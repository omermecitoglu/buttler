"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import z from "zod";
import { recreateRunningServices } from "~/core/recreate";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import { variableNamePattern } from "~/models/shared-variable";
import getInheritedVariables from "~/operations/getInheritedVariables";
import getService from "~/operations/getService";
import getServiceLinks, { getLinkedServiceId } from "~/operations/getServiceLinks";
import getSharedVariables from "~/operations/getSharedVariables";
import saveSharedVariables from "~/operations/saveSharedVariables";
import { updateLinksInheritance } from "~/operations/updateLinkInheritance";
import { jsonField } from "~/utils/jsonField";
import { userMiddleware } from "./middlewares/user";

const variableName = z.string().trim().regex(variableNamePattern);

function hasDuplicates(names: string[]) {
  return new Set(names).size !== names.length;
}

/** Inherited variables depend on the shared variables and the links of other services */
function updateInheritedTags() {
  updateTag("getInheritedVariablesOfService(...)");
}

async function recreate(serviceIds: string[]) {
  if (serviceIds.length === 0) return displayMessage("success", "saved");
  try {
    const failed = await recreateRunningServices(serviceIds);
    return failed.length > 0 ? displayMessage("error", "recreate_failed") : displayMessage("success", "recreated");
  } finally {
    refresh();
  }
}

export const saveSharedVariablesAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    variables: jsonField("invalid_shared_variables", z.array(z.object({
      id: z.string().min(1).optional(),
      key: variableName,
      template: z.string(),
    }))),
    // Recreates the running services that inherit them, otherwise they get the change when they are created again
    recreate: z.literal("on").optional(),
  }),
  action: input => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
    const { variables } = input;
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "save_failed");
    if (hasDuplicates(variables.map(({ key }) => key))) return displayMessage("error", "duplicate_keys");
    try {
      saveSharedVariables(db, serviceId, variables);
    } catch {
      return displayMessage("error", "save_failed");
    }
    updateTag(`getSharedVariablesOfService(${serviceId})`);
    updateInheritedTags();
    // Only the services that inherit them are affected
    const inheritingIds = (await getServiceLinks(db, serviceId))
      .filter(link => (link.serviceAId === serviceId ? link.serviceBInherits : link.serviceAInherits))
      .map(link => getLinkedServiceId(link, serviceId));
    return await recreate(input.recreate ? inheritingIds : []);
  },
});

/** Saves what a service inherits through all of its links, so its container is recreated at most once */
export const updateLinksInheritanceAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    links: jsonField("invalid_links", z.array(z.object({
      linkId: z.string().min(1),
      inherits: z.boolean(),
      // Only the renamed variables, the others keep their key
      names: z.array(z.object({
        sharedVariableId: z.string().min(1),
        name: variableName,
      })),
    }))),
    recreate: z.literal("on").optional(),
  }),
  action: input => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
    const serviceLinks = await getServiceLinks(db, serviceId);
    const links = input.links.map(({ linkId }) => serviceLinks.find(({ id }) => id === linkId));
    if (links.some(link => !link)) return displayMessage("error", "update_failed");
    const changedLinks = links.filter(link => !!link);
    // The links of system services are made by Buttler
    const linkedIds = new Set(changedLinks.flatMap(link => [link.serviceAId, link.serviceBId]));
    const linkedServices = await Promise.all([...linkedIds].map(id => getService(db, id)));
    if (linkedServices.some(service => !service || service.type === "system")) {
      return displayMessage("error", "update_failed");
    }
    const names = (await Promise.all(input.links.map(async (change, index) => {
      if (!change.inherits) return [];
      const sharedVariables = await getSharedVariables(db, getLinkedServiceId(changedLinks[index], serviceId));
      return sharedVariables.map(variable => {
        return change.names.find(({ sharedVariableId }) => sharedVariableId === variable.id)?.name ?? variable.key;
      });
    }))).flat();
    const otherNames = (await getInheritedVariables(db, serviceId))
      .filter(variable => !input.links.some(({ linkId }) => linkId === variable.linkId))
      .map(({ name }) => name);
    if (hasDuplicates([...names, ...otherNames])) return displayMessage("error", "duplicate_names");
    if (!updateLinksInheritance(db, serviceId, input.links)) return displayMessage("error", "update_failed");
    for (const link of changedLinks) {
      updateTag(`getLinksOfService(${link.serviceAId})`);
      updateTag(`getLinksOfService(${link.serviceBId})`);
      updateTag(`getSharedVariableNamesOfLink(${link.id})`);
    }
    updateInheritedTags();
    return await recreate(input.recreate ? [serviceId] : []);
  },
});
