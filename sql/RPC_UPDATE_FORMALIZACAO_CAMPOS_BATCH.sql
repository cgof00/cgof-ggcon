-- RPC: Atualiza formalizacao.tipo_formalizacao e formalizacao.recurso em lote
-- - Chave: emenda (match por dígitos apenas para tolerar formatação com pontos)
-- - Escopo: apenas anos 2023–2026 (por padrão)
--
-- Como usar (via PostgREST):
-- POST /rest/v1/rpc/update_formalizacao_campos_batch
-- { "records": [ {"emenda":"2026.005.80418","tipo_formalizacao":"...","recurso":"..."}, ... ] }

create or replace function public.update_formalizacao_campos_batch(
  records jsonb,
  years int[] default array[2023, 2024, 2025, 2026]
)
returns jsonb
language plpgsql
as $$
declare
  updated_rows int := 0;
  not_found int := 0;
  skipped_year int := 0;
  input_rows int := 0;
  filtered_rows int := 0;
begin
  if records is null then
    return jsonb_build_object('updated', 0, 'notFound', 0, 'skippedYear', 0, 'total', 0, 'years', years);
  end if;

  with input as (
    select
      nullif(btrim(elem->>'emenda'), '') as emenda_raw,
      regexp_replace(coalesce(elem->>'emenda', ''), '\\D', '', 'g') as emenda_norm,
      nullif(btrim(elem->>'tipo_formalizacao'), '') as tipo_formalizacao,
      nullif(btrim(elem->>'recurso'), '') as recurso,
      case
        when length(regexp_replace(coalesce(elem->>'emenda', ''), '\\D', '', 'g')) >= 4
          then substring(regexp_replace(coalesce(elem->>'emenda', ''), '\\D', '', 'g') from 1 for 4)::int
        else null
      end as ano
    from jsonb_array_elements(records) as elem
  ),
  input_clean as (
    select *
    from input
    where emenda_raw is not null
      and emenda_norm <> ''
      and (tipo_formalizacao is not null or recurso is not null)
  ),
  input_filtered as (
    select *
    from input_clean
    where ano = any(years)
  ),
  updated as (
    update formalizacao f
    set
      tipo_formalizacao = coalesce(i.tipo_formalizacao, f.tipo_formalizacao),
      recurso = coalesce(i.recurso, f.recurso)
    from input_filtered i
    where regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = i.emenda_norm
    returning 1
  ),
  counts as (
    select
      (select count(*) from input) as total_input,
      (select count(*) from input_clean) as clean_input,
      (select count(*) from input_filtered) as filtered_input,
      (select count(*) from updated) as updated_count,
      (
        select count(*)
        from input_filtered i
        where not exists (
          select 1
          from formalizacao f
          where regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = i.emenda_norm
        )
      ) as not_found_count,
      (
        select count(*)
        from input_clean i
        where i.ano is distinct from all(years)
      ) as skipped_year_count
  )
  select
    total_input,
    filtered_input,
    updated_count,
    not_found_count,
    skipped_year_count
  into
    input_rows,
    filtered_rows,
    updated_rows,
    not_found,
    skipped_year
  from counts;

  return jsonb_build_object(
    'updated', updated_rows,
    'notFound', not_found,
    'skippedYear', skipped_year,
    'total', input_rows,
    'filtered', filtered_rows,
    'years', years
  );
end;
$$;
