-- Cria colunas auxiliares com os 5 últimos dígitos (somente números) da emenda.
-- Objetivo: usar essas colunas como chave em fórmulas/joins.
--
-- Colunas criadas (GENERATED ALWAYS AS ... STORED):
-- - formalizacao.emenda_last5            (derivada de formalizacao.emenda)
-- - emendas.emenda_last5                 (derivada de emendas.codigo_num)
-- - formalizacao_recursos.emenda_last5   (derivada de formalizacao_recursos.emenda)
--   (se a tabela se chamar formalizacao_recurso, cria nela também)
--
-- Observação importante:
-- - Últimos 5 dígitos podem colidir (2 emendas diferentes com mesmo final). Para mais segurança,
--   considere usar (ano + last5) como chave composta em joins.

begin;

do $$
begin
  -- ===== formalizacao =====
  if to_regclass('public.formalizacao') is not null then
    execute $sql$
      alter table public.formalizacao
        add column if not exists emenda_last5 text
        generated always as (
          right(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g'), 5)
        ) stored;
    $sql$;

    execute $sql$
      create index if not exists idx_formalizacao_emenda_last5
      on public.formalizacao (emenda_last5);
    $sql$;
  end if;

  -- ===== emendas =====
  if to_regclass('public.emendas') is not null then
    execute $sql$
      alter table public.emendas
        add column if not exists emenda_last5 text
        generated always as (
          right(regexp_replace(coalesce(codigo_num, ''), '\\D', '', 'g'), 5)
        ) stored;
    $sql$;

    execute $sql$
      create index if not exists idx_emendas_emenda_last5
      on public.emendas (emenda_last5);
    $sql$;
  end if;

  -- ===== formalizacao_recursos (plural) =====
  if to_regclass('public.formalizacao_recursos') is not null then
    execute $sql$
      alter table public.formalizacao_recursos
        add column if not exists emenda_last5 text
        generated always as (
          right(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g'), 5)
        ) stored;
    $sql$;

    execute $sql$
      create index if not exists idx_formalizacao_recursos_emenda_last5
      on public.formalizacao_recursos (emenda_last5);
    $sql$;
  end if;

  -- ===== formalizacao_recurso (singular) - compat =====
  if to_regclass('public.formalizacao_recurso') is not null then
    execute $sql$
      alter table public.formalizacao_recurso
        add column if not exists emenda_last5 text
        generated always as (
          right(regexp_replace(coalesce(emenda, ''), '\\D', '', 'g'), 5)
        ) stored;
    $sql$;

    execute $sql$
      create index if not exists idx_formalizacao_recurso_emenda_last5
      on public.formalizacao_recurso (emenda_last5);
    $sql$;
  end if;

  -- Recarregar schema cache do PostgREST (Supabase)
  begin
    perform pg_notify('pgrst', 'reload schema');
  exception when others then
    null;
  end;
end;
$$;

commit;
