"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import EnvironmentVariablesRepeater, {
  type EnvironmentVariableItem,
} from "~/components/services/EnvironmentVariablesRepeater";
import PortMappingsRepeater, { type PortMappingItem } from "~/components/services/PortMappingsRepeater";
import VolumeMountsRepeater, { type VolumeMountItem } from "~/components/services/VolumeMountsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import type { EnvironmentVariableScope } from "~/core/environment-variables";

export type EditServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  service: {
    name: string,
    type: "github" | "dockerhub",
    repository: string,
    branch: string,
    ports: { external: number, internal: number }[],
    /** The values of secrets are null */
    environmentVariables: { key: string, value: string | null, scope: EnvironmentVariableScope, isSecret: boolean }[],
    volumes: { id: string, name: string, containerPath: string }[],
  },
  onClose: () => void,
};

const EditServiceForm = ({ action, service, onClose }: EditServiceFormProps) => {
  const t = useTranslations("ServicePage.edit");
  const tInfo = useTranslations("ServicePage.info");
  const labels = useServiceFormLabels();
  const formId = useId();

  const [name, setName] = useState(service.name);
  const [repository, setRepository] = useState(service.repository);
  const [branch, setBranch] = useState(service.branch);
  const [isSaving, setIsSaving] = useState(false);
  const [ports, setPorts] = useState<PortMappingItem[]>(() => service.ports.map(port => ({
    id: `saved-${port.external}`,
    external: port.external,
    internal: port.internal,
  })));
  const [variables, setVariables] = useState<EnvironmentVariableItem[]>(() => service.environmentVariables.map(variable => ({
    id: `saved-${variable.key}`,
    key: variable.key,
    value: variable.value ?? "",
    scope: variable.scope,
    isSecret: variable.isSecret,
    savedSecretKey: variable.isSecret ? variable.key : undefined,
  })));
  const [volumes, setVolumes] = useState<VolumeMountItem[]>(() => service.volumes.map(volume => ({
    id: volume.id,
    name: volume.name,
    containerPath: volume.containerPath,
  })));

  const isGitHub = service.type === "github";

  const cleanPorts = ports
    .filter(port => port.external !== "" && port.internal !== "")
    .map(port => ({ external: Number(port.external), internal: Number(port.internal) }));

  const cleanVariables = variables
    .filter(variable => variable.key.trim() !== "")
    .map(variable => ({
      key: variable.key.trim(),
      value: variable.savedSecretKey !== undefined && variable.value === "" ? null : variable.value,
      scope: variable.scope,
      isSecret: variable.isSecret,
    }));

  const cleanVolumes = volumes
    .filter(volume => volume.containerPath.trim() !== "")
    .map(volume => ({ name: (volume.name ?? "").trim(), containerPath: volume.containerPath.trim() }));

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      const result = await action(state, formData);
      if (Object.keys(result).length === 0) onClose();
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  // Validation errors are in upper case
  const messages = {
    update_failed: t("messages.update_failed"),
    secret_value_required: t("messages.secret_value_required"),
    TOO_SMALL: t("messages.field_required"),
    INVALID_PORTS: t("messages.invalid_ports"),
    INVALID_ENVIRONMENT_VARIABLES: t("messages.invalid_environment_variables"),
    INVALID_VOLUMES: t("messages.invalid_volumes"),
  };

  const fields = [
    { key: "name", label: t("name"), value: name, onChange: setName },
    { key: "repository", label: isGitHub ? tInfo("repository") : tInfo("image"), value: repository, onChange: setRepository },
    { key: "branch", label: isGitHub ? tInfo("branch") : tInfo("tag"), value: branch, onChange: setBranch },
  ];

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
      <input type="hidden" name="ports" value={JSON.stringify(cleanPorts)} />
      <input type="hidden" name="environmentVariables" value={JSON.stringify(cleanVariables)} />
      <input type="hidden" name="volumes" value={JSON.stringify(cleanVolumes)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`${formId}-${field.key}`}>{field.label}</Label>
            <Input
              id={`${formId}-${field.key}`}
              name={field.key}
              required
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
            />
          </div>
        ))}
      </div>
      <PortMappingsRepeater items={ports} onChange={setPorts} labels={labels.ports} />
      <EnvironmentVariablesRepeater
        items={variables}
        onChange={setVariables}
        hasBuild={isGitHub}
        labels={{ ...labels.env, savedSecretPlaceholder: t("secretPlaceholder") }}
      />
      <VolumeMountsRepeater items={volumes} onChange={setVolumes} labels={labels.volumes} />
      <div className="flex flex-col gap-4 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{isGitHub ? t("applyHelpWithBuild") : t("applyHelp")}</p>
        <div className="flex shrink-0 justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" size="sm" pending={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default EditServiceForm;
