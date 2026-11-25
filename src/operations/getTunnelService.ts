import type database from "~/database";

export const TUNNEL_SERVICE_NAME = "Cloudflare Tunnel";

/** Returns the system service of cloudflared, which only exists while there is a tunnel */
export default function getTunnelService(db: typeof database) {
  return db.query.services.findFirst({
    where: {
      type: "system",
      name: TUNNEL_SERVICE_NAME,
    },
  });
}
