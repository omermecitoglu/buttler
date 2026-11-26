import { eq } from "drizzle-orm";
import { decryptSecret } from "~/core/secrets";
import { getServiceHost, resolveTemplate } from "~/core/shared-variables";
import type database from "~/database";
import { sharedVariableNames } from "~/database/schema/shared-variables";
import { getSecretContext } from "./getSecretContext";
import getServiceLinks, { getLinkedServiceId } from "./getServiceLinks";

export type InheritedVariable = {
  linkId: string,
  /** The service that shares the variable */
  sourceServiceId: string,
  sharedVariableId: string,
  /** Its key in the service that shares it */
  key: string,
  /** Its name in the container, the key unless it's renamed */
  name: string,
  /** `null` for secrets, unless they are decrypted */
  value: string | null,
  isSecret: boolean,
  /** Referenced variables that aren't set and have no fallback */
  unset: string[],
};

/**
 * Resolves the variables that a service inherits through its links.
 * When two of them have the same name, the one of the older link is kept.
 * Decrypted secrets must never be cached or sent to the browser.
 */
export default async function getInheritedVariables(
  db: typeof database,
  serviceId: string,
  { decrypt = false } = {},
): Promise<InheritedVariable[]> {
  const links = (await getServiceLinks(db, serviceId)).filter(link => {
    return link.serviceAId === serviceId ? link.serviceAInherits : link.serviceBInherits;
  });
  const inherited: InheritedVariable[] = [];
  for (const link of links) {
    const sourceServiceId = getLinkedServiceId(link, serviceId);
    const [
      source,
      names,
    ] = await Promise.all([
      db.query.services.findFirst({
        where: { id: sourceServiceId },
        with: { environmentVariables: true, sharedVariables: { orderBy: { key: "asc" } } },
      }),
      db.select().from(sharedVariableNames).where(eq(sharedVariableNames.linkId, link.id)),
    ]);
    if (!source) continue;
    const variables = source.environmentVariables.map(variable => ({
      ...variable,
      value: variable.isSecret
        ? (decrypt ? decryptSecret(variable.value, getSecretContext(sourceServiceId, variable.key)) : null)
        : variable.value,
    }));
    for (const sharedVariable of source.sharedVariables) {
      const name = names.find(({ sharedVariableId }) => sharedVariableId === sharedVariable.id)?.name ?? sharedVariable.key;
      if (inherited.some(variable => variable.name === name)) continue;
      const resolved = resolveTemplate(sharedVariable.template, { host: getServiceHost(sourceServiceId), variables });
      inherited.push({
        linkId: link.id,
        sourceServiceId,
        sharedVariableId: sharedVariable.id,
        key: sharedVariable.key,
        name,
        value: resolved.isSecret && !decrypt ? null : resolved.value,
        isSecret: resolved.isSecret,
        unset: resolved.unset,
      });
    }
  }
  return inherited;
}
