#!/usr/bin/env node
/**
 * Supabase Data Ingestion Script — NPA Digital Twin
 * 
 * Reads all CSV files from /data and upserts them into Supabase.
 * Safe to run multiple times (idempotent via upsert).
 * 
 * Usage: node scripts/ingest-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables manually since this is a raw Node script
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.trim().split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BATCH_SIZE = 500;

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const rl = readline.createInterface({ input: createReadStream(filePath) });
    let headers = null;
    rl.on('line', (line) => {
      if (!headers) {
        headers = line.split(',').map(h => h.trim().replace(/\r/g, ''));
        return;
      }
      const values = [];
      let cur = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { values.push(cur); cur = ''; continue; }
        cur += ch;
      }
      values.push(cur.replace(/\r/g, ''));
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? null; });
      rows.push(row);
    });
    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

async function upsertBatch(table, rows, conflictCol) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictCol });
  if (error) {
    console.error(`  ❌ Error upserting into ${table}:`, error.message);
  }
}

async function ingestTable(fileName, tableName, conflictCol, transform = r => r) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) { console.log(`  ⚠️  ${fileName} not found, skipping.`); return; }
  console.log(`\n📥 Ingesting ${fileName} → ${tableName}...`);
  const rows = await parseCSV(filePath);
  console.log(`   ${rows.length} rows parsed.`);
  let processed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(transform);
    await upsertBatch(tableName, batch, conflictCol);
    processed += batch.length;
    process.stdout.write(`\r   ${processed}/${rows.length} rows upserted...`);
  }
  console.log(`\n   ✅ Done.`);
}

function coerceNumbers(row, fields) {
  const out = { ...row };
  fields.forEach(f => {
    if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
      out[f] = parseFloat(out[f]);
    }
  });
  return out;
}

async function main() {
  console.log('🚀 NPA Digital Twin — Supabase Ingestion Script');
  console.log('================================================');

  // 1. Assets
  await ingestTable('assets.csv', 'assets', 'asset_id');

  // 2. Sensor metadata
  await ingestTable('sensor_metadata.csv', 'sensor_metadata', 'sensor_id', row =>
    coerceNumbers(row, ['normal_min', 'normal_max', 'alarm_low', 'alarm_high', 'trip_low', 'trip_high'])
  );

  // 3. Maintenance history
  await ingestTable('maintenance_history.csv', 'maintenance_history', 'work_order_id', row =>
    coerceNumbers(row, ['labor_hours', 'downtime_hours', 'production_loss_bbl'])
  );

  // 4. Failure events
  await ingestTable('failure_events.csv', 'failure_events', 'failure_event_id', row =>
    coerceNumbers(row, ['production_loss_bbl', 'downtime_hours'])
  );

  // 5. Documents table
  await ingestTable('documents.csv', 'documents', 'document_id');

  // 6. Timeseries — streamed in large batches (3M+ rows)
  const tsPath = path.join(DATA_DIR, 'timeseries.csv');
  if (fs.existsSync(tsPath)) {
    console.log(`\n📥 Ingesting timeseries.csv → timeseries (streaming 3M+ rows)...`);
    console.log('   This may take several minutes...');
    const rows = await parseCSV(tsPath);
    console.log(`   ${rows.length} rows parsed.`);
    let processed = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        ...row,
        value: parseFloat(row.value),
      }));
      await upsertBatch('timeseries', batch, 'id');
      processed += batch.length;
      if (processed % 10000 === 0) {
        process.stdout.write(`\r   ${processed}/${rows.length} rows upserted...`);
      }
    }
    console.log(`\n   ✅ Timeseries done.`);
  } else {
    console.log('\n  ⚠️  timeseries.csv not found, skipping.');
  }

  console.log('\n\n✅ All ingestion complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
