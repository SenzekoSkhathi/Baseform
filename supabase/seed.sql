-- ============================================================
-- Baseform Seed Data — Western Cape Universities
-- Source: UCT 2027, SU 2027, CPUT 2026, UWC 2026 Prospectuses
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Schema: add guardian fields to profiles ───────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS guardian_name         text,
  ADD COLUMN IF NOT EXISTS guardian_phone        text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_email              text,
  ADD COLUMN IF NOT EXISTS guardian_whatsapp_number    text;

-- ── Schema: enrich faculties table with programme-level detail ─
ALTER TABLE faculties
  ADD COLUMN IF NOT EXISTS scoring_system      text    DEFAULT 'standard_aps',
  ADD COLUMN IF NOT EXISTS native_score_minimum numeric,
  ADD COLUMN IF NOT EXISTS field_of_study      text,
  ADD COLUMN IF NOT EXISTS duration_years      int,
  ADD COLUMN IF NOT EXISTS qualification_type  text,   -- 'degree' | 'diploma' | 'higher_certificate' | 'advanced_diploma'
  ADD COLUMN IF NOT EXISTS nqf_level           int,
  ADD COLUMN IF NOT EXISTS places_available    int;    -- NULL = not capped / not stated

-- Keep one university row per abbreviation so faculty joins do not duplicate programmes.
DELETE FROM universities u
USING (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY lower(trim(abbreviation))
           ORDER BY id
         ) AS rn
  FROM universities
) dupes
WHERE u.ctid = dupes.ctid
  AND dupes.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS universities_unique_abbreviation_idx
  ON universities (lower(trim(abbreviation)));

-- Reset seeded programme rows for ALL universities curated in this file.
-- This removes legacy/misassigned rows so the UI only shows institution-specific faculties.
DELETE FROM faculties f
USING universities u
WHERE f.university_id = u.id
  AND lower(trim(u.abbreviation)) IN (
    -- Western Cape
    'uct', 'su', 'cput', 'uwc',
    -- Eastern Cape
    'nmu', 'ru', 'ufh', 'wsu',
    -- KwaZulu-Natal
    'dut', 'mut', 'ukzn', 'unizulu',
    -- Gauteng
    'smu', 'tut', 'uj', 'vut', 'up', 'wits',
    -- Other provinces
    'cut', 'ul', 'spu', 'ump', 'univen', 'nwu', 'ufs'
  );

-- Keep only one row per unique programme identity before reseeding.
DELETE FROM faculties f
USING (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY
             university_id,
             lower(trim(name)),
             coalesce(lower(trim(field_of_study)), ''),
             coalesce(lower(trim(qualification_type)), ''),
             coalesce(aps_minimum::text, ''),
             coalesce(duration_years::text, '')
           ORDER BY id
         ) AS rn
  FROM faculties
) dupes
WHERE f.ctid = dupes.ctid
  AND dupes.rn > 1;

