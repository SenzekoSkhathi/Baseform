-- Seed bursaries data.
-- Table already exists with: id (bigint), title, provider, description,
-- amount_per_year, fields_of_study (array), provinces_eligible (array),
-- requires_financial_need, minimum_aps, application_url, closing_date, is_active.
--
-- Safe to re-run: deletes by title then re-inserts.

DELETE FROM public.bursaries WHERE title IN (
  'NSFAS Bursary',
  'Funza Lushaka Teaching Bursary',
  'DHET Artisan Development Bursary',
  'Telkom Bursary Programme',
  'Sasol Bursary Programme',
  'Eskom Bursary',
  'Anglo American Bursary',
  'Transnet Bursary Programme',
  'SAPPI Bursary Programme',
  'Nedbank Bursary',
  'Standard Bank Bursary Programme',
  'Old Mutual Bursary',
  'Sanlam Bursary Programme',
  'DAC Arts and Culture Bursary',
  'National Department of Health Bursary',
  'Law Society of South Africa Bursary'
);

INSERT INTO public.bursaries
  (title, provider, description, amount_per_year, minimum_aps, provinces_eligible,
   fields_of_study, requires_financial_need, application_url, closing_date, is_active)
VALUES

-- ── Government / National ─────────────────────────────────────────────────────

('NSFAS Bursary',
 'National Student Financial Aid Scheme',
 'Government bursary covering tuition, accommodation, meals, transport, and a personal care allowance for qualifying South African students from low-income households.',
 NULL, 0, '{"All"}', '{}', true,
 'https://www.nsfas.org.za', '2026-11-30', true),

('Funza Lushaka Teaching Bursary',
 'Department of Basic Education',
 'Full bursary for students studying towards a teaching qualification (BEd or PGCE) at a public South African university. Recipients must teach in a public school for the same number of years funded.',
 NULL, 0, '{"All"}', '{"Education"}', true,
 'https://www.funzalushaka.doe.gov.za', '2026-10-31', true),

('DHET Artisan Development Bursary',
 'Department of Higher Education and Training',
 'Bursary supporting students enrolled in artisan and technical trade qualifications at TVET colleges and universities of technology.',
 NULL, 0, '{"All"}', '{"Engineering","Technology"}', false,
 'https://www.dhet.gov.za', '2026-09-30', true),

-- ── Corporate / Professional ──────────────────────────────────────────────────

('Telkom Bursary Programme',
 'Telkom SA SOC',
 'Full bursary for South African citizens studying ICT, engineering, or related fields. Includes a work-back agreement — recipients work at Telkom after graduating.',
 NULL, 28, '{"All"}', '{"Engineering","Computer Science","Information Technology"}', false,
 'https://www.telkom.co.za/careers', '2026-08-31', true),

('Sasol Bursary Programme',
 'Sasol Limited',
 'Merit-based bursary for students studying chemical engineering, mechanical engineering, electrical engineering, or chemistry. Includes vacation work opportunities.',
 NULL, 30, '{"All"}', '{"Engineering","Chemistry"}', false,
 'https://www.sasol.com/careers', '2026-07-31', true),

('Eskom Bursary',
 'Eskom Holdings SOC',
 'Bursary for students studying electrical, mechanical, or civil engineering. Includes experiential learning at Eskom facilities.',
 NULL, 28, '{"All"}', '{"Engineering"}', false,
 'https://www.eskom.co.za/careers', '2026-09-30', true),

('Anglo American Bursary',
 'Anglo American South Africa',
 'STEM-focused bursary for students studying mining, geology, metallurgy, or engineering. Includes vacation work and mentorship.',
 NULL, 30, '{"Gauteng","Northern Cape","North West","Limpopo","Mpumalanga"}',
 '{"Engineering","Geology","Mining"}', false,
 'https://www.angloamerican.com/careers', '2026-08-31', true),

('Transnet Bursary Programme',
 'Transnet SOC',
 'Bursary for South African students studying engineering, logistics, supply chain, or IT. Includes vacation work placement at Transnet facilities.',
 NULL, 25, '{"All"}', '{"Engineering","Information Technology","Logistics"}', false,
 'https://www.transnet.net/careers', '2026-09-30', true),

('SAPPI Bursary Programme',
 'Sappi Limited',
 'Bursary for students in chemical engineering, mechanical engineering, paper science, or forestry at South African universities.',
 NULL, 28, '{"KwaZulu-Natal","Mpumalanga","Western Cape","Eastern Cape"}',
 '{"Engineering","Forestry","Environmental Science"}', false,
 'https://www.sappi.com/careers', '2026-08-31', true),

('Nedbank Bursary',
 'Nedbank Group',
 'Bursary for students studying finance, accounting, IT, actuarial science, or data science. Includes mentorship and possible employment on graduation.',
 NULL, 28, '{"All"}',
 '{"Finance","Accounting","Actuarial Science","Information Technology"}', false,
 'https://www.nedbank.co.za/careers', '2026-08-31', true),

('Standard Bank Bursary Programme',
 'Standard Bank Group',
 'Bursary aimed at students studying commerce, IT, or engineering. Includes structured work-back agreement and graduate placement opportunities.',
 NULL, 28, '{"All"}', '{"Commerce","Information Technology","Engineering"}', false,
 'https://www.standardbank.co.za/careers', '2026-09-30', true),

('Old Mutual Bursary',
 'Old Mutual Limited',
 'Bursary for students in actuarial science, finance, commerce, or technology. Recipients gain exposure to the financial services industry through vacation work.',
 NULL, 30, '{"All"}', '{"Actuarial Science","Finance","Commerce"}', false,
 'https://www.oldmutual.co.za/careers', '2026-08-31', true),

('Sanlam Bursary Programme',
 'Sanlam Group',
 'Financial services bursary for students studying actuarial science, finance, data science, or computer science.',
 NULL, 30, '{"Western Cape","Gauteng"}',
 '{"Actuarial Science","Finance","Data Science","Computer Science"}', false,
 'https://www.sanlam.co.za/careers', '2026-08-31', true),

-- ── Sector-specific ───────────────────────────────────────────────────────────

('DAC Arts and Culture Bursary',
 'Department of Arts and Culture',
 'Bursary for students studying fine arts, music, drama, dance, or heritage studies at accredited South African institutions.',
 NULL, 0, '{"All"}', '{"Arts","Music","Performing Arts","Heritage Studies"}', true,
 'https://www.dac.gov.za', '2026-09-30', true),

('National Department of Health Bursary',
 'National Department of Health',
 'Bursary for students studying medicine, nursing, pharmacy, physiotherapy, occupational therapy, or other health sciences. Work-back to public health facilities required.',
 NULL, 25, '{"All"}',
 '{"Medicine","Nursing","Pharmacy","Health Sciences","Physiotherapy"}', true,
 'https://www.health.gov.za', '2026-09-30', true),

('Law Society of South Africa Bursary',
 'Law Society of South Africa',
 'Bursary for South African students studying towards an LLB degree. Merit and need-based assessment.',
 NULL, 28, '{"All"}', '{"Law"}', true,
 'https://www.lssa.org.za', '2026-09-30', true);
