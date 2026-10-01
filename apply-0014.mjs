// One-off: directly apply 0014_thanks_reaction.sql and verify.
import pg from "pg";
import { readFile } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlText = await readFile("migrations/0014_thanks_reaction.sql", "utf8");

const client = new pg.Client({ connectionString });
await client.connect();

console.log("1. Running migration...");
await client.query(sqlText);
console.log("   OK");

console.log("2. Recording in _migrations...");
await client.query(`
  insert into _migrations (name) values ('0014_thanks_reaction.sql')
  on conflict (name) do nothing
`);
console.log("   OK");

console.log("3. Verifying constraint...");
const constraint = await client.query(`
  select pg_get_constraintdef(oid) as def
  from pg_constraint
  where conname = 'reactions_emoji_check'
`);
console.log(`   ${constraint.rows[0]?.def ?? "NOT FOUND"}`);

await client.end();
console.log("");
console.log("Done.");