-- ============================================================
-- UNIVERSITIES
-- ============================================================
INSERT INTO universities
  (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES
  ('University of Cape Town',                    'UCT',  'Western Cape', 'Cape Town',    'https://www.uct.ac.za',      'https://applyonline.uct.ac.za',        100, '2026-07-31', true),
  ('Stellenbosch University',                    'SU',   'Western Cape', 'Stellenbosch', 'https://www.sun.ac.za',      'https://www.maties.com',               0,   '2026-07-31', true),
  ('Cape Peninsula University of Technology',    'CPUT', 'Western Cape', 'Cape Town',    'https://www.cput.ac.za',     'https://www.cput.ac.za/study/apply',    0,   '2026-08-30', true),
  ('University of Western Cape',                 'UWC',  'Western Cape', 'Bellville',    'https://www.uwc.ac.za',      'https://www.uwc.ac.za',                 0,   '2026-09-30', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- HELPER: insert faculties for a given university abbreviation
-- Columns: name | aps_min | scoring | native | field | yrs | qual_type | nqf | places | reqs
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  UCT — University of Cape Town                          │
-- │  Scoring systems:                                        │
-- │    uct_fps_600  = sum of best-6 subject % (max 600)     │
-- │    uct_fps_800  = same but Maths+PhysSci doubled (800)  │
-- │    uct_fps_900  = fps_600 + NBT scores up to 300 (900)  │
-- └─────────────────────────────────────────────────────────┘

-- UCT: Faculty of Commerce
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BCom Financial Accounting: Chartered Accountant',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BBusSc Financial Accounting: Finance with Accounting',
   31,'uct_fps_600',435,'Commerce',4,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Accounting — General',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Management Studies',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Marketing Studies',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Industrial and Organisational Psychology',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Pure Mathematics required.'),

  ('BCom Information Systems',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Finance',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Economics and Finance',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Economics and Statistics',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Politics, Philosophy and Economics (PPE)',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BCom Economics with Law',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. English HL ≥50% or FAL ≥60%. Maths required.'),

  ('BBusSc in Computer Science',
   31,'uct_fps_600',435,'Commerce',4,'degree',8,NULL,
   'FPS 435 guaranteed. Maths ≥70%.'),

  ('BCom in Information Systems and Computer Science',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. Maths ≥70%.'),

  ('BCom Statistics and Data Science',
   31,'uct_fps_600',435,'Commerce',3,'degree',8,NULL,
   'FPS 435 guaranteed. Maths ≥70%.'),

  ('BCom Actuarial Science',
   36,'uct_fps_600',500,'Commerce',3,'degree',8,NULL,
   'FPS 500 guaranteed. Maths ≥80%, English HL ≥60% or FAL ≥80%. Highly competitive.'),

  ('BBusSc Actuarial Science',
   36,'uct_fps_600',500,'Commerce',4,'degree',8,NULL,
   'FPS 500 guaranteed. Maths ≥80%, English HL ≥60% or FAL ≥80%. Highly competitive.'),

  ('BCom Quantitative Finance',
   36,'uct_fps_600',500,'Commerce',3,'degree',8,NULL,
   'FPS 500 guaranteed. Maths ≥80%, English HL ≥60% or FAL ≥80%. Highly competitive.'),

  ('BBusSc Quantitative Finance',
   36,'uct_fps_600',500,'Commerce',4,'degree',8,NULL,
   'FPS 500 guaranteed. Maths ≥80%, English HL ≥60% or FAL ≥80%. Highly competitive.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';

-- UCT: Faculty of Engineering & the Built Environment
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BScEng Civil Engineering',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥70%.'),

  ('BScEng Electrical Engineering',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥75%.'),

  ('BScEng Electrical & Computer Engineering',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥75%.'),

  ('BScEng Mechatronics',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥75%.'),

  ('BScEng Chemical Engineering',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥75%.'),

  ('BScEng Mechanical & Mechatronic Engineering',
    36,'uct_fps_600',500,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 500. Maths ≥80%, Physical Sciences ≥75%.'),

  ('BSc Construction Studies',
    32,'uct_fps_600',450,'Engineering & Built Environment',3,'degree',8,NULL,
   'FPS 450. Maths ≥65%, Physical Sciences ≥60%.'),

  ('BSc Property Studies',
    32,'uct_fps_600',450,'Engineering & Built Environment',3,'degree',8,NULL,
   'FPS 450. Maths ≥65%.'),

  ('BSc Geomatics',
    32,'uct_fps_600',450,'Engineering & Built Environment',4,'degree',8,NULL,
   'FPS 450. Maths ≥65–75%.'),

  ('Bachelor of Architectural Studies (BAS)',
    32,'uct_fps_600',450,'Engineering & Built Environment',3,'degree',8,NULL,
   'FPS 450. Maths ≥50%, English ≥50%. Portfolio required.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';

-- UCT: Faculty of Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('MBChB — Medicine & Surgery',
   39,'uct_fps_900',810,'Health Sciences',6,'degree',8,NULL,
   'FPS 810 (out of 900, includes NBT scores out of 300). Maths ≥70%, Physical Sciences ≥70%, English ≥65%. Sub-minimum APS 450. Highly competitive.'),

  ('BSc Physiotherapy',
   37,'uct_fps_900',730,'Health Sciences',4,'degree',8,NULL,
   'FPS 730. Maths ≥60%, Physical Sciences or Life Sciences ≥65%, English ≥65%. Sub-minimum APS 360.'),

  ('BSc Occupational Therapy',
   37,'uct_fps_900',730,'Health Sciences',4,'degree',8,NULL,
   'FPS 730. Maths ≥60%, Physical Sciences or Life Sciences ≥65%, English ≥65%. Sub-minimum APS 340.'),

  ('BSc Audiology',
   36,'uct_fps_900',720,'Health Sciences',4,'degree',8,NULL,
   'FPS 720. Maths ≥60%, Physical Sciences or Life Sciences ≥65%, English ≥65%. Sub-minimum APS 340.'),

  ('BSc Speech-Language Pathology',
   36,'uct_fps_900',715,'Health Sciences',4,'degree',8,NULL,
   'FPS 715. Maths ≥60%, Physical Sciences or Life Sciences ≥65%, English ≥65%. Sub-minimum APS 340.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';

-- UCT: Faculty of Humanities
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BA / BSocSc — General (Arts & Social Sciences)',
   32,'uct_fps_600',450,'Humanities',3,'degree',7,NULL,
   'FPS 450 guaranteed. English HL ≥50% or FAL ≥60%. Wide range of majors available.'),

  ('BSocSc Philosophy, Politics & Economics (PPE)',
   32,'uct_fps_600',450,'Humanities',3,'degree',7,NULL,
   'FPS 450. NSC Mathematics ≥60%.'),

  ('Bachelor of Social Work',
   32,'uct_fps_600',450,'Humanities',4,'degree',8,NULL,
   'FPS 450. English HL ≥50% or FAL ≥60%.'),

  ('BA Fine Art',
   27,'uct_fps_600',380,'Humanities',4,'degree',8,NULL,
   'FPS 380. Portfolio evaluation is the leading indicator for admission.'),

  ('BA Theatre & Performance',
   27,'uct_fps_600',380,'Humanities',4,'degree',8,NULL,
   'FPS 380. Audition is the leading indicator for admission.'),

  ('Bachelor of Music',
   27,'uct_fps_600',380,'Humanities',4,'degree',8,NULL,
   'FPS 380. Audition, interview and music theory test required.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';

-- UCT: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('LLB — Undergraduate (4 years)',
   36,'uct_fps_600',500,'Law',4,'degree',8,NULL,
   'FPS 500 guaranteed. NBT AL Proficient, QL Intermediate or above. No more than 10 international students accepted.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';

-- UCT: Faculty of Science
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc Applied Mathematics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Applied Statistics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Archaeology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%. Physical Sciences not required but recommended.'),

  ('BSc Artificial Intelligence',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Astrophysics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Biology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Biochemistry',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Chemistry',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Computer Science',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%. Physical Sciences or Computer Science required.'),

  ('BSc Environmental & Geographical Science',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Genetics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Geology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Human Anatomy & Physiology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Marine Biology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Mathematics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Mathematical Statistics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Ocean & Atmosphere Science',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Physics',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Quantitative Biology',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.'),

  ('BSc Statistics & Data Science',
   35,'uct_fps_800',660,'Science',3,'degree',7,NULL,
   'FPS 660 (Maths & Physical Sciences doubled). Maths ≥70%, Physical Sciences ≥60%.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UCT';


-- ┌─────────────────────────────────────────────────────────┐
-- │  SU — Stellenbosch University                           │
-- │  Scoring: su_aggregate                                  │
-- │  native_score_minimum = minimum NSC aggregate %         │
-- │  (average of best 6 subjects excl. Life Orientation)    │
-- └─────────────────────────────────────────────────────────┘

-- SU: Faculty of AgriSciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BAgric in Agribusiness Management',
   27,'su_aggregate',60,'AgriSciences',3,'degree',7,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences (Physics & Chemistry) 50%.'),

  ('BScAgric in Agricultural Economics',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%.'),

  ('BScAgric in Animal Production Systems',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%.'),

  ('BScAgric in Plant and Soil Science / Viticulture & Oenology',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%.'),

  ('BSc in Conservation Ecology',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%.'),

  ('BSc in Food Science',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%.'),

  ('BSc in Forestry (Forestry and Wood Sciences)',
   27,'su_aggregate',60,'AgriSciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Maths 60% (Wood & Wood Products Sciences: Maths 70%), Physical Sciences 50%.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Arts and Social Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BA in Humanities',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 40%.'),

  ('BA in Language and Culture',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 50%.'),

  ('BA in Development and the Environment',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 40%. Maths 60% if taking Economics.'),

  ('BA in Human Resource Management',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 40%. Maths 50% or Math Literacy 70%.'),

  ('BA in International Studies',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. English Home Language 50% or English First Additional Language 60%.'),

  ('BA in Political, Philosophical and Economic Studies (PPE)',
   28,'su_aggregate',63,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 40%. Maths 60%.'),

  ('BA in Drama and Theatre Studies',
   29,'su_aggregate',65,'Arts and Social Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Home Language 60%, First Additional Language 50%. Audition/interview required in August.'),

  ('Bachelor of Social Work',
   28,'su_aggregate',63,'Arts and Social Sciences',4,'degree',8,100,
   'Aggregate ≥63%. Home Language 50%, First Additional Language 50%. 100 places.'),

  ('BA in Visual Arts',
   27,'su_aggregate',60,'Arts and Social Sciences',4,'degree',8,60,
   'Aggregate ≥60%. Portfolio submission by 1 September required. 60 places.'),

  ('Bachelor of Music (BMus)',
   27,'su_aggregate',60,'Arts and Social Sciences',4,'degree',8,NULL,
   'Aggregate ≥60%. Home Language 50%, First Additional Language 40%. Audition and music theory test required.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Economic and Management Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BCom (Economic Sciences)',
   29,'su_aggregate',65,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%. Focal areas: Econometrics, Economic & Management Consultation, Financial Sector, Transport Economics.'),

  ('BCom (Management Sciences)',
   29,'su_aggregate',65,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%. Focal areas include: Business Analytics, Financial Management, HR Management, Marketing, Logistics.'),

  ('BCom (Financial Accounting)',
   29,'su_aggregate',65,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%.'),

  ('BCom (Management Accounting)',
   29,'su_aggregate',65,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%.'),

  ('BCom (Industrial Psychology)',
   29,'su_aggregate',65,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%.'),

  ('BAcc (Accounting)',
   33,'su_aggregate',70,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥70%. Maths 70% OR Maths 60% + Accounting 70%. Pathway to Chartered Accountant.'),

  ('BCom (Mathematical Sciences)',
   33,'su_aggregate',70,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥70%. Maths 75%. Focal areas: Data Science, Financial Risk Management, Operations Research.'),

  ('BCom (Actuarial Science)',
   40,'su_aggregate',80,'Economic and Management Sciences',3,'degree',7,NULL,
   'Aggregate ≥80%. Maths 80%, Home Language 60%. Pathway to Fellow of the Actuarial Society of South Africa.'),

  ('BCom (International Business)',
   40,'su_aggregate',80,'Economic and Management Sciences',4,'degree',8,NULL,
   'Aggregate ≥80%. Maths 70%. Strict selection; includes international exchange semester in year 3.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Foundation Phase Education',
   27,'su_aggregate',60,'Education',4,'degree',8,125,
   'Aggregate ≥60%. Maths 40% or Math Literacy 60%. 125 places. Qualifies you to teach Grades R–3.'),

  ('BEd Intermediate Phase Education',
   27,'su_aggregate',60,'Education',4,'degree',8,125,
   'Aggregate ≥60%. Maths 40% or Math Literacy 60%. 125 places. Qualifies you to teach Grades 4–7.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Engineering
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEng (Chemical)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%. Selection mark = Maths% + Physical Sciences% + (6 × NSC average), max 800. ~600+ typically needed.'),

  ('BEng (Civil)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%. Competitive selection mark required.'),

  ('BEng (Electrical and Electronic)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%.'),

  ('BEng (Industrial)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%.'),

  ('BEng (Mechanical)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%.'),

  ('BEng (Mechatronic)',
   33,'su_aggregate',70,'Engineering',4,'degree',8,NULL,
   'Aggregate ≥70%. Maths 70%, Physical Sciences 60%. Combines mechanical, electronic and computer engineering.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('LLB — 4-year Undergraduate',
   33,'su_aggregate',70,'Law',4,'degree',8,120,
   'Aggregate ≥70%. NBT AQL before 31 July. English or Afrikaans Home Language 60% or First Additional Language 70%. 120 places.'),

  ('BA (Law) — 3-year',
   33,'su_aggregate',70,'Law',3,'degree',7,55,
   'Aggregate ≥70%. NBT AQL before 31 July. 55 places. Provides entry to the 2-year graduate LLB.'),

  ('BCom (Law) — 3-year',
   33,'su_aggregate',70,'Law',3,'degree',7,80,
   'Aggregate ≥70%. Maths 60%. NBT AQL before 31 July. 80 places. Provides entry to the 2-year graduate LLB.'),

  ('BAccLLB — 5-year (Accounting + Law)',
   40,'su_aggregate',80,'Law',5,'degree',8,35,
   'Aggregate ≥80%. Maths 70% OR Maths 60% + Accounting 70%. NBT AQL before 31 July. 35 places.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Medicine and Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('MBChB — Medicine (6 years)',
   36,'su_aggregate',75,'Medicine and Health Sciences',6,'degree',8,280,
   'Aggregate ≥75%. Maths 60%, Physical Sciences 50%, Life Sciences 50%. ±280 places. Selection based on academic and non-academic merit.'),

  ('Bachelor of Nursing',
   27,'su_aggregate',60,'Medicine and Health Sciences',4,'degree',8,50,
   'Aggregate ≥60%. Maths 40% or Math Literacy 70%, Life Sciences 50%. ±50 places.'),

  ('BSc in Physiotherapy',
   27,'su_aggregate',60,'Medicine and Health Sciences',4,'degree',8,55,
   'Aggregate ≥60%. Maths 60%, Physical Sciences 50%. ±55 places.'),

  ('Bachelor of Occupational Therapy',
   27,'su_aggregate',60,'Medicine and Health Sciences',4,'degree',8,50,
   'Aggregate ≥60%. Maths 50%, Life Sciences 50%. ±50 places.'),

  ('BSc in Dietetics',
   27,'su_aggregate',60,'Medicine and Health Sciences',4,'degree',8,35,
   'Aggregate ≥60%. Maths 50%, Physical Sciences 50%, Life Sciences 50%. ±35 places.'),

  ('Bachelor of Speech-Language and Hearing Therapy',
   27,'su_aggregate',60,'Medicine and Health Sciences',4,'degree',8,30,
   'Aggregate ≥60%. Maths 50%, Physical Sciences 50% or Life Sciences 60%. ±30 places. Two of three languages at 60%.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Science
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc Biodiversity & Ecology',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%, Physical Sciences 50%. Focal areas: Climate Change Ecology, Plant and Animal Biodiversity.'),

  ('BSc Human Life Sciences',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60% or 70% (depending on first-year choice). Physical Sciences 50%.'),

  ('BSc Molecular Biology & Biotechnology',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60% or 70%, Physical Sciences 50%.'),

  ('BSc Chemistry',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 70%, Physical Sciences 50%.'),

  ('BSc Sport Science',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60%, Physical Sciences 50%.'),

  ('BSc Earth Science / BSc GeoInformatics',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 60% (GeoInformatics: 70% if Computer Science subject taken). Physical Sciences 50%.'),

  ('BSc Physics',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 70%, Physical Sciences 50%. Focal areas: Laser Physics, Theoretical Physics.'),

  ('BSc Mathematical Sciences',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 70%. Physical Sciences 50% if taking Physics. Focal areas: Applied Mathematics, Operations Research.'),

  ('BSc Computer Science',
   29,'su_aggregate',65,'Science',3,'degree',7,NULL,
   'Aggregate ≥65%. Maths 70%. Physical Sciences 50% if taking Physics/Chemistry. Focal areas: General Computer Science, Data Science.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';

-- SU: Faculty of Theology & Bachelor of Data Science
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BTh (Bachelor of Theology)',
   27,'su_aggregate',60,'Theology',3,'degree',7,NULL,
   'Aggregate ≥60%.'),

  ('BDiv (Bachelor of Divinity)',
   27,'su_aggregate',60,'Theology',4,'degree',8,NULL,
   'Aggregate ≥60%. Entry to ministry in DRC / URC.'),

  ('Bachelor of Data Science (BDatSci) — Interfaculty',
   40,'su_aggregate',80,'Science',4,'degree',8,NULL,
   'Aggregate ≥80%. Maths 80%. Afrikaans or English Home Language 60% / First Additional Language 75%. Focal areas: Computer Science, Applied Mathematics, Statistical Physics.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SU';


-- ┌─────────────────────────────────────────────────────────┐
-- │  CPUT — Cape Peninsula University of Technology         │
-- │  Scoring: cput_aps                                      │
-- │  Method 1: sum of best-6 subject % ÷ 10                 │
-- │  Method 2: same but Maths + Physical Sciences doubled   │
-- │  Applications are FREE                                  │
-- └─────────────────────────────────────────────────────────┘

-- CPUT: Faculty of Applied Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Agriculture / Diploma in Agricultural Management',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 or Tech Maths 4. Life Sciences or Physical Sciences 4.'),

  ('Diploma in Biotechnology',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 4, Tech Maths 5. Life Sciences or Physical Sciences 4.'),

  ('Diploma in Analytical Chemistry',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 4, Tech Maths 5. Physical Sciences 4. APS method 1.'),

  ('Bachelor of Environmental Health',
   32,'cput_aps',32,'Applied Sciences',4,'degree',8,NULL,
   'English 4, Maths 4, Tech Maths 5. Life Sciences 4, Physical Sciences 4.'),

  ('Bachelor of Food Science & Technology',
   32,'cput_aps',32,'Applied Sciences',4,'degree',8,NULL,
   'English 4, Maths 4, Tech Maths 5. Life Sciences 3, Physical Sciences 4.'),

  ('Diploma in Nature Conservation',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 or Tech Maths 4. Life Sciences 5, Physical Sciences 4.'),

  ('Diploma in Marine Science',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 4, Tech Maths 5. Physical Sciences 4.'),

  ('Diploma in Horticulture',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 or Tech Maths 4. Life Sciences 5, Physical Sciences 4.'),

  ('Diploma in Landscape Architecture',
   30,'cput_aps',30,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 or Tech Maths 4. Life Sciences 5, Physical Sciences 4.'),

  ('Diploma in Mathematical Sciences',
   28,'cput_aps',28,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 4, Tech Maths 5. Physical Sciences, Accounting, Business Studies or Economics 3.'),

  ('Diploma in Environmental Management',
   28,'cput_aps',28,'Applied Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5. Life Sciences 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';

-- CPUT: Faculty of Business & Management Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Accountancy',
   38,'cput_aps',38,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 (×2 method) or Maths Lit 5 (×2), Accounting 4. Note: for each Maths subject the actual achievement is multiplied by 2.'),

  ('Diploma in Entrepreneurship',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2, Accounting 4.'),

  ('Diploma in Human Resource Management',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2, Accounting 4.'),

  ('Diploma in Management',
   28,'cput_aps',28,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2, Accounting 4.'),

  ('Diploma in Marketing',
   25,'cput_aps',25,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2, Accounting 4.'),

  ('Diploma in Public Administration',
   28,'cput_aps',28,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2, Accounting 4.'),

  ('Diploma in Tourism Management',
   28,'cput_aps',28,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2. Motivation letter indicating understanding of tourism and career prospects.'),

  ('Diploma in Banking',
   24,'cput_aps',24,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 (contact classes). Work experience recommended.'),

  ('Diploma in Retail Business Management',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2.'),

  ('Diploma in Hospitality & Hotel Management',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2. Work experience recommended.'),

  ('Diploma in Hospitality Management & Professional Cookery',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2.'),

  ('Diploma in Events Management',
   28,'cput_aps',28,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2. Motivation letter required.'),

  ('Diploma in Real Estate',
   26,'cput_aps',26,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4. One of: Economics, Business Studies or Accounting 4. Full-time students must be employed.'),

  ('Diploma in Sport and Leisure Management',
   25,'cput_aps',25,'Business and Management Sciences',3,'diploma',6,NULL,
   'English 4, Maths 2. Non-Academic Review Component for Sport Management required.'),

  ('Bachelor of Business Informatics',
   25,'cput_aps',25,'Business and Management Sciences',4,'degree',8,NULL,
   'English 4, Maths 3. Business and IT combined degree.'),

  ('Bachelor of Paralegal Studies',
   30,'cput_aps',30,'Business and Management Sciences',3,'degree',7,NULL,
   'English 4, Maths 3. One official language at level 4 (excluding English).')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';

-- CPUT: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Foundation Phase Teaching',
   32,'cput_aps',32,'Education',4,'degree',8,NULL,
   'Home Language 4, First Additional Language 3. Maths Lit 5. Selection based on Grade 11 results.'),

  ('BEd Intermediate Phase Teaching',
   32,'cput_aps',32,'Education',4,'degree',8,NULL,
   'Home Language 4, First Additional Language 3. Selection based on Grade 11 results.'),

  ('BEd Senior Phase & FET Teaching',
   32,'cput_aps',32,'Education',4,'degree',8,NULL,
   'Home Language 4, First Additional Language 3. Selection based on Grade 11 results. Language of instruction: Mowbray (English), Wellington (Afrikaans).')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';

-- CPUT: Faculty of Engineering & the Built Environment
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Chemical Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4. Maths ≥60%, Physical Science ≥60%.'),

  ('Bachelor of Engineering Technology in Chemical Engineering',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 5, Maths 5, Physical Science 5. Maths ≥60%, Physical Science ≥60%.'),

  ('Diploma in Civil Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4. Maths ≥60%, Physical Science ≥60%.'),

  ('Diploma in Geomatics (Surveying & GIS)',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4.'),

  ('Bachelor of Engineering Technology in Civil Engineering',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 5, Maths 5, Physical Science 5.'),

  ('Bachelor of Geomatics',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 5, Maths 5, Physical Science 5.'),

  ('Diploma in Engineering Technology — Electrical Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5. Physical Science or Electrical Technology 4.'),

  ('Diploma in Engineering Technology — Computer Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5. Computer Applications Technology or IT 4.'),

  ('Bachelor of Engineering Technology in Electrical Engineering',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 5, Maths 5. Physical Science 5.'),

  ('Bachelor of Engineering Technology in Computer Engineering',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 5, Maths 5.'),

  ('Diploma in Mechanical Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4.'),

  ('Diploma in Mechanical Engineering (Mechatronics)',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4.'),

  ('Diploma in Industrial Engineering',
   30,'cput_aps',30,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 2. English 4, Maths 4, Tech Maths 5, Physical Science 4.'),

  ('Bachelor of Marine Engineering',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 4, Maths 5, Physical Science 5. Eyesight and medical assessment by SAMSA Medical Practitioner required.'),

  ('Bachelor of Nautical Science',
   36,'cput_aps',36,'Engineering & the Built Environment',4,'degree',8,NULL,
   'Method 2. English 6, Maths 6, Physical Science 4. Eyesight and medical assessment by SAMSA Medical Practitioner required.'),

  ('Diploma in Construction',
   25,'cput_aps',25,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'English 4, Maths 4, Physical Science 4. NSC rating scale used. Recommended: Accounting 3, Business Studies 3, Economics 3.'),

  ('Diploma in Clothing & Textile Technology',
   26,'cput_aps',26,'Engineering & the Built Environment',3,'diploma',6,NULL,
   'Method 1. English 4, Maths 3, Maths Lit 4. Online selection test. Mathematical Literacy accepted.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';

-- CPUT: Faculty of Health & Wellness Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BHSc in Medical Laboratory Sciences',
   38,'cput_aps',38,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 5, Physical Sciences 4. Preference to higher APS applicants.'),

  ('BHSc in Dental Technology',
   33,'cput_aps',33,'Health and Wellness Sciences',3,'degree',7,NULL,
   'English 4, Maths 4. Life Sciences 4.'),

  ('Higher Certificate in Dental Assisting',
   25,'cput_aps',25,'Health and Wellness Sciences',1,'higher_certificate',5,NULL,
   'English 3, Maths 2 or Maths Lit 3.'),

  ('Bachelor of Emergency Medical Care',
   35,'cput_aps',35,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 4, Physical Sciences 4. Selection interview, medical and environmental assessment required.'),

  ('Diploma in Emergency Medical Care',
   28,'cput_aps',28,'Health and Wellness Sciences',3,'diploma',6,NULL,
   'English 3, Maths 3. Life Sciences 3.'),

  ('Bachelor of Nursing',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 5*, Physical Sciences 4* (* = Life Sciences as alternative). Invitation to selection interview.'),

  ('BHSc in Optometry',
   32,'cput_aps',32,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 5**. Invitation to selection interview.'),

  ('BSc in Diagnostic Radiography',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 4, Physical Sciences 4*. Health screening questionnaire required.'),

  ('BSc in Diagnostic Ultrasound',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 4, Physical Sciences 4*. Health screening questionnaire.'),

  ('BSc in Radiation Therapy',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 4, Physical Sciences 4*. Health screening questionnaire.'),

  ('BSc in Nuclear Medicine Technology',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Life Sciences 4 (compulsory), Physical Sciences 4 (compulsory).'),

  ('Bachelor of Health Science in Medical Imaging & Therapeutic Sciences',
   30,'cput_aps',30,'Health and Wellness Sciences',4,'degree',8,NULL,
   'English 4, Maths 4. Streams: Diagnostic Radiography (max 65), Radiation Therapy (max 14), Nuclear Medicine Technology (max 7), Diagnostic Ultrasound (max 12).'),

  ('Diploma in Somatology',
   24,'cput_aps',24,'Health and Wellness Sciences',3,'diploma',6,NULL,
   'English 4, Maths 3 or Maths Lit 4. Life Sciences 4. Hepatitis inoculation required prior to registration.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';

-- CPUT: Faculty of Informatics & Design
-- NB: Design programmes close 30 September; others 30 August
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Architectural Technology',
   30,'cput_aps',30,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 4, Maths Lit 6, Tech Maths 5. Application closes 30 September.'),

  ('Diploma in Interior Design',
   30,'cput_aps',30,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 4, Maths Lit 6, Tech Maths 5. Application closes 30 September.'),

  ('Diploma in Fashion',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5. Portfolio or entrance exam may be required. Closes 30 September.'),

  ('Diploma in Visual Communication Design',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5. Portfolio may be required. Closes 30 September.'),

  ('Diploma in Product Design',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5. Portfolio may be required. Closes 30 September.'),

  ('Diploma in Jewellery Design & Manufacture',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5. Portfolio may be required. Closes 30 September.'),

  ('Diploma in Film Production',
   30,'cput_aps',30,'Informatics and Design',3,'diploma',6,NULL,
   'English 5, Maths 3, Maths Lit 4.'),

  ('Diploma in Photography',
   30,'cput_aps',30,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 4.'),

  ('Diploma in Journalism',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 5, Maths 3, Maths Lit 4. Another language (excl. English) 50%.'),

  ('Diploma in Public Relations & Communication',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 5, Maths 2, Maths Lit 4. Another language 50%.'),

  ('Diploma in Information & Communication Technology — Applications Development',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5.'),

  ('Diploma in Information & Communication Technology — Communication Networks',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5.'),

  ('Diploma in Information & Communication Technology — Multimedia Applications',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 3, Maths Lit 5.'),

  ('Diploma in Urban & Regional Planning',
   28,'cput_aps',28,'Informatics and Design',3,'diploma',6,NULL,
   'English 4, Maths 4, Maths Lit 5. Geography 4 OR Economics/Business Studies/Tourism 4 (compulsory).')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CPUT';


-- ┌─────────────────────────────────────────────────────────┐
-- │  UWC — University of Western Cape                       │
-- │  Scoring: uwc_points                                    │
-- │  Weighted points system based on NSC achievement levels │
-- │  UWC Points ≈ standard APS (both scale similarly)       │
-- │  Application closes: 30 September                       │
-- └─────────────────────────────────────────────────────────┘

-- UWC: Faculty of Community and Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Social Work',
   34,'uwc_points',34,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 34 UWC Points. English 4 (home or first additional). Maths Code 3 or Maths Literacy Code 4. Another language Code 4.'),

  ('BA Sport, Recreation & Exercise Science',
   30,'uwc_points',30,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 30 UWC Points. English 4. Maths Code 3 or Maths Literacy Code 4.'),

  ('BSc Dietetics and Nutrition',
   33,'uwc_points',33,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 33 UWC Points. English 4. Maths Code 4, Maths Literacy Code 6. Life Sciences Code 4.'),

  ('BSc Sport and Exercise Science',
   33,'uwc_points',33,'Community and Health Sciences',3,'degree',7,NULL,
   'Min 33 UWC Points. English 4. Maths Code 4.'),

  ('BSc Occupational Therapy',
   38,'uwc_points',38,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 38 UWC Points. English 4. Maths Code 3 or Maths Literacy Code 5.'),

  ('BSc Physiotherapy',
   38,'uwc_points',38,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 38 UWC Points. English 4. Maths Code 4, Maths Literacy Code 6. Life Sciences Code 4 AND Physical Sciences Code 4.'),

  ('B Nursing and Midwifery',
   38,'uwc_points',38,'Community and Health Sciences',4,'degree',8,NULL,
   'Min 38 UWC Points. English 4. Maths Code 4, Maths Literacy Code 6. Life Sciences Code 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Economic and Management Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BAdmin (Public Administration)',
   28,'uwc_points',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 3 or Maths Literacy Code 5.'),

  ('BCom (3-year stream)',
   28,'uwc_points',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4.'),

  ('BCom Financial Accounting',
   28,'uwc_points',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4.'),

  ('BCom Information Systems',
   28,'uwc_points',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4.'),

  ('BCom Accounting (3-year)',
   28,'uwc_points',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 3 AND Accounting Code 5.'),

  ('BCom Accounting (4-year)',
   28,'uwc_points',28,'Economic and Management Sciences',4,'degree',8,NULL,
   'English 4. Another language Code 3. Maths Code 4 AND Accounting Code 4 OR Maths Literacy Code 5.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Arts and Humanities
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Arts (BA) — General',
   35,'uwc_points',35,'Arts and Humanities',3,'degree',7,NULL,
   'English 4. Maths Code 3 or Maths Literacy Code 4. Maths Code 3 required for Psychology, Industrial Psychology, Geography & Environmental Studies.'),

  ('Bachelor of Library and Information Studies (BLIS)',
   35,'uwc_points',35,'Arts and Humanities',4,'degree',8,NULL,
   'English 4. Maths Code 3 or Maths Literacy Code 4.'),

  ('Bachelor of Theology (BTh)',
   35,'uwc_points',35,'Arts and Humanities',3,'degree',7,NULL,
   'English 4. Maths Code 3 or Maths Literacy Code 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Natural Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc Computer Science',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4.'),

  ('BSc Mathematics & Statistical Sciences',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 5 AND (Physical Sciences or Life Sciences or Information Technology Code 6).'),

  ('BSc Chemical Sciences',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4, Physical Sciences Code 4.'),

  ('BSc Applied Geology',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4, Physical Sciences Code 4.'),

  ('BSc Environment & Water Science',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4, Physical Sciences or Life Sciences Code 4.'),

  ('BSc Biotechnology',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 4, Physical Sciences Code 4.'),

  ('BSc Medical Bioscience',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Life Sciences Code 8 (Distinction required). This is a highly competitive programme.'),

  ('BSc Physical Science',
   33,'uwc_points',33,'Natural Sciences',3,'degree',7,NULL,
   'English 4. Maths Code 5, Physical Sciences Code 4.'),

  ('Bachelor of Pharmacy',
   38,'uwc_points',38,'Natural Sciences',4,'degree',8,NULL,
   'English 4. Maths Code 4. Physical Sciences AND Life Sciences Code 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Dentistry
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Dental Surgery (BDS)',
   40,'uwc_points',47,'Dentistry',5,'degree',8,NULL,
   'Min 47 UWC Points. English 4. Maths Code 4. Physical Sciences AND Life Sciences Code 4. Highly competitive.'),

  ('Bachelor of Oral Health (BOH)',
   30,'uwc_points',30,'Dentistry',4,'degree',8,NULL,
   'English 4. Maths Code 3, Maths Literacy Code 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('LLB — 4-year',
   30,'uwc_points',30,'Law',4,'degree',8,NULL,
   'English 4. Maths Code 4 or Maths Literacy Code 5.'),

  ('BCom Law',
   30,'uwc_points',30,'Law',3,'degree',7,NULL,
   'English 4. Maths Code 3 or Maths Literacy Code 4.'),

  ('Bachelor of Arts in Law — BA (Law)',
   40,'uwc_points',47,'Law',4,'degree',8,NULL,
   'Min 47 UWC Points. English 4. Maths Code 3 or Maths Literacy Code 5. Highly selective.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';

-- UWC: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Foundation Phase Teaching',
   33,'uwc_points',33,'Education',4,'degree',8,NULL,
   'Min 33 UWC Points. English 4, another language Code 3. Maths Literacy Code 5. Language of instruction must be one of the languages.'),

  ('BEd Intermediate Phase Teaching',
   33,'uwc_points',33,'Education',4,'degree',8,NULL,
   'Min 33 UWC Points. English 4, another language Code 3. Maths Code 3 or Maths Literacy Code 5.'),

  ('BEd Senior Phase & FET Teaching',
   33,'uwc_points',33,'Education',4,'degree',8,NULL,
   'Min 33 UWC Points. English 4, another language Code 3. Subject-specific elective requirements apply.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UWC';


-- ============================================================
-- Baseform Seed Data — Eastern Cape Universities
-- Source: NMU 2027, RU 2024, UFH 2024, WSU 2026 Prospectuses
-- ============================================================

-- ============================================================
-- UNIVERSITIES
-- ============================================================
INSERT INTO universities
  (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES
  ('Nelson Mandela University', 'NMU', 'Eastern Cape', 'Gqeberha',  'https://www.mandela.ac.za',  'https://ienabler.mandela.ac.za',        0,   '2026-08-31', true),
  ('Rhodes University',         'RU',  'Eastern Cape', 'Makhanda',  'https://www.ru.ac.za',        'https://www.ru.ac.za/admissiongateway', 100, '2026-09-30', true),
  ('University of Fort Hare',   'UFH', 'Eastern Cape', 'Alice',     'https://www.ufh.ac.za',       'https://www.ufh.ac.za',                 0,   '2026-09-30', true),
  ('Walter Sisulu University',  'WSU', 'Eastern Cape', 'Mthatha',   'https://www.wsu.ac.za',       'https://www.wsu.ac.za',                 0,   '2026-09-30', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- NMU — Nelson Mandela University
-- Scoring: nmu_as = Applicant Score (sum of 6 subject %, max 600)
--   excl. Life Orientation. aps_minimum ≈ native_score / 14
--   (same ratio as UCT FPS 600 → standard APS)
-- No application fee for SA citizens
-- Applications close: 31 August
-- ============================================================

-- NMU: Faculty of Business & Economic Sciences (BES)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BCom (Accountancy)',
   29,'nmu_as',410,'Business and Economic Sciences',3,'degree',8,NULL,
   'AS 410. Mathematics ≥60% compulsory. Prepares for CA(SA) and CIMA routes.'),

  ('BCom (Accounting Science)',
   29,'nmu_as',410,'Business and Economic Sciences',3,'degree',8,NULL,
   'AS 410. Mathematics ≥60% compulsory. CA route qualification.'),

  ('Diploma in Accountancy',
   25,'nmu_as',350,'Business and Economic Sciences',3,'diploma',6,NULL,
   'AS 350. Mathematics Literacy and Technical Mathematics accepted. Extended curriculum (4yr) available at lower AS.'),

  ('BCom (General Business Management)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥30%. Also offered on George Campus.'),

  ('BCom (Economics)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥30%.'),

  ('BCom (Industrial Psychology & Human Resource Management)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥30%.'),

  ('BCom (Computer Science & Information Systems)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥60%.'),

  ('BCom (Logistics & Supply Chain Management)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥30%.'),

  ('BCom (Marketing & Business Management)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350. Mathematics ≥30%.'),

  ('BCom (Public Relations Management)',
   25,'nmu_as',350,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 350.'),

  ('BCom (Hospitality Management)',
   20,'nmu_as',280,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 280. Mathematics ≥30%.'),

  ('BCom (Tourism Management)',
   20,'nmu_as',280,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 280. Mathematics ≥30%.'),

  ('BAdmin (Public Administration)',
   19,'nmu_as',270,'Business and Economic Sciences',3,'degree',7,NULL,
   'AS 270. Mathematics Literacy accepted.'),

  ('Advanced Diploma in Logistics & Supply Chain Management',
   19,'nmu_as',270,'Business and Economic Sciences',3,'advanced_diploma',7,NULL,
   'AS 270. Requires Diploma entry qualification.'),

  ('Advanced Diploma in Human Resource Management',
   19,'nmu_as',270,'Business and Economic Sciences',3,'advanced_diploma',7,NULL,
   'AS 270.'),

  ('Advanced Diploma in Public Relations Management',
   19,'nmu_as',270,'Business and Economic Sciences',3,'advanced_diploma',7,NULL,
   'AS 270.'),

  ('Diploma in Public Management',
   17,'nmu_as',240,'Business and Economic Sciences',3,'diploma',6,NULL,
   'AS 240. Mathematics Literacy accepted.'),

  ('Diploma in Logistics & Supply Chain Management',
   19,'nmu_as',270,'Business and Economic Sciences',3,'diploma',6,NULL,
   'AS 270. Mathematics Literacy accepted.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- NMU: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Foundation Phase Teaching',
   24,'nmu_as',330,'Education',4,'degree',7,NULL,
   'AS 330. English ≥50%. Two language subjects required. Mathematics Literacy ≥40%.'),

  ('BEd Intermediate Phase Teaching',
   24,'nmu_as',330,'Education',4,'degree',7,NULL,
   'AS 330. English ≥50%. Mathematics or Mathematics Literacy required.'),

  ('BEd Senior Phase & FET Teaching',
   24,'nmu_as',330,'Education',4,'degree',7,NULL,
   'AS 330. English ≥50%. Specialisations: Languages, Social Sciences, Natural Sciences, Economic & Management Sciences, Arts & Culture.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- NMU: Faculty of Engineering, Built Environment & Technology (FEBET)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Architecture (BArch)',
   22,'nmu_as',315,'Engineering, Built Environment and Technology',5,'degree',8,NULL,
   'AS 315. Mathematics ≥60%. Portfolio submission required. 5-year professional degree.'),

  ('Bachelor of Engineering Technology — Civil Engineering',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%, Physical Science ≥50%.'),

  ('Bachelor of Engineering Technology — Electrical Engineering',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%, Physical Science ≥50%.'),

  ('Bachelor of Engineering Technology — Mechanical Engineering',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%, Physical Science ≥50%.'),

  ('Bachelor of Engineering Technology — Chemical Process Technology',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%, Physical Science ≥50%.'),

  ('Bachelor of Engineering Technology — Industrial Engineering',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%.'),

  ('Bachelor of Engineering Technology — Marine Engineering',
   25,'nmu_as',350,'Engineering, Built Environment and Technology',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60% or Technical Mathematics. Medical fitness required.'),

  ('Advanced Diploma in Architectural Technology',
   19,'nmu_as',270,'Engineering, Built Environment and Technology',3,'advanced_diploma',7,NULL,
   'AS 270. Mathematics ≥40%.'),

  ('Advanced Diploma in Quantity Surveying',
   19,'nmu_as',270,'Engineering, Built Environment and Technology',3,'advanced_diploma',7,NULL,
   'AS 270. Mathematics ≥40%.'),

  ('Diploma in Information Technology (Networks)',
   16,'nmu_as',230,'Engineering, Built Environment and Technology',3,'diploma',6,NULL,
   'AS 230. Mathematics ≥30% or Mathematics Literacy ≥50%.'),

  ('Diploma in Information Technology (Software Development)',
   17,'nmu_as',245,'Engineering, Built Environment and Technology',3,'diploma',6,NULL,
   'AS 245. Mathematics ≥30%.'),

  ('Diploma in Information Technology (Support Services)',
   16,'nmu_as',230,'Engineering, Built Environment and Technology',3,'diploma',6,NULL,
   'AS 230. Mathematics ≥30% or Mathematics Literacy ≥50%.'),

  ('Diploma in Interior Design',
   22,'nmu_as',310,'Engineering, Built Environment and Technology',3,'diploma',6,NULL,
   'AS 310. Mathematics ≥30%. Portfolio submission required.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- NMU: Faculty of Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('MBChB (Bachelor of Medicine and Bachelor of Surgery)',
   36,'nmu_as',500,'Health Sciences',6,'degree',8,NULL,
   'AS 500. English ≥60%, Mathematics ≥60%, Physical Science ≥60%, Life Sciences ≥60%. Highly competitive. Selection interview required.'),

  ('Bachelor of Pharmacy (BPharm)',
   29,'nmu_as',410,'Health Sciences',4,'degree',8,NULL,
   'AS 410. Mathematics ≥60%, Physical Science ≥60%. Registered with South African Pharmacy Council.'),

  ('BSc (Nursing)',
   25,'nmu_as',350,'Health Sciences',4,'degree',8,NULL,
   'AS 350. Mathematics ≥40%, Life Sciences ≥40%.'),

  ('Bachelor of Health Sciences — Medical Laboratory Science',
   25,'nmu_as',350,'Health Sciences',4,'degree',8,NULL,
   'AS 350. Mathematics ≥60%, Physical Science ≥50%, Life Sciences ≥50%.'),

  ('BSc (Emergency Medical Care)',
   21,'nmu_as',300,'Health Sciences',4,'degree',8,NULL,
   'AS 300. English ≥50%. Medical fitness and selection process required.'),

  ('Bachelor of Health Sciences — Radiography (Diagnostics)',
   22,'nmu_as',315,'Health Sciences',4,'degree',8,NULL,
   'AS 315. Mathematics ≥40%, Physical Science ≥40%, Life Sciences ≥40%.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- NMU: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('LLB (4-year direct entry)',
   20,'nmu_as',275,'Law',4,'degree',8,NULL,
   'AS 275. English ≥50%. Direct entry LLB.'),

  ('LLB (Extended Curriculum — 5 years)',
   17,'nmu_as',240,'Law',5,'degree',8,NULL,
   'AS 240. English ≥50%. Extended curriculum for students needing additional academic support.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- NMU: Faculty of Science
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc Biochemistry',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥60%, Physical Science ≥50%, Life Sciences ≥50%.'),

  ('BSc Chemistry',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥60%, Physical Science ≥60%.'),

  ('BSc Microbiology',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥60%, Physical Science ≥50%, Life Sciences ≥50%.'),

  ('BSc Biological Sciences',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥40%, Life Sciences ≥50%. Extended curriculum (lower AS) available.'),

  ('BSc Marine Biology',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥40%, Life Sciences ≥50%. Extended curriculum (lower AS) available.'),

  ('BSc Nature Conservation',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥40%, Life Sciences ≥50%. Extended curriculum (lower AS) available.'),

  ('BSc Physics and Mathematics',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥60%, Physical Science ≥60%.'),

  ('BSc Environmental Sciences',
   22,'nmu_as',315,'Science',4,'degree',7,NULL,
   'AS 315. Mathematics ≥40%, Physical Science ≥40%.'),

  ('BSc Applied Mathematics',
   25,'nmu_as',350,'Science',3,'degree',7,NULL,
   'AS 350. Mathematics ≥60%.'),

  ('BSc Computer Science',
   25,'nmu_as',350,'Science',3,'degree',7,NULL,
   'AS 350. Mathematics ≥60%.'),

  ('BSc Statistics',
   25,'nmu_as',350,'Science',3,'degree',7,NULL,
   'AS 350. Mathematics ≥60%.'),

  ('BSc (Mathematics)',
   20,'nmu_as',280,'Science',3,'degree',7,NULL,
   'AS 280. Mathematics ≥60%.'),

  ('BSc (Geology / Geosciences)',
   20,'nmu_as',280,'Science',3,'degree',7,NULL,
   'AS 280. Mathematics ≥40%, Physical Science ≥40%.'),

  ('BSc (Agricultural Management)',
   20,'nmu_as',280,'Science',4,'degree',7,NULL,
   'AS 280. Mathematics ≥40%.'),

  ('Advanced Diploma in Game Ranch Management',
   22,'nmu_as',305,'Science',3,'advanced_diploma',7,NULL,
   'AS 305. Mathematics ≥30%.'),

  ('BA (Fine Arts / Visual Arts)',
   17,'nmu_as',240,'Humanities',3,'degree',7,NULL,
   'AS 240. Portfolio submission required.'),

  ('BA (Humanities — History, Philosophy, Political Science, Languages, Sociology, Anthropology)',
   17,'nmu_as',240,'Humanities',3,'degree',7,NULL,
   'AS 240. English ≥40%.'),

  ('BA (Media, Communication & Culture)',
   17,'nmu_as',240,'Humanities',3,'degree',7,NULL,
   'AS 240. English ≥40%. Covers Journalism, Broadcasting, Public Relations, Multimedia.'),

  ('BA (Psychology)',
   19,'nmu_as',270,'Humanities',3,'degree',7,NULL,
   'AS 270. English ≥40%.'),

  ('Bachelor of Social Work (BSW)',
   19,'nmu_as',270,'Humanities',4,'degree',7,NULL,
   'AS 270. English ≥40%. Selection interview may apply.'),

  ('Bachelor of Music (BMus)',
   20,'nmu_as',280,'Humanities',3,'degree',7,NULL,
   'AS 280, or lower AS with successful audition. Music aptitude audition required. Specialisations: Performance, Education, Technology.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NMU';

-- ============================================================
-- RU — Rhodes University
-- Scoring: ru_aps = 8-point scale (A=8 … G=2), 7 subjects
--   Life Orientation counts 0. Max APS = 56.
--   aps_minimum ≈ native_score × 3/4 (converts to std 42-max scale)
-- R100 non-refundable deposit required to book place
-- Applications close: approximately September
-- ============================================================

-- RU: Faculty of Commerce
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BCom Accounting',
   23,'ru_aps',30,'Commerce',3,'degree',7,NULL,
   'RU APS 30. English Level 5 (60%+), Mathematics Level 5 (60%+).'),

  ('BCom Economics',
   23,'ru_aps',30,'Commerce',3,'degree',7,NULL,
   'RU APS 30. English Level 5 (60%+), Mathematics Level 5 (60%+).'),

  ('BCom Information Systems',
   23,'ru_aps',30,'Commerce',3,'degree',7,NULL,
   'RU APS 30. English Level 5 (60%+), Mathematics Level 5 (60%+).'),

  ('BCom Management',
   23,'ru_aps',30,'Commerce',3,'degree',7,NULL,
   'RU APS 30. English Level 5 (60%+), Mathematics Level 5 (60%+).'),

  ('Bachelor of Business Science (BBusSc)',
   26,'ru_aps',34,'Commerce',4,'degree',8,NULL,
   'RU APS 34. English Level 5 (60%+), Mathematics Level 6 (70%+). Quantitative 4-year degree with business focus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- RU: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Education (BEd)',
   18,'ru_aps',24,'Education',4,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+). Specialisations: Foundation Phase, Intermediate Phase, Senior Phase & FET. Two pathways: direct 4-year BEd or bachelor''s degree + PGCE.'),

  ('Postgraduate Certificate in Education (PGCE)',
   0,'ru_aps',0,'Education',1,'degree',8,NULL,
   'Requires completed bachelor''s degree. 1-year postgraduate teaching qualification. Teaching subjects must align to undergraduate degree.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- RU: Faculty of Humanities
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BA in Languages',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in History',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Philosophy',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Sociology',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Political Science',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Media Studies',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Music',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Anthropology',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Psychology',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).'),

  ('BA in Drama & Theatre Arts',
   18,'ru_aps',24,'Humanities',3,'degree',7,NULL,
   'RU APS 24. English Level 4 (50%+).')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- RU: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('LLB (4-year direct entry)',
   20,'ru_aps',27,'Law',4,'degree',8,NULL,
   'RU APS 27. English Level 5 (60%+). Direct-entry LLB. Most students complete a 3-year bachelor''s degree first, then the 2-year LLB top-up.'),

  ('LLB (2-year post-degree)',
   0,'ru_aps',0,'Law',2,'degree',8,NULL,
   'Requires completed BA, BCom or BEd. 2-year LLB top-up. English Level 5 in undergraduate required.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- RU: Faculty of Pharmacy
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Pharmacy (BPharm)',
   26,'ru_aps',34,'Pharmacy',4,'degree',8,NULL,
   'RU APS 34. English Level 5, Mathematics Level 5, Life Sciences Level 5. Registered with South African Pharmacy Council. Highly competitive — limited places.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- RU: Faculty of Science
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc Biology',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Botany',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Chemistry',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Computer Science',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Environmental Science',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Geography',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Geology',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Mathematics',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Physics',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Statistics',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Zoology',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('BSc Information Systems',
   20,'ru_aps',27,'Science',3,'degree',7,NULL,
   'RU APS 27. English Level 5, Mathematics Level 5 (60%+).'),

  ('Bachelor of Fine Arts (BFA)',
   16,'ru_aps',21,'Science',3,'degree',7,NULL,
   'RU APS 21. English Level 5, Art Level 5 (60%+). Portfolio of artwork required at application.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'RU';

-- ============================================================
-- UFH — University of Fort Hare
-- Scoring: ufh_aps = standard APS (7-point NSC scale) including
--   Life Orientation capped at Level 4 (4 pts)
-- Main campus: Alice; East London campus for Management & Commerce
-- No application fee
-- ============================================================

-- UFH: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Senior & FET Phase — Agriculture',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28 (29 with ML). English 4, First Additional Language 4. Maths 4 or ML 5. Agricultural Science 4, Life Sciences 4. 2 other subjects 4. Alice campus.'),

  ('BEd Senior & FET Phase — Commerce',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28 (27 with ML). English 4. Maths 4 or ML 3. Two of: Accounting, Economics, Business Management. 2 other subjects 4. Alice campus.'),

  ('BEd Senior & FET Phase — Science',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28. English 4. Maths 4. Physical Science or Computer Science 4. Geography 4. 3 other subjects 4. Alice campus.'),

  ('BEd Senior & FET Phase — Social Science',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28. English 4. isiXhosa (Home or First Additional) 4. History or Geography 4. 3 other subjects 4. Alice campus.'),

  ('BEd Foundation Phase Teaching',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28 (29 with ML). English 4, isiXhosa 4. ML 5, Life Orientation (Major) 5. 2 other subjects 4. Alice campus.'),

  ('BEd Intermediate Phase Teaching',
   28,'ufh_aps',28,'Education',4,'degree',7,NULL,
   'APS 28 (29 with ML). English 4. ML 4. isiXhosa or First Additional Language 4. 3 other subjects 4. Alice campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- UFH: Faculty of Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Laws (LLB)',
   30,'ufh_aps',30,'Law',4,'degree',8,NULL,
   'APS 30. English 4. Maths 3 or ML/Technical Maths 4. 4 other subjects 4. Alice campus.'),

  ('Bachelor of Laws — Extended Programme',
   26,'ufh_aps',26,'Law',5,'degree',8,NULL,
   'APS 26 (28 with ML or Technical Maths). English 4. Maths 2. 4 other subjects 4. 5-year extended programme. Alice campus.'),

  ('BCom in Law',
   28,'ufh_aps',28,'Law',3,'degree',7,NULL,
   'APS 28 (29 with ML or Technical Maths). English 4. Maths 5 or ML 5. 4 other subjects 4. Alice campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- UFH: Faculty of Management & Commerce
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BAdmin in Public Administration',
   26,'ufh_aps',26,'Management & Commerce',3,'degree',7,NULL,
   'APS 26 (with ML). English 4. 4 other subjects 4. East London campus.'),

  ('Bachelor of Commerce (General)',
   28,'ufh_aps',28,'Management & Commerce',3,'degree',7,NULL,
   'APS 28. English 4. Maths 4. 4 other subjects 4. East London campus.'),

  ('BCom — Extended Programme',
   27,'ufh_aps',27,'Management & Commerce',4,'degree',7,NULL,
   'APS 27 (with ML). English 4. ML at lower level. Extended 4-year programme. East London campus.'),

  ('BCom in Accounting',
   32,'ufh_aps',32,'Management & Commerce',3,'degree',7,NULL,
   'APS 32. English 4. Maths 5 (60-69%). Accounting 5. 4 other subjects — two at Level 5. East London campus.'),

  ('BCom in Accounting — Extended Programme',
   30,'ufh_aps',30,'Management & Commerce',4,'degree',7,NULL,
   'APS 30. Lower Maths and Accounting requirements. Extended 4-year programme. East London campus.'),

  ('BCom in Information Systems',
   28,'ufh_aps',28,'Management & Commerce',3,'degree',7,NULL,
   'APS 28. English 4. Maths 4. 4 other subjects 4. East London campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- UFH: Faculty of Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc in Human Movement Science',
   28,'ufh_aps',28,'Health Sciences',4,'degree',7,NULL,
   'APS 28 (29 with ML). English 4. ML 5 or Maths 4. Life Sciences 5. 3 other subjects 4. Alice campus.'),

  ('BSc in Speech Language Pathology',
   28,'ufh_aps',28,'Health Sciences',4,'degree',7,NULL,
   'APS 28 (29 with ML). English 4. Maths or ML 4. Physical Science 4, Life Sciences 4. 2 other subjects 4. Alice campus.'),

  ('Bachelor of Nursing',
   28,'ufh_aps',28,'Health Sciences',4,'degree',8,NULL,
   'APS 28 (29 with ML). English 4. Maths or ML 4. Physical Science 4, Life Sciences 4. 2 other subjects 4. Alice campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- UFH: Faculty of Science & Agriculture
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BSc — General (Natural Sciences)',
   28,'ufh_aps',28,'Science & Agriculture',4,'degree',7,NULL,
   'APS 28. English 4. Maths 4. Physical Sciences 4. One of: Life Sciences, Geography, Computer Science, Info Tech 4. 2 other subjects 4. Alice campus.'),

  ('BSc — Extended Programme',
   27,'ufh_aps',27,'Science & Agriculture',5,'degree',7,NULL,
   'APS 27 (lower with Level 3 Maths or Physical Sciences). Extended 5-year programme. Alice campus.'),

  ('BSc Agriculture (Soil Science)',
   28,'ufh_aps',28,'Science & Agriculture',4,'degree',7,NULL,
   'APS 28. English 4. Maths 4. Physical Sciences 4. Life Sciences 4. Geography or Agricultural Science 4. Alice campus.'),

  ('BSc Agriculture (Animal Production / Horticulture)',
   27,'ufh_aps',27,'Science & Agriculture',4,'degree',7,NULL,
   'APS 27 (28 with ML). English 4. Maths 4 or ML 5. Physical Sciences 4. Life Sciences 4. Extended programme available. Alice campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- UFH: Faculty of Social Sciences & Humanities
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Arts — Humanities',
   26,'ufh_aps',26,'Social Sciences & Humanities',3,'degree',7,NULL,
   'APS 26. English 4. First Additional Language 4. Subjects from: Social Sciences, Languages, African Studies, Communication. Alice campus.'),

  ('Bachelor of Social Science',
   26,'ufh_aps',26,'Social Sciences & Humanities',3,'degree',7,NULL,
   'APS 26. English 4. isiXhosa or other Home/First Additional Language 4. History or Geography 4. 3 other subjects 4. Alice campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFH';

-- ============================================================
-- WSU — Walter Sisulu University
-- Scoring: wsu_aps = 8-point scale (90-100%=8, 80-89%=7, 70-79%=6,
--   60-69%=5, 50-59%=4, 40-49%=3, 30-39%=2, 00-30%=1)
--   Best 6 subjects: 2 languages + 4 highest (excl. LO)
-- Campuses: Mthatha, Buffalo City (East London), Butterworth, Komani
-- No application fee
-- ============================================================

-- WSU: Faculty of Economic & Financial Sciences (Mthatha)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Accountancy',
   18,'wsu_aps',21,'Economic and Financial Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3 (40-49%). Mathematics 3 (40-49%). 2 additional subjects 3. Mthatha campus.'),

  ('Diploma in Financial Information Systems',
   18,'wsu_aps',21,'Economic and Financial Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. Mathematics 3. 2 additional subjects 3. Mthatha campus.'),

  ('Diploma in Internal Auditing',
   18,'wsu_aps',21,'Economic and Financial Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 20 ECP (4yr). English 3. Maths or Accounting 5 (60-69%) or ML 5. Mthatha campus.'),

  ('Bachelor of Accounting',
   22,'wsu_aps',25,'Economic and Financial Sciences',3,'degree',7,NULL,
   'WSU APS 25. English 4 (50-59%). Mathematics 4 (50-59%). Mthatha campus.'),

  ('Bachelor of Accounting Sciences',
   24,'wsu_aps',27,'Economic and Financial Sciences',4,'degree',7,NULL,
   'WSU APS 27. English 5 (60-69%). Mathematics 4 (50-59%). CA route. Accredited by SAICA. Mthatha campus.'),

  ('Bachelor of Commerce',
   22,'wsu_aps',25,'Economic and Financial Sciences',3,'degree',7,NULL,
   'WSU APS 25. English 4. Mathematics 4 or ML 5 (60-69%). Mthatha campus.'),

  ('Bachelor of Commerce in Business Management',
   22,'wsu_aps',25,'Economic and Financial Sciences',3,'degree',7,NULL,
   'WSU APS 25. English 4. Mathematics 3 or ML 5 (60-69%). Mthatha campus.'),

  ('Bachelor of Commerce in Economics',
   22,'wsu_aps',25,'Economic and Financial Sciences',3,'degree',7,NULL,
   'WSU APS 25. English 4. Mathematics 3 or ML 6 (70-79%). Mthatha campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Education (Komani / Mthatha)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd Foundation Phase Teaching',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. isiXhosa Home Language 4. English as First Additional Language 4. ML 4. Life Orientation (Major) 5. 2 other subjects 8 pts total. Komani/Mthatha campus.'),

  ('BEd SP & FET Teaching — Creative Arts',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English/African Language 4. History or Geography 4. Music/Dance/Drama/Visual Arts 4. Music Aptitude Test required if no Matric Music. Mthatha campus.'),

  ('BEd SP & FET Teaching — Consumer & Management Science',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. One of: Consumer Studies/Hospitality/Tourism 4. Mthatha/Komani campus.'),

  ('BEd SP & FET Teaching — Economic & Management Science',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. ML 4 or Maths 2. Two of: Accounting/Business Studies/Economics 4. Mthatha/Komani campus.'),

  ('BEd SP & FET Teaching — Humanities',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. History 4. Geography 4. 3 other subjects 8 pts. Mthatha/Komani campus.'),

  ('BEd SP & FET Teaching — Languages',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 5 (60-69%). isiXhosa 4. 2 other subjects at 4. Mthatha/Komani campus.'),

  ('BEd SP & FET Teaching — Mathematics, Science & Technology',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. Mathematics 4. Life Sciences or Physical Sciences 4. Mthatha/Komani campus.'),

  ('BEd SP & FET Teaching — Technical & Vocational Education',
   21,'wsu_aps',24,'Education',4,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. Two technical subjects at Level 4 from: Technical Maths, Technical Sciences, EGD, Civil/Electrical/Mechanical Technology, Mathematics, Physical Sciences. Mthatha campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Engineering, Built Environment & IT (Buffalo City / Butterworth)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Building Technology',
   21,'wsu_aps',24,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 24 (mainstream) / 22 ECP. English 4. Mathematics or Technical Maths 4. Physical Science or Technical Science 3-4. Buffalo City/Butterworth campus.'),

  ('Diploma in Civil Engineering',
   21,'wsu_aps',24,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 24 (mainstream) / 22 ECP. English 4. Mathematics 4. Physical Sciences 4. Buffalo City/Butterworth campus.'),

  ('Diploma in Electrical Engineering',
   21,'wsu_aps',24,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 24 (mainstream) / 22 ECP. English 4. Mathematics 4. Physical Sciences 4. Buffalo City campus.'),

  ('Diploma in Mechanical Engineering',
   21,'wsu_aps',24,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 24 (mainstream) / 22 ECP. English 4. Mathematics or Technical Maths 4. Physical Science or Technical Science 4. Buffalo City campus.'),

  ('Diploma in ICT — Applications Development',
   19,'wsu_aps',22,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 22 with Maths / 24 with ML (mainstream). ECP: APS 18/20. English 4. Mathematics 3 or ML 5 (60-69%). Buffalo City campus.'),

  ('Diploma in ICT — Business Analysis',
   19,'wsu_aps',22,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 22 with Maths / 24 with ML. English 4. Mathematics 3 or ML 5. Buffalo City campus.'),

  ('Diploma in ICT — Communication Networks',
   19,'wsu_aps',22,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 22 with Maths / 24 with ML. English 4. Mathematics 3 or ML 5. Buffalo City campus.'),

  ('Diploma in ICT — Support Services',
   19,'wsu_aps',22,'Engineering, Built Environment and Information Technology',3,'diploma',6,NULL,
   'WSU APS 22 with Maths / 24 with ML. English 4. Mathematics 3 or ML 5. Buffalo City campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Law, Humanities & Social Sciences (Mthatha / Buffalo City)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Fashion',
   17,'wsu_aps',19,'Humanities, Social Sciences and Law',3,'diploma',6,NULL,
   'WSU APS 19. English 4. Mathematics 2 or Accounting 3. Portfolio evaluation and placement interview required. Buffalo City campus.'),

  ('Diploma in Fine Art',
   17,'wsu_aps',19,'Humanities, Social Sciences and Law',3,'diploma',6,NULL,
   'WSU APS 19. English 3 (40-49%). Portfolio of artworks and internal assessment/interview may apply. Buffalo City campus.'),

  ('Bachelor of Arts',
   22,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25. Achievement Level 4 in any 2 of: English, isiXhosa, Sesotho, Geography, History. Mthatha campus.'),

  ('Bachelor of Social Sciences in Anthropology',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences in Criminology',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences in Philosophy',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences in Political Studies',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences in Population Studies',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences in Sociology',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 24 ECP. English 4. 4 other subjects 4. Extended stream: English 3. Mthatha campus.'),

  ('Bachelor of Social Sciences — Psychology',
   21,'wsu_aps',25,'Humanities, Social Sciences and Law',3,'degree',7,NULL,
   'WSU APS 25. English 4. 4 other subjects 4. Mthatha campus.'),

  ('Bachelor of Laws (LLB)',
   23,'wsu_aps',26,'Humanities, Social Sciences and Law',4,'degree',8,NULL,
   'WSU APS 26. English 5 (60-69%). Mathematics 3 or ML 4 (50-59%). Mthatha campus.'),

  ('Bachelor of Psychology',
   23,'wsu_aps',26,'Humanities, Social Sciences and Law',4,'degree',8,NULL,
   'WSU APS 26. English 4. African Language 4. Life Sciences 4. Character reference check required. Mthatha campus.'),

  ('Bachelor of Social Work',
   23,'wsu_aps',26,'Humanities, Social Sciences and Law',4,'degree',8,NULL,
   'WSU APS 26. English 4. African Language 5 (60-69%). Life Sciences 4. Character reference check required. Mthatha campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Management & Public Administration Sciences (Butterworth / Buffalo City / Komani)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Higher Certificate in Versatile Broadcasting',
   16,'wsu_aps',18,'Management and Public Administration Sciences',1,'higher_certificate',5,NULL,
   'WSU APS 18. English 4. Any other language 3. 2 additional subjects 3. Buffalo City campus.'),

  ('Diploma in Administrative Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 4. ML 2 or Maths 4. 4 other subjects. Butterworth campus.'),

  ('Diploma in Hospitality Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 4. ML 4. 3 school subjects 3. Butterworth campus.'),

  ('Diploma in Human Resources Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 20 ECP. English 3. Maths 3 or ML 4. 2 school subjects 3. Butterworth/Komani campus.'),

  ('Diploma in Journalism',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 5 (60-69%). Any other language 4. 2 additional subjects 4. Buffalo City campus.'),

  ('Diploma in Local Government Finance',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 20 ECP. English 3. One of: Accounting 3, Maths 3, or ML 4. Butterworth/Komani campus.'),

  ('Diploma in Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 20 ECP. English 3. Accounting 3, Maths 3, or ML 4. Butterworth campus.'),

  ('Diploma in Marketing Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. Maths 3 or ML 4. 2 other subjects 3. Butterworth campus.'),

  ('Diploma in Policing',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. 4 other subjects 3. Butterworth campus.'),

  ('Diploma in Office Management & Technology',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 19 ECP. English 3. Maths 3 or ML 4. 2 other subjects 4. Butterworth campus.'),

  ('Diploma in Public Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. 4 other subjects 3. Butterworth/Komani campus.'),

  ('Diploma in Public Relations Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21 (mainstream) / 19 ECP. English 5 (60-69%). Other language 4. 2 subjects 4. Butterworth campus.'),

  ('Diploma in Small Business Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. Maths 3, Accounting 3, or ML 4. 2 other subjects 3. Butterworth campus.'),

  ('Diploma in Sport Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 3. 3 other subjects 3. Butterworth campus.'),

  ('Diploma in Tourism Management',
   18,'wsu_aps',21,'Management and Public Administration Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 4. Maths 3 or ML 4 (50-59%). 3 school subjects (any). Butterworth campus.'),

  ('Bachelor of Administration',
   22,'wsu_aps',25,'Management and Public Administration Sciences',3,'degree',7,NULL,
   'WSU APS 25. English 4 (50-59%). 4 other subjects 4. Butterworth campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Medicine & Health Sciences (Mthatha)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Medical Sciences',
   21,'wsu_aps',24,'Medicine and Health Sciences',3,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. Maths 4. Physical Science 4. Life Sciences 4. Any other subject 4. Mthatha campus.'),

  ('Bachelor of Medicine in Clinical Practice (Clinical Associate)',
   21,'wsu_aps',24,'Medicine and Health Sciences',3,'degree',7,NULL,
   'WSU APS 24. English 4. African Language 4. Maths 4. Physical Science 4. Life Sciences 4. Any other subject 4. Mthatha campus.'),

  ('Bachelor of Nursing',
   21,'wsu_aps',24,'Medicine and Health Sciences',4,'degree',8,NULL,
   'WSU APS 24. English 4. African Language 4. Maths 4. Physical Science 4. Life Sciences 4. Any other subject 4. Mthatha campus.'),

  ('Bachelor of Health Sciences in Medical Orthotics & Prosthetics',
   21,'wsu_aps',24,'Medicine and Health Sciences',4,'degree',8,NULL,
   'WSU APS 24. English 4. African Language 4. Maths 4. Physical Science 4. Life Sciences 4. Any other subject 4. Mthatha campus.'),

  ('Bachelor of Medicine and Bachelor of Surgery (MBChB)',
   26,'wsu_aps',30,'Medicine and Health Sciences',6,'degree',8,NULL,
   'WSU APS 30. English 5 (60-69%). African Language 5. Maths 5. Physical Science 5. Life Sciences 5. Any other subject 5. Additional selection criteria apply. Mthatha campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- WSU: Faculty of Natural Sciences (Mthatha / Buffalo City)
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Analytical Chemistry',
   19,'wsu_aps',22,'Natural Sciences',3,'diploma',6,NULL,
   'WSU APS 22 (mainstream) / 20 ECP. English 4. Mathematics 3. Physical Sciences 4. Buffalo City campus.'),

  ('Diploma in Consumer Sciences — Food & Nutrition',
   19,'wsu_aps',22,'Natural Sciences',3,'diploma',6,NULL,
   'WSU APS 22 (mainstream) / 20 ECP. English 4. Mathematics 3. Physical Sciences 4. Buffalo City campus.'),

  ('Diploma in Pest Management',
   18,'wsu_aps',21,'Natural Sciences',3,'diploma',6,NULL,
   'WSU APS 21. English 4. Mathematics 3. Life Sciences 3. Physical Sciences 3. Mthatha campus.'),

  ('BSc in Applied Mathematics',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 4. Mthatha campus.'),

  ('BSc in Applied Statistical Sciences',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 4. Mthatha campus.'),

  ('BSc in Biological Sciences',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 5 (60-69%). Life Sciences 5. Mthatha campus.'),

  ('BSc in Chemistry',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 5 (60-69%). Mthatha campus.'),

  ('BSc in Computer Science',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 4. Mthatha campus.'),

  ('BSc in Environmental Studies',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 4. Physical Sciences 4. Life Sciences or Agriculture or Tourism 4. Mthatha campus.'),

  ('BSc in Mathematics',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 4. Mthatha campus.'),

  ('BSc in Pest Management',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 4. Physical Sciences 4. Life Sciences 4. Mthatha campus.'),

  ('BSc in Physics',
   22,'wsu_aps',25,'Natural Sciences',3,'degree',7,NULL,
   'WSU APS 25 (mainstream) / 23 ECP. English 4. Mathematics 5 (60-69%). Physical Sciences 5 (60-69%). Mthatha campus.')

) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WSU';

-- ============================================================
-- KwaZulu-Natal Universities
-- ============================================================

INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES
  ('Durban University of Technology', 'DUT', 'KwaZulu-Natal', 'Durban',
   'https://www.dut.ac.za', 'https://www.cao.ac.za/apply', 0, '2025-09-30', true),
  ('Mangosuthu University of Technology', 'MUT', 'KwaZulu-Natal', 'Durban',
   'https://www.mut.ac.za', 'https://www.cao.ac.za/apply', 0, '2025-09-30', true),
  ('University of KwaZulu-Natal', 'UKZN', 'KwaZulu-Natal', 'Durban',
   'https://www.ukzn.ac.za', 'https://www.cao.ac.za/apply', 210, '2025-09-30', true)
ON CONFLICT DO NOTHING;

-- DUT: Faculty of Accounting and Informatics
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of ICT (BIT)',
   26,'nsc_aps',26,'Accounting and Informatics',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Maths 4. Two designated 20-credit subjects at Level 4 (not more than one lang). DBN Campus.'),
  ('Bachelor of ICT: Internet of Things (IoT)',
   26,'nsc_aps',26,'Accounting and Informatics',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Maths 4. Physical Sciences 4. Two designated 20-credit subjects at Level 4 (not more than one lang). DBN Campus.'),
  ('Diploma ICT: Applications Development',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 6. Three 20-credit subjects (not more than one lang). DBN and Indumiso campuses.'),
  ('Diploma ICT: Applications Development (Foundation Programme)',
   18,'nsc_aps',18,'Accounting and Informatics',4,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 3. Maths 3/Maths Lit 5. Three 20-credit subjects (not more than one lang). 4-year foundation entry. DBN Campus.'),
  ('Diploma ICT: Business Analysis',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4 AND Maths Lit 6. Three 20-credit subjects (not more than one lang). DBN and Indumiso campuses.'),
  ('Diploma in Business and Information Management',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4. Four 20-credit subjects (excl LO, not more than one lang). DBN and PMB campuses.'),
  ('Diploma in Accounting',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4 and Maths Lit 5 or Acc 4. Three 20-credit subjects (not more than one lang). DBN and PMB campuses.'),
  ('Diploma in Accounting (Foundation Programme)',
   18,'nsc_aps',18,'Accounting and Informatics',4,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4 or Acc 4. Three 20-credit subjects (not more than one lang). 4-year foundation entry. DBN and PMB campuses.'),
  ('Diploma in Business and Information Management (Foundation Programme)',
   18,'nsc_aps',18,'Accounting and Informatics',4,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4. Four 20-credit subjects (excl LO, not more than one lang). 4-year foundation entry. DBN Campus.'),
  ('Diploma in Internal Auditing',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 4. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Library and Information Studies',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3. Four 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Management Accounting',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3 or Acc 4. Three 20-credit subjects OR Maths 5, Acc 4, two 20-credit subjects. DBN and PMB campuses.'),
  ('Diploma in Taxation',
   20,'nsc_aps',20,'Accounting and Informatics',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 5 or Acc 4. Three 20-credit subjects (not more than one lang). DBN Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- DUT: Faculty of Applied Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Applied Science in Biotechnology',
   28,'nsc_aps',28,'Applied Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. One 20-credit subject (not more than one lang). NSC Points: 28. DBN Campus.'),
  ('Bachelor of Applied Science in Food Science and Technology',
   28,'nsc_aps',28,'Applied Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. One 20-credit subject (not more than one lang). NSC Points: 28. DBN Campus.'),
  ('Bachelor of Applied Science in Industrial Chemistry',
   26,'nsc_aps',26,'Applied Sciences',4,'degree',7,NULL,
   'NSC Degree. English 4. Maths 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Applied Science in Textile Science',
   26,'nsc_aps',26,'Applied Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Sport Science and Management',
   28,'nsc_aps',28,'Applied Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci or Phys Sci 4. Sport Sci 4. Three 20-credit subjects. NSC Points: 28. DBN Campus.'),
  ('Diploma in Shipping and Logistics',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 3. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Analytical Chemistry',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English 4. Maths 4. Phys Sci 4. DBN Campus.'),
  ('Diploma in Clothing Management',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Four 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Consumer Sciences in Food and Nutrition',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. One of Acc, Bus Stud, Consumer Stud, or Phys Sci or Life Sci. Two 20-credit subjects. DBN Campus.'),
  ('Diploma in Nautical Science',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Sustainable Horticulture and Landscaping',
   20,'nsc_aps',20,'Applied Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 3/Maths Lit 4. Life Sci 4. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Higher Certificate: Sport Management',
   24,'nsc_aps',24,'Applied Sciences',1,'higher_certificate',5,NULL,
   'NSC Higher Certificate. English HL/FAL 3. Maths or Phys Sci or Life Sci 4. Two 20-credit subjects (not more than one lang). NSC Points: 24. DBN Campus.'),
  ('Higher Certificate: Applied Sciences',
   20,'nsc_aps',20,'Applied Sciences',1,'higher_certificate',5,NULL,
   'NSC Higher Certificate. English 4. Maths 3. Phys Sci 3 OR Technical Maths 3 and Technical Science 3. DBN Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- DUT: Faculty of Arts and Design
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Applied Arts in Commercial Photography',
   24,'nsc_aps',24,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 3. Four recognised 20-credit subjects at Level 4. DBN Campus.'),
  ('Bachelor of Applied Arts in Screen Arts and Technology',
   36,'nsc_aps',36,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL 4/FAL 5. Four 20-credit subjects (not more than one lang). NSC Points: 36. DBN Campus.'),
  ('Bachelor of Design in Visual Communication Design',
   24,'nsc_aps',24,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 3. Four 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Education SP & FET: Economic and Management Sciences',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Accounting 4. Three 20-credit subjects (not more than one lang). NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Education SP & FET: Electrical Technology',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths or Tech Maths or Tech Sci 4. Electrical Tech 4. Three 20-credit subjects. NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Education SP & FET: Mechanical Technology',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Tech Maths or Maths or Phys Sci 4. Mechanical Tech 4 or Maths Lit 5. Three 20-credit subjects. NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Education SP & FET: Languages',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 5. IsiZulu 5 or IsiXhosa 5. Three 20-credit subjects. NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Education SP & FET: Natural Sciences',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci or Phys Sci 4. Two 20-credit subjects (not more than one lang). NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Education SP & FET: Civil Technology',
   28,'nsc_aps',28,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Tech Maths or Maths or Maths Lit 5. Civil Tech 4. Four 20-credit subjects (not more than one lang). NSC Points: 28. Indumiso Campus.'),
  ('Bachelor of Journalism',
   26,'nsc_aps',26,'Arts and Design',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 5. One other official language 4. Three 20-credit subjects at Level 4. DBN Campus.'),
  ('Diploma in Drama',
   24,'nsc_aps',24,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English 4. Another Language 4. Three 20-credit subjects (not more than one lang). NSC Points: 24. DBN Campus.'),
  ('Diploma in Fashion Design',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English 4. Four 20-credit subjects. DBN Campus.'),
  ('Diploma in Fine Art',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English 4. Four 20-credit subjects. DBN Campus.'),
  ('Diploma in Interior Design',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English 3. Four recognised 20-credit subjects at Level 3. DBN Campus.'),
  ('Diploma in Jewellery Design and Manufacture',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English 4. Four 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Language Practice',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'NSC Diploma. English HL 4/FAL 5 and IsiZulu or IsiXhosa or Afrikaans HL 4/FAL 5. Three 20-credit subjects. DBN Campus.'),
  ('Higher Certificate: Performing Arts Technology',
   20,'nsc_aps',20,'Arts and Design',1,'higher_certificate',5,NULL,
   'NSC Higher Certificate. English HL/FAL 3. Maths Lit 3. Three 20-credit subjects (other than LO, only one may be additional lang). DBN Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- DUT: Faculty of Engineering and the Built Environment
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor Built Environment: Urban and Regional Planning',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL 4/FAL 5. Geog, Hist, Phys Sci or Life Sci 4. One 20-credit subject that is not a language 4. DBN Campus.'),
  ('Bachelor of Engineering Technology in Chemical Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Engineering Technology in Electronic Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Maths 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Engineering Technology in Industrial Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Engineering Technology in Mechanical Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Engineering Technology in Power Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of Engineering Technology in Civil Engineering',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of the Built Environment in Architecture',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Maths 4. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of the Built Environment in Construction Studies',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 5. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of the Built Environment in Geomatics',
   26,'nsc_aps',26,'Engineering and the Built Environment',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Maths 4. Two recognised 20-credit subjects. DBN Campus.'),
  ('Diploma in Engineering Technology in Civil Engineering',
   22,'nsc_aps',22,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 4. Three 20-credit subjects (not more than one lang). Indumiso Campus.'),
  ('Diploma in Built Environment in Construction Studies',
   22,'nsc_aps',22,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4/Technical Maths 5. Phys Sci 4/Technical Sci 4. Three 20-credit subjects (not more than one lang). Indumiso Campus.'),
  ('Diploma in Pulp and Paper Technology',
   20,'nsc_aps',20,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Phys Sci 4. Maths 4. Two 20-credit subjects (not more than one lang). DBN Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- DUT: Faculty of Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Child and Youth Care',
   24,'nsc_aps',24,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English HL/FAL 4. Four 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of H/Scs in Environmental Health',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of H/Scs in Radiography: Diagnostic',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. One 20-credit subject. NSC Points: 28. Closing date 31 August. DBN Campus.'),
  ('Bachelor of H/Scs in Radiography: Sonography',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. One 20-credit subject. NSC Points: 28. Closing date 31 August. DBN Campus.'),
  ('Bachelor of H/Scs in Radiography: Therapy and Oncology',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. One 20-credit subject. NSC Points: 28. Closing date 31 August. DBN Campus.'),
  ('Bachelor of H/Scs in Clinical Technology',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of H/Scs in Emergency Medical Care',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). NSC Points: 30. DBN Campus.'),
  ('Bachelor of H/Scs in Homeopathy',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. Two additional 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor of H/Scs in Chiropractic',
   26,'nsc_aps',26,'Health Sciences',6,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. Two additional 20-credit subjects (not more than one lang). 6-year programme. Closing date 15 August. DBN Campus.'),
  ('Bachelor of H/Scs in Medical Laboratory Science',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Maths 4. Life Sci 4. Phys Sci 4. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Bachelor in Nursing',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'NSC Degree/Bachelors Pass. English 4. Life Sci 4. Maths 4/Maths Lit 6 or Phys Sci 4. Two additional 20-credit subjects (only one may be additional lang). NSC Points: 28. Indumiso Campus.'),
  ('Diploma in Somatology',
   20,'nsc_aps',20,'Health Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Life Sci 4. Maths 3/Maths Lit 5. Two additional 20-credit subjects (only one may be lang). DBN Campus.'),
  ('Higher Certificate in Dental Assisting',
   20,'nsc_aps',20,'Health Sciences',1,'higher_certificate',5,NULL,
   'NSC Higher Certificate. English HL/FAL 3. Maths 3/Maths Lit 5. Life Sci OR Phys Sci 3. Two 20-credit subjects (not more than one lang). DBN Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- DUT: Faculty of Management Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Management Sciences: Business Administration',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN and PMB campuses.'),
  ('Diploma in Management Sciences: Business Law',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Management Sciences: Human Resources',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN and PMB campuses.'),
  ('Diploma in Management Sciences: Marketing',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3 or Maths Lit 5 or Accounting 3. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Management Sciences: Operations',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Public Relations and Communication Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN and PMB campuses.'),
  ('Diploma in Management Sciences: Retail',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL 3/FAL 4. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Public Administration: Disaster and Risk Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Public Administration: Local Government',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Public Administration: Public Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN and PMB campuses.'),
  ('Diploma in Public Administration: Supply Chain Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Maths 3/Maths Lit 4. Three 20-credit subjects (not more than one lang). NSC Points: 25. DBN Campus.'),
  ('Diploma in Catering Management',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 2/Maths Lit 3. Acc 3. Two 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Hospitality Management',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 2/Maths Lit 3. Acc 3. Three 20-credit subjects (not more than one lang). DBN Campus.'),
  ('Diploma in Tourism Management',
   26,'nsc_aps',26,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 4. Maths 2/Maths Lit 2. Three recognised 20-credit subjects. NSC Points: 26. DBN Campus.'),
  ('Diploma in Eco Tourism',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'NSC Diploma. English HL/FAL 3. Maths 3 and Acc 3 or Life Sci 4 or Agric Sci 4. One 20-credit subject (not more than one lang). NSC Points: 25. PMB Campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'DUT';

-- MUT: Faculty of Engineering
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Chemical Engineering',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 1st Additional 4. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Civil Engineering',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 1st Additional 4. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Building',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 1st Additional 4. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Electrical Engineering',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 1st Additional 4. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Mechanical Engineering',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 1st Additional 4. Engineering Graphics and Design 4. All at 50% and above. Umlazi campus.'),
  ('Diploma in Surveying',
   20,'nsc_aps',20,'Engineering',3,'diploma',6,NULL,
   'Maths 4. Physical Science 4. English 4. All at 50% and above. Further departmental screening. Umlazi campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'MUT';

-- MUT: Faculty of Natural Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Applied Sciences in Nature Conservation',
   22,'nsc_aps',22,'Natural Sciences',3,'degree',7,NULL,
   'Maths 3. English 5. Life Sciences 5. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Bachelor of Health Sciences: Medical Laboratory Science',
   24,'nsc_aps',24,'Natural Sciences',3,'degree',7,NULL,
   'Maths 4. English 4. Life Sciences 4. Physical Science 4. All at 50% and above. HPCSA registration required. Umlazi campus.'),
  ('Bachelor of Science in Environmental Health',
   24,'nsc_aps',24,'Natural Sciences',4,'degree',7,NULL,
   'Maths 4. English 4. Life Sciences 4. Physical Science 4. Recommended: Geography 4. Agricultural Science 4. HPCSA registration. Umlazi campus.'),
  ('Diploma in Agriculture',
   20,'nsc_aps',20,'Natural Sciences',3,'diploma',6,NULL,
   'Maths 3 OR Maths Literacy 4. English 4. Physical Science 3. Agricultural Science 4 OR Life Science 4. All at 50% and above. Umlazi campus.'),
  ('Diploma in Analytical Chemistry',
   20,'nsc_aps',20,'Natural Sciences',3,'diploma',6,NULL,
   'Maths 4. English 4. Physics 4. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Community Extension',
   20,'nsc_aps',20,'Natural Sciences',3,'diploma',6,NULL,
   'English 4. Agricultural Science 4 OR Consumer Studies 4 OR Life Science 4 OR Geography 4 OR Economics 4. All at 50% and above. Umlazi campus.'),
  ('Diploma in Information Technology',
   18,'nsc_aps',18,'Natural Sciences',3,'diploma',6,NULL,
   'English 3. Maths 3 OR Maths Literacy 5. All at 50% and above. Further departmental screening. Umlazi campus.'),
  ('Diploma in Nature Conservation',
   20,'nsc_aps',20,'Natural Sciences',3,'diploma',6,NULL,
   'English 4. Maths 3. Agricultural Science 3 OR Life Science 4. All at 50% and above. Further departmental screening. Umlazi campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'MUT';

-- MUT: Faculty of Management Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Diploma in Accounting',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Accounting 4. Maths 3 OR Maths Literacy 6. Minimum 25 APS required for all Management Sciences programmes. Umlazi campus.'),
  ('Diploma in Cost and Management Accounting',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Accounting 4. Maths 3 OR Maths Literacy 6. Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Local Government Finance',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Accounting 4. Maths 3 OR Maths Literacy 6. Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Public Finance and Accounting',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Accounting 4. Maths 3 OR Maths Literacy 6. Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Human Resource Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 1st Additional 4. Accounting 4. Maths 3 OR Maths Literacy 4. Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Marketing',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Maths 3 OR Maths Literacy 5 OR Accounting 3. Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Office Management and Technology',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Any five accredited subjects (typing or computer studies an advantage). Minimum 25 APS. Umlazi campus.'),
  ('Diploma in Public Management',
   25,'nsc_aps',25,'Management Sciences',3,'diploma',6,NULL,
   'English 4. Any five accredited subjects. Minimum 25 APS. Umlazi campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'MUT';

-- UKZN: College of Agriculture, Engineering and Science
-- Note: UKZN uses an 8-point APS scale (90-100%=8 pts, LO excluded, max=48).
-- aps_minimum values converted to standard 7-point scale (native x 7/8).
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('B Sc Engineering: Agricultural',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College and PMB campuses.'),
  ('B Sc Engineering: Chemical',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College campus.'),
  ('B Sc Engineering: Civil',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College and PMB campuses.'),
  ('B Sc Engineering: Computer',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College and PMB campuses.'),
  ('B Sc Engineering: Electrical',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College and PMB campuses.'),
  ('B Sc Engineering: Electronic',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College campus.'),
  ('B Sc Engineering: Mechanical',
   29,'ukzn_aps',33,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths and Phys Sci 5 (at least 65%) and English LO 4. Two from designated list. Howard College and PMB campuses.'),
  ('B Sc Land Surveying',
   26,'ukzn_aps',30,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'NSC-Deg with Maths and Phys Sci 5 and English LO 4. Howard College campus.'),
  ('B Architectural Studies',
   26,'ukzn_aps',30,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Maths 5, English and LO 4 and one designated subject at HL/FAL 5. Portfolio, essay and questionnaire required. Howard College campus.'),
  ('B Sc Agricultural Economics',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'NSC-Deg with Engl, LO, Maths and Agric Sci or Econ or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Agricultural Management',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'NSC-Deg with Engl, LO, Maths and Agric Sci or Econ or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Agric: Agribusiness',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Maths, Engl, LO and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Agric: Animal and Poultry Science',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'NSC-Deg with Maths, Engl, LO and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Agric: Plant Sciences',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'NSC-Deg with Maths, Engl, LO and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Stream M: Mathematics',
   26,'ukzn_aps',30,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Maths 5 and Engl and LO 4 and Agric Sci or Life Sci or Phys Sci 4. Howard College and PMB campuses.'),
  ('B Sc Stream: Life and Earth Sciences',
   24,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'NSC-Deg with Maths and Engl, LO 4. Agric Sci or Life Sci or Phys Sci 4. Howard College and PMB campuses.'),
  ('B Sc Computer Science and Information Technology',
   26,'ukzn_aps',30,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Maths 5, Engl, LO and Agric Sci or Life Sci or Phys Sci 4. Howard College and Westville campuses.'),
  ('B Sc Geographic Information Systems and Earth Observation',
   26,'ukzn_aps',30,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Maths 5, Engl and LO 4 and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Applied Chemistry',
   24,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'NSC-Deg with Engl, LO, Maths and Agric Sci or Life Sci or Phys Sci 4. Westville campus.'),
  ('B Sc Chemistry and Chemical Technology',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl, LO, Maths and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Environmental Science',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl, LO 4. Maths 4. Agric Sci or Life Sci or Phys Sci 4. Howard College and PMB campuses.'),
  ('B Sc Environmental and Earth Science',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl, LO 4. Maths 4. Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('B Sc Geological Science',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl, LO 4. Maths 4. Agric Sci or Life Sci or Phys Sci 4. Westville campus.'),
  ('B Sc Marine Biology',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl, LO 4. Maths 4. Agric Sci or Life Sci or Phys Sci 4. Westville campus.'),
  ('B Sc Augmented Programme',
   23,'ukzn_aps',26,'Agriculture, Engineering and Science',4,'degree',7,NULL,
   'UKZN APS 26-48. NSC-Deg with Engl and LO 4. Maths 4. Agric Sci or Life Sci or Phys Sci 3. Only Quintile 1-2 school applicants. PMB and Westville campuses.'),
  ('B Sc Engineering Access',
   25,'ukzn_aps',28,'Agriculture, Engineering and Science',1,'degree',7,NULL,
   'UKZN APS 28. NSC-Deg with Engl and LO 4 and Maths, Phys Sci 4. Only Quintile 1-2 school applicants. 1-year access into BSc Engineering. Howard College campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UKZN';

-- UKZN: College of Health Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Audiology',
   26,'ukzn_aps',30,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Maths and Life Sci or Phys Sci 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Speech-Language Therapy',
   26,'ukzn_aps',30,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Maths and Life Sci or Phys Sci 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Dental Therapy',
   26,'ukzn_aps',30,'Health Sciences',3,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4 and Life Sci and Maths 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Medical Science: Anatomy',
   26,'ukzn_aps',30,'Health Sciences',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl, LO 4, Life Sci, Maths and Phys Sci 4 (Choices 1-3 prioritised). Westville campus.'),
  ('Bachelor of Medical Science: Physiology',
   26,'ukzn_aps',30,'Health Sciences',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl, LO 4, Life Sci, Maths and Phys Sci 4 (Choices 1-3 prioritised). Westville campus.'),
  ('Bachelor of Occupational Therapy',
   26,'ukzn_aps',30,'Health Sciences',4,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4 and Maths 3 and Life Sci or Phys Sci 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Optometry',
   29,'ukzn_aps',33,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Engl, LO, Maths and Life Sci or Phys Sci 4 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Oral Hygiene',
   26,'ukzn_aps',30,'Health Sciences',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Life Sci and Maths 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Pharmacy',
   29,'ukzn_aps',33,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Engl, LO, Maths and Life Sci or Phys Sci 4 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Physiotherapy',
   26,'ukzn_aps',30,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Maths 3 and Life Sci or Phys Sci 3 (Choices 1-3 only). Westville campus.'),
  ('Bachelor of Science: Dietetics and Human Nutrition',
   24,'ukzn_aps',28,'Health Sciences',4,'degree',7,NULL,
   'NSC-Deg with Engl and LO and Maths 4 and Agric Sci or Life Sci or Phys Sci 4. PMB campus.'),
  ('Bachelor of Sport Science',
   26,'ukzn_aps',30,'Health Sciences',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Maths/Maths Lit 3. Westville campus.'),
  ('Bachelor of Nursing',
   26,'ukzn_aps',30,'Health Sciences',4,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and Maths/Maths Lit 3 and Life Sci 4 (Choice 1 only). Howard College campus.'),
  ('Bachelor of Medicine and Bachelor of Surgery (MBBCh)',
   35,'ukzn_aps',40,'Health Sciences',6,'degree',8,NULL,
   'NSC-Deg with Engl, Life Sci, Maths and Phys Sci 5 and LO 4. At least 65% aggregate. Closing date 30 June. Nelson R Mandela School of Medicine campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UKZN';

-- UKZN: College of Humanities
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BEd: Foundation Phase',
   24,'ukzn_aps',28,'Humanities',4,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4. IsiZulu L4 (50-59%) in Maths Literacy or Rating 3 (40-49%) in Maths. Edgewood campus.'),
  ('BEd: Intermediate Phase',
   24,'ukzn_aps',28,'Humanities',4,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4. Level 5 in any two of Maths, Maths Lit, Technology, Life Science, Physical Science. Edgewood campus.'),
  ('BEd: Senior Phase and Further Education and Training',
   25,'ukzn_aps',28,'Humanities',4,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4. Level 5 in any two NSC subjects pertaining to the package selected. Edgewood campus.'),
  ('BA: General Studies',
   24,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4 and one of: Bus Stud, Cons Stud, Drama Arts, Econ, Geog, Hist, Info Tech, Life Sci, Maths/Maths Lit, Music, Religion Stud, Vis Arts, any lang HL/FAL 5. Howard College and PMB campuses.'),
  ('BA: Cultural and Heritage Tourism',
   24,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. Howard College campus.'),
  ('BA in Music',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28. NSC-Deg with English and LO 4. Auditions required for music programmes. Howard College campus.'),
  ('BA in Music Foundation',
   19,'ukzn_aps',22,'Humanities',4,'degree',7,NULL,
   'UKZN APS 22. NSC-Deg with English and LO 4. Foundation programme for students from disadvantaged schools with no formal music training. Howard College campus.'),
  ('Bachelor of Social Science: General Studies',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. Howard College and PMB campuses.'),
  ('Bachelor of Social Science: Housing',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Eng and Maths Level 4. Howard College campus.'),
  ('Bachelor of Social Work',
   25,'ukzn_aps',28,'Humanities',4,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. Howard College and PMB campuses.'),
  ('BA: Philosophy, Politics and Law',
   26,'ukzn_aps',30,'Humanities',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. Howard College and PMB campuses.'),
  ('BA: International Studies',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. PMB campus.'),
  ('BA: Visual Art',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. PMB campus.'),
  ('Bachelor of Social Science: Government, Business and Ethics',
   25,'ukzn_aps',28,'Humanities',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and one of the designated subjects at Level 5. PMB campus.'),
  ('Bachelor of Theology',
   22,'ukzn_aps',25,'Humanities',3,'degree',7,NULL,
   'NSC-Deg with Engl and LO 4. PMB campus.'),
  ('Humanities Extended Curriculum (B Soc Sc)',
   18,'ukzn_aps',20,'Humanities',4,'degree',7,NULL,
   'UKZN APS 20-27. NSC-Deg with Engl and LO 4. Only Quintile 1-2 school applicants. 4-year extended degree. Howard College and PMB campuses.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UKZN';

-- UKZN: College of Law and Management Studies
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Laws (LLB)',
  28,'ukzn_aps',32,'Law and Management',4,'degree',8,NULL,
   'UKZN APS 32-48. NSC-Deg with Engl HL 5/FAL 6 and Maths 3/Maths Lit 5 and LO 4. Howard College and PMB campuses.'),
  ('Bachelor of Administration',
  25,'ukzn_aps',28,'Law and Management',3,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Engl and LO 4 and Maths 3. Westville campus.'),
  ('Bachelor of Business Administration',
  23,'ukzn_aps',26,'Law and Management',3,'degree',7,NULL,
   'UKZN APS 26-48. NSC-Deg with Engl and LO 4 and Maths 3. Westville and PMB campuses.'),
  ('Bachelor of Business Science in Finance',
  29,'ukzn_aps',33,'Law and Management',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths 6 and Engl and LO 4. Westville campus.'),
  ('Bachelor of Business Science in Investment Science',
  29,'ukzn_aps',33,'Law and Management',4,'degree',7,NULL,
   'UKZN APS 33-48. NSC-Deg with Maths 6 and Engl and LO 4. Westville campus.'),
  ('B Com: General',
  26,'ukzn_aps',30,'Law and Management',3,'degree',7,NULL,
   'UKZN APS 30-48. NSC-Deg with Engl, LO 4 and Maths 4. PMB and Westville campuses.'),
  ('B Com: Accounting',
  28,'ukzn_aps',32,'Law and Management',3,'degree',7,NULL,
   'UKZN APS 32-48. NSC-Deg with Maths 5 and Engl and LO 4. PMB and Westville campuses.'),
  ('B Com 4: General Extended Curriculum',
  23,'ukzn_aps',26,'Law and Management',4,'degree',7,NULL,
   'UKZN APS 26-48. NSC-Deg with Maths 3, LO and Engl 4. Preference to students from Quintile 1-3 schools. PMB and Westville campuses.'),
  ('B Com 4: Accounting Extended Curriculum',
  25,'ukzn_aps',28,'Law and Management',4,'degree',7,NULL,
   'UKZN APS 28-48. NSC-Deg with Maths 4, LO and Engl 4. Preference to students from Quintile 1-3 schools. PMB and Westville campuses.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UKZN';

-- University of Zululand
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES
  ('University of Zululand', 'UNIZULU', 'KwaZulu-Natal', 'Richards Bay',
   'https://www.unizulu.ac.za', 'https://www.cao.ac.za/apply', 250, '2025-10-31', true)
ON CONFLICT DO NOTHING;

-- UNIZULU: Faculty of Humanities and Social Sciences
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('BA Environmental Planning and Development',
   28,'nsc_aps',28,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Geography 4. Four 20-credit subjects. KwaDlangezwa campus.'),
  ('BA in Intercultural Communication',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('Diploma in Media Studies',
   24,'nsc_aps',24,'Humanities and Social Sciences',3,'diploma',6,NULL,
   'NSC Dip. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Correctional Studies',
   28,'nsc_aps',28,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 5. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Industrial Sociology',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (Anthropology and History)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (Geography and History)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (Geography and Tourism)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (History and IsiZulu)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (Linguistics and English)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA (Philosophy and Psychology)',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA in Psychology',
   28,'nsc_aps',28,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Social Science (Geography/History) 4. Four 20-credit subjects. KwaDlangezwa campus.'),
  ('BA in Drama, Theatre and Performance',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Dramatic Art or Visual Art 4. Four 20-credit subjects. KwaDlangezwa campus.'),
  ('Diploma in Public Relations Management',
   24,'nsc_aps',24,'Humanities and Social Sciences',3,'diploma',6,NULL,
   'NSC Dip. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Development Studies',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Information Science',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('Bachelor of Library and Information Science',
   26,'nsc_aps',26,'Humanities and Social Sciences',4,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('Bachelor of Social Work',
   28,'nsc_aps',28,'Humanities and Social Sciences',4,'degree',7,NULL,
   'NSC Deg. English HL 4/FAL 5. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Sociology',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Five 20-credit subjects. KwaDlangezwa campus.'),
  ('Bachelor of Social Sciences in Political and International Studies',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Geography 4. History 4. Economics/Maths Literacy 4. Two 20-credit subjects. KwaDlangezwa campus.'),
  ('BA Tourism Studies',
   26,'nsc_aps',26,'Humanities and Social Sciences',3,'degree',7,NULL,
   'NSC Deg. English 4. Tourism or Geography 4. Four 20-credit subjects. KwaDlangezwa campus.'),
  ('Diploma in Tourism Management',
   24,'nsc_aps',24,'Humanities and Social Sciences',3,'diploma',6,NULL,
   'NSC Dip. English 4. Five subjects including Maths/Maths Lit, Tourism and/or Geog, Hosp Stud, Bus Stud and/or Acc at Level 4. KwaDlangezwa campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UNIZULU';

-- UNIZULU: Faculty of Education
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('Bachelor of Education: Foundation Phase Teaching',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'NSC Deg. IsiZulu HL 4. English FAL 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('Bachelor of Education: Intermediate Phase Teaching (Languages and Humanities)',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'NSC Deg. IsiZulu 4. English 4. Geography 4 and History 4. KwaDlangezwa campus.'),
  ('Bachelor of Education: Intermediate Phase Teaching (Languages, Maths, Natural Science and Technology)',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'NSC Deg. IsiZulu FAL/HL 4. English HL/FAL 4. Maths 4 and Phys Sci 3 OR Maths 3 and Phys Sci 4. KwaDlangezwa campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UNIZULU';

-- UNIZULU: Faculty of Commerce, Administration and Law
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('B Admin: Public Administration and Business Management',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Admin: Public Administration and Economics',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Admin: Public Administration and Human Resources',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Admin: Public Administration and Political Science',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Accounting and Economics)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Accounting and Economics) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Accounting) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Banking and Business Management)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Banking and Business Management) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Business Management and Accounting)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Business Management and Accounting) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Business Management and Economics)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Business Management and Economics) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Business Management and Human Resource Management) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Economics and Banking)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Economics and Banking) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Economics and Human Resource Management)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Economics and Human Resources Management) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com (Human Resource Management and Business Management)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 6. KwaDlangezwa campus.'),
  ('B Com (Management Information Systems)',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 4. KwaDlangezwa campus.'),
  ('B Com (Management Information Systems) 4 years',
   26,'nsc_aps',26,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('B Com Accounting Science',
   28,'nsc_aps',28,'Commerce, Administration and Law',4,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 4. KwaDlangezwa campus.'),
  ('B Com in Accounting',
   28,'nsc_aps',28,'Commerce, Administration and Law',3,'degree',7,NULL,
   'NSC Deg Endorsement. English 4. Maths 4. KwaDlangezwa campus.'),
  ('Bachelor of Laws (LLB)',
   30,'nsc_aps',30,'Commerce, Administration and Law',4,'degree',8,NULL,
   'NSC Deg Endorsement. English 4. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('Diploma in Co-Operatives Management',
   24,'nsc_aps',24,'Commerce, Administration and Law',3,'diploma',6,NULL,
   'NSC Dip Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('Diploma in Logistics Management',
   24,'nsc_aps',24,'Commerce, Administration and Law',3,'diploma',6,NULL,
   'NSC Dip Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('Diploma in Transport Management',
   24,'nsc_aps',24,'Commerce, Administration and Law',3,'diploma',6,NULL,
   'NSC Dip Endorsement. English 3. Maths 3/Maths Lit 4. KwaDlangezwa campus.'),
  ('Higher Certificate in Accountancy',
   22,'nsc_aps',22,'Commerce, Administration and Law',1,'higher_certificate',5,NULL,
   'NSC Certificate Endorsement. English 3. Maths 3/Maths Lit 4. 1 year. KwaDlangezwa campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UNIZULU';

-- UNIZULU: Faculty of Science, Agriculture and Engineering
INSERT INTO faculties
  (university_id, name, aps_minimum, scoring_system, native_score_minimum,
   field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('B Consumer Science: Extension and Rural Development',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. LO 4. Life Sci OR Agric Sci 4. KwaDlangezwa campus.'),
  ('B Consumer Science: Hospitality and Tourism',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. LO 4. KwaDlangezwa campus.'),
  ('B Eng Electrical Engineering',
   30,'nsc_aps',30,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 5. KwaDlangezwa campus.'),
  ('B Eng Electrical Engineering and Computer Engineering',
   30,'nsc_aps',30,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 5. KwaDlangezwa campus.'),
  ('B Eng Mechanical Engineering',
   30,'nsc_aps',30,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 5. KwaDlangezwa campus.'),
  ('B Eng Mechatronic Engineering',
   30,'nsc_aps',30,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 5. KwaDlangezwa campus.'),
  ('B Nursing Science',
   30,'nsc_aps',30,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Life Sciences 4. Maths Level 3 or Maths Literacy Level 4. KwaDlangezwa campus.'),
  ('B Sc Agric: Agronomy',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Agric: Animal Science',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Agricultural Economics: Agribusiness Management',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Applied Mathematics with Computer Science',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Applied Mathematics with Hydrology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Applied Mathematics with Mathematics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Applied Mathematics with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Applied Mathematics with Statistics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Augmented: Life Sciences',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 3. Maths 3. Physical Sciences 3. Life Sciences or Agric Sciences 3. 4-year extended programme. KwaDlangezwa campus.'),
  ('B Sc Augmented: Physical Sciences',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 3. Maths 3. Physical Sciences 3. 4-year extended programme. KwaDlangezwa campus.'),
  ('B Sc Biochemistry with Botany',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Biochemistry with Chemistry',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English HL/FAL 4. Maths 5. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Biochemistry with Human Movement Science',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Biochemistry with Microbiology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Biochemistry with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Botany with Geography',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Geography 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Botany with Hydrology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Botany with Microbiology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Botany with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Chemistry with Computer Science',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Chemistry with Hydrology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Chemistry with Mathematics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Chemistry with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Chemistry with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English HL/FAL 4. Maths 5. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Computer Science with Hydrology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Computer Science with Mathematics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Computer Science with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Computer Science with Statistics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Geography with Hydrology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Geography 4. KwaDlangezwa campus.'),
  ('B Sc Geography with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. Geography 4. KwaDlangezwa campus.'),
  ('B Sc Geography with Statistics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. Geography 4. KwaDlangezwa campus.'),
  ('B Sc Geography with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Geography 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Human Movement Science with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English HL/FAL 4. Maths 5. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Human Movement Science with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Hydrology with Microbiology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Hydrology with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Hydrology with Statistics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Hydrology with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Mathematics with Physics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Mathematics with Statistics',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 5. Physical Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Microbiology with Human Movement Science',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 4. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Microbiology with Zoology',
   28,'nsc_aps',28,'Science, Agriculture and Engineering',3,'degree',7,NULL,
   'NSC Deg. English 4. Maths 4. Physical Sciences 3. Life Sciences or Agric Sciences 4. KwaDlangezwa campus.'),
  ('B Sc Foundation',
   26,'nsc_aps',26,'Science, Agriculture and Engineering',4,'degree',7,NULL,
   'NSC Deg. English 3. Maths 3. Physical Sciences 2. Agric Sciences or Life Sciences 3. 4-year foundation programme. KwaDlangezwa campus.'),
  ('Diploma in Hospitality Management',
   26,'nsc_aps',26,'Science, Agriculture and Engineering',3,'diploma',6,NULL,
   'NSC Dip. English 4. Four 20-credit subjects (excl lang) at Level 3. KwaDlangezwa campus.'),
  ('Diploma in Sport and Exercise Technology',
   26,'nsc_aps',26,'Science, Agriculture and Engineering',3,'diploma',6,NULL,
   'NSC Dip. English HL 4/FAL 3. Three subjects from the designated list at Level 3. KwaDlangezwa campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UNIZULU';

-- ============================================================
-- GAUTENG UNIVERSITIES
-- ============================================================

-- SMU (Sefako Makgatho Health Sciences University)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'Sefako Makgatho Health Sciences University', 'SMU', 'Gauteng', 'Ga-Rankuwa',
  'https://www.smu.ac.za', 'https://www.smu.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  ('MBChB',
   38,'nsc_aps',38,'School of Medicine',6,'degree',8,NULL,
   'APS includes LO. Maths 6. Physical Sciences 6. Life Sciences 6. English 6. Additional subject 5. Additional subject 4. LO 5.'),
  ('MBChB Extended Curriculum Programme',
   32,'nsc_aps',32,'School of Medicine',6,'degree',8,NULL,
   'APS includes LO. Quintile 1-2 Black students only. Maths 5. Physical Sciences 5. Life Sciences 5. English 5. LO 4. Additional subjects 4 each. 1-year foundation then mainstream MBChB.'),
  ('Diploma in Emergency Medical Care',
   18,'nsc_aps',18,'School of Health Care Sciences',2,'diploma',6,NULL,
   'APS includes LO. English 3. Maths 3. Life Sciences 3. Physical Sciences 3. Additional subjects 3 each.'),
  ('Higher Certificate in Emergency Medical Care',
   16,'nsc_aps',16,'School of Health Care Sciences',1,'higher_certificate',5,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. LO 3.'),
  ('Bachelor of Diagnostic Radiography',
   24,'nsc_aps',24,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4.'),
  ('Bachelor of Dental Surgery (BDS)',
   37,'nsc_aps',37,'School of Oral Health Sciences',5,'degree',8,NULL,
   'APS includes LO. Maths 6. Physical Sciences 6. Life Sciences 6. English 5. Additional subjects 5 and 4. LO 5.'),
  ('Bachelor of Dental Therapy (BDT)',
   28,'nsc_aps',28,'School of Oral Health Sciences',3,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Additional subjects 4 each. LO 4.'),
  ('Bachelor of Oral Hygiene (BOH)',
   28,'nsc_aps',28,'School of Oral Health Sciences',3,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Additional subjects 4 each. LO 4.'),
  ('Bachelor of Pharmacy (BPharm)',
   32,'nsc_aps',32,'School of Pharmacy',4,'degree',8,NULL,
   'APS includes LO. Maths 5. Physical Sciences 5. Life Sciences 5. English 5. Accounting or Economics 4. Additional subject 4. LO 4.'),
  ('Bachelor of Nursing and Midwifery',
   26,'nsc_aps',26,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. English 5. Maths 4. Physical Sciences 4. Life Sciences 4. Additional subject 4. Additional subject 3. LO 3.'),
  ('Bachelor of Occupational Therapy',
   25,'nsc_aps',25,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Additional subjects 3 each. LO 3.'),
  ('BSc Physiotherapy',
   28,'nsc_aps',28,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Additional subjects 4 each. LO 4.'),
  ('Bachelor of Audiology',
   25,'nsc_aps',25,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. English 4. Life Sciences 4. Home or First Additional Language 4. LO 3. Additional subjects 3 each.'),
  ('Bachelor of Speech-Language Pathology',
   25,'nsc_aps',25,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. English 4. Life Sciences 4. Home or First Additional Language 4. LO 3. Additional subjects 3 each.'),
  ('BSc Dietetics',
   25,'nsc_aps',25,'School of Health Care Sciences',4,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Additional subjects 3 each. LO 3.'),
  ('BSc',
   28,'nsc_aps',28,'School of Science and Technology',3,'degree',7,NULL,
   'APS includes LO. Maths 5. Physical Sciences 4. Life Sciences 4. English 4. Two additional subjects 4 each.'),
  ('BSc Extended Curriculum Programme',
   26,'nsc_aps',26,'School of Science and Technology',4,'degree',7,NULL,
   'APS includes LO. Maths 4. Physical Sciences 4. Life Sciences 4. English 4. Two additional subjects 4 each. 4-year extended programme.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SMU';

-- TUT (Tshwane University of Technology)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'Tshwane University of Technology', 'TUT', 'Gauteng', 'Pretoria',
  'https://www.tut.ac.za', 'https://www.tut.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Arts and Design
  ('Dip (Commercial Photography)',
   22,'nsc_aps',22,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 3.'),
  ('Dip (Fashion Design and Technology)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 3.'),
  ('Dip (Fine and Applied Arts)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 3.'),
  ('Dip (Integrated Communication Design)',
   24,'nsc_aps',24,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Interior Design)',
   22,'nsc_aps',22,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Jewellery Design and Manufacture)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 3.'),
  ('Dip (Motion Picture Production)',
   22,'nsc_aps',22,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Performing Arts) (Dance)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Performing Arts) (Jazz Music)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Performing Arts) (Opera)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Performing Arts) (Technical Theatre and Design)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Performing Arts) (Theatre Arts and Performance)',
   20,'nsc_aps',20,'Arts and Design',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('HCert (Music)',
   18,'nsc_aps',18,'Arts and Design',1,'higher_certificate',5,NULL,
   'LO excluded. English 3.'),
  -- Faculty of Economics and Finance
  ('Dip (Accounting)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Accounting or Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Economics)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Financial Management)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Accounting or Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Financial Planning)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Accounting, Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Internal Auditing)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Accounting or Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Public Finance)',
   22,'nsc_aps',22,'Economics and Finance',3,'diploma',6,NULL,
   'LO excluded. English 4. Accounting, Maths or Technical Maths 4.'),
  ('HCert (Accounting)',
   22,'nsc_aps',22,'Economics and Finance',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  -- Faculty of Engineering and the Built Environment
  ('Bachelor of Architecture (BArch)',
   22,'nsc_aps',22,'Engineering and the Built Environment',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  ('Bachelor of Geomatics (BGeomatics)',
   25,'nsc_aps',25,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Chemical Engineering)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Civil Engineering)',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Electrical Engineering)',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Industrial Engineering)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Materials Engineering: Polymer Technology)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Mechanical Engineering)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Mechatronics Engineering)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('BEngTech (Metallurgical Engineering)',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Building Science)',
   25,'nsc_aps',25,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths 3. Physical Sciences or Technical Sciences 3.'),
  ('Dip (Civil Engineering)',
   25,'nsc_aps',25,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Electrical Engineering)',
   26,'nsc_aps',26,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Geomatics)',
   22,'nsc_aps',22,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Industrial Design)',
   21,'nsc_aps',21,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  ('HCert (Construction Engineering: Material Test)',
   20,'nsc_aps',20,'Engineering and the Built Environment',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('HCert (Construction Engineering: Water and Waste)',
   20,'nsc_aps',20,'Engineering and the Built Environment',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('HCert (Electrical Engineering)',
   20,'nsc_aps',20,'Engineering and the Built Environment',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('HCert (Industrial Engineering)',
   20,'nsc_aps',20,'Engineering and the Built Environment',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Maths or Technical Maths 3. Physical Sciences or Technical Sciences 3.'),
  ('HCert (Mechanical Engineering)',
   20,'nsc_aps',20,'Engineering and the Built Environment',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  -- Faculty of Humanities
  ('BEd (Foundation Phase Teaching)',
   25,'nsc_aps',25,'Humanities',4,'degree',7,NULL,
   'LO excluded. Home language 4. First Additional Language 4. Maths or Maths Literacy 4. SN designation required.'),
  ('BEd (Intermediate Phase Teaching)',
   25,'nsc_aps',25,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Other home language 4. Maths or Maths Literacy 4. Life Sciences and Physical Science or History and Geography 4.'),
  ('BEd (SP & FET: Agriculture)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Agricultural Sciences or Life Sciences 4.'),
  ('BEd (SP & FET: Consumer Sciences)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Consumer Studies or Hospitality Studies or Tourism 4.'),
  ('BEd (SP & FET: Economic and Management Sciences)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Accounting or Business Studies or Economics 4.'),
  ('BEd (SP & FET: Information Technology)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Information Technology 4.'),
  ('BEd (SP & FET: Mathematics)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Life Sciences or Physical Sciences 4.'),
  ('BEd (SP & FET: Physical Education)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Life Sciences 4.'),
  ('BEd (SP & FET: Sciences)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Life Sciences or Physical Sciences 4.'),
  ('BEd (SP & FET: Technology)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Technology or Engineering subject 4.'),
  ('Dip (Correctional and Rehabilitation Studies)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Mathematical Literacy 3.'),
  ('Dip (Integrated Communication)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Journalism)',
   24,'nsc_aps',24,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 4. Geography or History 4. Third language or articulated subject 4.'),
  ('Dip (Language Practice)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 4. Any other official SA language 4.'),
  ('Dip (Law)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 4.'),
  ('Dip (Legal Support)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 4. Any other additional language 4.'),
  ('Dip (Policing)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Employed law enforcement officers require NQF 5/6 plus 5 years experience (no matric APS needed).'),
  ('Dip (Public Affairs: Administration of State)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Mathematical Literacy 3.'),
  ('Dip (Public Affairs: Local Government)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Mathematical Literacy 3.'),
  ('Dip (Traffic Safety and Municipal Police Management)',
   20,'nsc_aps',20,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths Literacy 3. Employed law enforcement officers require NQF 5/6 plus 5 years experience.'),
  -- Faculty of ICT
  ('Dip (Computer Science)',
   26,'nsc_aps',26,'ICT',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Computer Science) Extended',
   28,'nsc_aps',28,'ICT',4,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Extended 4-year programme.'),
  ('Dip (Computer Systems Engineering)',
   26,'nsc_aps',26,'ICT',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths 3. Physical Sciences or Technical Sciences 3.'),
  ('Dip (Computer Systems Engineering) Extended',
   23,'nsc_aps',23,'ICT',4,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths 3. Physical Sciences or Technical Sciences 3. Extended 4-year programme.'),
  ('Dip (Informatics)',
   26,'nsc_aps',26,'ICT',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Information Technology)',
   26,'nsc_aps',26,'ICT',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Physical Sciences or Technical Science 3.'),
  ('Dip (Multimedia Computing)',
   26,'nsc_aps',26,'ICT',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  -- Faculty of Management Sciences
  ('Dip (Administrative Information Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Casino Resort Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Business Studies, Geography, Hospitality Studies or Tourism 3.'),
  ('Dip (Contact Centre Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Credit Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Accounting 3.'),
  ('Dip (Entrepreneurship)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Commercial subjects 4.'),
  ('Dip (Event Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Business Studies, Hospitality Studies or Tourism 4.'),
  ('Dip (Food Operations Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Hospitality Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Human Resource Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4.'),
  ('Dip (Marketing)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Accounting, Business Studies or Economics 3.'),
  ('Dip (Operations Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Retail Business Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Sport Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Accounting, Business Studies or Economics 4.'),
  ('Dip (Supply Chain Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('Dip (Tourism Management)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Business Studies, Geography, Hospitality Studies or Tourism 4.'),
  ('Dip (Work Study)',
   24,'nsc_aps',24,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('HCert (Administrative Information Management)',
   20,'nsc_aps',20,'Management Sciences',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Online presentation.'),
  ('HCert (Contact Centre Management)',
   20,'nsc_aps',20,'Management Sciences',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Online presentation.'),
  -- Faculty of Science
  ('Dip (Animal Sciences)',
   19,'nsc_aps',19,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Science 4.'),
  ('Dip (Crop Production)',
   19,'nsc_aps',19,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy or Physical Sciences or Technical Sciences 4.'),
  ('Dip (Equine Science)',
   19,'nsc_aps',19,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Science 4.'),
  ('Dip (Horticulture)',
   25,'nsc_aps',25,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Life Sciences or Physical Sciences or Technical Sciences 4.'),
  ('Dip (Landscape Technology)',
   25,'nsc_aps',25,'Science',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Life Sciences or Physical Sciences or Technical Sciences 3.'),
  ('Dip (Nature Conservation)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Agricultural Sciences, Geography, Life Sciences or Physical Sciences or Technical Sciences 4.'),
  ('Dip (Wildlife Management)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Agricultural Sciences, Geography, Life Sciences or Physical Sciences or Technical Sciences 4.'),
  ('HCert (Forestry Management)',
   18,'nsc_aps',18,'Science',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Mbombela campus only.'),
  ('Dip (Environmental Health)',
   24,'nsc_aps',24,'Science',4,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('Bachelor of Nursing (BNursing)',
   27,'nsc_aps',27,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Life Sciences 4.'),
  ('Bachelor of Pharmacy (BPharm)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('Bachelor of Radiography in Diagnostics (BRad)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('BHSci (Biokinetics)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('BHSci (Clinical Technology)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('BHSci (Medical Laboratory Science)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('BHSci (Medical Orthotics and Prosthetics)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('BHSci (Veterinary Technology)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences or Agricultural Sciences 4.'),
  ('Dip (Kinesiology and Coaching Science)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3. Life Sciences 3.'),
  ('Dip (Somatic Therapy)',
   22,'nsc_aps',22,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Life Sciences 4.'),
  ('HCert (Dental Assisting)',
   20,'nsc_aps',20,'Science',1,'higher_certificate',5,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 4.'),
  ('BSc (Industrial Chemistry)',
   24,'nsc_aps',24,'Science',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Sciences 4.'),
  ('Dip (Analytical Chemistry)',
   21,'nsc_aps',21,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Biotechnology)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('Dip (Environmental Sciences)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Food Technology)',
   24,'nsc_aps',24,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('Dip (Geology)',
   21,'nsc_aps',21,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Industrial Physics)',
   21,'nsc_aps',21,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4.'),
  ('Dip (Water Science and Technology)',
   21,'nsc_aps',21,'Science',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4. Physical Sciences or Technical Sciences 4. Life Sciences 4.'),
  ('HCert (Resource and Waste Management)',
   18,'nsc_aps',18,'Science',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Maths or Technical Maths or Maths Literacy 3.'),
  ('HCert (Water Treatment)',
   18,'nsc_aps',18,'Science',1,'higher_certificate',5,NULL,
   'LO excluded. English 3. Maths or Maths Literacy 3. Physical Sciences or Technical Sciences 3.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'TUT';

-- UJ (University of Johannesburg)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of Johannesburg', 'UJ', 'Gauteng', 'Johannesburg',
  'https://www.uj.ac.za', 'https://www.uj.ac.za/apply', NULL, '2026-10-31', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Art, Design and Architecture
  ('Bachelor of Architecture',
   30,'nsc_aps',30,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Communication Design)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Digital Media Design)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Industrial Design)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Interior Design)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Fashion Design)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('BA (Visual Art)',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Portfolio assessment required.'),
  ('Diploma in Architecture',
   25,'nsc_aps',25,'Art, Design and Architecture',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('Diploma in Fashion Production',
   22,'nsc_aps',22,'Art, Design and Architecture',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('Diploma in Jewellery Design and Manufacture',
   21,'nsc_aps',21,'Art, Design and Architecture',3,'diploma',6,NULL,
   'LO excluded. Maths or Technical Maths required.'),
  -- College of Business and Economics
  ('Bachelor of Accounting',
   33,'nsc_aps',33,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('Bachelor of Hospitality Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (28 APS with Maths Literacy)'),
  ('Bachelor of Human Resource Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (28 APS with Maths Literacy)'),
  ('Bachelor of Tourism Development and Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (28 APS with Maths Literacy)'),
  ('BCom Accounting',
   28,'nsc_aps',28,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Business Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Economics and Econometrics',
   28,'nsc_aps',28,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Entrepreneurial Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Finance',
   28,'nsc_aps',28,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Industrial Psychology',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Information Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (28 APS with Maths Literacy)'),
  ('BCom Information Systems',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Marketing Management',
   26,'nsc_aps',26,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BCom Transport and Logistics Management',
   27,'nsc_aps',27,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('Bachelor of Public Management and Governance',
   27,'nsc_aps',27,'Business and Economics',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (29 APS with Maths Literacy)'),
  ('BCom Extended Accounting',
   24,'nsc_aps',24,'Business and Economics',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Extended 4-year programme.'),
  ('BCom Extended Business Management',
   25,'nsc_aps',25,'Business and Economics',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Extended 4-year programme.'),
  ('BCom Extended Economics and Econometrics',
   25,'nsc_aps',25,'Business and Economics',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Extended 4-year programme.'),
  ('BCom Extended Finance',
   25,'nsc_aps',25,'Business and Economics',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Extended 4-year programme.'),
  ('Diploma in Accountancy',
   23,'nsc_aps',23,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Business Information Technology',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Financial Services Operations',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Food and Beverage',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Logistics',
   24,'nsc_aps',24,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('Diploma in Marketing',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in People Management',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Retail Business Management',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (23 APS with Maths Literacy)'),
  ('Diploma in Small Business Management',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (23 APS with Maths Literacy)'),
  ('Diploma in Tourism Management',
   22,'nsc_aps',22,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (24 APS with Maths Literacy)'),
  ('Diploma in Transportation Management',
   24,'nsc_aps',24,'Business and Economics',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  -- Faculty of Education
  ('BEd Foundation Phase Teaching',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Intermediate Phase Teaching',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Accounting',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Business Management',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Economics',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: English',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Geography',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Life Sciences',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Mathematics',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Physical Science',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET: Psychology',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. Home language 5 (60%+) or Additional Language 6 (70%+). NSC bachelor''s endorsement required.'),
  -- Faculty of Engineering and the Built Environment
  ('BEng Civil Engineering',
   32,'nsc_aps',32,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. Mathematics 60%+. Physical Sciences required.'),
  ('BEng Electrical and Electronic Engineering',
   32,'nsc_aps',32,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. Mathematics 60%+. Physical Sciences required.'),
  ('BEng Mechanical Engineering',
   32,'nsc_aps',32,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. Mathematics 60%+. Physical Sciences required.'),
  ('BEngTech Chemical Engineering',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Civil Engineering',
   28,'nsc_aps',28,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Electrical Engineering',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Extraction and Metallurgy',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Industrial Engineering',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Mechanical Engineering',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Mining Engineering',
   23,'nsc_aps',23,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BEngTech Physical Metallurgy',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('Bachelor of Mine Surveying',
   23,'nsc_aps',23,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc in Construction',
   30,'nsc_aps',30,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('Bachelor of Urban and Regional Planning',
   27,'nsc_aps',27,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('Diploma in Management Services',
   19,'nsc_aps',19,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (21 APS with Maths Literacy)'),
  ('Diploma in Operations Management',
   20,'nsc_aps',20,'Engineering and the Built Environment',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. (22 APS with Maths Literacy)'),
  -- Faculty of Health Sciences
  ('Bachelor of Biokinetics',
   32,'nsc_aps',32,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('Bachelor of Diagnostic Radiography',
   31,'nsc_aps',31,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics required (not Maths Literacy). Life Sciences required.'),
  ('Bachelor of Diagnostic Ultrasound',
   31,'nsc_aps',31,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics required (not Maths Literacy). Life Sciences required.'),
  ('Bachelor of Nuclear Medicine',
   31,'nsc_aps',31,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics required (not Maths Literacy). Life Sciences required.'),
  ('Bachelor of Radiation Therapy',
   31,'nsc_aps',31,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics required (not Maths Literacy). Life Sciences required.'),
  ('BHSci Chiropractic',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required. Interview and observation from two practising Doctors of Chiropractic required.'),
  ('BHSci Complementary Medicine',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required. Letter of recommendation and assignment required. Does not accept upgraded matric results.'),
  ('BHSci Emergency Medical Care',
   27,'nsc_aps',27,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Must pass fitness assessment, medical examination and interview.'),
  ('BHSci Medical Laboratory Science',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('BHSci Podiatry',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('Bachelor of Environmental Health',
   24,'nsc_aps',24,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('Bachelor of Nursing',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('Bachelor of Optometry',
   34,'nsc_aps',34,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('BCom Sport Management',
   23,'nsc_aps',23,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  ('BHSci Sport and Exercise Science',
   27,'nsc_aps',27,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy required. (28 APS with Maths Literacy)'),
  ('Diploma in Sport Management',
   22,'nsc_aps',22,'Health Sciences',3,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required.'),
  -- Faculty of Humanities
  ('Bachelor of Social Work',
   31,'nsc_aps',31,'Humanities',4,'degree',7,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  ('Bachelor of Arts',
   27,'nsc_aps',27,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  ('BA Language Practice',
   27,'nsc_aps',27,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  ('BA Politics, Economics and Technology',
   27,'nsc_aps',27,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  ('BA Community Development and Leadership',
   27,'nsc_aps',27,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  ('Diploma in Public Relations and Communication',
   25,'nsc_aps',25,'Humanities',3,'diploma',6,NULL,
   'LO excluded. Home language or English 5 (60%+) required.'),
  -- Faculty of Law
  ('BA LLB',
   31,'nsc_aps',31,'Law',3,'degree',8,NULL,
   'LO excluded. Maths or Maths Literacy required. (32 APS with Maths Literacy)'),
  ('BCom Law',
   31,'nsc_aps',31,'Law',3,'degree',8,NULL,
   'LO excluded. Mathematics required (not Maths Literacy).'),
  ('LLB',
   31,'nsc_aps',31,'Law',4,'degree',8,NULL,
   'LO excluded. Maths or Maths Literacy required. (32 APS with Maths Literacy)'),
  -- Faculty of Science
  ('BSc Information Technology',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Technical Maths and Technical Science not accepted.'),
  ('BSc Computer Science and Informatics',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Technical Maths and Technical Science not accepted.'),
  ('BSc Computer Science and Informatics specialising in AI',
   34,'nsc_aps',34,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Technical Maths and Technical Science not accepted.'),
  ('BSc Biochemistry',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Botany and Zoology',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Zoology and Chemistry',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Zoology and Environmental Management',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Zoology and Forensic Pathology',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Physiology and Biochemistry',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Physiology and Psychology',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Life Sciences required.'),
  ('BSc Geography and Environmental Management',
   30,'nsc_aps',30,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Geography recommended.'),
  ('BSc Applied Mathematics and Computer Science',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc Applied Mathematics and Mathematical Statistics',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc Mathematics and Computer Science',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc Mathematics and Mathematical Statistics',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc Computational Science',
   33,'nsc_aps',33,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required.'),
  ('BSc Actuarial Science',
   40,'nsc_aps',40,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ (distinction level recommended).'),
  ('BSc Biochemistry and Chemistry',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BSc Chemistry and Physics',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BSc Geology and Chemistry',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BSc Geology and Physics',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('BSc Physics and Applied Mathematics',
   31,'nsc_aps',31,'Science',3,'degree',7,NULL,
   'LO excluded. Mathematics 60%+ required. Physical Sciences required.'),
  ('Diploma in Analytical Chemistry',
   22,'nsc_aps',22,'Science',4,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. Physical Sciences required.'),
  ('Diploma in Biotechnology',
   23,'nsc_aps',23,'Science',4,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.'),
  ('Diploma in Food Technology',
   22,'nsc_aps',22,'Science',4,'diploma',6,NULL,
   'LO excluded. Maths or Maths Literacy required. Life Sciences required.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UJ';

-- VUT (Vaal University of Technology)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'Vaal University of Technology', 'VUT', 'Gauteng', 'Vanderbijlpark',
  'https://www.vut.ac.za', 'https://www.vut.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Applied and Computer Sciences
  ('Dip (Analytical Chemistry)',
   21,'nsc_aps',21,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 60%. Physical Science or Engineering Science 60%.'),
  ('Dip (Agricultural Management)',
   21,'nsc_aps',21,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 4. Agriculture or Life Science 3. (22 APS with Maths Literacy)'),
  ('Dip (Biotechnology)',
   23,'nsc_aps',23,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Engineering Maths 60%. Physical Science or Engineering Science 60%. Life Sciences 4.'),
  ('Dip (Non-Destructive Testing)',
   19,'nsc_aps',19,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Maths or Technical Maths 3. Physical Science or Technical Science 4.'),
  ('Dip (Information Technology)',
   26,'nsc_aps',26,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4 (or Maths Literacy 6). Max 6 subjects counted. (28 APS with Maths Literacy)'),
  ('Dip (Information Technology) Extended',
   24,'nsc_aps',24,'Applied and Computer Sciences',4,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 4 (or Maths Literacy 6). Extended 4-year programme. (26 APS with Maths Literacy)'),
  ('BHSci Medical Laboratory Science',
   27,'nsc_aps',27,'Applied and Computer Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 5.'),
  ('Dip (Environmental Science)',
   21,'nsc_aps',21,'Applied and Computer Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  -- Faculty of Management Sciences
  ('Dip (Financial Information Systems)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. Accounting 4. English 4. Maths or Technical Maths or Maths Literacy 3. (22 APS with Maths Literacy)'),
  ('Dip (Cost and Management Accounting)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. Accounting 4. English 4. Maths or Technical Maths or Maths Literacy 3. (22 APS with Maths Literacy)'),
  ('Dip (Internal Auditing)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. Accounting 4. English 4. Maths or Technical Maths or Maths Literacy 3. (23 APS with Maths Literacy)'),
  ('Dip (Human Resources Management)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One other subject 4. (21 APS with Maths Literacy)'),
  ('Dip (Logistics and Supply Chain Management)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One other subject 4. (21 APS with Maths Literacy)'),
  ('Dip (Marketing)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One other subject 4. (21 APS with Maths Literacy)'),
  ('Dip (Retail Business Management)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One other subject 4. (21 APS with Maths Literacy)'),
  ('Dip (Sport Management)',
   20,'nsc_aps',20,'Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One other subject 4. (21 APS with Maths Literacy)'),
  -- Faculty of Human Sciences
  ('Dip (Fashion, Photography, Graphic Design and Fine Art)',
   21,'nsc_aps',21,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths 2 (30%) or Maths Literacy 3 (40%). Portfolio and practical interview required. (22 APS with Maths Literacy)'),
  ('Dip (Food Service Management)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. Hospitality, Hotel, Tourism, Catering, Accounting, Business Studies or Consumer Studies 4. Chef uniforms compulsory. (21 APS with Maths Literacy)'),
  ('Dip (Public Relations Management)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. Other Language 4. (21 APS with Maths Literacy)'),
  ('Dip (Tourism Management)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. One compulsory subject 4 (Tourism, Geography, Business Studies or History recommended). (21 APS with Maths Literacy)'),
  ('Dip (Ecotourism Management)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Life Sciences 4. Maths or Technical Maths or Maths Literacy 3. (21 APS with Maths Literacy)'),
  ('Dip (Labour Law)',
   23,'nsc_aps',23,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 5. Other Language 3. Maths or Technical Maths or Maths Literacy 3. (24 APS with Maths Literacy)'),
  ('Dip (Legal Assistance)',
   21,'nsc_aps',21,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Maths or Technical Maths or Maths Literacy 3. (22 APS with Maths Literacy)'),
  ('Dip (Safety Management)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Other Language 3. Maths or Technical Maths or Maths Literacy 3. (21 APS with Maths Literacy)'),
  ('Dip (Policing)',
   20,'nsc_aps',20,'Human Sciences',3,'diploma',6,NULL,
   'LO excluded. English 4. Other Language 3. Maths or Technical Maths or Maths Literacy 3. Practical interview and portfolio required. (21 APS with Maths Literacy)'),
  ('Bachelor of Communication Studies',
   20,'nsc_aps',20,'Human Sciences',3,'degree',7,NULL,
   'LO excluded. English 5. Additional Language 4. Maths or Technical Maths or Maths Literacy 3. NSC bachelor''s endorsement required. (21 APS with Maths Literacy)'),
  ('BEd Senior Phase and FET Teaching',
   22,'nsc_aps',22,'Human Sciences',4,'degree',7,NULL,
   'LO excluded. Language of Teaching and Learning 4. Maths or Technical Maths or Maths Literacy 4. Physical Science or Technical Science 3. NSC bachelor''s endorsement required. (24 APS with Maths Literacy)'),
  -- Faculty of Engineering and Technology
  ('Dip (Chemical Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Civil Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Industrial Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Mechanical Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Metallurgical Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Electronic Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Power Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Process Control Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Computer Systems Engineering)',
   24,'nsc_aps',24,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4. English 4.'),
  ('Dip (Operations Management)',
   23,'nsc_aps',23,'Engineering and Technology',3,'diploma',6,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 3. English 4.'),
  ('Dip (Chemical Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Civil Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Industrial Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Mechanical Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Metallurgical Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Electronic Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Power Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Process Control Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.'),
  ('Dip (Computer Systems Engineering) Extended',
   22,'nsc_aps',22,'Engineering and Technology',4,'diploma',6,NULL,
   'LO excluded. Mathematics 3. Physical Sciences 3. English 3. Extended 4-year programme.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'VUT';

-- UP (University of Pretoria)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of Pretoria', 'UP', 'Gauteng', 'Pretoria',
  'https://www.up.ac.za', 'https://www.up.ac.za/apply', NULL, '2026-06-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Economic and Management Sciences
  ('BAdmin: Public Administration and International Relations',
   28,'nsc_aps',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 3.'),
  ('BCom',
   34,'nsc_aps',34,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 6. Mathematics 6.'),
  ('BCom Accounting Sciences',
   34,'nsc_aps',34,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 6. Mathematics 6.'),
  ('BCom Business Management',
   34,'nsc_aps',34,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BCom Financial Management Sciences',
   32,'nsc_aps',32,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BCom Information Systems',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BCom Agribusiness Management',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BCom Supply Chain Management',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4.'),
  ('BCom Marketing Management',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4.'),
  ('BCom Human Resource Management',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4.'),
  ('BCom Economics',
   32,'nsc_aps',32,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  -- Faculty of Education
  ('BEd Early Childhood Care and Education',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. NSC bachelor''s endorsement required.'),
  ('BEd Foundation Phase Teaching',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. NSC bachelor''s endorsement required.'),
  ('BEd Intermediate Phase Teaching',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase and FET Teaching',
   28,'nsc_aps',28,'Education',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. NSC bachelor''s endorsement required.'),
  ('Higher Certificate in Sports Sciences',
   20,'nsc_aps',20,'Education',1,'higher_certificate',5,NULL,
   'LO excluded. English HL/FAL 4.'),
  -- Faculty of Engineering, Built Environment and Information Technology
  ('BEng Chemical Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Civil Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Computer Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Electrical Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Mechanical Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Mining Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BSc Electronic Engineering',
   35,'nsc_aps',35,'Engineering, Built Environment and Information Technology',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6.'),
  ('BEng Extended (5-year programme)',
   33,'nsc_aps',33,'Engineering, Built Environment and Information Technology',5,'degree',8,NULL,
   'LO excluded. English 65%. Mathematics 65%. Physical Sciences 65%. Extended 5-year programme.'),
  ('BSc Architecture',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4. Physical Sciences 4. Portfolio may be required.'),
  ('BSc Construction Management',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4. Accounting or Physical Sciences 4.'),
  ('BSc Real Estate',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Accounting or Physical Sciences 4.'),
  ('BSc Quantity Surveying',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Accounting 4.'),
  ('Bachelor of Town and Regional Planning',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 4.'),
  ('Bachelor of Information Science',
   28,'nsc_aps',28,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  ('Bachelor of Information Science: Publishing',
   28,'nsc_aps',28,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  ('Bachelor of Information Science: Multimedia',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 5.'),
  ('Bachelor of Information Technology: Information Systems',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BSc Computer Science',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6.'),
  ('BSc IT: Information and Communication Systems',
   30,'nsc_aps',30,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 6.'),
  -- Faculty of Health Sciences
  ('Bachelor of Dental Surgery (BDS)',
   35,'nsc_aps',35,'Health Sciences',5,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 5. Life Sciences required.'),
  ('Bachelor of Oral Hygiene',
   25,'nsc_aps',25,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences 4.'),
  ('Bachelor of Dietetics',
   28,'nsc_aps',28,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences 4.'),
  ('Bachelor of Nursing Science',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences or Life Sciences 4.'),
  ('Bachelor of Occupational Therapy',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences 4.'),
  ('Bachelor of Physiotherapy',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences 4.'),
  ('Bachelor of Radiography',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences 4.'),
  ('Bachelor of Clinical Medical Practice',
   28,'nsc_aps',28,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences or Life Sciences 4.'),
  ('Bachelor of Sports Science',
   30,'nsc_aps',30,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Physical Sciences or Life Sciences 4.'),
  -- Faculty of Humanities
  ('BA Speech-Language Pathology',
   32,'nsc_aps',32,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 5.'),
  ('BA Audiology',
   32,'nsc_aps',32,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 5.'),
  ('BA Information Design',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Portfolio assessment required.'),
  ('BA',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5.'),
  ('Bachelor of Social Work',
   30,'nsc_aps',30,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5.'),
  ('BA Languages',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5.'),
  ('BA Philosophy, Politics and Economics',
   32,'nsc_aps',32,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BA Fine Arts',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Portfolio assessment required.'),
  ('Bachelor of Music',
   30,'nsc_aps',30,'Humanities',4,'degree',7,NULL,
   'LO excluded. Music 4-5 (50-59%). English HL/FAL 5. Practical audition required.'),
  ('Bachelor of Drama',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Audition required.'),
  -- Faculty of Law
  ('LLB',
   35,'nsc_aps',35,'Law',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 6.'),
  ('BCom Law',
   32,'nsc_aps',32,'Law',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BA Law',
   34,'nsc_aps',34,'Law',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5.'),
  -- Faculty of Theology and Religion
  ('Bachelor of Theology',
   28,'nsc_aps',28,'Theology and Religion',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  ('Bachelor of Divinity',
   28,'nsc_aps',28,'Theology and Religion',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  ('Diploma in Theology',
   24,'nsc_aps',24,'Theology and Religion',3,'diploma',6,NULL,
   'LO excluded. English HL/FAL 4.'),
  -- Faculty of Natural and Agricultural Sciences
  ('BSc Agriculture: Soil Sciences',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Agriculture: Animal Science',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Agriculture: Plant Pathology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Food Management',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Biochemistry',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Biotechnology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Genetics',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Forensic Science',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Microbiology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Zoology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Ecology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Actuarial and Financial Mathematics',
   36,'nsc_aps',36,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 7 (distinction).'),
  ('BSc Mathematics',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6.'),
  ('BSc Applied Mathematics',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6.'),
  ('BSc Chemistry',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Geography and Environmental Science',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Geology',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Geomatics',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Meteorology',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('BSc Physics',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5.'),
  ('Bachelor of Consumer Science: Clothing Retail Management',
   28,'nsc_aps',28,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  ('Bachelor of Consumer Science: Food Management',
   28,'nsc_aps',28,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 4.'),
  -- Faculty of Veterinary Science
  ('Bachelor of Veterinary Science (BVSc)',
   35,'nsc_aps',35,'Veterinary Science',6,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. Life Sciences required. Competitive selection.'),
  ('Bachelor of Veterinary Nursing',
   28,'nsc_aps',28,'Veterinary Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Physical Sciences or Life Sciences 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UP';

-- UNISA (University of South Africa)
-- Note: UNISA 2024 prospectus covers Short Learning Programmes only (no APS-based undergraduate admissions data available)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of South Africa', 'UNISA', 'Gauteng', 'Pretoria',
  'https://www.unisa.ac.za', 'https://www.unisa.ac.za/apply', NULL, NULL, true
) ON CONFLICT DO NOTHING;

-- WITS (University of the Witwatersrand)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of the Witwatersrand', 'WITS', 'Gauteng', 'Johannesburg',
  'https://www.wits.ac.za', 'https://www.wits.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Commerce, Law and Management
  ('BCom General',
   38,'nsc_aps',38,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. APS 35-37 may be waitlisted.'),
  ('Bachelor of Accounting Science (BAccSc)',
   44,'nsc_aps',44,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. APS 39-43 may be waitlisted.'),
  ('BCom Accounting',
   38,'nsc_aps',38,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. APS 35-37 may be waitlisted.'),
  ('Bachelor of Economic Science (BEconSc)',
   42,'nsc_aps',42,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 7. APS 39-41 may be waitlisted.'),
  ('BCom Financial Sciences',
   42,'nsc_aps',42,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 7. APS 39-41 may be waitlisted.'),
  ('BCom Information Systems',
   38,'nsc_aps',38,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. APS 35-37 may be waitlisted.'),
  ('BCom Politics, Philosophy and Economics',
   38,'nsc_aps',38,'Commerce, Law and Management',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. APS 35-37 may be waitlisted.'),
  ('LLB (4-year)',
   46,'nsc_aps',46,'Commerce, Law and Management',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 6. Mathematics 5 or Maths Literacy 6. APS 40-45 may be waitlisted.'),
  -- Faculty of Engineering and the Built Environment
  ('BScEng Chemical Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Civil Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Electrical Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Information Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Mechanical Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Industrial Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Aeronautical Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Mining Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BScEng Metallurgy and Materials Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',4,'degree',8,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BEngSc Biomedical Engineering',
   42,'nsc_aps',42,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required. Pre-professional; can transfer to BScEng.'),
  ('BEngSc Digital Arts',
   42,'nsc_aps',42,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('Bachelor of Architectural Studies (BAS)',
   34,'nsc_aps',34,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 4. Mathematics 4. Portfolio and written graphic exercise required. Apply by 30 June 2026.'),
  ('BSc Urban and Regional Planning',
   36,'nsc_aps',36,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BSc Construction Studies',
   36,'nsc_aps',36,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  ('BSc Property Studies',
   36,'nsc_aps',36,'Engineering and the Built Environment',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5.'),
  -- Faculty of Health Sciences
  ('MBBCh',
   0,'nsc_aps',0,'Health Sciences',6,'degree',8,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and Physical Sciences 5. Apply by 30 June 2026.'),
  ('Bachelor of Dental Science (BDS)',
   0,'nsc_aps',0,'Health Sciences',5,'degree',8,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and Physical Sciences 5. Job shadowing certificate required. Apply by 30 June 2026.'),
  ('Bachelor of Pharmacy (BPharm)',
   0,'nsc_aps',0,'Health Sciences',4,'degree',8,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and/or Physical Sciences 5. Apply by 30 June 2026.'),
  ('BSc Physiotherapy',
   0,'nsc_aps',0,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and/or Physical Sciences 5. Job shadowing required. Apply by 30 June 2026.'),
  ('Bachelor of Nursing (BNurs)',
   0,'nsc_aps',0,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 4. Mathematics 4. Life Sciences and/or Physical Sciences 4. Apply by 30 June 2026.'),
  ('Bachelor of Occupational Therapy',
   0,'nsc_aps',0,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 4. Mathematics 4. Life Sciences and/or Physical Sciences 4. Job shadowing required. Apply by 30 June 2026.'),
  ('BHSci Biomedical Sciences',
   0,'nsc_aps',0,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and Physical Sciences 5. Apply by 30 June 2026.'),
  ('BHSci Biokinetics',
   0,'nsc_aps',0,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and/or Physical Sciences 5. Apply by 30 June 2026.'),
  ('BHSci Health Systems Sciences',
   0,'nsc_aps',0,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 5. Mathematics 5. Life Sciences and/or Physical Sciences 5. Apply by 30 June 2026.'),
  ('Bachelor of Clinical Medical Practice',
   0,'nsc_aps',0,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 4. Mathematics 4. Life Sciences and Physical Sciences 4. Apply by 30 June 2026.'),
  ('Bachelor of Oral Health Sciences (Oral Hygiene)',
   0,'nsc_aps',0,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Composite Index (CI) selection: 60% academic + 40% NBT. English 4. Mathematics 4. Life Sciences and/or Physical Sciences 4. Apply by 30 June 2026.'),
  -- Faculty of Humanities
  ('BA General',
   36,'nsc_aps',36,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. APS 30-35 may be waitlisted.'),
  ('BA Digital Arts',
   36,'nsc_aps',36,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Portfolio/questionnaire required. APS 30-35 may be waitlisted.'),
  ('BA Theatre and Performance',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Audition required (October 2026). APS 30-33 may be waitlisted.'),
  ('BA Film and Television',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Portfolio and interview required. Apply by 30 June 2026.'),
  ('BA Fine Arts',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Questionnaire and portfolio required. APS 30-33 may be waitlisted.'),
  ('Bachelor of Music (BMus)',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Interview and audition required. APS 30-33 may be waitlisted.'),
  ('BA Law',
   43,'nsc_aps',43,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 3 or Maths Literacy 4. Route to LLB. APS 40-42 may be waitlisted.'),
  ('BEd (Foundation, Intermediate, or SP/FET Phase)',
   37,'nsc_aps',37,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Maths or Technical Maths or Maths Literacy as applicable. NSC bachelor''s endorsement required.'),
  ('Bachelor of Speech-Language Pathology',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. NBT required. APS 30-33 may be waitlisted.'),
  ('Bachelor of Audiology',
   34,'nsc_aps',34,'Humanities',4,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. NBT required. APS 30-33 may be waitlisted.'),
  ('Bachelor of Social Work',
   36,'nsc_aps',36,'Humanities',4,'degree',7,60,
   'LO excluded. English HL/FAL 5. 60 places available. APS 34-35 may be waitlisted.'),
  -- Faculty of Science
  ('BSc General',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BSc Biological Sciences',
   43,'nsc_aps',43,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Life Sciences recommended. NBT required.'),
  ('BSc Geographical and Archaeological Sciences',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. NBT required.'),
  ('BSc Geospatial Sciences',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 5. NBT required.'),
  ('BSc Environmental Studies',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. NBT required.'),
  ('BSc Geological Sciences',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 5. Physical Sciences 6. NBT required.'),
  ('BSc Actuarial Science',
   44,'nsc_aps',44,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 7. Mathematics 7. Physical Sciences 7. NBT required. Highly competitive.'),
  ('BSc Computational and Applied Mathematics',
   44,'nsc_aps',44,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. NBT required.'),
  ('BSc Computer Science',
   44,'nsc_aps',44,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. NBT required.'),
  ('BSc Mathematical Sciences',
   44,'nsc_aps',44,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 7. Mathematics 7. Physical Sciences 7. NBT required.'),
  ('BSc Physical Sciences (Chemistry/Physics)',
   42,'nsc_aps',42,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 5. NBT required.'),
  ('BSc Chemistry with Chemical Engineering',
   43,'nsc_aps',43,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6. NBT required.'),
  ('BSc Astronomy and Astrophysics',
   43,'nsc_aps',43,'Science',3,'degree',7,NULL,
   'LO excluded. English HL/FAL 5. Mathematics 6. Physical Sciences 6. NBT required.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'WITS';

-- ============================================================
-- OTHER UNIVERSITIES
-- ============================================================

-- CUT (Central University of Technology)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'Central University of Technology', 'CUT', 'Free State', 'Bloemfontein',
  'https://www.cut.ac.za', 'https://www.cut.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Health and Environmental Sciences
  ('Bachelor of Health Sciences: Health Technology',
   30,'nsc_aps',30,'Health and Environmental Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BHSci Health Management',
   30,'nsc_aps',30,'Health and Environmental Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BHSci Environmental Health',
   30,'nsc_aps',30,'Health and Environmental Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BHSci Food Science and Technology',
   30,'nsc_aps',30,'Health and Environmental Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  -- Faculty of Engineering, Built Environment and Information Technology
  ('BEngTech Civil Engineering',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics and Physical Sciences required. Bloemfontein campus.'),
  ('BEngTech Electrical Engineering',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics and Physical Sciences required. Bloemfontein campus.'),
  ('BEngTech Mechanical Engineering',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics and Physical Sciences required. Bloemfontein campus.'),
  ('BSc Construction Management',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BSc Land Surveying',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics and Physical Sciences required. Bloemfontein campus.'),
  ('BSc Quantity Surveying',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics and Physical Sciences required. Bloemfontein campus.'),
  ('BSc Information Technology',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Mathematics required. Bloemfontein and Welkom campuses.'),
  ('BSc Information and Communication Technology',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BSc Design Studies',
   36,'nsc_aps',36,'Engineering, Built Environment and Information Technology',3,'degree',7,NULL,
   'LO excluded. Portfolio assessment may be required. Bloemfontein campus.'),
  -- Faculty of Management Sciences
  ('BCom Accounting',
   27,'nsc_aps',27,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BCom Business Management',
   27,'nsc_aps',27,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BCom Marketing',
   27,'nsc_aps',27,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BCom Human Resource Management',
   27,'nsc_aps',27,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('BCom Public Management',
   27,'nsc_aps',27,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein and Welkom campuses.'),
  ('Bachelor of Hospitality Management',
   28,'nsc_aps',28,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('Bachelor of Tourism Management',
   28,'nsc_aps',28,'Management Sciences',3,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  -- Faculty of Humanities
  ('BA Design and Studio Art',
   27,'nsc_aps',27,'Humanities',3,'degree',7,NULL,
   'LO excluded. Portfolio assessment required. Bloemfontein campus.'),
  ('BEd Foundation Phase Teaching',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BEd Senior Phase and FET: IT/Computer Science',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BEd Senior Phase and FET: Economics and Management Sciences',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BEd Senior Phase and FET: Languages',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BEd Senior Phase and FET: Mathematics',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.'),
  ('BEd Senior Phase and FET: Natural Sciences',
   27,'nsc_aps',27,'Humanities',4,'degree',7,NULL,
   'LO excluded. Bloemfontein campus.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'CUT';

-- UL (University of Limpopo)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of Limpopo', 'UL', 'Limpopo', 'Polokwane',
  'https://www.ul.ac.za', 'https://www.ul.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Humanities
  ('BEd SP & FET: Languages and Life Orientation',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. First Language 4.'),
  ('BEd SP & FET: Languages and Social Sciences',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 3. First Language 4.'),
  ('BEd SP & FET: Economics and Management Studies',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. Maths or Maths Literacy 3. Accounting, Economics or Business Studies 4.'),
  ('BEd SP & FET: Mathematics, Science and Technology',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. Mathematics 3. Physical Science 4. Life Science 4.'),
  ('BEd Foundation Phase Teaching',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. First Language 4. Selection test required.'),
  ('Bachelor of Social Work',
   23,'nsc_aps',23,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 4. Selection test required.'),
  ('BA Criminology and Psychology',
   23,'nsc_aps',23,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4. Additional Language 4. Maths or Maths Literacy 3.'),
  ('BPsych',
   23,'nsc_aps',23,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Additional Language 4. Maths or Maths Literacy 2. Selection test required.'),
  ('BA Political Studies',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BA Sociology and Anthropology',
   23,'nsc_aps',23,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4. Additional Language 4. Maths or Maths Literacy 3.'),
  ('BA Cultural Studies',
   23,'nsc_aps',23,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4. Additional Language 4. Maths or Maths Literacy 3.'),
  ('BA Languages',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50-59%) and 5 (60-69%).'),
  ('BA Translation and Linguistics',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 and 5. Northern Sotho option available.'),
  ('BA Performing Arts',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 and 5. Audition may be required.'),
  ('Bachelor of Information Studies',
   25,'nsc_aps',25,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4 and 5.'),
  ('BA Communication Studies',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 and 5.'),
  ('BA Media Studies',
   23,'nsc_aps',23,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4. Extended curriculum programme option available (same APS).'),
  ('BA Contemporary English and Multilingual Studies',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English required.'),
  -- Faculty of Management and Law
  ('BAcc (Bachelor of Accountancy)',
   30,'nsc_aps',30,'Management and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4.'),
  ('BCom Accountancy',
   28,'nsc_aps',28,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4.'),
  ('BCom Accountancy Extended',
   26,'nsc_aps',26,'Management and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Extended 4-year programme.'),
  ('BCom Business Management',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 3.'),
  ('BCom Business Management Extended',
   22,'nsc_aps',22,'Management and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 3. Extended 4-year programme.'),
  ('BCom Human Resource Management',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 3.'),
  ('BCom Human Resource Management Extended',
   22,'nsc_aps',22,'Management and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Maths Literacy 3. Extended 4-year programme.'),
  ('BCom Economics',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Economics 3.'),
  ('BCom Economics Extended',
   22,'nsc_aps',22,'Management and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Maths or Economics 3. Extended 4-year programme.'),
  ('BAdmin',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BAdmin Local Government',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BDev Planning and Management',
   26,'nsc_aps',26,'Management and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Maths or Economics 3.'),
  ('LLB',
   30,'nsc_aps',30,'Management and Law',4,'degree',8,NULL,
   'LO excluded. English 5.'),
  ('LLB Extended',
   26,'nsc_aps',26,'Management and Law',5,'degree',8,NULL,
   'LO excluded. English 5. Extended 5-year programme.'),
  -- Faculty of Science and Agriculture
  ('BSc Physical Sciences',
   26,'nsc_aps',26,'Science and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5.'),
  ('BSc Physical Sciences Extended',
   22,'nsc_aps',22,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Extended 4-year programme.'),
  ('BSc Geology',
   26,'nsc_aps',26,'Science and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5.'),
  ('BSc Mathematical Sciences',
   24,'nsc_aps',24,'Science and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5.'),
  ('BSc Mathematical Sciences Extended',
   22,'nsc_aps',22,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Extended 4-year programme.'),
  ('BSc Life Sciences',
   26,'nsc_aps',26,'Science and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5. Life Science 4.'),
  ('BSc Life Sciences Extended',
   22,'nsc_aps',22,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Science 3. Extended 4-year programme.'),
  ('Bachelor of Agricultural Management',
   24,'nsc_aps',24,'Science and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 3. Physical Science 4. Life Science 4.'),
  ('BSc Agriculture: Agricultural Economics',
   24,'nsc_aps',24,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Agriculture: Plant Production',
   24,'nsc_aps',24,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Science 4.'),
  ('BSc Agriculture: Animal Production',
   24,'nsc_aps',24,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Science 4.'),
  ('BSc Agriculture: Soil Science',
   25,'nsc_aps',25,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 5. Life Science 4.'),
  ('BSc Environmental and Resource Studies',
   24,'nsc_aps',24,'Science and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Science 4.'),
  ('BSc Water and Sanitation Sciences',
   24,'nsc_aps',24,'Science and Agriculture',5,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5. Life Science 4.'),
  -- Faculty of Health Sciences
  ('MBChB',
   27,'nsc_aps',27,'Health Sciences',6,'degree',8,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5. Life Science 5. Additional subjects 4 each. Selection test required.'),
  ('BSc Dietetics',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 5. Life Science 5.'),
  ('Bachelor of Optometry (BOptom)',
   27,'nsc_aps',27,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5. Life Science 5.'),
  ('BSc Medical Sciences',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 5. Life Science 5.'),
  ('Bachelor of Nursing (BNurs)',
   26,'nsc_aps',26,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 5. Life Science 5.'),
  ('Bachelor of Pharmacy (BPharm)',
   27,'nsc_aps',27,'Health Sciences',4,'degree',8,NULL,
   'LO excluded. English 4. Mathematics 5. Physical Science 5. Life Science 5.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UL';

-- SPU (Sol Plaatje University)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'Sol Plaatje University', 'SPU', 'Northern Cape', 'Kimberley',
  'https://www.spu.ac.za', 'https://www.spu.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Education
  ('BEd Foundation Phase Teaching',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. One African language 4. Maths 3 or Maths Literacy 4. NSC bachelor''s endorsement required.'),
  ('BEd Intermediate Phase: Mathematics, Natural Sciences and Technology',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. One African language 4. Mathematics 4. Physical Sciences 4. Life Sciences 4. NSC bachelor''s endorsement required.'),
  ('BEd Intermediate Phase: Languages, Social Sciences and Life Skills',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. One African language 4. Geography or History 4. NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase: Life Sciences, Natural Sciences and Mathematics',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 4. Life Sciences 4. NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase: Languages',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. One African language 4. NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase: History and Social Sciences',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. One African language 4. Geography 4. History 4. NSC bachelor''s endorsement required.'),
  ('BEd Senior Phase: Accounting, Economics and Business Studies',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Two of: Accounting 4, Business Studies 4, or Economics 4. NSC bachelor''s endorsement required.'),
  -- Faculty of Economic and Management Sciences
  ('BCom Accounting',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 5 (or Mathematics 4 and Accounting 3). NSC bachelor''s endorsement required.'),
  ('BCom Economics',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 5 (or Mathematics 4 and Economics/Business Studies 3). NSC bachelor''s endorsement required.'),
  ('Diploma in Retail Business Management',
   25,'nsc_aps',25,'Economic and Management Sciences',3,'diploma',6,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 3 or Maths Literacy 5. One of: Accounting 4, Business Studies 4, or Economics 4. NSC diploma endorsement required.'),
  ('Higher Certificate in Entrepreneurship',
   25,'nsc_aps',25,'Economic and Management Sciences',1,'higher_certificate',5,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 3 or Maths Literacy 4. One of: Accounting, Business Studies, or Economics 3.'),
  -- Faculty of Humanities
  ('Bachelor of Arts',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 2 or Maths Literacy 3. Majors include: Languages, History, Heritage Studies, Geography, Mathematics, Sociology.'),
  ('Higher Certificate in Heritage Studies',
   25,'nsc_aps',25,'Humanities',1,'higher_certificate',5,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 2 or Maths Literacy 3.'),
  ('Higher Certificate in Court Interpreting',
   25,'nsc_aps',25,'Humanities',1,'higher_certificate',5,NULL,
   'LO excluded. English HL 4 or FAL 5. One other African language HL 4 or FAL 5 (native speaker preferred).'),
  -- Faculty of Natural and Applied Sciences
  ('BSc',
   30,'nsc_aps',30,'Natural and Applied Sciences',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 4 (Maths Literacy not accepted). Physical Sciences 4. Life Sciences 4. Specialisations: Mathematical/Computer Sciences, Physical Sciences, Biological Sciences.'),
  ('BSc Data Science',
   30,'nsc_aps',30,'Natural and Applied Sciences',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 5 (Maths Literacy not accepted).'),
  ('Bachelor of Environmental Science',
   30,'nsc_aps',30,'Natural and Applied Sciences',4,'degree',8,NULL,
   'LO excluded. English HL 4 or FAL 5. Mathematics 4 (Maths Literacy not accepted). Physical Sciences 4. Life Sciences 4.'),
  ('Diploma in Information and Communication Technology: Applications Development',
   25,'nsc_aps',25,'Natural and Applied Sciences',3,'diploma',6,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 3 or Maths Literacy 5. CAT or IT recommended.'),
  ('Diploma in Agriculture',
   25,'nsc_aps',25,'Natural and Applied Sciences',3,'diploma',6,NULL,
   'LO excluded. English HL 4 or FAL 5. Maths 3 or Maths Literacy 5. Physical Science 3. Life Sciences 3 or Agricultural Sciences 3.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'SPU';

-- UMP (University of Mpumalanga)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of Mpumalanga', 'UMP', 'Mpumalanga', 'Mbombela',
  'https://www.ump.ac.za', 'https://www.ump.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Economics, Development and Business Management
  ('Higher Certificate in Event Management',
   19,'nsc_aps',19,'Economics, Development and Business Management',1,'higher_certificate',5,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 (or Maths Literacy 4). Three additional vocational subjects 2. (21 APS with Maths Literacy)'),
  ('Diploma in Hospitality Management',
   24,'nsc_aps',24,'Economics, Development and Business Management',3,'diploma',6,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 3 (or Maths Literacy 4). One additional language. (25 APS with Maths Literacy)'),
  ('BCom General',
   30,'nsc_aps',30,'Economics, Development and Business Management',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4. Maths Literacy not accepted.'),
  ('Bachelor of Administration',
   32,'nsc_aps',32,'Economics, Development and Business Management',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Second Language 4. Mathematics 2 or Maths Literacy 3. Economics elective requires Maths 4.'),
  ('Bachelor of Development Studies',
   32,'nsc_aps',32,'Economics, Development and Business Management',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 or Maths Literacy 3. History or Geography 4. Sciences 4.'),
  ('Bachelor of Social Work',
   32,'nsc_aps',32,'Economics, Development and Business Management',4,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 or Maths Literacy 3.'),
  ('Bachelor of Arts General',
   28,'nsc_aps',28,'Economics, Development and Business Management',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 or Maths Literacy 3.'),
  ('LLB',
   33,'nsc_aps',33,'Economics, Development and Business Management',4,'degree',8,NULL,
   'LO halved in APS. English HL/FAL 4. Additional Language 4. Mathematics 3 or Maths Literacy 4. NSC bachelor''s endorsement required. At least 50% of places reserved for NSC applicants.'),
  -- Faculty of Agriculture and Natural Sciences
  ('Diploma in Agriculture: Plant Production',
   23,'nsc_aps',23,'Agriculture and Natural Sciences',3,'diploma',6,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 3 (or Maths Literacy 4). Agriculture, Geography or Life Science 4. (24 APS with Maths Literacy)'),
  ('Diploma in Agriculture: Animal Production',
   24,'nsc_aps',24,'Agriculture and Natural Sciences',3,'diploma',6,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 3 (or Maths Literacy 6). Physical Science 3. Life Sciences or Agriculture 4. (27 APS with Maths Literacy)'),
  ('Diploma in Nature Conservation',
   30,'nsc_aps',30,'Agriculture and Natural Sciences',3,'diploma',6,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 or Maths Literacy 3. Life Sciences and Geography 4 recommended.'),
  ('BSc Agriculture',
   30,'nsc_aps',30,'Agriculture and Natural Sciences',4,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4 (or Maths Literacy 6). Life Sciences, Biology or Agriculture 4. Physical Sciences 4.'),
  ('BSc Forestry',
   30,'nsc_aps',30,'Agriculture and Natural Sciences',4,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4. Physical Science 4. Two of: Life Science, Agricultural Science or Geography 4. NSC bachelor''s endorsement required.'),
  ('Bachelor of Agriculture: Agricultural Extension and Rural Resource Management',
   26,'nsc_aps',26,'Agriculture and Natural Sciences',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4 (or Maths Literacy 6). Agriculture or Life Science 4. Physical Science 4. (28 APS with Maths Literacy)'),
  ('BSc Environmental Science',
   30,'nsc_aps',30,'Agriculture and Natural Sciences',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4 (or Maths Literacy 6). Two of: Life Science, Physical Science or Geography 4.'),
  ('BSc',
   30,'nsc_aps',30,'Agriculture and Natural Sciences',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4 (or Maths Literacy 6). Life Science, Physical Science or Geography 4.'),
  ('Higher Certificate in ICT: User Support',
   20,'nsc_aps',20,'Agriculture and Natural Sciences',1,'higher_certificate',5,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 2 (or Maths Literacy 4). Three other content subjects 2. (22 APS with Maths Literacy)'),
  ('Diploma in ICT: Applications Development',
   24,'nsc_aps',24,'Agriculture and Natural Sciences',3,'diploma',6,NULL,
   'LO halved in APS. English HL/FAL 4. Additional Language 4. Mathematics 4. NSC diploma endorsement required.'),
  ('Bachelor of ICT',
   32,'nsc_aps',32,'Agriculture and Natural Sciences',3,'degree',7,NULL,
   'LO halved in APS. English HL/FAL 4. Mathematics 4. NSC bachelor''s endorsement required.'),
  -- Faculty of Education
  ('BEd Foundation Phase Teaching',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'LO divided by 2 in APS (not fully excluded). English HL/FAL 4. Mathematics 3 (or Maths Literacy 4). Best 3 electives used. Preliminary admission on Grade 11 results, final on Grade 12. (27 APS with Maths Literacy)')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UMP';

-- UNIVEN (University of Venda)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of Venda', 'UNIVEN', 'Limpopo', 'Thohoyandou',
  'https://www.univen.ac.za', 'https://www.univen.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Humanities, Social Sciences and Education
  ('BA Media Studies',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English or African Language 4 (50-59%).'),
  ('BA',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4 (50-59%).'),
  ('BA Development Studies',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4. History or Economics 4.'),
  ('BA Indigenous Knowledge Systems',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BA Language Practice',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. African Language 4. English 4.'),
  ('BA English Language and Literature',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BA International Relations',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4. History or Economics 4.'),
  ('BA Youth Development',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('BA History',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4. History 4.'),
  ('Bachelor of Theology',
   30,'nsc_aps',30,'Humanities, Social Sciences and Education',3,'degree',7,NULL,
   'LO excluded. English 4. RPL considered.'),
  ('Higher Certificate in Music',
   18,'nsc_aps',18,'Humanities, Social Sciences and Education',1,'higher_certificate',5,NULL,
   'LO excluded. English required. NSC certificate pass.'),
  ('Bachelor of Social Work',
   35,'nsc_aps',35,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. English 4 (50-59%).'),
  ('BEd Senior Phase and FET Teaching',
   36,'nsc_aps',36,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. English 50%. Two subjects 50% from: Mathematics, Physical Sciences, Life Sciences, Accounting, Business Studies, Economics, History, Geography, Sepedi, Tshivenda, or Xitsonga. NSC bachelor''s endorsement required.'),
  ('BEd Foundation Phase Teaching',
   36,'nsc_aps',36,'Humanities, Social Sciences and Education',4,'degree',7,NULL,
   'LO excluded. English 50%. Mathematics Literacy 50%. Mathematics 40%. Languages 50%. NSC bachelor''s endorsement required.'),
  -- Faculty of Health Sciences
  ('Bachelor of Nursing',
   38,'nsc_aps',38,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 4 (60-69%). English 4. Physical Sciences 4 (60-69%). Mathematics 4 (50-59%).'),
  ('BSc Nutrition',
   34,'nsc_aps',34,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 4. English 4. Mathematics 4. Physical Sciences or Agricultural Sciences 4.'),
  ('BSc Sports and Exercise Science',
   34,'nsc_aps',34,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 4. English 4. Physical Sciences 4.'),
  ('BSc Biokinesics',
   34,'nsc_aps',34,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 4. English 4. Mathematics 4. Physical Sciences 4.'),
  ('BSc Recreation and Leisure Studies',
   34,'nsc_aps',34,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4.'),
  ('Bachelor of Psychology',
   36,'nsc_aps',36,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Selection test required.'),
  ('Diploma in Nursing',
   28,'nsc_aps',28,'Health Sciences',3,'diploma',6,NULL,
   'LO excluded. Life Sciences 4. English 4. Physical Sciences 4. Mathematics 3.'),
  -- Faculty of Management, Commerce and Law
  ('BAdmin Public Administration',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Three other subjects 3 (40-49%).'),
  ('BCom Accounting Sciences',
   35,'nsc_aps',35,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 50%.'),
  ('BCom Tourism Management',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Maths Literacy 3 or Mathematics 3. Two of: Accounting, Business Studies, Economics, IT, Geography, Tourism 3.'),
  ('BCom Accounting',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Accounting or Mathematics 4.'),
  ('BCom Business Information Systems',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 75% or Maths Literacy 3. Two of: Accounting, Business Studies, Economics, IT, Computer Studies 3.'),
  ('BCom Business Management',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Business Studies 4. Two of: Accounting, Economics, IT, Mathematics 3.'),
  ('BCom Cost and Management Accounting',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Accounting or Mathematics 4.'),
  ('BCom Economics',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Economics or Mathematics 4. Two of: Accounting, Business Studies, IT 3.'),
  ('BCom Human Resource Management',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Two of: Accounting, Business Studies, Economics, IT, Mathematics 3.'),
  ('BCom Industrial Psychology',
   32,'nsc_aps',32,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 4. Two of: Accounting, Business Studies, Economics, IT, Mathematics 3.'),
  ('LLB',
   38,'nsc_aps',38,'Management, Commerce and Law',4,'degree',8,NULL,
   'LO excluded. English 60% minimum.'),
  ('BA Criminal Justice',
   34,'nsc_aps',34,'Management, Commerce and Law',3,'degree',7,NULL,
   'LO excluded. English 50% minimum.'),
  -- Extended degree programmes (Management/Commerce/Law): APS 28-31
  ('BAdmin Extended',
   28,'nsc_aps',28,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. APS 28-31. Extended 4-year programme.'),
  ('BCom Accounting Extended',
   28,'nsc_aps',28,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. APS 28-31. Extended 4-year programme.'),
  ('BCom Business Management Extended',
   28,'nsc_aps',28,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. APS 28-31. Extended 4-year programme.'),
  ('BCom Economics Extended',
   28,'nsc_aps',28,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. APS 28-31. Extended 4-year programme.'),
  ('BCom Human Resource Management Extended',
   28,'nsc_aps',28,'Management, Commerce and Law',4,'degree',7,NULL,
   'LO excluded. APS 28-31. Extended 4-year programme.'),
  -- Faculty of Science, Engineering and Agriculture
  ('Diploma in Freshwater Technology',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',3,'diploma',6,NULL,
   'LO excluded. English 3. Four NSC subjects 3. Life Sciences, Agricultural Sciences, Physical Sciences or Geography 4.'),
  ('BSc',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Biochemistry and Microbiology',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Biochemistry and Biology',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Microbiology and Botany',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Mathematics and Applied Mathematics',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Mathematics and Physics',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Mathematics and Statistics',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Physics and Chemistry',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Chemistry and Mathematics',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Chemistry and Biochemistry',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Chemistry and Applied Chemistry',
   26,'nsc_aps',26,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Botany and Zoology',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Computer Science',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('BSc Computer Science and Mathematics',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4.'),
  ('Bachelor of Environmental Sciences',
   32,'nsc_aps',32,'Science, Engineering and Agriculture',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Sciences 4. Life Sciences 4. Geography or Agricultural Sciences 4.'),
  ('BEarthSci Mining and Environmental Geology',
   35,'nsc_aps',35,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. Mathematics 5 (60-69%). Physical Science 4. English 4. Three of: Agricultural Sciences, Life Sciences, Economics, Geography or Accounting 4.'),
  ('BEarthSci Hydrology and Water Resources',
   35,'nsc_aps',35,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. Mathematics 5. English 5. Physical Sciences 5. Three of: Agricultural Sciences, Life Sciences, Economics, Geography or Accounting 4.'),
  ('Bachelor of Urban and Regional Planning',
   35,'nsc_aps',35,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. Physical Sciences 5. Mathematics 5. English 5. Geography 5. Three of: Agricultural Sciences, Life Sciences, Economics or Accounting 4.'),
  ('BEnvSci Disaster Risk Reduction',
   35,'nsc_aps',35,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. Geography 5. Mathematics 5. Life Sciences 4. English 4. Physical Sciences 4. Economics 4.'),
  ('BSc Agriculture: Agricultural Economics',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Sciences 4. Life Sciences or Agricultural Sciences 4.'),
  ('BSc Agriculture: Agribusiness Management',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Agriculture: Animal Science',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Agriculture: Horticultural Sciences',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Agriculture: Plant Production',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Soil Science',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Forestry',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences 4.'),
  ('BSc Food Science and Technology',
   28,'nsc_aps',28,'Science, Engineering and Agriculture',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4. Physical Science 4. Life Sciences or Agricultural Sciences 4.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UNIVEN';

-- NWU (North-West University)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'North-West University', 'NWU', 'North West', 'Mahikeng',
  'https://www.nwu.ac.za', 'https://www.nwu.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Health Sciences
  ('Diploma in Coaching Science',
   18,'nsc_aps',18,'Health Sciences',2,'diploma',6,NULL,
   'LO excluded. Language 4. Academic paper selection. Mahikeng and Potchefstroom campuses.'),
  ('BHSci Sport Coaching and Human Movement Sciences',
   24,'nsc_aps',24,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Language 4. Academic paper selection. Mahikeng and Potchefstroom.'),
  ('BHSci Recreation Science and Tourism Management',
   24,'nsc_aps',24,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Language 4. Academic paper selection. Potchefstroom.'),
  ('BHSci Sport and Recreation Administration',
   24,'nsc_aps',24,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Language 4. Academic paper selection. Potchefstroom.'),
  ('BHSci Biokinetics',
   32,'nsc_aps',32,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Maths 3 or Maths Literacy 4. Physical Sciences or Life Sciences 4. Language 4. Must be medically fit. Academic paper selection. Potchefstroom.'),
  ('Bachelor of Pharmacy',
   32,'nsc_aps',32,'Health Sciences',4,'degree',8,NULL,
   'LO excluded. Mathematics 5. Physical Sciences 5. Language 4. Life Sciences recommended. Potchefstroom.'),
  ('BHSci Physiology and Biochemistry',
   26,'nsc_aps',26,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 5. Physical Sciences 5. Language 4. Life Sciences recommended. Potchefstroom.'),
  ('BHSci Physiology and Psychology',
   26,'nsc_aps',26,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 5. Physical Sciences 4. Language 4. Life Sciences recommended. Potchefstroom.'),
  ('BHSci Consumer Studies',
   24,'nsc_aps',24,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Maths 4 or Maths Literacy 5. One Natural Sciences subject 4. Potchefstroom.'),
  ('Bachelor of Consumer Studies: Food Product Management',
   24,'nsc_aps',24,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4. Physical Sciences 4 (if Chemistry chosen). One Natural Sciences subject. Potchefstroom.'),
  ('Bachelor of Consumer Studies: Fashion Retail Management',
   24,'nsc_aps',24,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4. One Natural Sciences subject. Potchefstroom.'),
  ('BSc Dietetics',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 5. Physical Sciences 5. Language 4. Potchefstroom.'),
  ('BHSci Occupational Hygiene',
   27,'nsc_aps',27,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 5. Physical Sciences 5. Language 4. Potchefstroom.'),
  ('BA Psychology and Labour Relations Management',
   26,'nsc_aps',26,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Maths 3 or Maths Literacy 5. Language 4. Potchefstroom and Vanderbijlpark.'),
  ('BSocSci Psychology',
   26,'nsc_aps',26,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Language 4. Mahikeng campus.'),
  ('Bachelor of Social Work',
   28,'nsc_aps',28,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Language 4. Academic paper selection. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('Bachelor of Nursing',
   25,'nsc_aps',25,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Physical Sciences or Maths or Life Sciences 4. Language 4. High demand - selection process followed. 40 hours job shadowing recommended. Mahikeng and Potchefstroom.'),
  -- Faculty of Natural and Agricultural Sciences
  ('Diploma in Animal Health',
   22,'nsc_aps',22,'Natural and Agricultural Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Physical Science or Life Science 3. Mathematics 3 or Technical Maths 4. Mahikeng.'),
  ('Diploma in Animal Science',
   22,'nsc_aps',22,'Natural and Agricultural Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Physical Science or Life Science or Agricultural Science 3. Maths 3 or Technical Maths 4 or Maths Literacy 5. Mahikeng.'),
  ('Diploma in Plant Science with Crop Production',
   22,'nsc_aps',22,'Natural and Agricultural Sciences',3,'diploma',6,NULL,
   'LO excluded. English 3. Physical Science or Life Science or Agricultural Science 3. Maths 3 or Technical Maths 4 or Maths Literacy 5. Mahikeng.'),
  ('BSc (Natural Sciences)',
   26,'nsc_aps',26,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4-5. Physical Sciences 4. Specialisations: Chemistry/Physics, Biochemistry/Chemistry, Physics/Computer Science, Environmental Sciences, Biological Sciences and more. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BSc Financial Mathematics',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 6. Potchefstroom and Vanderbijlpark.'),
  ('BSc Business Analytics',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 6. Potchefstroom and Vanderbijlpark.'),
  ('BSc Quantitative Risk Management',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 6. Potchefstroom.'),
  ('BSc Actuarial Sciences',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 6. Potchefstroom and Vanderbijlpark.'),
  ('BSc Urban and Regional Planning',
   28,'nsc_aps',28,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 or Technical Maths 5. Selection test required. Potchefstroom.'),
  ('BSc Information Technology',
   26,'nsc_aps',26,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 or Technical Maths 5. Potchefstroom and Vanderbijlpark.'),
  ('BSc Agricultural Sciences',
   26,'nsc_aps',26,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 4 or Technical Maths 5. Physical Science or Life Science 4. Mahikeng.'),
  ('BSc Extended (Natural Sciences)',
   24,'nsc_aps',24,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 or Technical Maths 4. Physical Sciences 4. Extended 4-year programme. Mahikeng.'),
  -- Faculty of Economic and Management Sciences
  ('BCom Accounting',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. English 4. Vanderbijlpark.'),
  ('BCom Chartered Accountancy',
   32,'nsc_aps',32,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 5. Language 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BCom Chartered Accountancy Extended',
   28,'nsc_aps',28,'Economic and Management Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 3. English 4. Extended 4-year programme.'),
  ('BCom Forensic Accountancy',
   36,'nsc_aps',36,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 5. Language 5. Potchefstroom.'),
  ('BCom Management Accountancy',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 5. Language 4. Potchefstroom, Vanderbijlpark.'),
  ('BCom Financial Accountancy',
   28,'nsc_aps',28,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BCom Business Management',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. Language 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BCom Marketing Management',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. Language 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BCom Communication Management',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3 or Maths Literacy 6. Language 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BCom Logistics Management',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. Language 4. Mahikeng, Vanderbijlpark.'),
  ('BCom Transport Economics',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. Language 4. Mahikeng, Vanderbijlpark.'),
  ('BCom Tourism and Marketing Management',
   24,'nsc_aps',24,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3 or Maths Literacy 6. Language 4. Mahikeng, Potchefstroom.'),
  ('BCom Human Resource Management',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Mahikeng, Potchefstroom.'),
  ('BCom Industrial and Organisational Psychology',
   30,'nsc_aps',30,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Mahikeng, Potchefstroom.'),
  ('BCom Information Systems',
   26,'nsc_aps',26,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Mahikeng.'),
  ('BCom Informatics',
   26,'nsc_aps',26,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Potchefstroom, Vanderbijlpark.'),
  ('BCom International Trade',
   26,'nsc_aps',26,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4. Language 4. Potchefstroom, Vanderbijlpark.'),
  ('BCom Agricultural Economics and Risk Management',
   26,'nsc_aps',26,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Afrikaans 4. Potchefstroom.'),
  ('BCom Econometrics',
   26,'nsc_aps',26,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3. English 4. Mahikeng.'),
  ('BAdmin Human Resource Management',
   23,'nsc_aps',23,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3 or Maths Literacy 4. English 4. Mahikeng.'),
  ('BAdmin Industrial and Organisational Psychology',
   23,'nsc_aps',23,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 3 or Maths Literacy 4. English 4. Mahikeng.'),
  ('BA Tourism Management',
   22,'nsc_aps',22,'Economic and Management Sciences',3,'degree',7,NULL,
   'LO excluded. English 4. Mahikeng.'),
  -- Faculty of Humanities
  ('BA Communication',
   24,'nsc_aps',24,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL 4 or FAL 5. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BA Graphic Design',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 5. Portfolio and skills test required. Potchefstroom.'),
  ('BA Public Administration',
   25,'nsc_aps',25,'Humanities',3,'degree',7,NULL,
   'LO excluded. HL or FAL 4. Potchefstroom, Vanderbijlpark.'),
  ('BSocSci Political Studies and International Relations',
   24,'nsc_aps',24,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home Language 4. Mahikeng.'),
  ('BAdmin Development and Management: Local Government',
   21,'nsc_aps',21,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4. Mathematics 3 or Maths Literacy 4. Mahikeng.'),
  ('BA Language and Culture Studies',
   24,'nsc_aps',24,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home Language or English 4. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('Diploma in Music',
   18,'nsc_aps',18,'Humanities',3,'diploma',6,NULL,
   'LO excluded. English 4. Language proficiency test, musical aptitude test and audition required. Potchefstroom.'),
  ('BA Music and Songwriting',
   21,'nsc_aps',21,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4. Audition required. Potchefstroom.'),
  ('Baccalaureate Musicae (BMus)',
   24,'nsc_aps',24,'Humanities',4,'degree',7,NULL,
   'LO excluded. Theory placement test (grade 5). Audition required. Potchefstroom.'),
  ('BSocSci Social Sciences',
   22,'nsc_aps',22,'Humanities',3,'degree',7,NULL,
   'LO excluded. Home Language 4. Specialisations: Development Studies, Geography, Psychology, Social Anthropology, Sociology. Mahikeng, Potchefstroom, Vanderbijlpark.'),
  ('BA Philosophy, Politics and Economics',
   26,'nsc_aps',26,'Humanities',3,'degree',7,NULL,
   'LO excluded. HL and FAL 4. Potchefstroom.'),
  -- Faculty of Education
  ('BEd Early Childhood Care and Education',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'LO excluded. Home Language and FAL 4. Basic Clearance Certificate required (Children''s Act). Computer literacy required. Distance learning.'),
  ('BEd Foundation Phase Teaching',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'LO excluded. Home Language and FAL 4. Maths 3 or Technical Maths 4. Mahikeng, Potchefstroom, Vanderbijlpark, Distance.'),
  ('BEd Intermediate Phase Teaching',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'LO excluded. Home Language and FAL 4. Mathematics 3 or Technical Maths 4. Potchefstroom, Vanderbijlpark.'),
  ('BEd Senior and FET Phase Teaching',
   26,'nsc_aps',26,'Education',4,'degree',7,NULL,
   'LO excluded. Home Language and FAL 4. Subject-specific requirements vary by specialisation. Mahikeng, Potchefstroom, Vanderbijlpark, Distance.'),
  -- Faculty of Engineering
  ('BEng (Chemical, Electrical, Computer, Mechanical, Mechatronic)',
   34,'nsc_aps',34,'Engineering',4,'degree',8,NULL,
   'LO excluded. Mathematics 70%+ (Grade 12). Physical Sciences 70%+ (Grade 12). Language of instruction 60%+. Potchefstroom. 1-year Xcel bridging programme available for borderline applicants.'),
  -- Faculty of Law
  ('BA in Law',
   30,'nsc_aps',30,'Law',3,'degree',7,NULL,
   'LO excluded. Home Language and FAL 5. Mathematics 3 or Maths Literacy 5. Selection process. Limited capacity. Potchefstroom, Vanderbijlpark.'),
  ('BCom Law',
   34,'nsc_aps',34,'Law',3,'degree',7,NULL,
   'LO excluded. Home Language and FAL 5. Mathematics 3 or Maths Literacy 4. Selection process. Limited capacity. Potchefstroom, Vanderbijlpark.'),
  ('LLB',
   34,'nsc_aps',34,'Law',4,'degree',8,NULL,
   'LO excluded. Home Language and FAL 5. Mathematics 3 or Maths Literacy 5. Selection process. Limited capacity. Mahikeng and Potchefstroom.'),
  ('LLB Extended',
   30,'nsc_aps',30,'Law',5,'degree',8,NULL,
   'LO excluded. Home Language 4 and FAL 4. Mathematics 3 or Maths Literacy 5. Selection process. Extended 5-year programme. Mahikeng.'),
  -- Faculty of Theology
  ('BA Ancient Languages',
   24,'nsc_aps',24,'Theology',3,'degree',7,NULL,
   'LO excluded. English 4. Potchefstroom.'),
  ('BTh with Pastoral Counselling and Psychology',
   26,'nsc_aps',26,'Theology',3,'degree',7,NULL,
   'LO excluded. English 4. In consultation with ACRP. Potchefstroom.'),
  ('Bachelor of Divinity (BDiv)',
   24,'nsc_aps',24,'Theology',4,'degree',7,NULL,
   'LO excluded. English 4. In consultation with Reformed, Hervormde and Dutch Reformed churches. Potchefstroom and Distance.'),
  ('BTh Christian Ministry',
   24,'nsc_aps',24,'Theology',3,'degree',7,NULL,
   'LO excluded. English 4. Potchefstroom and Distance.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'NWU';

-- UFS (University of the Free State)
INSERT INTO universities (name, abbreviation, province, city, website_url, application_url, application_fee, closing_date, is_active)
VALUES (
  'University of the Free State', 'UFS', 'Free State', 'Bloemfontein',
  'https://www.ufs.ac.za', 'https://www.ufs.ac.za/apply', NULL, '2026-09-30', true
) ON CONFLICT DO NOTHING;

INSERT INTO faculties (university_id, name, aps_minimum, scoring_system, native_score_minimum, field_of_study, duration_years, qualification_type, nqf_level, places_available, additional_requirements)
SELECT u.id, v.name, v.aps, v.sc, v.nat, v.fos, v.yrs, v.qt, v.nqf, v.places::int, v.reqs
FROM universities u
JOIN (VALUES
  -- Faculty of Economic and Management Sciences
  ('BCom',
   28,'nsc_aps',28,'Economic and Management Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). English 4 (50%). Also available at Qwaqwa Campus. Specialisations: Economics, Finance, Business Analytics, Marketing, Business Management, HRM.'),
  ('BCom (Law)',
   33,'nsc_aps',33,'Economic and Management Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). English 4 (50%).'),
  ('BAdmin',
   28,'nsc_aps',28,'Economic and Management Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 3 (30%). English 4 (50%). Also available at Qwaqwa Campus (Maths 2 accepted).'),
  ('BCom with specialisation in Management',
   28,'nsc_aps',28,'Economic and Management Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). English 4 (50%). Qwaqwa Campus only.'),
  -- Faculty of Education
  ('BEd Foundation Phase',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. English HL 4 (50%). Afrikaans HL 4 (50%). Specialisations: Afrikaans, Sesotho, isiZulu. Bloemfontein and South Campus.'),
  ('BEd Intermediate Phase',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Life Sciences 4 (60%). English HL, Afrikaans HL, or Sesotho HL required. Specialisations: Mathematics/Natural Sciences/Technology; Life Skills/Social Sciences/Afrikaans.'),
  ('BEd Senior Phase and FET',
   30,'nsc_aps',30,'Education',4,'degree',7,NULL,
   'LO excluded. Requirements vary by specialisation. Mathematics 4, Life Sciences 5 (60%), or English 4. Specialisations include: Accounting, EMS, Technology, Life Sciences, Sesotho/English/isiZulu FAL, Geography, Mathematical Literacy. Also at Qwaqwa Campus.'),
  ('BCommDev',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 5 (60%). Subject to selection. Qwaqwa Campus. RPL considered for applicants with Diploma in Vocational Skills (Level 4 English).'),
  -- Faculty of Health Sciences
  ('BScMed (Related Science Studies)',
   30,'nsc_aps',30,'Health Sciences',3,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 5 (60%). Subject to selection. Closing date 31 May 2026.'),
  ('MB ChB',
   36,'nsc_aps',36,'Health Sciences',6,'degree',8,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 5 (60%). Subject to selection. Closing date 31 May 2026.'),
  ('Bachelor of Nursing',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 4 (60%). Mathematics or Maths Literacy accepted. Subject to selection. Closing date 31 July 2026.'),
  ('Bachelor of Optometry',
   33,'nsc_aps',33,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 4 (60%). Subject to selection.'),
  ('BSc Physiotherapy',
   33,'nsc_aps',33,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 4 (60%). Subject to selection.'),
  ('BSc Dietetics',
   33,'nsc_aps',33,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 4 (60%). Subject to selection.'),
  ('Bachelor of Occupational Therapy',
   33,'nsc_aps',33,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 5 (60%). Physical Sciences 4 (60%). Subject to selection.'),
  ('Bachelor of Biokinetics',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Life Sciences 4 (60%). Physical Sciences 4 (60%).'),
  ('Bachelor of Sport Coaching',
   30,'nsc_aps',30,'Health Sciences',4,'degree',7,NULL,
   'LO excluded. Physical Sciences required.'),
  -- Faculty of Law
  ('LLB',
   33,'nsc_aps',33,'Law',4,'degree',8,NULL,
   'LO excluded. Mathematical Literacy 70% (or Mathematics) required.'),
  -- Faculty of Natural and Agricultural Sciences
  ('BSc Biological Sciences',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Life Sciences 4 (50%). Physical Sciences 5 (60%). Specialisations: Genetics, Botany, Biochemistry, Microbiology, Zoology, Ecology. Also at Qwaqwa Campus.'),
  ('BSc Forensic Science',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Physical Sciences 6 (70%). Life Sciences 4 (50%). Subject to selection.'),
  ('BSc Actuarial Science',
   34,'nsc_aps',34,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). English 6 (70%).'),
  ('BSc Mathematical Sciences and Applied Statistics',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics required. Specialisations: Climate Sciences, Econometrics, Statistics and Economics, Statistics and Psychology.'),
  ('BSc Chemical Sciences',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Physical Sciences 5 (60%). Specialisations: Chemistry & Biochemistry, Chemistry & Botany, Chemistry & Microbiology, Chemistry & Physics.'),
  ('BSc Geology',
   30,'nsc_aps',30,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Physical Sciences 5 (60%). Specialisations: Environmental Geology, Geochemistry, Geohydrology.'),
  ('BSc Agricultural Economics',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%).'),
  ('BSc Computer Sciences',
   33,'nsc_aps',33,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Subject to selection. Specialisations: Computer Science & Chemistry, CS & Maths, CS & Physics, Data Science, CS & Business Management. Also at Qwaqwa Campus.'),
  ('BSc Information Technology',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Physical Sciences 5 (60%). Also at Qwaqwa Campus.'),
  ('BSc Sustainable Food Systems',
   30,'nsc_aps',30,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 2 (30%).'),
  ('BSc Geography',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics required. Specialisations: Environmental Geography, Environmental Soil Science. Also at Qwaqwa Campus.'),
  ('BSc Chemical and Physical Sciences',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Life Sciences 5 (60%). Physical Sciences 5 (60%). Qwaqwa Campus only. Specialisations: Chemistry & Physics, Chemistry & Botany.'),
  ('Bachelor of Agriculture',
   30,'nsc_aps',30,'Natural and Agricultural Sciences',4,'degree',7,NULL,
   'LO excluded. Mathematics 4 (50%). Specialisations: Soil Sciences, Crop Sciences, Climate Sciences.'),
  ('BSc Agriculture',
   32,'nsc_aps',32,'Natural and Agricultural Sciences',3,'degree',7,NULL,
   'LO excluded. Life Sciences or Agricultural Sciences compulsory. Physical Sciences recommended.'),
  -- Faculty of the Humanities
  ('BA General',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50%). Also available at Qwaqwa Campus.'),
  ('BA (Language Practice)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL 5 (60%). Subject to selection.'),
  ('BA (Governance and Political Transformation)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50%).'),
  ('BA (Integrated Organisational Communication)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 5 (60%).'),
  ('BA (Journalism)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL 4 (50%).'),
  ('BA (Fine Arts)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50%). Portfolio of creative work required. Subject to selection. Closing date 30 September 2026.'),
  ('BA (Drama and Theatre Arts)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English HL 5 (60%) or FAL 4 (50%). Compulsory audition and interview. Closing date 30 September 2026.'),
  ('BA (Specialising in Languages)',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50%).'),
  ('Bachelor of Music',
   30,'nsc_aps',30,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 4 (50%). Music Theory UNISA/ABRSM Grade 5 or Performance Grade 7 required. Compulsory audition. Closing date 30 September 2026.'),
  ('Bachelor of Social Work',
   35,'nsc_aps',35,'Humanities',4,'degree',7,NULL,
   'LO excluded. English 5 (60%). Subject to selection. Closing date 31 July 2026. Preference to direct school leavers.'),
  ('Bachelor of Social Sciences',
   30,'nsc_aps',30,'Humanities',3,'degree',7,NULL,
   'LO excluded. English 4 (50%). Specialisations: Psychology, Sociology, Anthropology, Criminology, Political Science, Industrial Psychology.'),
  ('Higher Certificate in Music Performance',
   20,'nsc_aps',20,'Humanities',1,'higher_certificate',5,NULL,
   'LO excluded. Compulsory audition and musical aptitude test. Subject to selection. Closing date 30 September 2026.'),
  ('Diploma in Music',
   25,'nsc_aps',25,'Humanities',3,'diploma',6,NULL,
   'LO excluded. UNISA/ABRSM/Trinity College Grade 3 Music Theory advised. Compulsory audition. Subject to selection. Closing date 30 September 2026.'),
  ('Advanced Diploma in Music',
   0,'nsc_aps',0,'Humanities',2,'advanced_diploma',7,NULL,
   'Completed Diploma in Music or NQF6 equivalent required. Compulsory audition. Subject to selection.'),
  ('Advanced Diploma in Opera Studies',
   0,'nsc_aps',0,'Humanities',2,'advanced_diploma',7,NULL,
   'Completed Diploma in Music or NQF6 equivalent required. Compulsory audition before 30 September 2026. Subject to selection.'),
  -- Faculty of Theology and Religion
  ('Bachelor of Divinity',
   28,'nsc_aps',28,'Theology and Religion',4,'degree',7,NULL,
   'LO excluded. English 4 (50%). CAL (test of academic literacy) required on registration. Focus on professional ministry.')
) AS v(name,aps,sc,nat,fos,yrs,qt,nqf,places,reqs) ON u.abbreviation = 'UFS';


-- ============================================================
-- UNIVERSITY LOGOS
-- Source: Wikimedia Commons (stable public CDN)
-- ============================================================
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS logo_url text;
UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7c/University_of_Cape_Town_logo.svg/250px-University_of_Cape_Town_logo.svg.png'
  WHERE abbreviation = 'UCT';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Stellenbosch_University_New_Logo.jpg/250px-Stellenbosch_University_New_Logo.jpg'
  WHERE abbreviation = 'SU';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/CPUT_logo.svg/250px-CPUT_logo.svg.png'
  WHERE abbreviation = 'CPUT';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/UWC_Logo.svg/250px-UWC_Logo.svg.png'
  WHERE abbreviation = 'UWC';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/University_of_Pretoria_Coat_of_Arms.png/250px-University_of_Pretoria_Coat_of_Arms.png'
  WHERE abbreviation = 'UP';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Logo_for_the_University_of_the_Witwatersrand%2C_Johannesburg_%28new_logo_as_of_2015%29.jpg/250px-Logo_for_the_University_of_the_Witwatersrand%2C_Johannesburg_%28new_logo_as_of_2015%29.jpg'
  WHERE abbreviation = 'WITS';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/a/af/University_of_Johannesburg_Logo.svg/250px-University_of_Johannesburg_Logo.svg.png'
  WHERE abbreviation = 'UJ';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/North-West_University_logo.svg/250px-North-West_University_logo.svg.png'
  WHERE abbreviation = 'NWU';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/UKZN_logo.svg/250px-UKZN_logo.svg.png'
  WHERE abbreviation = 'UKZN';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/The_Durban_University_of_Technology_new_log.jpg/250px-The_Durban_University_of_Technology_new_log.jpg'
  WHERE abbreviation = 'DUT';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Tshwane_University_of_Technology_logo.svg/250px-Tshwane_University_of_Technology_logo.svg.png'
  WHERE abbreviation = 'TUT';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Nelson_Mandela_University_logo.svg/250px-Nelson_Mandela_University_logo.svg.png'
  WHERE abbreviation = 'NMU';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/2/24/University_of_the_Free_State_coat_of_arms.svg/250px-University_of_the_Free_State_coat_of_arms.svg.png'
  WHERE abbreviation = 'UFS';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/3/38/University_of_Limpopo_logo.svg/250px-University_of_Limpopo_logo.svg.png'
  WHERE abbreviation = 'UL';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Unisa_coat_of_arms.svg/250px-Unisa_coat_of_arms.svg.png'
  WHERE abbreviation = 'UNISA';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Rhodes_University_coat_of_arms.svg/250px-Rhodes_University_coat_of_arms.svg.png'
  WHERE abbreviation = 'RU';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Vaal_University_of_Technology_logo.svg/250px-Vaal_University_of_Technology_logo.svg.png'
  WHERE abbreviation = 'VUT';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/University_of_Venda_logo.svg/250px-University_of_Venda_logo.svg.png'
  WHERE abbreviation = 'UNIVEN';

UPDATE universities SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/University_of_Zululand_coat_of_arms.svg/250px-University_of_Zululand_coat_of_arms.svg.png'
  WHERE abbreviation = 'UZ';
