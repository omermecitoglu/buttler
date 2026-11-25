"use client";

import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type DomainActionFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  label: string,
  pendingLabel: string,
};

/** The result of the action is in the status of the domain */
const DomainActionForm = ({ action, label, pendingLabel }: DomainActionFormProps) => {
  const [isPending, setIsPending] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsPending(true);
    try {
      return await action(state, formData);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form action={handleAction} className="gap-0">
      <Button type="submit" variant="outline" size="xs" pending={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
    </Form>
  );
};

export default DomainActionForm;
