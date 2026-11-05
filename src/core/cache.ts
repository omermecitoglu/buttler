import "server-only";
import type { ServiceDTO } from "~/models/service";

/* service */

export function serviceIdsCT() {
  return "all-service-ids";
}

export function serviceCT(id: ServiceDTO["id"]) {
  return `service:${id}`;
}
