"use client";
import Input from "@omer-x/bs-ui-kit/form/Input";
import Select from "@omer-x/bs-ui-kit/form/Select";
import React, { useState } from "react";
import type { ServiceDTO } from "~/models/service";

type ServiceFormProps = {
  data?: ServiceDTO,
};

const ServiceForm = ({
  data,
}: ServiceFormProps) => {
  const [kind, setKind] = useState<ServiceDTO["kind"]>(data?.kind ?? "git");

  const dbEngineName = (engine: "mysql" | "postgres" | "mongo" | "redis") => {
    switch (engine) {
      case "postgres": return "PostgreSQL";
      case "mysql": return "MySQL";
      case "mongo": return "MongoDB";
      case "redis": return "Redis";
    }
  };

  return (
    <>
      {!data && (
        <Select
          label="Type"
          name="kind"
          options={[
            "git",
            "database",
          ]}
          optionName={option => (option === "git" ? "Custom" : "Database")}
          value={kind}
          onChange={setKind}
        />
      )}
      <Input
        label="Name"
        name="name"
        required
        autoFocus
        defaultValue={data?.name}
      />
      {(kind === "git" || !!data) && (
        <Input
          label="Repository"
          name="repo"
          required
          defaultValue={data?.repo}
          readOnly={(data?.repo ?? "").length > 0}
        />
      )}
      {kind === "database" && !data && (
        <Select
          label="Engine"
          name="repo"
          options={[
            "postgres",
            // "mysql",
            // "mongo",
            // "redis",
          ]}
          optionName={dbEngineName}
        />
      )}
    </>
  );
};

export default ServiceForm;
