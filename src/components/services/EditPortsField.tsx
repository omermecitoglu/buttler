"use client";

import { useState } from "react";
import PortMappingsRepeater, { type PortMappingItem } from "~/components/services/PortMappingsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";

export type EditPortsFieldProps = {
  ports: { external: number, internal: number }[],
};

const EditPortsField = ({ ports }: EditPortsFieldProps) => {
  const labels = useServiceFormLabels();
  const [items, setItems] = useState<PortMappingItem[]>(() => ports.map(({ external, internal }) => ({
    id: `saved-${external}`,
    external,
    internal,
  })));

  const value = items
    .filter(item => item.external !== "" && item.internal !== "")
    .map(item => ({ external: Number(item.external), internal: Number(item.internal) }));

  return (
    <>
      <input type="hidden" name="ports" value={JSON.stringify(value)} />
      <PortMappingsRepeater items={items} onChange={setItems} labels={labels.ports} />
    </>
  );
};

export default EditPortsField;
