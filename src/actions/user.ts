"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import z from "zod";
import { adminMiddleware } from "~/core/auth";
import { type GitHubAccount, findUser } from "~/core/github/users";
import { getSession } from "~/core/session";
import db from "~/database";
import type { UserDTO } from "~/models/user";
import createUser from "~/operations/createUser";
import deleteUser from "~/operations/deleteUser";

export const addUserAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    login: z.string().trim().transform(login => login.replace(/^@/, "")),
  }),
  action: ({ login }) => async (): Promise<Record<string, string>> => {
    const { githubToken } = await getSession();
    let user: GitHubAccount | null;
    try {
      user = await findUser(login, githubToken);
    } catch {
      return displayMessage("error", "github_unreachable");
    }
    if (!user) return displayMessage("error", "unknown_user");
    if (!await createUser(db, user)) return displayMessage("error", "already_added");
    refresh();
    return {};
  },
});

export const removeUserAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (userId: UserDTO["id"]): Promise<Record<string, string>> => {
    if (!await deleteUser(db, userId)) return displayMessage("error", "remove_failed");
    refresh();
    return {};
  },
});
