"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { updateTag } from "next/cache";
import z from "zod";
import { syncIngressNetwork } from "~/core/docker/ingress";
import { isHostname, isPort, normalizeHostname } from "~/core/domains";
import db from "~/database";
import type { DomainDTO } from "~/models/domain";
import type { ServiceDTO } from "~/models/service";
import createDomain from "~/operations/createDomain";
import deleteDomain from "~/operations/deleteDomain";
import getService from "~/operations/getService";
import { adminMiddleware } from "./middlewares/admin";

export const addDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    hostname: z.string().transform(normalizeHostname).refine(isHostname, "invalid_hostname"),
    port: z.string().transform(Number).refine(isPort, "invalid_port"),
  }),
  action: ({ hostname, port }) => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "add_failed");
    if (!await createDomain(db, { hostname, serviceId, port })) return displayMessage("error", "hostname_taken");
    try {
      await syncIngressNetwork(serviceId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to connect service ${serviceId} to the reverse proxy:`, error);
      await deleteDomain(db, serviceId, hostname);
      return displayMessage("error", "connect_failed");
    }
    updateTag(`getSingleService(${serviceId})`);
    return {};
  },
});

export const removeDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (
    serviceId: ServiceDTO["id"],
    hostname: DomainDTO["hostname"],
  ): Promise<Record<string, string>> => {
    if (!await deleteDomain(db, serviceId, hostname)) return displayMessage("error", "remove_failed");
    try {
      await syncIngressNetwork(serviceId);
    } catch (error) {
      // The domain is already gone, a leftover network is removed with the next sync
      // eslint-disable-next-line no-console
      console.error(`Failed to disconnect service ${serviceId} from the reverse proxy:`, error);
    }
    updateTag(`getSingleService(${serviceId})`);
    return {};
  },
});
