import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getConfigs } from "./config";

type SessionData = {
  userId?: number,
  githubToken?: string,
};

export async function getSession() {
  const configs = await getConfigs();
  if (!configs.sessionCookieName) {
    throw new Error("Session cookie name is missing in the configurations!");
  }
  if (!configs.sessionPassword) {
    throw new Error("Session password is missing in the configurations!");
  }
  return await getIronSession<SessionData>(await cookies(), {
    cookieName: configs.sessionCookieName,
    password: configs.sessionPassword,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
}
