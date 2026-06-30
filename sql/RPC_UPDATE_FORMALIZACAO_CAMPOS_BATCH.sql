-- RPC: Atualiza formalizacao.tipo_formalizacao, formalizacao.recurso e formalizacao.parecer_ld em lote
-- - Chave: emenda (match por dígitos apenas para tolerar formatação com pontos)
-- - Escopo: apenas anos 2023–2026 (por padrão)
--
-- Como usar (via PostgREST):
-- POST /rest/v1/rpc/update_formalizacao_campos_batch
-- { "records": [ {"emenda":"2026.005.80418","tipo_formalizacao":"...","recurso":"...","parecer_ld":"..."}, ... ] }

create or replace function public.update_formalizacao_campos_batch(
  records jsonb,
  years int[] default array[2023, 2024, 2025, 2026]
)
returns jsonb
language plpgsql
as $$
declare
  updated_norm_rows int := 0;
  updated_last5_rows int := 0;
  updated_last5_noyear_rows int := 0;
  updated_total int := 0;
  not_found int := 0;
  skipped_year int := 0;
  ambiguous_input_last5 int := 0;
  ambiguous_dest_last5 int := 0;
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
      right(regexp_replace(coalesce(elem->>'emenda', ''), '\\D', '', 'g'), 5) as emenda_last5,
      nullif(btrim(elem->>'tipo_formalizacao'), '') as tipo_formalizacao,
      nullif(btrim(elem->>'recurso'), '') as recurso,
      nullif(btrim(elem->>'parecer_ld'), '') as parecer_ld,
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
      and (tipo_formalizacao is not null or recurso is not null or parecer_ld is not null)
  ),
  input_by_norm as (
    select
      emenda_norm,
      emenda_last5,
      ano,
      max(tipo_formalizacao) as tipo_formalizacao,
      max(recurso) as recurso,
      max(parecer_ld) as parecer_ld
    from input_clean
    group by emenda_norm, emenda_last5, ano
  ),

  -- 1) UPDATE por emenda completa (normalizada)
  updated_norm as (
    update formalizacao f
    set
      tipo_formalizacao = coalesce(i.tipo_formalizacao, f.tipo_formalizacao),
      recurso = coalesce(i.recurso, f.recurso),
      parecer_ld = coalesce(i.parecer_ld, f.parecer_ld)
    from input_by_norm i
    where
      (
        case
          when f.ano is not null
           and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
            then regexp_replace(f.ano::text, '\\D', '', 'g')::int
          when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
            then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
          else null
        end
      ) = any(years)
      and regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = i.emenda_norm
    returning f.id
  ),

  -- 2) Fallback por (ano + últimos 5 dígitos)
  --    Só aplica quando a chave for única no input (para evitar conflito de 2 emendas com mesmo final)
  input_unmatched_norm as (
    select i.*
    from input_by_norm i
    where not exists (
      select 1
      from formalizacao f
      where
        (
          case
            when f.ano is not null
             and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
              then regexp_replace(f.ano::text, '\\D', '', 'g')::int
            when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
              then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
            else null
          end
        ) = any(years)
        and regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = i.emenda_norm
    )
  ),
  input_year_last5_unique as (
    select
      ano,
      emenda_last5,
      max(tipo_formalizacao) as tipo_formalizacao,
      max(recurso) as recurso,
      max(parecer_ld) as parecer_ld
    from input_unmatched_norm
    where emenda_last5 is not null and emenda_last5 <> ''
      and ano = any(years)
    group by ano, emenda_last5
    having count(*) = 1
  ),
  formalizacao_year_last5 as (
    select
      f.id,
      right(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g'), 5) as emenda_last5,
      (
        case
          when f.ano is not null
           and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
            then regexp_replace(f.ano::text, '\\D', '', 'g')::int
          when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
            then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
          else null
        end
      ) as ano
    from formalizacao f
    where (
      case
        when f.ano is not null
         and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
          then regexp_replace(f.ano::text, '\\D', '', 'g')::int
        when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
          then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
        else null
      end
    ) = any(years)
  ),
  formalizacao_year_last5_unique as (
    select
      ano,
      emenda_last5,
      min(id) as id
    from formalizacao_year_last5
    where emenda_last5 is not null and emenda_last5 <> ''
    group by ano, emenda_last5
    having count(*) = 1
  ),
  updated_last5 as (
    update formalizacao f
    set
      tipo_formalizacao = coalesce(i.tipo_formalizacao, f.tipo_formalizacao),
      recurso = coalesce(i.recurso, f.recurso),
      parecer_ld = coalesce(i.parecer_ld, f.parecer_ld)
    from input_year_last5_unique i
    join formalizacao_year_last5_unique u
      on u.ano = i.ano
     and u.emenda_last5 = i.emenda_last5
    where f.id = u.id
      and not exists (select 1 from updated_norm un where un.id = f.id)
    returning f.id
  ),

  -- 3) Fallback por last5 SEM ano no input
  --    Útil quando a emenda na planilha não permite extrair ano, mas ainda queremos
  --    atualizar somente o destino 2023–2026. Só aplica com unicidade em ambos.
  --    PROTEÇÃO: exclui emendas cujo ano é extraível mas NÃO está nos anos alvo
  --    (ex.: emendas de 2019 têm formato AAAA.NNN.NNNN, diferente de 2023+ AAAA.NNN.NNNNN,
  --     e os últimos 5 dígitos podem colidir com emendas de outros anos — ignorar esses casos)
  input_last5_unique_anyyear as (
    select
      emenda_last5,
      max(tipo_formalizacao) as tipo_formalizacao,
      max(recurso) as recurso,
      max(parecer_ld) as parecer_ld
    from input_unmatched_norm
    where emenda_last5 is not null and emenda_last5 <> ''
      and (ano is null or ano = any(years))  -- não usar linhas de anos fora do escopo (ex.: 2019)
    group by emenda_last5
    having count(*) = 1
  ),
  formalizacao_last5_unique_in_years as (
    select
      right(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g'), 5) as emenda_last5,
      min(f.id) as id
    from formalizacao f
    where (
      case
        when f.ano is not null
         and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
          then regexp_replace(f.ano::text, '\\D', '', 'g')::int
        when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
          then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
        else null
      end
    ) = any(years)
    group by 1
    having count(*) = 1
  ),
  updated_last5_noyear as (
    update formalizacao f
    set
      tipo_formalizacao = coalesce(i.tipo_formalizacao, f.tipo_formalizacao),
      recurso = coalesce(i.recurso, f.recurso),
      parecer_ld = coalesce(i.parecer_ld, f.parecer_ld)
    from input_last5_unique_anyyear i
    join formalizacao_last5_unique_in_years u
      on u.emenda_last5 = i.emenda_last5
    where f.id = u.id
      and not exists (select 1 from updated_norm un where un.id = f.id)
      and not exists (select 1 from updated_last5 ul where ul.id = f.id)
    returning f.id
  ),

  counts as (
    select
      (select count(*) from input) as total_input,
      (select count(*) from input_clean) as filtered_input,
      (select count(*) from updated_norm) as updated_norm_count,
      (select count(*) from updated_last5) as updated_last5_count,
      (select count(*) from updated_last5_noyear) as updated_last5_noyear_count,
      (
        -- emendas do input (válidas) que não acharam match nem por norm nem por last5 seguro
        select count(*)
        from input_by_norm i
        where not exists (
          select 1
          from formalizacao f
          where
            (
              case
                when f.ano is not null
                 and nullif(regexp_replace(f.ano::text, '\\D', '', 'g'), '') is not null
                  then regexp_replace(f.ano::text, '\\D', '', 'g')::int
                when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
                  then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
                else null
              end
            ) = any(years)
            and regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = i.emenda_norm
        )
        and not exists (
          select 1
          from input_year_last5_unique iu
          join formalizacao_year_last5_unique fu
            on fu.ano = iu.ano and fu.emenda_last5 = iu.emenda_last5
          where iu.ano = i.ano and iu.emenda_last5 = i.emenda_last5
        )
        and not exists (
          select 1
          from input_last5_unique_anyyear ia
          join formalizacao_last5_unique_in_years fa
            on fa.emenda_last5 = ia.emenda_last5
          where ia.emenda_last5 = i.emenda_last5
        )
      ) as not_found_count,
      (
        select count(*)
        from input_clean i
        where i.ano is not null and not (i.ano = any(years))
      ) as skipped_year_count,
      (
        select count(*)
        from (
          select ano, emenda_last5
          from input_unmatched_norm
          where emenda_last5 is not null and emenda_last5 <> ''
          group by ano, emenda_last5
          having count(*) > 1
        ) x
      ) as ambiguous_input_last5_count,
      (
        select count(*)
        from (
          select ano, emenda_last5
          from formalizacao_year_last5
          where emenda_last5 is not null and emenda_last5 <> ''
          group by ano, emenda_last5
          having count(*) > 1
        ) x
      ) as ambiguous_dest_last5_count
  )
  select
    total_input,
    filtered_input,
    updated_norm_count,
    updated_last5_count,
    updated_last5_noyear_count,
    (updated_norm_count + updated_last5_count + updated_last5_noyear_count) as updated_total_count,
    not_found_count,
    skipped_year_count,
    ambiguous_input_last5_count,
    ambiguous_dest_last5_count
  into
    input_rows,
    filtered_rows,
    updated_norm_rows,
    updated_last5_rows,
    updated_last5_noyear_rows,
    updated_total,
    not_found,
    skipped_year,
    ambiguous_input_last5,
    ambiguous_dest_last5
  from counts;

  return jsonb_build_object(
    'updated', updated_total,
    'updatedNorm', updated_norm_rows,
    'updatedLast5', updated_last5_rows,
    'updatedLast5NoYear', updated_last5_noyear_rows,
    'notFound', not_found,
    'skippedYear', skipped_year,
    'ambiguousInputLast5', ambiguous_input_last5,
    'ambiguousDestLast5', ambiguous_dest_last5,
    'total', input_rows,
    'filtered', filtered_rows,
    'years', years
  );
end;
$$;

-- Overload sem parâmetro years (útil para chamadas que omitirem years)
create or replace function public.update_formalizacao_campos_batch(
  records jsonb
)
returns jsonb
language sql
as $$
  select public.update_formalizacao_campos_batch(records, array[2023, 2024, 2025, 2026]);
$$;

-- (Opcional, mas recomendado) força o PostgREST/Supabase a recarregar o schema cache
-- para que a função recém-criada seja encontrada imediatamente.
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  -- ignorar se o canal não existir/sem permissão
  null;
end;
$$;
