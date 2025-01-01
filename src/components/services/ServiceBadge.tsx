import React from "react";
import Badge from "react-bootstrap/Badge";
import type { ServiceDTO } from "~/models/service";

type ServiceBadgeProps = {
  status: ServiceDTO["status"],
};

const ServiceBadge = ({
  status,
}: ServiceBadgeProps) => {
  const getVariant = () => {
    switch (status) {
      case "idle": return "secondary";
      case "running": return "success";
    }
  };
  return (
    <Badge bg={getVariant()}>
      {status.toUpperCase()}
    </Badge>
  );
};

export default ServiceBadge;
