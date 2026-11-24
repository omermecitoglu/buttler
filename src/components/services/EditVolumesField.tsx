"use client";

import { useState } from "react";
import VolumeMountsRepeater, { type VolumeMountItem } from "~/components/services/VolumeMountsRepeater";
import useServiceFormLabels from "~/components/services/useServiceFormLabels";

export type EditVolumesFieldProps = {
  volumes: { id: string, name: string, containerPath: string }[],
};

const EditVolumesField = ({ volumes }: EditVolumesFieldProps) => {
  const labels = useServiceFormLabels();
  const [items, setItems] = useState<VolumeMountItem[]>(() => volumes.map(({ id, name, containerPath }) => ({
    id,
    name,
    containerPath,
  })));

  const value = items
    .filter(item => item.containerPath.trim() !== "")
    .map(item => ({ name: (item.name ?? "").trim(), containerPath: item.containerPath.trim() }));

  return (
    <>
      <input type="hidden" name="volumes" value={JSON.stringify(value)} />
      <VolumeMountsRepeater items={items} onChange={setItems} labels={labels.volumes} />
    </>
  );
};

export default EditVolumesField;
