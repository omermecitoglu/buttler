"use client";

import { useTranslations } from "next-intl";
import EditPortsField from "~/components/services/EditPortsField";
import EditTextField from "~/components/services/EditTextField";
import EditVariablesField, { type SavedVariable } from "~/components/services/EditVariablesField";
import EditVolumesField from "~/components/services/EditVolumesField";

export type ServiceEdit =
  | { section: "name", name: string } |
  { section: "source", isGitHub: boolean, repository: string, branch: string } |
  { section: "ports", ports: { external: number, internal: number }[], exposedPorts: number[] } |
  { section: "variables", isGitHub: boolean, variables: SavedVariable[] } |
  { section: "volumes", volumes: { id: string, name: string, containerPath: string }[] };

export type EditServiceFieldsProps = {
  edit: ServiceEdit,
};

const EditServiceFields = ({ edit }: EditServiceFieldsProps) => {
  const t = useTranslations("ServicePage");

  switch (edit.section) {
    case "name":
      return <EditTextField name="name" label={t("edit.name")} defaultValue={edit.name} />;
    case "source":
      return (
        <>
          <EditTextField
            name="repository"
            label={edit.isGitHub ? t("info.repository") : t("info.image")}
            defaultValue={edit.repository}
          />
          <EditTextField
            name="branch"
            label={edit.isGitHub ? t("info.branch") : t("info.tag")}
            defaultValue={edit.branch}
          />
        </>
      );
    case "ports":
      return <EditPortsField ports={edit.ports} exposedPorts={edit.exposedPorts} />;
    case "variables":
      return <EditVariablesField variables={edit.variables} hasBuild={edit.isGitHub} />;
    case "volumes":
      return <EditVolumesField volumes={edit.volumes} />;
  }
};

export default EditServiceFields;
