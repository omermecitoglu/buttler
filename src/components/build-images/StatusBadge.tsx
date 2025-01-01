import Badge from "react-bootstrap/Badge";
import type { BuildImageDTO } from "~/models/build-image";

type StatusBadgeProps = {
  status: BuildImageDTO["status"] | "active",
};

const StatusBadge = ({
  status,
}: StatusBadgeProps) => {
  const getVariant = () => {
    switch (status) {
      case "pending": return "warning";
      case "canceled": return "secondary";
      case "failed": return "danger";
      case "ready": return "primary";
      case "active": return "success";
    }
  };
  return (
    <Badge bg={getVariant()} text={getVariant() === "warning" ? "dark" : "light"}>
      {status.toUpperCase()}
    </Badge>
  );
};

export default StatusBadge;
