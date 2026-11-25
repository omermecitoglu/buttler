import { connection } from "next/server";
import { getInstanceId } from "~/core/reachability";
import { readSetupCode } from "~/core/setup-code";

/** Lets Buttler recognize itself behind the domain. It's public, but only exists during the setup. */
export async function GET() {
  await connection();
  if (readSetupCode() === null) return new Response(null, { status: 404 });
  return new Response(getInstanceId(), { headers: { "Cache-Control": "no-store" } });
}
