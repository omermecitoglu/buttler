import "server-only";
import type { ServiceDTO } from "~/models/service";

export function cacheTag(_tagName: string) {
  // this is a dummy cacheTag function because use cache was not stable yet when I was coding this
}

/* service */

export function serviceIdsCT() {
  return "all-service-ids";
}

export function serviceCT(id: ServiceDTO["id"]) {
  return `service:${id}`;
}
