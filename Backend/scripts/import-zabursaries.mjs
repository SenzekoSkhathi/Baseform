import "dotenv/config";

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sourcePath = new URL('./../data/zabursaries-200.json', import.meta.url);

function parseClosingDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function summarizeText(value) {
  if (!value) {
    return null;
  }

  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return null;
  }

  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}...` : text;
}

function dedupeStrings(values) {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))];
}

async function main() {
  const raw = await readFile(sourcePath, 'utf8');
  const rows = JSON.parse(raw);

  const payload = rows.map((row) => {
    const applicationLinks = dedupeStrings(row.application_links);
    const externalApplicationUrl = applicationLinks.find((link) => !link.startsWith('mailto:')) ?? row.application_url ?? row.detail_page_url ?? null;
    const summarySource = [row.funding_value, row.eligibility_requirements, row.application_instructions]
      .filter(Boolean)
      .join(' ');

    return {
      title: row.title,
      provider: row.provider ?? null,
      description: summarizeText(summarySource || row.source_category),
      amount_per_year: null,
      minimum_aps: 0,
      closing_date: parseClosingDate(row.closing_date),
      application_url: externalApplicationUrl,
      provinces_eligible: ['All'],
      fields_of_study: dedupeStrings(row.study_fields),
      requires_financial_need: false,
      is_active: true,
    };
  });

  const batchSize = 50;
  const titles = payload.map((row) => row.title);

  for (let index = 0; index < titles.length; index += batchSize) {
    const batchTitles = titles.slice(index, index + batchSize);
    const { error } = await supabase.from('bursaries').delete().in('title', batchTitles);

    if (error) {
      throw new Error(`Failed to clear batch starting at row ${index + 1}: ${error.message}`);
    }
  }

  let processed = 0;

  for (let index = 0; index < payload.length; index += batchSize) {
    const batch = payload.slice(index, index + batchSize);
    const { error } = await supabase.from('bursaries').insert(batch);

    if (error) {
      throw new Error(`Failed to import batch starting at row ${index + 1}: ${error.message}`);
    }

    processed += batch.length;
    console.log(`Imported ${processed}/${payload.length}`);
  }

  console.log(`Finished importing ${payload.length} bursaries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});