import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SITE = 'https://www.zabursaries.co.za';
const TARGET_COUNT = 200;
const PER_PAGE_LIMIT = 25;

const categoryPages = [
  { field: 'Accounting', url: `${SITE}/accounting-bursaries-south-africa/` },
  { field: 'Arts', url: `${SITE}/music-and-performing-arts-bursaries-south-africa/` },
  { field: 'Commerce', url: `${SITE}/commerce-bursaries-south-africa/` },
  { field: 'Computer Science & IT', url: `${SITE}/computer-science-it-bursaries-south-africa/` },
  { field: 'Construction & Built Environment', url: `${SITE}/construction-and-built-environment-bursaries-south-africa/` },
  { field: 'Education', url: `${SITE}/education-bursaries-south-africa/` },
  { field: 'Engineering', url: `${SITE}/engineering-bursaries-south-africa/` },
  { field: 'General', url: `${SITE}/general-bursaries-south-africa/` },
  { field: 'Government', url: `${SITE}/government-bursaries-south-africa/` },
  { field: 'International', url: `${SITE}/international-scholarships-bursaries-south-africa/` },
  { field: 'Law', url: `${SITE}/law-bursaries-south-africa/` },
  { field: 'Postgraduate', url: `${SITE}/mba-postgraduate/` },
  { field: 'Medical', url: `${SITE}/medical-bursaries-south-africa/` },
  { field: 'NSFAS', url: `${SITE}/nsfas-funding/` },
  { field: 'Science', url: `${SITE}/science-bursaries-south-africa/` },
];

const bursaryTitlePattern = /\b(bursary|scholarship|fellowship|grant|fund|loan|programme|program|trust)\b/i;
const skipPathPattern = /\/(?:page|tag|category|wp-content|wp-json|author|feed|comments|privacy-policy-2|contact|about|terms|sitemap)(?:\/|$)/i;

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-');
}

