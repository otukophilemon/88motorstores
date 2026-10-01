// One-off: directly apply 0013_garage_post_types.sql and verify.
import pg from "pg";
import { readFile } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlText = await readFile("migrations/0013_garage_post_types.sql", "utf8");

const client = new pg.Client({ connectionString });
await client.connect();

console.log("1. Running migration...");
await client.query(sqlText);
console.log("   OK");

console.log("2. Recording in _migrations...");
await client.query(`
  insert into _migrations (name) values ('0013_garage_post_types.sql')
  on conflict (name) do nothing
`);
console.log("   OK");

console.log("3. Verifying garage_posts.post_type...");
const ptCol = await client.query(`
  select column_name, data_type, column_default
  from information_schema.columns
  where table_name = 'garage_posts' and column_name = 'post_type'
`);
if (ptCol.rowCount !== 1) {
  console.error(`   FAIL - expected 1, found ${ptCol.rowCount}`);
  process.exit(1);
}
console.log(`   garage_posts.post_type → ${ptCol.rows[0].data_type} default ${ptCol.rows[0].column_default}`);

console.log("4. Verifying garage_comments.is_accepted...");
const iaCol = await client.query(`
  select column_name, data_type, column_default
  from information_schema.columns
  where table_name = 'garage_comments' and column_name = 'is_accepted'
`);
if (iaCol.rowCount !== 1) {
  console.error(`   FAIL - expected 1, found ${iaCol.rowCount}`);
  process.exit(1);
}
console.log(`   garage_comments.is_accepted → ${iaCol.rows[0].data_type} default ${iaCol.rows[0].column_default}`);

console.log("5. Verifying chat_messages table...");
const cmTable = await client.query(`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_name = 'chat_messages'
`);
if (cmTable.rowCount !== 1) {
  console.error(`   FAIL - expected 1, found ${cmTable.rowCount}`);
  process.exit(1);
}
console.log("   chat_messages exists");

console.log("6. Verifying chat_messages columns...");
const cmCols = await client.query(`
  select column_name, data_type
  from information_schema.columns
  where table_name = 'chat_messages'
  order by ordinal_position
`);
for (const c of cmCols.rows) {
  console.log(`   ${c.column_name}  →  ${c.data_type}`);
}

console.log("7. Verifying indexes...");
const idx = await client.query(`
  select indexname from pg_indexes
  where indexname in (
    'garage_posts_type_created_idx',
    'garage_comments_one_accepted_per_post_idx',
    'chat_messages_created_at_idx',
    'chat_messages_user_idx'
  )
`);
for (const i of idx.rows) console.log(`   ${i.indexname}`);
if (idx.rowCount !== 4) {
  console.error(`   FAIL - expected 4, found ${idx.rowCount}`);
  process.exit(1);
}

await client.end();
console.log("");
console.log("Done. Phase G6 migration applied.");