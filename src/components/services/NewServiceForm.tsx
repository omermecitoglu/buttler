"use client";

import { faDocker } from "@fortawesome/free-brands-svg-icons/faDocker";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import DockerHubSourcePicker from "~/components/services/DockerHubSourcePicker";
import EnvironmentVariablesRepeater, {
  type EnvironmentVariableItem,
} from "~/components/services/EnvironmentVariablesRepeater";
import GitHubSourcePicker from "~/components/services/GitHubSourcePicker";
import InternetAccessChoice from "~/components/services/InternetAccessChoice";
import PortMappingsRepeater, {
  type PortMappingItem,
} from "~/components/services/PortMappingsRepeater";
import SharedVariablesRepeater, {
  type SharedVariableItem,
} from "~/components/services/SharedVariablesRepeater";
import VolumeMountsRepeater, {
  type VolumeMountItem,
} from "~/components/services/VolumeMountsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { generatePassword, getDatabasePreset } from "~/core/database-presets";
import type { SharedVariableSource } from "~/core/shared-variables";
import { Link } from "~/i18n/navigation";

export type NewServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
};

type ServiceSourceType = "github" | "dockerhub";

/** The image of the preset that added an item, which removes it when another image is chosen */
type PresetItem<T> = T & { preset?: string };

/** The container name has the ID of the service, which isn't known yet */
const previewHost = "buttler-service-…";

