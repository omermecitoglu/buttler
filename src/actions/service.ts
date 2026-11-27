"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import z from "zod";
import { requireUser } from "~/core/auth";
import { deleteBuildLog, findLatestImage, startBuilding } from "~/core/build";
import { syncDomains } from "~/core/cloudflare/domains";
import { removeInternetNetwork } from "~/core/docker/internet";
import { removeLinkNetworks } from "~/core/docker/links";
import { isVolumeName, removeServiceContainers, removeServiceImages, removeVolumes } from "~/core/docker/removal";
import {
  type ServiceIdentity,
  type ServiceRef,
  assertServiceNotDeleting,
  getServiceRuntimeState,
  isImagePresentLocally,
  isServiceBuilding,
  isServicePulling,
  markServiceDeleting,
  markServicePulling,
  pullAndDeployService,
  restartServiceContainer,
  startServiceContainer,
  stopServiceContainer,
} from "~/core/docker/status";
import { getServiceImageTag } from "~/core/dockerhub";
import { environmentVariableScopes } from "~/core/environment-variables";
import { deleteFromReverseProxy } from "~/core/nginx";
import { isServiceBusy } from "~/core/recreate";
import db from "~/database";
import { redirect } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";
import { variableNamePattern } from "~/models/shared-variable";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
import getDeployableService from "~/operations/getDeployableService";
import getInheritedVariables from "~/operations/getInheritedVariables";
import getService from "~/operations/getService";
import getSharedVolumes from "~/operations/getSharedVolumes";
import updateService, { MissingSecretValueError } from "~/operations/updateService";
import { jsonField } from "~/utils/jsonField";
import { adminMiddleware } from "./middlewares/admin";
import { userMiddleware } from "./middlewares/user";

const recreateField = z.literal("on").optional();

const portsField = jsonField("invalid_ports", z.array(z.object({
  external: z.coerce.number().int().min(1).max(65535),
  internal: z.coerce.number().int().min(1).max(65535),
})));

const environmentVariable = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  value: z.string(),
  scope: z.enum(environmentVariableScopes).default("runtime"),
  isSecret: z.boolean().default(false),
});

/** Only the messages of `refine` reach the form, `.min(1, "...")` gives `TOO_SMALL` */
function requiredString(message: string) {
  return z.string().trim().refine(value => value !== "", message);
}

/** Radio buttons that have no default, nothing is sent until one is chosen */
const internetAccessField = z.enum(["yes", "no"]).optional()
  .refine(value => value !== undefined, "internet_access_required")
  .transform(value => value === "yes");

const volumesField = jsonField("invalid_volumes", z.array(z.object({
  // Checked below, the errors in the JSON become "invalid_volumes"
  name: z.string().trim(),
  containerPath: z.string().trim().min(1).startsWith("/"),
})))
  .refine(volumes => volumes.every(({ name }) => name !== ""), { message: "volume_name_required", abort: true })
  .refine(
    // Docker doesn't accept other names, the service couldn't be deployed
    volumes => volumes.every(({ name }) => isVolumeName(name) || name.startsWith("/")),
    "invalid_volume_name",
  );

export const createServiceAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    name: requiredString("service_name_required"),
    type: z.enum(["github", "dockerhub"]),
    repository: requiredString("repository_required"),
    branch: requiredString("branch_required"),
    ports: portsField.optional().default([]),
    environmentVariables: jsonField("invalid_environment_variables", z.array(environmentVariable)).optional().default([]),
    volumes: volumesField.optional().default([]),
    sharedVariables: jsonField("invalid_shared_variables", z.array(z.object({
      key: z.string().trim().regex(variableNamePattern),
      template: z.string(),
    })))
      .refine(variables => new Set(variables.map(({ key }) => key)).size === variables.length, "duplicate_shared_variables")
      .optional()
      .default([]),
    internetAccess: internetAccessField,
  }),
  action: input => async (locale: AppLocale) => {
    // Only the services with a build step can use the other scopes
    const environmentVariables = input.type === "github"
      ? input.environmentVariables
      : input.environmentVariables.map(variable => ({ ...variable, scope: "runtime" as const }));
    try {
      const service = await Promise.resolve(createService(db, {
        name: input.name,
        type: input.type,
        repository: input.repository,
        branch: input.branch,
        internetAccess: input.internetAccess,
        ports: input.ports,
        environmentVariables,
        volumes: input.volumes,
        sharedVariables: input.sharedVariables,
      }));
      const deployable = {
        ...service,
        ports: input.ports,
        environmentVariables,
        volumes: input.volumes,
      };
      if (service.type === "github") {
        startBuilding(deployable);
      } else {
        startPulling(deployable);
      }
      updateTag("getAllServices()");
      updateTag("getServiceGraph()");
    } catch {
      displayMessage("error", "create_failed");
    }
    return redirect({ locale, href: "/services" });
  },
});

