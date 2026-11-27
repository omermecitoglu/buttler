import { requireUser } from "~/core/auth";
import { SERVICE_RECIPE_FILE_NAME } from "~/core/service-recipe";
import db from "~/database";
import getServiceRecipe from "~/operations/getServiceRecipe";

/** Downloads the recipe of the services whose IDs are given as `id` parameters */
export async function GET(request: Request) {
  // The proxy doesn't cover the API routes
  await requireUser();

  const serviceIds = new URL(request.url).searchParams.getAll("id");
  const recipe = await getServiceRecipe(db, serviceIds);

  return new Response(JSON.stringify(recipe, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${SERVICE_RECIPE_FILE_NAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
