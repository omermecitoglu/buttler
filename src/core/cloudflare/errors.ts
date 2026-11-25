/** The connection is missing, or Cloudflare doesn't accept it anymore. Only a new connection helps. */
export class CloudflareConnectionError extends Error {
  constructor(message = "Cloudflare is not connected") {
    super(message);
    this.name = "CloudflareConnectionError";
  }
}

export class CloudflareApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CloudflareApiError";
    this.status = status;
  }
}

// Next.js bundles have their own copies of the class
export function isCloudflareConnectionError(error: unknown): error is CloudflareConnectionError {
  return error instanceof Error && error.name === "CloudflareConnectionError";
}
