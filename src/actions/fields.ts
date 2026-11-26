import "server-only";
import z from "zod";

/** A form field with a JSON value */
export function jsonField<T extends z.ZodType>(errorMessage: string, schema: T) {
  return z.string().transform((val, ctx): z.output<T> => {
    try {
      return schema.parse(JSON.parse(val || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: errorMessage });
      return z.NEVER;
    }
  });
}
