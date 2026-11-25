import { redirect } from "next/navigation";
import { getSession } from "~/core/session";
import { isSetupCode } from "~/core/setup-code";

/** The link that is printed while Buttler starts. The code must not stay in the address bar. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code === null || !isSetupCode(code)) return redirect("/install");
  const session = await getSession();
  session.setupCode = code;
  await session.save();
  return redirect("/install");
}
