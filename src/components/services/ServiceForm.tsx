import Input from "@omer-x/bs-ui-kit/form/Input";
import React from "react";
import type { ServiceDTO } from "~/models/service";
import type z from "zod";

type ServiceFormProps = {
  data?: z.infer<typeof ServiceDTO>,
};

const ServiceForm = ({
  data,
}: ServiceFormProps) => (
  <>
    <Input
      label="Name"
      name="name"
      required
      autoFocus
      defaultValue={data?.name}
    />
    <Input
      label="Git Repository"
      name="repo"
      required
      defaultValue={data?.repo}
    />
  </>
);

export default ServiceForm;
