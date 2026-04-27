-- Postgres full-text search retrieval over public.bursaries.
-- Lets BaseBot ground bursary answers in real DB rows without any external
-- embedding vendor. Uses tsvector + GIN + websearch_to_tsquery, weighted by
-- field importance (title > provider/fields > description/eligibility).
--
-- Why a trigger instead of GENERATED STORED:
--   to_tsvector(regconfig, text) is STABLE, not IMMUTABLE, so Postgres
--   rejects it inside a generated-column expression. The standard pattern
--   is a BEFORE INSERT/UPDATE trigger, which has no immutability requirement
--   and re-computes tsv automatically whenever a source field changes.

alter table public.bursaries
  add column if not exists tsv tsvector;

create or replace function public.bursaries_update_tsv()
returns trigger
language plpgsql
as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.provider, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.fields_of_study, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.provinces_eligible, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.eligibility_requirements, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.application_instructions, '')), 'C');
  return new;
end;
$$;

drop trigger if exists bursaries_tsv_update_trg on public.bursaries;
create trigger bursaries_tsv_update_trg
  before insert or update on public.bursaries
  for each row
  execute function public.bursaries_update_tsv();

-- One-shot backfill for existing rows. Direct expression — no trigger needed.
update public.bursaries
set tsv =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(provider, '')), 'B') ||
  setweight(to_tsvector('english', array_to_string(coalesce(fields_of_study, '{}'), ' ')), 'B') ||
  setweight(to_tsvector('english', array_to_string(coalesce(provinces_eligible, '{}'), ' ')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(eligibility_requirements, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(application_instructions, '')), 'C')
where tsv is null;

create index if not exists bursaries_tsv_idx
  on public.bursaries
  using gin (tsv);

-- search_bursaries_fts: top-k weighted full-text matches over active bursaries.
-- Uses websearch_to_tsquery which safely parses free-form student queries
-- ("engineering bursaries that don't need financial aid") into a tsquery.
-- Optional province / field filters narrow the result set.
create or replace function public.search_bursaries_fts(
  query text,
  match_count int default 5,
  province_filter text default null,
  field_filter text default null
)
returns table (
  id bigint,
  title text,
  provider text,
  description text,
  funding_value text,
  amount_per_year numeric,
  minimum_aps numeric,
  closing_date date,
  detail_page_url text,
  application_url text,
  application_instructions text,
  eligibility_requirements text,
  fields_of_study text[],
  provinces_eligible text[],
  similarity float
)
language plpgsql stable
as $$
declare
  ts_query tsquery;
begin
  ts_query := websearch_to_tsquery('english', coalesce(query, ''));

  -- Empty / unparseable query → no results, not an error.
  if ts_query is null or numnode(ts_query) = 0 then
    return;
  end if;

  return query
  select
    b.id, b.title, b.provider, b.description, b.funding_value,
    b.amount_per_year, b.minimum_aps, b.closing_date,
    b.detail_page_url, b.application_url, b.application_instructions,
    b.eligibility_requirements, b.fields_of_study, b.provinces_eligible,
    ts_rank_cd(b.tsv, ts_query)::float as similarity
  from public.bursaries b
  where b.is_active = true
    and b.tsv @@ ts_query
    and (
      province_filter is null
      or province_filter = any(b.provinces_eligible)
      or array_length(b.provinces_eligible, 1) is null
    )
    and (
      field_filter is null
      or field_filter = any(b.fields_of_study)
      or array_length(b.fields_of_study, 1) is null
    )
  order by ts_rank_cd(b.tsv, ts_query) desc
  limit least(match_count, 20);
end;
$$;

grant execute on function public.search_bursaries_fts(text, int, text, text) to authenticated, service_role;
