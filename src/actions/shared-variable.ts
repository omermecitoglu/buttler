"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import z from "zod";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import type { ServiceLinkDTO } from "~/models/service-link";
import { variableNamePattern } from "~/models/shared-variable";
import getInheritedVariables from "~/operations/getInheritedVariables";
import getService from "~/operations/getService";
import getServiceLinks, { getLinkedServiceId } from "~/operations/getServiceLinks";
import getSharedVariables from "~/operations/getSharedVariables";
import saveSharedVariables from "~/operations/saveSharedVariables";
import updateLinkInheritance from "~/operations/updateLinkInheritance";
import { jsonField } from "./fields";
import { userMiddleware } from "./middlewares/user";
import { recreateRunningServices } from "./recreate";

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
    // The services to recreate right away, the others get the change when they are created again
    recreate: jsonField("invalid_recreate", z.array(z.string())).optional().default([]),
  }),
  action: ({ variables, recreate: recreatedIds }) => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
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
    return await recreate(recreatedIds.filter(id => inheritingIds.includes(id)));
  },
});

export const updateLinkInheritanceAction = defineFormAction({
  middlewares: [userMiddleware],
  schema: z.object({
    inherits: z.literal("on").optional(),
    // Only the renamed variables, the others keep their key
    names: jsonField("invalid_names", z.array(z.object({
      sharedVariableId: z.string().min(1),
      name: variableName,
    }))).optional().default([]),
    recreate: z.literal("on").optional(),
  }),
  action: input => async (
    serviceId: ServiceDTO["id"],
    linkId: ServiceLinkDTO["id"],
  ): Promise<Record<string, string>> => {
    const link = (await getServiceLinks(db, serviceId)).find(({ id }) => id === linkId);
    if (!link) return displayMessage("error", "update_failed");
    const inherits = !!input.inherits;
    if (inherits) {
      const sharedVariables = await getSharedVariables(db, getLinkedServiceId(link, serviceId));
      const names = sharedVariables.map(variable => {
        return input.names.find(({ sharedVariableId }) => sharedVariableId === variable.id)?.name ?? variable.key;
      });
      const otherNames = (await getInheritedVariables(db, serviceId))
        .filter(variable => variable.linkId !== linkId)
        .map(({ name }) => name);
      if (hasDuplicates([...names, ...otherNames])) return displayMessage("error", "duplicate_names");
    }
    if (!updateLinkInheritance(db, serviceId, linkId, { inherits, names: input.names })) {
      return displayMessage("error", "update_failed");
    }
    updateTag(`getLinksOfService(${link.serviceAId})`);
    updateTag(`getLinksOfService(${link.serviceBId})`);
    updateInheritedTags();
    return await recreate(input.recreate ? [serviceId] : []);
  },
});