export const updateServiceAction = defineFormAction({
  middlewares: [userMiddleware],
  // The parts that are not given are left untouched
  schema: z.object({
    name: z.string().trim().min(1).optional(),
    repository: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    ports: portsField.optional(),
    environmentVariables: jsonField("invalid_environment_variables", z.array(environmentVariable.extend({
      // Secrets that are left untouched don't have a value
      value: z.string().nullable(),
    }))).optional(),
    volumes: volumesField.optional(),
    // Otherwise the changes apply the next time the container is created
    recreate: recreateField,
  }),
  action: ({ recreate, ...input }) => async (serviceId: string): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "update_failed");
    if (recreate && !await canRecreateContainer(service)) return displayMessage("error", "service_busy");
    // Only the services with a build step can use the other scopes
    const environmentVariables = service.type === "github"
      ? input.environmentVariables
      : input.environmentVariables?.map(variable => ({ ...variable, scope: "runtime" as const }));
    if (environmentVariables) {
      // A variable that was saved before keeps winning over an inherited one
      const savedKeys = service.environmentVariables.map(({ key }) => key);
      const inheritedNames = (await getInheritedVariables(db, serviceId)).map(({ name }) => name);
      if (environmentVariables.some(({ key }) => !savedKeys.includes(key) && inheritedNames.includes(key))) {
        return displayMessage("error", "inherited_variable_name");
      }
    }
    try {
      updateService(db, serviceId, { ...input, environmentVariables });
    } catch (error) {
      return displayMessage("error", error instanceof MissingSecretValueError ? "secret_value_required" : "update_failed");
    }
    updateTag("getAllServices()");
    updateTag("getServiceGraph()");
    updateTag(`getSingleService(${serviceId})`);
    // Linked services may inherit variables that are built from them
    updateTag("getInheritedVariablesOfService(...)");
    if (recreate && !await recreateContainer(serviceId)) return displayMessage("error", "recreate_failed");
    return {};
  },
});

export const updateInternetAccessAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    internetAccess: internetAccessField,
    // Otherwise the change applies the next time the container is created
    recreate: recreateField,
  }),
  action: input => async (serviceId: string): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "update_failed");
    if (input.recreate && !await canRecreateContainer(service)) return displayMessage("error", "service_busy");
    try {
      updateService(db, serviceId, { internetAccess: input.internetAccess });
    } catch {
      return displayMessage("error", "update_failed");
    }
    updateTag("getAllServices()");
    updateTag(`getSingleService(${serviceId})`);
    if (!input.recreate) return displayMessage("success", "saved");
    if (!await recreateContainer(serviceId)) return displayMessage("error", "recreate_failed");
    return displayMessage("success", "recreated");
  },
});

/** The container is replaced anyway while it's built or pulled, and replacing it at the same time would fail */
async function canRecreateContainer(service: ServiceIdentity) {
  const { status } = await getServiceRuntimeState(service);
  return status !== "building" && status !== "pulling" && !isServiceBusy(service.id);
}

