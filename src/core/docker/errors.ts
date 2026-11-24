export const NOT_MODIFIED = 304;
export const FORBIDDEN = 403;
export const NOT_FOUND = 404;
export const CONFLICT = 409;

export async function ignoreStatus(promise: Promise<unknown>, ...statusCodes: number[]) {
  try {
    await promise;
  } catch (error) {
    const { statusCode } = error as { statusCode?: number };
    if (!statusCode || !statusCodes.includes(statusCode)) throw error;
  }
}
