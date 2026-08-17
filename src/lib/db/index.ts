import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Helper to safely obtain db connection
const connectionString = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
if (connectionString) {
  pool = new Pool({ connectionString });
}

export { pool };
export const db = pool ? drizzle(pool, { schema }) : (null as any);
export * from "./schema";
