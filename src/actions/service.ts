"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { revalidatePath, updateTag } from "next/cache";
import z from "zod";
import { restartServiceContainer, startServiceContainer, stopServiceContainer } from "~/core/docker/status";
import db from "~/database";
import { redirect } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";
import createService from "~/operations/createService";
import getService from "~/operations/getService";

export const createServiceAction = defineFormAction({
  schema: z.object({
    name: z.string().trim().min(1, "service_name_required"),
    type: z.enum(["github", "dockerhub"]),
    repository: z.string().trim().min(1, "repository_required"),
    branch: z.string().trim().min(1, "branch_required"),
    ports: z.string().optional().default("[]").transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val || "[]");
        if (!Array.isArray(parsed)) throw new Error();
        return z.array(z.object({
          external: z.coerce.number().int().min(1).max(65535),
          internal: z.coerce.number().int().min(1).max(65535),
        })).parse(parsed);
      } catch {
        ctx.addIssue({ code: "custom", message: "invalid_ports" });
        return z.NEVER;
      }
    }),
    environmentVariables: z.string().optional().default("[]").transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val || "[]");
        if (!Array.isArray(parsed)) throw new Error();
        return z.array(z.object({
          key: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
          value: z.string(),
        })).parse(parsed);
      } catch {
        ctx.addIssue({ code: "custom", message: "invalid_environment_variables" });
        return z.NEVER;
      }
    }),
    volumes: z.string().optional().default("[]").transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val || "[]");
        if (!Array.isArray(parsed)) throw new Error();
        return z.array(z.object({
          name: z.string().trim().min(1, "volume_name_required"),
          containerPath: z.string().trim().min(1).startsWith("/"),
        })).parse(parsed);
      } catch {
        ctx.addIssue({ code: "custom", message: "invalid_volumes" });
        return z.NEVER;
      }
    }),
  }),
  action: input => async (locale: AppLocale) => {
    try {
      await Promise.resolve(createService(db, {
        name: input.name,
        type: input.type,
        repository: input.repository,
        branch: input.branch,
        ports: input.ports,
        environmentVariables: input.environmentVariables,
        volumes: input.volumes,
      }));
      updateTag("getAllServices()");
    } catch {
      displayMessage("error", "create_failed");
    }
    return redirect({ locale, href: "/services" });
  },
});

export async function startService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await startServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
  return { success: true };
}

export async function stopService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await stopServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
  return { success: true };
}

export async function restartService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await restartServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
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
