"use client";

import { faDocker } from "@fortawesome/free-brands-svg-icons/faDocker";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useId, useState } from "react";
import DockerHubSourcePicker from "~/components/services/DockerHubSourcePicker";
import EnvironmentVariablesRepeater, {
  type EnvironmentVariableItem,
  type EnvironmentVariablesRepeaterLabels,
} from "~/components/services/EnvironmentVariablesRepeater";
import GitHubSourcePicker from "~/components/services/GitHubSourcePicker";
import PortMappingsRepeater, {
  type PortMappingItem,
  type PortMappingsRepeaterLabels,
} from "~/components/services/PortMappingsRepeater";
import VolumeMountsRepeater, {
  type VolumeMountItem,
  type VolumeMountsRepeaterLabels,
} from "~/components/services/VolumeMountsRepeater";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { Link } from "~/i18n/navigation";

export type NewServiceFormLabels = {
  sourceSection: {
    title: string,
    description: string,
    github: string,
    dockerhub: string,
  },
  generalSection: {
    title: string,
    nameLabel: string,
    namePlaceholder: string,
    nameHelp: string,
  },
  portsSection: PortMappingsRepeaterLabels,
  envSection: EnvironmentVariablesRepeaterLabels,
  volumesSection: VolumeMountsRepeaterLabels,
  submit: string,
  submitting: string,
  back: string,
  messages: Record<string, string>,
};

export type NewServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  labels: NewServiceFormLabels,
};

type ServiceSourceType = "github" | "dockerhub";

const NewServiceForm = ({
  action,
  labels,
}: NewServiceFormProps) => {
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
    }));

  const cleanVolumes = volumes
    .filter(v => v.containerPath.trim() !== "")
    .map(v => ({
      name: (v.name ?? "").trim(),
      containerPath: v.containerPath.trim(),
    }));

  return (
    <Form
      action={action}
      messages={labels.messages}
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
          <h2 className="text-base font-semibold text-slate-100">{labels.sourceSection.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{labels.sourceSection.description}</p>
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
            <span>{labels.sourceSection.github}</span>
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
            <span>{labels.sourceSection.dockerhub}</span>
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
              onSelectTag={t => setBranch(t)}
            />
          )}
        </div>
      </Card>
      {/* General Settings Card */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{labels.generalSection.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{labels.generalSection.nameHelp}</p>
        </div>
        <div className="space-y-1.5 max-w-lg">
          <Label htmlFor={nameInputId}>
            {labels.generalSection.nameLabel}
            {" "}
            <span className="text-rose-400">*</span>
          </Label>
          <Input
            id={nameInputId}
            name="name"
            required
            placeholder={labels.generalSection.namePlaceholder}
          />
        </div>
      </Card>
      {/* Port Mappings Section */}
      <PortMappingsRepeater
        items={ports}
        onChange={setPorts}
        labels={labels.portsSection}
      />
      {/* Environment Variables Section */}
      <EnvironmentVariablesRepeater
        items={envVars}
        onChange={setEnvVars}
        labels={labels.envSection}
      />
      {/* Volume Mounts Section */}
      <VolumeMountsRepeater
        items={volumes}
        onChange={setVolumes}
        labels={labels.volumesSection}
      />
      {/* Form Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <Link href="/services">
          <Button type="button" variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-slate-200">
            <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
            <span>{labels.back}</span>
          </Button>
        </Link>
        <Button type="submit" variant="primary" size="md" className="gap-2">
          <FontAwesomeIcon icon={faPlus} className="size-3.5" />
          <span>{labels.submit}</span>
        </Button>
      </div>
    </Form>
  );
};

export default NewServiceForm;
