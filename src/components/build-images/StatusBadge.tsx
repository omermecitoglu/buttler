import Badge from "react-bootstrap/Badge";
import type { BuildImageDTO } from "~/models/build-image";
import type z from "zod";

type StatusBadgeProps = {
  status: z.infer<typeof BuildImageDTO>["status"] | "active",
};

const StatusBadge = ({
  status,
}: StatusBadgeProps) => {
  const getVariant = () => {
    switch (status) {
      case "pending": return "warning";
      case "canceled": return "secondary";
      case "failed": return "danger";
      case "ready": return "success";
      case "active": return "primary";
    }
  };
  return (
    <Badge bg={getVariant()} text={getVariant() === "warning" ? "dark" : "light"}>
      {status.toUpperCase()}
    </Badge>
  );
};

export default StatusBadge;
