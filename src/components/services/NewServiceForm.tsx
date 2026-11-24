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
import PortMappingsRepeater, {
  type PortMappingItem,
} from "~/components/services/PortMappingsRepeater";
import VolumeMountsRepeater, {
  type VolumeMountItem,
} from "~/components/services/VolumeMountsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { Link } from "~/i18n/navigation";

export type NewServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
};

type ServiceSourceType = "github" | "dockerhub";

const NewServiceForm = ({ action }: NewServiceFormProps) => {
  const t = useTranslations("NewServicePage");
  const labels = useServiceFormLabels();

  const [sourceType, setSourceType] = useState<ServiceSourceType>("github");
  const [repository, setRepository] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [ports, setPorts] = useState<PortMappingItem[]>([]);
  const [envVars, setEnvVars] = useState<EnvironmentVariableItem[]>([]);
  const [volumes, setVolumes] = useState<VolumeMountItem[]>([]);

  const nameInputId = useId();

  const handleSourceTypeChange = (type: ServiceSourceType) => {
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

  const cleanVolumes = volumes
    .filter(v => v.containerPath.trim() !== "")
    .map(v => ({
      name: (v.name ?? "").trim(),
      containerPath: v.containerPath.trim(),
    }));

  const messages = {
    create_failed: t("messages.create_failed"),
    service_name_required: t("messages.service_name_required"),
    repository_required: t("messages.repository_required"),
    branch_required: t("messages.branch_required"),
    invalid_ports: t("messages.invalid_ports"),
    invalid_environment_variables: t("messages.invalid_environment_variables"),
    invalid_volumes: t("messages.invalid_volumes"),
    volume_name_required: t("messages.volume_name_required"),
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
              onSelectImage={img => setRepository(img)}
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
