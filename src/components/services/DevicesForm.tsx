"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";
import { DEVICE_KINDS, type DeviceKind } from "~/core/devices";

export type DevicesFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  devices: DeviceKind[],
  /** Without a container, the change applies when the service is started */
  hasContainer: boolean,
  /** A build or a pull replaces the container anyway */
  isBusy: boolean,
};

/** Tells when the change is applied to the container */
function getHelpKey(hasContainer: boolean, isBusy: boolean, recreate: boolean) {
  if (!hasContainer) return "onStart";
  if (isBusy) return "onDeploy";
  return recreate ? "now" : "onRestart";
}

const DevicesForm = ({ action, devices, hasContainer, isBusy }: DevicesFormProps) => {
  const t = useTranslations("ServicePage.settings.devices");
  const id = useId();
  // Controlled inputs, so they aren't reset when the action fails
  const [selected, setSelected] = useState<DeviceKind[]>(devices);
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canRecreate = hasContainer && !isBusy;

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = (kind: DeviceKind, checked: boolean) => {
    const next = new Set<DeviceKind>(selected);
    if (checked) next.add(kind);
    else next.delete(kind);
    setSelected([...next]);
  };

  const messages = {
    saved: t("messages.saved"),
    recreated: t("messages.recreated"),
    update_failed: t("messages.update_failed"),
    recreate_failed: t("messages.recreate_failed"),
    service_busy: t("messages.service_busy"),
    invalid_devices: t("messages.invalid_devices"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <input type="hidden" name="devices" value={JSON.stringify(DEVICE_KINDS.filter(kind => selected.includes(kind)))} />
      {DEVICE_KINDS.map(kind => (
        <div key={kind} className="flex items-start gap-2">
          <input
            id={`${id}-${kind}`}
            type="checkbox"
            checked={selected.includes(kind)}
            onChange={event => toggle(kind, event.target.checked)}
            disabled={isSaving}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
          />
          <div>
            <Label htmlFor={`${id}-${kind}`} className="font-normal tracking-normal normal-case">{t(`kinds.${kind}.label`)}</Label>
            <p className="mt-1 text-xs text-slate-500">{t(`kinds.${kind}.description`)}</p>
          </div>
        </div>
      ))}
      {canRecreate && (
        <div className="flex items-start gap-2">
          <input
            id={`${id}-recreate`}
            type="checkbox"
            name="recreate"
            checked={recreate}
            onChange={event => setRecreate(event.target.checked)}
            disabled={isSaving}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
          />
          <Label htmlFor={`${id}-recreate`} className="font-normal tracking-normal normal-case">{t("recreate")}</Label>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">{t(`help.${getHelpKey(hasContainer, isBusy, recreate)}`)}</p>
        <div className="ml-auto shrink-0">
          <Button type="submit" variant="primary" size="sm" pending={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default DevicesForm;