function stripHtml(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function htmlToLines(html) {
  return decodeHtmlEntities(
    html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|section|article|h1|h2|h3|h4|h5|h6|li|tr|td|th|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractEmailsAndUrls(text) {
  const emails = new Set();
  const urls = new Set();

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    emails.add(match[0]);
  }

  for (const match of text.matchAll(/https?:\/\/[^\s)\]>'"]+/gi)) {
    urls.add(match[0].replace(/[.,;:]+$/g, ''));
  }

  return { emails: [...emails], urls: [...urls] };
}

function extractSection(lines, startPattern, endPattern) {
  const startIndex = lines.findIndex((line) => startPattern.test(line));
  if (startIndex < 0) {
    return [];
  }

  const endIndex = endPattern ? lines.slice(startIndex + 1).findIndex((line) => endPattern.test(line)) : -1;

  return lines.slice(startIndex + 1, endIndex >= 0 ? startIndex + 1 + endIndex : undefined);
}

function extractSectionText(lines, startPattern, endPattern) {
  return extractSection(lines, startPattern, endPattern).join(' ').replace(/\s+/g, ' ').trim();
}

function extractProvider(lines, fallbackTitle) {
  const providerLine = lines.find((line) => /ABOUT THE BURSARY PROVIDER/i.test(line));
  if (providerLine) {
    const parts = providerLine.split(/[-–]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts[parts.length - 1].replace(/^the\s+/i, '').trim();
    }
  }

  return fallbackTitle;
}

function extractClosingDate(lines) {
  const closingIndex = lines.findIndex((line) => /CLOSING DATE/i.test(line));
  if (closingIndex < 0) {
    return null;
  }

  const windowText = lines.slice(closingIndex, closingIndex + 4).join(' ');
  const dateMatch = windowText.match(/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/);
  return dateMatch ? dateMatch[0] : null;
}

function extractApplicationLinks(html, lines, detailUrl) {
  const sectionLines = extractSection(lines, /HOW TO APPLY/i, /CLOSING DATE/i);
  const sectionText = sectionLines.join(' ');
  const { emails, urls } = extractEmailsAndUrls(sectionText);
  const found = new Set();

  for (const email of emails) {
    found.add(`mailto:${email}`);
  }

  for (const url of urls) {
    try {
      const normalized = normalizeUrl(url);
      const parsed = new URL(normalized);
      if (!parsed.hostname.endsWith('zabursaries.co.za')) {
        found.add(normalized);
      }
    } catch {
      // Ignore malformed URLs.
    }
  }

  const rawStart = html.search(/HOW TO APPLY/i);
  const rawEnd = html.search(/CLOSING DATE/i);
  const rawSection = rawStart >= 0 ? html.slice(rawStart, rawEnd > rawStart ? rawEnd : undefined) : html;

  for (const match of rawSection.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!href.startsWith('http') && !href.startsWith('mailto:')) {
      continue;
    }

    try {
      const normalized = href.startsWith('mailto:') ? href : normalizeUrl(href);
      if (normalized.startsWith('mailto:')) {
        found.add(normalized);
        continue;
      }

      const parsed = new URL(normalized);
      if (!parsed.hostname.endsWith('zabursaries.co.za')) {
        found.add(normalized);
      }
    } catch {
      // Ignore malformed URLs.
    }
  }

  const applicationLinks = [...found].filter(Boolean);
  if (applicationLinks.length === 0) {
    applicationLinks.push(detailUrl);
  }

  return applicationLinks;
}

function extractEligibility(lines) {
  return extractSectionText(lines, /ELIGIBILITY REQUIREMENTS/i, /(HOW TO APPLY|CLOSING DATE|CONTACT THE)/i);
}

function extractFundingValue(lines) {
  const fundingPatterns = [
    /COVERAGE VALUE/i,
    /AWARD VALUE/i,
    /FUNDS COVERED/i,
    /WHAT DOES THE BURSARY COVER/i,
    /WHAT EXPENSES OR FEES DOES A BURSARY COVER/i,
  ];

  for (const pattern of fundingPatterns) {
    const value = extractSectionText(lines, pattern, /(ELIGIBILITY REQUIREMENTS|HOW TO APPLY|CLOSING DATE|CONTACT THE)/i);
    if (value) {
      return value;
    }
  }

  return null;
}

function extractApplicationInstructions(lines) {
  return extractSectionText(lines, /HOW TO APPLY/i, /(CLOSING DATE|CONTACT THE)/i);
}

function extractStudyFields(lines) {
  const sectionLines = extractSection(lines, /FIELDS COVERED/i, /(ELIGIBILITY REQUIREMENTS|HOW TO APPLY|CLOSING DATE)/i);
  const fields = [];

  for (const line of sectionLines) {
    const cleaned = line.replace(/^[■•\-*]+\s*/, '').trim();
    if (!cleaned) {
      continue;
    }

    if (
      cleaned.length <= 80
      && /[A-Za-z]/.test(cleaned)
      && !/^(view our other|related bursaries|bursaries will be awarded|www\.|about the|more about|eligibility requirements|how to apply|closing date|contact the)/i.test(cleaned)
    ) {
      if (!fields.includes(cleaned)) {
        fields.push(cleaned);
      }
    }

    if (fields.length >= 20) {
      break;
    }
  }

  return fields;
}

async function enrichRow(row) {
  const html = await fetchHtml(row.application_url);
  const lines = htmlToLines(html);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const applicationLinks = extractApplicationLinks(html, lines, row.application_url);

  row.title = h1Match ? stripHtml(h1Match[1]) : row.title;
  row.provider = extractProvider(lines, row.title);
  row.closing_date = extractClosingDate(lines);
  row.detail_page_url = row.application_url;
  row.application_links = applicationLinks;
  row.application_url = applicationLinks.find((link) => !link.startsWith('mailto:')) ?? row.detail_page_url;
  row.eligibility_requirements = extractEligibility(lines);
  row.funding_value = extractFundingValue(lines);
  row.application_instructions = extractApplicationInstructions(lines);
  row.study_fields = extractStudyFields(lines);
}

async function enrichRows(rows) {
  const concurrency = 6;
  let index = 0;

  async function worker() {
    while (index < rows.length) {
      const currentIndex = index;
      index += 1;
      await enrichRow(rows[currentIndex]);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

function normalizeUrl(input) {
  const url = new URL(input, SITE);
  url.protocol = 'https:';
  url.hash = '';
  url.search = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '/');
  }
  return url.toString();
}

function isLikelyBursaryUrl(url) {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('zabursaries.co.za')) {
    return false;
  }

  if (skipPathPattern.test(parsed.pathname)) {
    return false;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return false;
  }

  const slug = segments[1];
  return bursaryTitlePattern.test(slug.replace(/-/g, ' '));
}

function extractCandidates(html, baseUrl, field) {
  const candidates = [];
  const seenInPage = new Set();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const text = stripHtml(match[2]);

    if (!text || !bursaryTitlePattern.test(text)) {
      continue;
    }

    let resolvedUrl;
    try {
      resolvedUrl = normalizeUrl(href.startsWith('mailto:') ? href : new URL(href, baseUrl).toString());
    } catch {
      continue;
    }

    if (!isLikelyBursaryUrl(resolvedUrl)) {
      continue;
    }

    if (seenInPage.has(resolvedUrl)) {
      continue;
    }

    seenInPage.add(resolvedUrl);
    candidates.push({ title: text, url: resolvedUrl, field });

    if (candidates.length >= PER_PAGE_LIMIT) {
      break;
    }
  }

  return candidates;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; BaseformBursaryCollector/1.0)',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function toCsv(rows) {
  const headers = ['title', 'field', 'provider', 'closing_date', 'application_links', 'application_url', 'detail_page_url', 'source_page'];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push([
      escapeCell(row.title),
      escapeCell(row.field),
      escapeCell(row.provider),
      escapeCell(row.closing_date),
      escapeCell((row.application_links ?? []).join(' | ')),
      escapeCell(row.application_url),
      escapeCell(row.detail_page_url),
      escapeCell(row.source_page),
    ].join(','));
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const collected = new Map();

  for (const page of categoryPages) {
    const html = await fetchHtml(page.url);
    const candidates = extractCandidates(html, page.url, page.field);

    for (const candidate of candidates) {
      if (!collected.has(candidate.url)) {
        collected.set(candidate.url, {
          title: candidate.title,
          field: candidate.field,
          application_url: candidate.url,
          source_page: page.url,
          detail_page_url: candidate.url,
          provider: null,
          closing_date: null,
          application_links: [],
          study_fields: [],
          funding_value: null,
          eligibility_requirements: null,
          application_instructions: null,
        });
      } else {
        const existing = collected.get(candidate.url);
        if (existing && !existing.field.includes(candidate.field)) {
          existing.field = `${existing.field}; ${candidate.field}`;
        }
      }
    }
  }

  const rows = Array.from(collected.values()).slice(0, TARGET_COUNT);

  if (rows.length < TARGET_COUNT) {
    throw new Error(`Only collected ${rows.length} bursaries, expected at least ${TARGET_COUNT}`);
  }

  await enrichRows(rows);

  const outputDir = resolve('Backend', 'data');
  const jsonPath = resolve(outputDir, 'zabursaries-200.json');
  const csvPath = resolve(outputDir, 'zabursaries-200.csv');

  await mkdir(outputDir, { recursive: true });

  await writeFile(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  await writeFile(csvPath, toCsv(rows), 'utf8');

  console.log(`Wrote ${rows.length} bursaries to ${jsonPath}`);
  console.log(`Wrote ${rows.length} bursaries to ${csvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});