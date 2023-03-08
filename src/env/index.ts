import { config } from "dotenv";
import { z } from "zod";

config()

const envSchema = z.object({
  CLIENT_SECRET: z.string(),
  ID_CLIENT: z.string(),
  ACCESS_TOKEN: z.string(),
  NOTION_SECRET: z.string(),
  DATABASE_ID: z.string(),
  PORT: z.coerce.number().default(3333),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error(
    '😵😵😵 Oh no! Invalid environment variables!',
    _env.error.format(),
  )

  throw new Error('Invalid environment variables!')
}

export const env = _env.data