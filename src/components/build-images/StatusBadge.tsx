"use client";
import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import type { BuildImageDTO } from "~/models/build-image";

type StatusBadgeProps = {
  status: BuildImageDTO["status"] | "active",
  errorCode: BuildImageDTO["errorCode"],
};

const StatusBadge = ({
  status,
  errorCode,
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

  const getErrorMessage = (code: BuildImageDTO["errorCode"]) => {
    switch (code) {
      case "REPO_NOT_FOUND":
        return "Please make sure you have the correct access rights and the repository exists.";
      case "BUILD_FAILED":
        return "Build was failed.";
      default:
        return "Unknown error";
    }
  };

  const badge = (
    <Badge bg={getVariant()} text={getVariant() === "warning" ? "dark" : "light"}>
      {status.toUpperCase()}
    </Badge>
  );

  if (status === "failed") {
    return (
      <OverlayTrigger placement="top" overlay={props => <Tooltip {...props}>{getErrorMessage(errorCode)}</Tooltip>}>
        {badge}
      </OverlayTrigger>
    );
  }

  return badge;
};

export default StatusBadge;
