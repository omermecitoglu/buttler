import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { users } from "~/database/schema/users";
import type z from "zod";

const sharedRefinements = createSharedRefinements(users, {
  id: schema => schema.describe("GitHub user ID"),
  login: schema => schema.describe("GitHub handle of the user, when it was last seen"),
  avatar: schema => schema.describe("URL of the avatar"),
  role: schema => schema.describe("Role of the user on this instance"),
  createdAt: schema => schema.readonly().describe("Creation date of the user as an ISO 8601 date string"),
});

export const UserDTO = createSelectSchema(users, sharedRefinements)
  .describe("Represents a person who has access to the instance");

export const NewUserDTO = createInsertSchema(users, sharedRefinements).omit({
  role: true,
  createdAt: true,
}).describe("Data Transfer Object for giving someone access to the instance");

export type UserDTO = z.infer<typeof UserDTO>;
export type NewUserDTO = z.infer<typeof NewUserDTO>;
export type UserRole = UserDTO["role"];
