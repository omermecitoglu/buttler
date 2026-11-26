import z from "zod";

const EnvSchema = z.object({
  DEBUG_MODE: z.enum(["yes"]).optional(),
});

const env = EnvSchema.parse(process.env);

export default env;
