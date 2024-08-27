import z from "zod";

const EnvSchema = z.object({
  CURRENT_WORKING_DIRECTORY: z.string().default(process.cwd()),
});

const env = EnvSchema.parse(process.env);

export default env;
