"use server";
import { redirect } from "next/navigation";
import { removeImage } from "~/core/docker";
import db from "~/database";
import deleteBuildImage from "~/operations/deleteBuildImage";

export async function destroy(id: string, _: FormData) {
  const serviceId = await db.transaction(async tx => {
    await removeImage(id);
    const image = await deleteBuildImage(tx, id);
    if (!image) throw new Error("Invalid Build Image");
    return image.serviceId;
  });
  redirect(`/services/${serviceId}`);
}
