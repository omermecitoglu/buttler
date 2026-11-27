export const BUTTLER_SERVICE_LABEL = "buttler.service-id";
export const BUTTLER_BRANCH_LABEL = "buttler.branch";
export const BUTTLER_COMMIT_LABEL = "buttler.commit";
export const BUTTLER_BUILT_AT_LABEL = "buttler.built-at";
/** Purpose of a network, the networks without it are not created by Buttler */
export const BUTTLER_NETWORK_LABEL = "buttler.network";
/** The tunnel that a cloudflared container runs */
export const BUTTLER_TUNNEL_LABEL = "buttler.tunnel-id";
/** The link that a network belongs to */
export const BUTTLER_LINK_LABEL = "buttler.link-id";
/** Volumes without it are not created by Buttler, creating a volume that already exists doesn't add it */
export const BUTTLER_VOLUME_LABEL = "buttler.volume";
