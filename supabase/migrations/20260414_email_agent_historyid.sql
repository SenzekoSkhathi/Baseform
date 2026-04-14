-- Store Gmail historyId per connection for incremental scanning.
-- Store email_domain per university so we can filter by sender domain (not subject).

-- historyId: lets the scanner fetch only emails added since the last run
ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS gmail_history_id text;

-- email_domain: the @domain.ac.za used in Gmail's from: filter
-- Null means fall back to subject-based matching for that university
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS email_domain text;

-- Seed known South African public university email domains.
-- These are matched case-insensitively against the abbreviation column.
UPDATE public.universities SET email_domain = 'uct.ac.za'       WHERE abbreviation ILIKE 'UCT';
UPDATE public.universities SET email_domain = 'wits.ac.za'      WHERE abbreviation ILIKE 'Wits' OR abbreviation ILIKE 'WITS';
UPDATE public.universities SET email_domain = 'up.ac.za'        WHERE abbreviation ILIKE 'UP' OR abbreviation ILIKE 'TukS';
UPDATE public.universities SET email_domain = 'sun.ac.za'       WHERE abbreviation ILIKE 'SU' OR abbreviation ILIKE 'Stell' OR abbreviation ILIKE 'Stellenbosch';
UPDATE public.universities SET email_domain = 'uj.ac.za'        WHERE abbreviation ILIKE 'UJ';
UPDATE public.universities SET email_domain = 'ukzn.ac.za'      WHERE abbreviation ILIKE 'UKZN';
UPDATE public.universities SET email_domain = 'uwc.ac.za'       WHERE abbreviation ILIKE 'UWC';
UPDATE public.universities SET email_domain = 'cput.ac.za'      WHERE abbreviation ILIKE 'CPUT';
UPDATE public.universities SET email_domain = 'dut.ac.za'       WHERE abbreviation ILIKE 'DUT';
UPDATE public.universities SET email_domain = 'tut.ac.za'       WHERE abbreviation ILIKE 'TUT';
UPDATE public.universities SET email_domain = 'unisa.ac.za'     WHERE abbreviation ILIKE 'UNISA';
UPDATE public.universities SET email_domain = 'mandela.ac.za'   WHERE abbreviation ILIKE 'NMU' OR abbreviation ILIKE 'NMMU';
UPDATE public.universities SET email_domain = 'ufs.ac.za'       WHERE abbreviation ILIKE 'UFS' OR abbreviation ILIKE 'UOVS';
UPDATE public.universities SET email_domain = 'nwu.ac.za'       WHERE abbreviation ILIKE 'NWU';
UPDATE public.universities SET email_domain = 'ul.ac.za'        WHERE abbreviation ILIKE 'UL' OR abbreviation ILIKE 'Limpopo';
UPDATE public.universities SET email_domain = 'ufh.ac.za'       WHERE abbreviation ILIKE 'UFH';
UPDATE public.universities SET email_domain = 'wsu.ac.za'       WHERE abbreviation ILIKE 'WSU';
UPDATE public.universities SET email_domain = 'uzulu.ac.za'     WHERE abbreviation ILIKE 'UZ' OR abbreviation ILIKE 'UNIZULU';
UPDATE public.universities SET email_domain = 'mut.ac.za'       WHERE abbreviation ILIKE 'MUT';
UPDATE public.universities SET email_domain = 'vut.ac.za'       WHERE abbreviation ILIKE 'VUT';
UPDATE public.universities SET email_domain = 'cut.ac.za'       WHERE abbreviation ILIKE 'CUT';
UPDATE public.universities SET email_domain = 'spu.ac.za'       WHERE abbreviation ILIKE 'SPU';
UPDATE public.universities SET email_domain = 'smu.ac.za'       WHERE abbreviation ILIKE 'SMU' OR abbreviation ILIKE 'Medunsa';
UPDATE public.universities SET email_domain = 'ru.ac.za'        WHERE abbreviation ILIKE 'RU' OR abbreviation ILIKE 'Rhodes';
UPDATE public.universities SET email_domain = 'univen.ac.za'    WHERE abbreviation ILIKE 'UNIVEN';
UPDATE public.universities SET email_domain = 'nsfas.org.za'    WHERE name ILIKE '%NSFAS%';
