"use server";
import { redirect } from "next/navigation";
import { removeImage } from "~/core/docker";
import db from "~/database";
import deleteBuildImage from "~/operations/deleteBuildImage";

export async function destroy(id: string, _: FormData) {
  let serviceId: string = "";
  try {
    serviceId = await db.transaction(async tx => {
      await removeImage(id);
      const image = await deleteBuildImage(tx, id);
      if (!image) throw new Error("Invalid Build Image");
      return image.serviceId;
    });
  } catch (error) {
    if (error && typeof error === "object" && "message" in error && error.message === "Transaction function cannot return a promise") {
      // do nothing. This is a known bug in Drizzle ORM
      // Check https://github.com/omermecitoglu/buttler/issues/40
    } else {
      throw error;
    }
  }
  redirect(`/services/${serviceId}`);
}
