import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Falls back to a placeholder so `prisma generate` (schema-only, no DB
// connection needed) works before .env is filled in. `prisma migrate`/`db push`
// will fail naturally with a connection error if DIRECT_URL/DATABASE_URL are
// still unset — that's the expected signal to fill in .env first.
const directUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgresql://placeholder/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: directUrl,
  },
});
