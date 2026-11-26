import { useTranslations } from "next-intl";

/** Labels of the sections that are shared by the forms of services */
export default function useServiceFormLabels() {
  const t = useTranslations("NewServicePage");

  return {
    ports: {
      title: t("portsSection.title"),
      description: t("portsSection.description"),
      addButton: t("portsSection.addButton"),
      removeButton: t("portsSection.removeButton"),
      hostPortLabel: t("portsSection.hostPortLabel"),
      hostPortPlaceholder: t("portsSection.hostPortPlaceholder"),
      containerPortLabel: t("portsSection.containerPortLabel"),
      containerPortPlaceholder: t("portsSection.containerPortPlaceholder"),
      emptyMessage: t("portsSection.emptyMessage"),
    },
    env: {
      title: t("envSection.title"),
      description: t("envSection.description"),
      addButton: t("envSection.addButton"),
      copyButton: t("envSection.copyButton"),
      copiedButton: t("envSection.copiedButton"),
      clearButton: t("envSection.clearButton"),
      pasteButton: t("envSection.pasteButton"),
      pasteInvalidMessage: t("envSection.pasteInvalidMessage"),
      pasteFailedMessage: t("envSection.pasteFailedMessage"),
      removeButton: t("envSection.removeButton"),
      keyLabel: t("envSection.keyLabel"),
      keyPlaceholder: t("envSection.keyPlaceholder"),
      valueLabel: t("envSection.valueLabel"),
      valuePlaceholder: t("envSection.valuePlaceholder"),
      scopeLabel: t("envSection.scopeLabel"),
      scopes: {
        build: t("envSection.scopes.build"),
        runtime: t("envSection.scopes.runtime"),
        both: t("envSection.scopes.both"),
      },
      scopeHelp: t("envSection.scopeHelp"),
      secretLabel: t("envSection.secretLabel"),
      emptyMessage: t("envSection.emptyMessage"),
    },
    volumes: {
      title: t("volumesSection.title"),
      description: t("volumesSection.description"),
      addButton: t("volumesSection.addButton"),
      removeButton: t("volumesSection.removeButton"),
      containerPathLabel: t("volumesSection.containerPathLabel"),
      containerPathPlaceholder: t("volumesSection.containerPathPlaceholder"),
      volumeNameLabel: t("volumesSection.volumeNameLabel"),
      volumeNamePlaceholder: t("volumesSection.volumeNamePlaceholder"),
      emptyMessage: t("volumesSection.emptyMessage"),
    },
  };
}
