"use client";

import { useId, useState } from "react";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type EditTextFieldProps = {
  name: string,
  label: string,
  defaultValue: string,
};

const EditTextField = ({ name, label, defaultValue }: EditTextFieldProps) => {
  const id = useId();
  // Uncontrolled inputs are reset when the action fails
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} required value={value} onChange={e => setValue(e.target.value)} />
    </div>
  );
};

export default EditTextField;
