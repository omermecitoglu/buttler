"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import z from "zod";
import { requireUser } from "~/core/auth";
import { deleteBuildLog, findLatestImage, startBuilding } from "~/core/build";
import { removeServiceContainers, removeServiceImages, removeVolumes } from "~/core/docker/removal";
import {
  type ServiceRef,
  getServiceRuntimeState,
  isImagePresentLocally,
  isServiceBuilding,
  isServicePulling,
  markServicePulling,
  pullAndDeployService,
  restartServiceContainer,
  startServiceContainer,
  stopServiceContainer,
} from "~/core/docker/status";
import { getServiceImageTag } from "~/core/dockerhub";
import { environmentVariableScopes } from "~/core/environment-variables";
import db from "~/database";
import { redirect } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
import getDeployableService from "~/operations/getDeployableService";
import getService from "~/operations/getService";
import getSharedVolumes from "~/operations/getSharedVolumes";
import updateService, { MissingSecretValueError } from "~/operations/updateService";
import { adminMiddleware } from "./middlewares/admin";
import { userMiddleware } from "./middlewares/user";

function jsonField<T extends z.ZodType>(errorMessage: string, schema: T) {
  return z.string().transform((val, ctx): z.output<T> => {
    try {
      return schema.parse(JSON.parse(val || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: errorMessage });
      return z.NEVER;
    }
  });
}

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

const volumesField = jsonField("invalid_volumes", z.array(z.object({
  name: z.string().trim().min(1, "volume_name_required"),
  containerPath: z.string().trim().min(1).startsWith("/"),
})));

export const createServiceAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    name: z.string().trim().min(1, "service_name_required"),
    type: z.enum(["github", "dockerhub"]),
    repository: z.string().trim().min(1, "repository_required"),
    branch: z.string().trim().min(1, "branch_required"),
    ports: portsField.optional().default([]),
    environmentVariables: jsonField("invalid_environment_variables", z.array(environmentVariable)).optional().default([]),
    volumes: volumesField.optional().default([]),
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
        ports: input.ports,
        environmentVariables,
        volumes: input.volumes,
      }));
      if (service.type === "github") {
        startBuilding({
          ...service,
          ports: input.ports,
          environmentVariables,
          volumes: input.volumes,
        });
      }
      updateTag("getAllServices()");
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
  }),
  action: input => async (serviceId: string): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "update_failed");
    // Only the services with a build step can use the other scopes
    const environmentVariables = service.type === "github"
      ? input.environmentVariables
      : input.environmentVariables?.map(variable => ({ ...variable, scope: "runtime" as const }));
    try {
      updateService(db, serviceId, { ...input, environmentVariables });
    } catch (error) {
      return displayMessage("error", error instanceof MissingSecretValueError ? "secret_value_required" : "update_failed");
    }
    updateTag("getAllServices()");
    updateTag(`getSingleService(${serviceId})`);
    return {};
  },
});

/** A build or a pull would deploy the service again after it's deleted */
function isServiceBeingDeployed(serviceId: string) {
  return isServiceBuilding(serviceId) || isServicePulling(serviceId);
}

/** The service itself is deleted last, so a deletion that fails can be tried again. Returns false if it's kept. */
async function removeService({ id, volumes }: { id: string, volumes: { name: string }[] }, deleteVolumes: boolean) {
  await removeServiceContainers(id);
  await removeServiceImages(id);
  if (deleteVolumes) {
    const sharedVolumes = await getSharedVolumes(db, id);
    await removeVolumes(volumes.map(volume => volume.name).filter(name => !sharedVolumes.includes(name)));
  }
  // A push may have started a build in the meantime
  if (isServiceBeingDeployed(id)) return false;
  await deleteService(db, id);
  return true;
}

export const deleteServiceAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    // Unchecked boxes are not submitted
    deleteVolumes: z.literal("on").optional(),
  }),
  action: input => async (serviceId: string, locale: AppLocale): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "delete_failed");
    const { status } = await getServiceRuntimeState(service);
    if (status === "building" || status === "pulling") return displayMessage("error", "service_busy");
    const isRemoved = await removeService(service, input.deleteVolumes === "on").catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to delete service ${serviceId}:`, error);
      return displayMessage("error", "delete_failed");
    });
    if (!isRemoved) return displayMessage("error", "service_busy");
    try {
      await deleteBuildLog(serviceId);
    } catch (error) {
      // The service is already gone, a leftover log must not look like a failure
      // eslint-disable-next-line no-console
      console.error(`Failed to delete the build log of service ${serviceId}:`, error);
    }
    updateTag("getAllServices()");
    updateTag(`getSingleService(${serviceId})`);
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