const NewServiceForm = ({ action }: NewServiceFormProps) => {
  const t = useTranslations("NewServicePage");
  const labels = useServiceFormLabels();

  const [sourceType, setSourceType] = useState<ServiceSourceType>("github");
  const [repository, setRepository] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [ports, setPorts] = useState<PortMappingItem[]>([]);
  const [envVars, setEnvVars] = useState<PresetItem<EnvironmentVariableItem>[]>([]);
  const [sharedVars, setSharedVars] = useState<PresetItem<SharedVariableItem>[]>([]);
  const [volumes, setVolumes] = useState<VolumeMountItem[]>([]);
  // There is no default, the user must choose
  const [internetAccess, setInternetAccess] = useState<boolean | null>(null);

  const nameInputId = useId();

  const presetImage = sourceType === "dockerhub" ? getDatabasePreset(repository)?.image : undefined;

  /** Replaces the items of the previous preset, the ones that are already there are kept */
  const applyPreset = (image: string) => {
    const preset = getDatabasePreset(image);
    if (preset?.image === presetImage) return;
    const note = preset ? t("sharedSection.presetNote", { image: preset.image }) : undefined;
    const keptEnvVars = envVars.filter(({ preset: added }) => !added);
    const keptSharedVars = sharedVars.filter(({ preset: added }) => !added);
    const envKeys = keptEnvVars.map(({ key }) => key.trim());
    const sharedKeys = keptSharedVars.map(({ key }) => key.trim());
    setEnvVars([
      ...keptEnvVars,
      ...(preset?.variables ?? [])
        .filter(({ key }) => !envKeys.includes(key))
        .map(({ key, value }) => ({
          id: crypto.randomUUID(),
          key,
          value: value ?? generatePassword(),
          scope: "runtime" as const,
          isSecret: value === null,
          note,
          preset: preset?.image,
        })),
    ]);
    setSharedVars([
      ...keptSharedVars,
      ...(preset?.sharedVariables ?? [])
        .filter(({ key }) => !sharedKeys.includes(key))
        .map(({ key, template }) => ({ uid: crypto.randomUUID(), key, template, note, preset: preset?.image })),
    ]);
  };

  const handleSourceTypeChange = (type: ServiceSourceType) => {
    applyPreset("");
    setSourceType(type);
    setRepository("");
    setBranch(type === "dockerhub" ? "latest" : "");
  };

  const cleanPorts = ports
    .filter(p => p.external !== "" && p.internal !== "")
    .map(p => ({
      external: Number(p.external),
      internal: Number(p.internal),
    }));

  const cleanEnvVars = envVars
    .filter(e => e.key.trim() !== "")
    .map(e => ({
      key: e.key.trim(),
      value: e.value,
      scope: e.scope,
      isSecret: e.isSecret,
    }));

  const cleanSharedVars = sharedVars
    .filter(v => v.key.trim() !== "")
    .map(v => ({ key: v.key.trim(), template: v.template }));

  const sharedSource: SharedVariableSource = {
    host: previewHost,
    variables: cleanEnvVars.map(variable => ({
      ...variable,
      // Services without a build step only have runtime variables
      scope: sourceType === "github" ? variable.scope : "runtime",
      // Secrets are masked in the preview
      value: variable.isSecret ? null : variable.value,
    })),
  };

  const cleanVolumes = volumes
    .filter(v => v.containerPath.trim() !== "")
    .map(v => ({
      name: (v.name ?? "").trim(),
      containerPath: v.containerPath.trim(),
    }));

  // Validation errors are in upper case
  const messages = {
    create_failed: t("messages.create_failed"),
    SERVICE_NAME_REQUIRED: t("messages.service_name_required"),
    REPOSITORY_REQUIRED: t("messages.repository_required"),
    BRANCH_REQUIRED: t("messages.branch_required"),
    INVALID_PORTS: t("messages.invalid_ports"),
    INVALID_ENVIRONMENT_VARIABLES: t("messages.invalid_environment_variables"),
    INVALID_VOLUMES: t("messages.invalid_volumes"),
    VOLUME_NAME_REQUIRED: t("messages.volume_name_required"),
    INVALID_VOLUME_NAME: t("messages.invalid_volume_name"),
    INTERNET_ACCESS_REQUIRED: t("messages.internet_access_required"),
    INVALID_SHARED_VARIABLES: t("messages.invalid_shared_variables"),
    DUPLICATE_SHARED_VARIABLES: t("messages.duplicate_shared_variables"),
  };

  return (
    <Form
      action={action}
      messages={messages}
      className="flex flex-col gap-8 w-full max-w-4xl"
    >
      <input type="hidden" name="type" value={sourceType} />
      <input type="hidden" name="repository" value={repository} />
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="ports" value={JSON.stringify(cleanPorts)} />
      <input type="hidden" name="environmentVariables" value={JSON.stringify(cleanEnvVars)} />
      <input type="hidden" name="volumes" value={JSON.stringify(cleanVolumes)} />
      <input type="hidden" name="sharedVariables" value={JSON.stringify(cleanSharedVars)} />
      {/* Source Selection Card */}
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("sourceSection.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("sourceSection.description")}</p>
        </div>
        {/* Source Toggle */}
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => handleSourceTypeChange("github")}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-all",
              sourceType === "github"
                ? "border-sky-500 bg-sky-500/10 text-sky-300 shadow-xs"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200",
            )}
          >
            <FontAwesomeIcon icon={faGithub} className="size-4" />
            <span>{t("sourceSection.github")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSourceTypeChange("dockerhub")}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-all",
              sourceType === "dockerhub"
                ? "border-sky-500 bg-sky-500/10 text-sky-300 shadow-xs"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200",
            )}
          >
            <FontAwesomeIcon icon={faDocker} className="size-4" />
            <span>{t("sourceSection.dockerhub")}</span>
          </button>
        </div>
        {/* Source Pickers */}
        <div className="pt-2">
          {sourceType === "github" ? (
            <GitHubSourcePicker
              selectedRepo={repository}
              selectedBranch={branch}
              onSelectRepo={(repo, defaultBranch) => {
                setRepository(repo);
                setBranch(defaultBranch);
              }}
              onSelectBranch={b => setBranch(b)}
            />
          ) : (
            <DockerHubSourcePicker
              selectedImage={repository}
              selectedTag={branch}
              onSelectImage={img => {
                applyPreset(img);
                setRepository(img);
              }}
              onSelectTag={tag => setBranch(tag)}
            />
          )}
        </div>
      </Card>
      {/* General Settings Card */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("generalSection.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("generalSection.nameHelp")}</p>
        </div>
        <div className="space-y-1.5 max-w-lg">
          <Label htmlFor={nameInputId}>
            {t("generalSection.nameLabel")}
            {" "}
            <span className="text-rose-400">*</span>
          </Label>
          <Input
            id={nameInputId}
            name="name"
            required
            placeholder={t("generalSection.namePlaceholder")}
          />
        </div>
      </Card>
      {/* Internet Access Section */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            {t("internetSection.title")}
            {" "}
            <span className="text-rose-400">*</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">{t("internetSection.description")}</p>
        </div>
        <InternetAccessChoice value={internetAccess} onChange={setInternetAccess} />
      </Card>
      {/* Port Mappings Section */}
      <PortMappingsRepeater
        items={ports}
        onChange={setPorts}
        labels={labels.ports}
      />
      {/* Environment Variables Section */}
      <EnvironmentVariablesRepeater
        items={envVars}
        onChange={setEnvVars}
        hasBuild={sourceType === "github"}
        labels={labels.env}
      />
      {/* Shared Variables Section */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("sharedSection.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("sharedSection.description")}</p>
        </div>
        <SharedVariablesRepeater items={sharedVars} onChange={setSharedVars} source={sharedSource} />
      </Card>
      {/* Volume Mounts Section */}
      <VolumeMountsRepeater
        items={volumes}
        onChange={setVolumes}
        labels={labels.volumes}
      />
      {/* Form Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <Link href="/services">
          <Button type="button" variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-slate-200">
            <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
            <span>{t("back")}</span>
          </Button>
        </Link>
        <Button type="submit" variant="primary" size="md" className="gap-2">
          <FontAwesomeIcon icon={faPlus} className="size-3.5" />
          <span>{t("submit")}</span>
        </Button>
      </div>
    </Form>
  );
};

export default NewServiceForm;
