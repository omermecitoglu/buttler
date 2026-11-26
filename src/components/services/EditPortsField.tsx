"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useState } from "react";
import PortMappingsRepeater, { type PortMappingItem } from "~/components/services/PortMappingsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";
import Button from "~/components/ui/button";

export type EditPortsFieldProps = {
  ports: { external: number, internal: number }[],
  /** Ports that the image of the service exposes, they can be added with their container port */
  exposedPorts: number[],
};

const EditPortsField = ({ ports, exposedPorts }: EditPortsFieldProps) => {
  const labels = useServiceFormLabels();
  const t = useTranslations("NewServicePage.portsSection");
  const [items, setItems] = useState<PortMappingItem[]>(() => ports.map(({ external, internal }) => ({
    id: `saved-${external}`,
    external,
    internal,
  })));

  const value = items
    .filter(item => item.external !== "" && item.internal !== "")
    .map(item => ({ external: Number(item.external), internal: Number(item.internal) }));

  const unmappedPorts = exposedPorts.filter(port => !items.some(item => Number(item.internal) === port));

  const addExposedPort = (port: number) => {
    setItems([...items, { id: crypto.randomUUID(), external: "", internal: port }]);
  };

  return (
    <>
      <input type="hidden" name="ports" value={JSON.stringify(value)} />
      <PortMappingsRepeater items={items} onChange={setItems} labels={labels.ports} />
      {unmappedPorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">{t("exposedPortsLabel")}</span>
          {unmappedPorts.map(port => (
            <Button
              key={port}
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => addExposedPort(port)}
              aria-label={t("addExposedPort", { port })}
              className="gap-1.5 font-mono"
            >
              <FontAwesomeIcon icon={faPlus} className="size-3" />
              <span>{port}</span>
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

export default EditPortsField;
