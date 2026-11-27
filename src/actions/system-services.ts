"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import z from "zod";
import db from "~/database";
import setShowSystemServices from "~/operations/setShowSystemServices";
import { adminMiddleware } from "./middlewares/admin";

export const setShowSystemServicesAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    show: z.literal("on").optional(),
  }),
  action: ({ show }) => async (): Promise<Record<string, string>> => {
    await setShowSystemServices(db, show === "on");
    refresh();
    return displayMessage("success", "saved");
  },
});
