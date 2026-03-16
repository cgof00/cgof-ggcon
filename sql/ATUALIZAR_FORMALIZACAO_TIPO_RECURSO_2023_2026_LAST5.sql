-- Atualizar formalizacao.tipo_formalizacao e formalizacao.recurso direto no banco
-- Escopo: apenas anos 2023–2026
-- Fonte sugerida: tabela formalizacao_recursos (ou outra staging com colunas emenda, tipo_formalizacao, recurso)
--
-- Estratégia:
-- 1) Match principal por emenda normalizada (apenas dígitos)
-- 2) Fallback por 5 últimos dígitos APENAS quando a chave é única na fonte (evita colisões)
-- 3) Nunca sobrescreve com vazio/nulo (só preenche com valores não-vazios da fonte)

begin;

-- Parâmetros (ajuste se precisar)
-- anos permitidos
with params as (
  select array[2023, 2024, 2025, 2026]::int[] as years
),
source_raw as (
  select
    emenda as emenda_src,
    regexp_replace(coalesce(emenda, ''), '\\D', '', 'g') as emenda_norm,
    right(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g'), 5) as emenda_last5,
    nullif(btrim(tipo_formalizacao), '') as tipo_formalizacao,
    nullif(btrim(recurso), '') as recurso,
    case
      when length(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g')) >= 4
        then substring(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g') from 1 for 4)::int
      else null
    end as ano
  from formalizacao_recursos
  where (nullif(btrim(tipo_formalizacao), '') is not null)
     or (nullif(btrim(recurso), '') is not null)
),
source_filtered as (
  select s.*
  from source_raw s, params p
  where s.ano = any(p.years)
    and s.emenda_norm <> ''
),
source_by_norm as (
  -- Dedupe por emenda completa normalizada
  select
    emenda_norm,
    max(tipo_formalizacao) as tipo_formalizacao,
    max(recurso) as recurso
  from source_filtered
  group by emenda_norm
),
updated_norm as (
  update formalizacao f
  set
    tipo_formalizacao = coalesce(s.tipo_formalizacao, f.tipo_formalizacao),
    recurso = coalesce(s.recurso, f.recurso),
    updated_at = now()
  from source_by_norm s, params p
  where
    -- ano do destino
    (
      case
        when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
          then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
        else null
      end
    ) = any(p.years)
    and regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') = s.emenda_norm
  returning f.id
),
source_last5_unique as (
  -- Só chaves last5 que não colidem na fonte
  select
    emenda_last5,
    max(tipo_formalizacao) as tipo_formalizacao,
    max(recurso) as recurso
  from source_filtered
  where emenda_last5 is not null and emenda_last5 <> ''
  group by emenda_last5
  having count(*) = 1
),
updated_last5 as (
  update formalizacao f
  set
    tipo_formalizacao = coalesce(s.tipo_formalizacao, f.tipo_formalizacao),
    recurso = coalesce(s.recurso, f.recurso),
    updated_at = now()
  from source_last5_unique s, params p
  where
    (
      case
        when length(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g')) >= 4
          then substring(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g') from 1 for 4)::int
        else null
      end
    ) = any(p.years)
    and right(regexp_replace(coalesce(f.emenda, ''), '\\D', '', 'g'), 5) = s.emenda_last5
    -- evita re-updating linhas já atualizadas pelo match completo
    and not exists (select 1 from updated_norm u where u.id = f.id)
  returning f.id
)
select
  (select count(*) from source_filtered) as fonte_linhas_2023_2026,
  (select count(*) from source_by_norm) as fonte_emendas_unicas_norm,
  (select count(*) from updated_norm) as updated_por_norm,
  (select count(*) from source_last5_unique) as fonte_chaves_last5_unicas,
  (select count(*) from updated_last5) as updated_por_last5;

commit;

-- Observação importante:
-- - Se "recurso" na fonte estiver vazio/NULL, o destino não será alterado.
-- - Se você quiser sobrescrever mesmo quando estiver vazio, eu adapto.