/** Creates the container again, so it gets the saved changes */
async function recreateContainer(serviceId: string) {
  try {
    await restartServiceContainer(await getServiceToDeploy(serviceId));
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to recreate the container of service ${serviceId}:`, error);
    return false;
  } finally {
    refresh();
  }
}

/** The service itself is deleted last, so a deletion that fails can be tried again */
async function removeService({ id, volumes }: { id: string, volumes: { name: string }[] }, chosenVolumes: string[]) {
  await removeServiceContainers(id);
  await removeInternetNetwork(id);
  await removeLinkNetworks(id);
  await removeServiceImages(id);
  if (chosenVolumes.length > 0) {
    const sharedVolumes = await getSharedVolumes(db, id);
    // Only its own volumes can be chosen
    const names = volumes.map(volume => volume.name).filter(name => chosenVolumes.includes(name));
    await removeVolumes(names.filter(name => !sharedVolumes.includes(name)));
  }
  await deleteFromReverseProxy(id, async () => {
    await deleteService(db, id);
    return true;
  });
}

export const deleteServiceAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    // Names of the volumes to be deleted, the others are kept
    volumes: jsonField("invalid_volumes", z.array(z.string())).optional().default([]),
  }),
  action: input => async (serviceId: string, locale: AppLocale): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "delete_failed");
    const { status } = await getServiceRuntimeState(service);
    if (status === "building" || status === "pulling") return displayMessage("error", "service_busy");
    // Nothing is awaited between the check and the mark, so no build, pull or deploy can start in between
    if (isServiceBusy(serviceId)) return displayMessage("error", "service_busy");
    markServiceDeleting(serviceId, true);
    let isRemoved: boolean;
    try {
      // The domains must not be public longer than they are served
      const hasDomains = service.domains.length > 0;
      if (hasDomains) await syncDomains({ withoutService: serviceId });
      isRemoved = await removeService(service, input.volumes).then(() => true, (error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to delete service ${serviceId}:`, error);
        return false;
      });
      // They are public again if the service is kept
      if (hasDomains) await syncDomains();
    } finally {
      markServiceDeleting(serviceId, false);
    }
    if (!isRemoved) return displayMessage("error", "delete_failed");
    try {
      await deleteBuildLog(serviceId);
    } catch (error) {
      // The service is already gone, a leftover log must not look like a failure
      // eslint-disable-next-line no-console
      console.error(`Failed to delete the build log of service ${serviceId}:`, error);
    }
    updateTag("getAllServices()");
    updateTag("getServiceGraph()");
    updateTag(`getSingleService(${serviceId})`);
    // The links are deleted with the service
    updateTag("getLinksOfService(...)");
    return redirect({ locale, href: "/services" });
  },
});

/** What an action on a service led to, builds and pulls go on in the background */
export type ServiceActionOutcome = "started" | "stopped" | "restarted" | "building" | "pulling";

type ServiceActionResult = {
  outcome: ServiceActionOutcome,
};

async function getServiceToDeploy(serviceId: string) {
  const service = await getDeployableService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  return service;
}

function startPulling(service: ServiceRef) {
  // Requests made during a pull share it
  if (isServicePulling(service.id)) return;
  assertServiceNotDeleting(service.id);
  markServicePulling(service.id, true);
  after(async () => {
    try {
      await pullAndDeployService(service);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to pull and deploy service ${service.id}:`, error);
    }
  });
}

export async function startService(serviceId: string): Promise<ServiceActionResult> {
  await requireUser();
  const service = await getServiceToDeploy(serviceId);
  if (service.type === "dockerhub") {
    const imageTag = getServiceImageTag(service);
    if (imageTag && !await isImagePresentLocally(imageTag)) {
      startPulling(service);
      refresh();
      return { outcome: "pulling" };
    }
  }
  if (service.type === "github" && !await findLatestImage(service.id)) {
    startBuilding(service);
    refresh();
    return { outcome: "building" };
  }
  await startServiceContainer(service);
  refresh();
  return { outcome: "started" };
}

export async function stopService(serviceId: string): Promise<ServiceActionResult> {
  await requireUser();
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await stopServiceContainer(service);
  refresh();
  return { outcome: "stopped" };
}

export async function restartService(serviceId: string): Promise<ServiceActionResult> {
  await requireUser();
  const service = await getServiceToDeploy(serviceId);
  await restartServiceContainer(service);
  refresh();
  return { outcome: "restarted" };
}

/** Builds and deploys the latest commit of a GitHub service */
export async function triggerBuild(serviceId: string): Promise<ServiceActionResult> {
  await requireUser();
  const service = await getServiceToDeploy(serviceId);
  if (service.type !== "github") {
    throw new Error(`Service cannot be built: ${serviceId}`);
  }
  // A repeated click must not queue another build
  if (!isServiceBuilding(service.id)) {
    startBuilding(service);
  }
  refresh();
  return { outcome: "building" };
}

/** Pulls and deploys the latest image of a Docker Hub service, other services run their last known image again */
export async function redeployService(serviceId: string): Promise<ServiceActionResult> {
  await requireUser();
  const service = await getServiceToDeploy(serviceId);
  if (service.type !== "dockerhub") return restartService(serviceId);
  startPulling(service);
  refresh();
  return { outcome: "pulling" };
}

// NOTE (v2 roadmap): Legacy v1 service server actions.
// Services and operations are being redesigned from scratch in Phase 3.

export async function create(_formData: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function update(_id: string, _: unknown, _formData: FormData): Promise<Record<string, string>> {
  await requireUser();
  return {};
}

export async function start(_serviceId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function stop(_serviceId: string, _containerId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function build(_id: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function attachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function detachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}
