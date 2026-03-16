-- Contagem de preenchimento da coluna `recurso`
-- Tabelas:
-- - public.formalizacao
-- - public.formalizacao_recurso (se existir)
-- - public.formalizacao_recursos (se existir)
--
-- Uso (Supabase SQL Editor):
-- 1) Rode este arquivo inteiro
-- 2) Depois rode: select * from public.contar_recurso();

create or replace function public.contar_recurso()
returns table(
  table_name text,
  table_exists boolean,
  total_rows bigint,
  recurso_not_null bigint,
  recurso_not_empty bigint,
  recurso_distinct bigint
)
language plpgsql
as $$
declare
  t text;
begin
  foreach t in array array['public.formalizacao', 'public.formalizacao_recurso', 'public.formalizacao_recursos'] loop
    if to_regclass(t) is null then
      table_name := t;
      table_exists := false;
      total_rows := 0;
      recurso_not_null := 0;
      recurso_not_empty := 0;
      recurso_distinct := 0;
      return next;
    else
      return query execute format(
        $q$
          select
            %L as table_name,
            true as table_exists,
            count(*)::bigint as total_rows,
            count(recurso)::bigint as recurso_not_null,
            count(nullif(btrim(recurso), ''))::bigint as recurso_not_empty,
            count(distinct nullif(btrim(recurso), ''))::bigint as recurso_distinct
          from %s
        $q$,
        t,
        t
      );
    end if;
  end loop;
end;
$$;

-- Opcional: força reload do schema cache do PostgREST/Supabase
-- (ajuda se você for chamar via API, mas no SQL Editor não é necessário)
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  null;
end;
$$;
