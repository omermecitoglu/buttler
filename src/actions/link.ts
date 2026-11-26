"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { updateTag } from "next/cache";
import z from "zod";
import { syncLinkNetwork } from "~/core/docker/links";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import type { ServiceLinkDTO } from "~/models/service-link";
import createServiceLink from "~/operations/createServiceLink";
import deleteServiceLink from "~/operations/deleteServiceLink";
import getService from "~/operations/getService";
import { userMiddleware } from "./middlewares/user";

/** Both services show the link */
function updateLinkTags(link: Pick<ServiceLinkDTO, "serviceAId" | "serviceBId">) {
  updateTag(`getLinksOfService(${link.serviceAId})`);
  updateTag(`getLinksOfService(${link.serviceBId})`);
  // The services may inherit variables through the link
  updateTag("getInheritedVariablesOfService(...)");
  updateTag("getServiceGraph()");
}

/** System services get their links from Buttler */
async function isLinkable(serviceId: ServiceDTO["id"]) {
  const service = await getService(db, serviceId);
  return !!service && service.type !== "system";
}

export const addLinkAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    linkedServiceId: z.string().min(1),
  }),
  action: ({ linkedServiceId }) => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
    if (!await isLinkable(serviceId) || !await isLinkable(linkedServiceId)) {
      return displayMessage("error", "add_failed");
    }
    const link = await createServiceLink(db, serviceId, linkedServiceId);
    if (!link) return displayMessage("error", "already_linked");
    try {
      await syncLinkNetwork(link.id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to link service ${link.serviceAId} to ${link.serviceBId}:`, error);
      await deleteServiceLink(db, serviceId, link.id);
      try {
        // Removes what has been created
        await syncLinkNetwork(link.id);
      } catch {
        // A leftover network is removed by the next sync
      }
      return displayMessage("error", "connect_failed");
    }
    updateLinkTags(link);
    return {};
  },
});

export const removeLinkAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({}),
  action: () => async (
    serviceId: ServiceDTO["id"],
    linkId: ServiceLinkDTO["id"],
  ): Promise<Record<string, string>> => {
    const link = await deleteServiceLink(db, serviceId, linkId);
    if (!link) return displayMessage("error", "remove_failed");
    try {
      await syncLinkNetwork(link.id);
    } catch (error) {
      // The services can still reach each other, so the link must stay visible
      // eslint-disable-next-line no-console
      console.error(`Failed to unlink service ${link.serviceAId} from ${link.serviceBId}:`, error);
      await createServiceLink(db, link.serviceAId, link.serviceBId, link.id);
      return displayMessage("error", "disconnect_failed");
    }
    updateLinkTags(link);
    return {};
  },
});
