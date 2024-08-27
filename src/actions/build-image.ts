"use server";
import db from "~/database";
import deleteBuildImage from "~/operations/deleteBuildImage";

export async function destroy(id: string, _: FormData) {
  await deleteBuildImage(db, id);
}
