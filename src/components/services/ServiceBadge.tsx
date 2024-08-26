import React from "react";
import Badge from "react-bootstrap/Badge";
import type { ServiceDTO } from "~/models/service";
import type z from "zod";

type ServiceBadgeProps = {
  status: z.infer<typeof ServiceDTO>["status"],
};

const ServiceBadge = ({
  status,
}: ServiceBadgeProps) => {
  const getVariant = () => {
    switch (status) {
      case "idle": return "secondary";
      case "ready": return "success";
    }
  };
  return (
    <Badge bg={getVariant()}>
      {status.toUpperCase()}
    </Badge>
  );
};

export default ServiceBadge;
