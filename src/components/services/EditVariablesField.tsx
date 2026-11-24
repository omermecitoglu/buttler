"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import EnvironmentVariablesRepeater, {
  type EnvironmentVariableItem,
} from "~/components/services/EnvironmentVariablesRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";
import type { EnvironmentVariableScope } from "~/core/environment-variables";

export type SavedVariable = {
  key: string,
  /** The values of secrets are null */
  value: string | null,
  scope: EnvironmentVariableScope,
  isSecret: boolean,
};

export type EditVariablesFieldProps = {
  variables: SavedVariable[],
  hasBuild: boolean,
};

const EditVariablesField = ({ variables, hasBuild }: EditVariablesFieldProps) => {
  const t = useTranslations("ServicePage.edit");
  const labels = useServiceFormLabels();
  const [items, setItems] = useState<EnvironmentVariableItem[]>(() => variables.map(variable => ({
    id: `saved-${variable.key}`,
    key: variable.key,
    value: variable.value ?? "",
    scope: variable.scope,
    isSecret: variable.isSecret,
    savedSecretKey: variable.isSecret ? variable.key : undefined,
  })));

  const value = items
    .filter(item => item.key.trim() !== "")
    .map(item => ({
      key: item.key.trim(),
      value: item.savedSecretKey !== undefined && item.value === "" ? null : item.value,
      scope: item.scope,
      isSecret: item.isSecret,
    }));

  return (
    <>
      <input type="hidden" name="environmentVariables" value={JSON.stringify(value)} />
      <EnvironmentVariablesRepeater
        items={items}
        onChange={setItems}
        hasBuild={hasBuild}
        labels={{ ...labels.env, savedSecretPlaceholder: t("secretPlaceholder") }}
      />
    </>
  );
};

export default EditVariablesField;
