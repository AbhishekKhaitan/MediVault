// One-time migration runner — run with: node run-migrations.js YOUR_DB_PASSWORD
// Two-pass approach: creates all tables first, then all RLS policies.
// This avoids cross-table policy references failing before tables exist.

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const password = process.argv[2]
if (!password) {
  console.error('Usage: node run-migrations.js YOUR_DB_PASSWORD')
  process.exit(1)
}

const migrations = [
  '001_families.sql',
  '002_family_members.sql',
  '003_documents.sql',
  '004_health_metrics.sql',
  '005_medications.sql',
  '006_medication_logs.sql',
  '007_emergency_access_logs.sql',
  '008_push_tokens.sql',
]

// Split a SQL file into non-policy statements and policy statements
function splitSql(sql) {
  const statements = sql
    .split(/;/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';')

  const schema = statements.filter(s => !/create\s+policy/i.test(s))
  const policies = statements.filter(s => /create\s+policy/i.test(s))
  return { schema, policies }
}

async function run() {
  const client = new Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.cdvxkousmrwmhbfzxjpj.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('✓ Connected to Supabase\n')

  const allSchema = []
  const allPolicies = []

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join('supabase', 'migrations', file), 'utf8')
    const { schema, policies } = splitSql(sql)
    allSchema.push({ file, statements: schema })
    allPolicies.push({ file, statements: policies })
  }

  // ── Pass 1: tables, indexes, alter table ─────────────────────────────────
  console.log('Pass 1 — creating tables and indexes:')
  for (const { file, statements } of allSchema) {
    process.stdout.write(`  ${file}... `)
    let ok = 0
    for (const stmt of statements) {
      try {
        await client.query(stmt)
        ok++
      } catch (err) {
        if (/already exists|duplicate/i.test(err.message)) {
          ok++
        } else {
          console.error(`\n  ✗ Error in ${file}:\n    ${stmt.slice(0, 80)}\n    ${err.message}`)
          await client.end()
          process.exit(1)
        }
      }
    }
    console.log(`✓ (${ok} statements)`)
  }

  // ── Pass 2: RLS policies ──────────────────────────────────────────────────
  console.log('\nPass 2 — applying RLS policies:')
  for (const { file, statements } of allPolicies) {
    if (statements.length === 0) continue
    process.stdout.write(`  ${file}... `)
    let ok = 0
    for (const stmt of statements) {
      try {
        await client.query(stmt)
        ok++
      } catch (err) {
        if (/already exists|duplicate/i.test(err.message)) {
          ok++
        } else {
          console.error(`\n  ✗ Error in ${file}:\n    ${stmt.slice(0, 80)}\n    ${err.message}`)
          await client.end()
          process.exit(1)
        }
      }
    }
    console.log(`✓ (${ok} policies)`)
  }

  // ── Storage bucket + policies ─────────────────────────────────────────────
  console.log('\nSetting up storage:')
  const storageSql = [
    `INSERT INTO storage.buckets (id, name, public)
     VALUES ('documents', 'documents', false)
     ON CONFLICT (id) DO NOTHING;`,

    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Family members can upload documents') THEN
         CREATE POLICY "Family members can upload documents"
         ON storage.objects FOR INSERT
         WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
       END IF;
     END$$;`,

    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Family members can read their documents') THEN
         CREATE POLICY "Family members can read their documents"
         ON storage.objects FOR SELECT
         USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
       END IF;
     END$$;`,

    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Family members can delete their documents') THEN
         CREATE POLICY "Family members can delete their documents"
         ON storage.objects FOR DELETE
         USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
       END IF;
     END$$;`,
  ]

  for (const stmt of storageSql) {
    try {
      await client.query(stmt)
    } catch (err) {
      console.log('  Storage note:', err.message)
    }
  }
  console.log('  ✓ Storage bucket + policies')

  await client.end()
  console.log('\n✅ All done! Run the app with: npm start')
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
