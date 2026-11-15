import { getLocale, getTranslations } from "next-intl/server";
import { createServiceAction } from "~/actions/service";
import NewServiceForm, { type NewServiceFormLabels } from "~/components/services/NewServiceForm";
import type { AppLocale } from "~/i18n/routing";

export default async function(_page: PageProps<"/[locale]/services/new">) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("NewServicePage"),
  ]);

  const labels: NewServiceFormLabels = {
    sourceSection: {
      title: t("sourceSection.title"),
      description: t("sourceSection.description"),
      github: t("sourceSection.github"),
      dockerhub: t("sourceSection.dockerhub"),
    },
    generalSection: {
      title: t("generalSection.title"),
      nameLabel: t("generalSection.nameLabel"),
      namePlaceholder: t("generalSection.namePlaceholder"),
      nameHelp: t("generalSection.nameHelp"),
    },
    portsSection: {
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
    envSection: {
      title: t("envSection.title"),
      description: t("envSection.description"),
      addButton: t("envSection.addButton"),
      removeButton: t("envSection.removeButton"),
      keyLabel: t("envSection.keyLabel"),
      keyPlaceholder: t("envSection.keyPlaceholder"),
      valueLabel: t("envSection.valueLabel"),
      valuePlaceholder: t("envSection.valuePlaceholder"),
      emptyMessage: t("envSection.emptyMessage"),
    },
    volumesSection: {
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
    submit: t("submit"),
    submitting: t("submitting"),
    back: t("back"),
    messages: {
      create_failed: t("messages.create_failed"),
      service_name_required: t("messages.service_name_required"),
      repository_required: t("messages.repository_required"),
      branch_required: t("messages.branch_required"),
      invalid_ports: t("messages.invalid_ports"),
      invalid_environment_variables: t("messages.invalid_environment_variables"),
      invalid_volumes: t("messages.invalid_volumes"),
      volume_name_required: t("messages.volume_name_required"),
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="pb-6 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
      </div>
      <NewServiceForm
        action={createServiceAction.bind(null, locale as AppLocale)}
        labels={labels}
      />
    </div>
  );
}
