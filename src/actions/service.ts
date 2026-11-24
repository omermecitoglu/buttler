"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import z from "zod";
import { findLatestImage, startBuilding } from "~/core/build";
import {
  isImagePresentLocally,
  markServicePulling,
  restartServiceContainer,
  startServiceContainer,
  stopServiceContainer,
} from "~/core/docker/status";
import { environmentVariableScopes } from "~/core/environment-variables";
import db from "~/database";
import { redirect } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";
import createService from "~/operations/createService";
import getDeployableService from "~/operations/getDeployableService";
import getService from "~/operations/getService";
import updateService, { MissingSecretValueError } from "~/operations/updateService";

function jsonField<T extends z.ZodType>(errorMessage: string, schema: T) {
  return z.string().optional().default("[]").transform((val, ctx): z.output<T> => {
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
  schema: z.object({
    name: z.string().trim().min(1, "service_name_required"),
    type: z.enum(["github", "dockerhub"]),
    repository: z.string().trim().min(1, "repository_required"),
    branch: z.string().trim().min(1, "branch_required"),
    ports: portsField,
    environmentVariables: jsonField("invalid_environment_variables", z.array(environmentVariable)),
    volumes: volumesField,
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
  schema: z.object({
    name: z.string().trim().min(1),
    repository: z.string().trim().min(1),
    branch: z.string().trim().min(1),
    ports: portsField,
    environmentVariables: jsonField("invalid_environment_variables", z.array(environmentVariable.extend({
      // Secrets that are left untouched don't have a value
      value: z.string().nullable(),
    }))),
    volumes: volumesField,
  }),
  action: input => async (serviceId: string): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "update_failed");
    // Only the services with a build step can use the other scopes
    const environmentVariables = service.type === "github"
      ? input.environmentVariables
      : input.environmentVariables.map(variable => ({ ...variable, scope: "runtime" as const }));
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

export async function startService(serviceId: string) {
  const service = await getDeployableService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  if (service.type === "dockerhub") {
    const rawImage = service.repository ?? "";
    const imageTag = rawImage
      ? (service.branch ? `${rawImage}:${service.branch}` : (rawImage.includes(":") ? rawImage : `${rawImage}:latest`))
      : "";
    if (imageTag) {
      const hasImage = await isImagePresentLocally(imageTag);
      if (!hasImage) {
        markServicePulling(service.id, true);
        void (async () => {
          try {
            await startServiceContainer(service);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`Failed to pull and start service ${service.id}:`, err);
          }
        })();
        refresh();
        return { success: true };
      }
    }
  }
  if (service.type === "github" && !await findLatestImage(service.id)) {
    startBuilding(service);
    refresh();
    return { success: true };
  }
  await startServiceContainer(service);
  refresh();
  return { success: true };
}

export async function stopService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await stopServiceContainer(service);
  refresh();
  return { success: true };
}

export async function restartService(serviceId: string) {
  const service = await getDeployableService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await restartServiceContainer(service);
  refresh();
  return { success: true };
}

// NOTE (v2 roadmap): Legacy v1 service server actions.
// Services and operations are being redesigned from scratch in Phase 3.

export async function create(_formData: FormData) {
  // Deprecated in v2
}

export async function update(_id: string, _: unknown, _formData: FormData): Promise<Record<string, string>> {
  return {};
}

export async function destroy(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function start(_serviceId: string, _: FormData) {
  // Deprecated in v2
}

export async function stop(_serviceId: string, _containerId: string, _: FormData) {
  // Deprecated in v2
}

export async function build(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function attachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}

export async function detachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}
