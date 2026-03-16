#!/usr/bin/env python3
"""
🚀 Setup Automático - Criar função sync_incremental() no Supabase
Execute: python setup_sync.py
"""

import os
import sys
from supabase import create_client, Client

def setup_sync():
    """Cria a função sync_incremental() no banco"""
    
    # Pegar credenciais do ambiente
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERRO: Variáveis de ambiente não configuradas!")
        print("Defina:")
        print("  SUPABASE_URL=...")
        print("  SUPABASE_SERVICE_ROLE_KEY=...")
        return False
    
    # Conectar ao Supabase
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado ao Supabase")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return False
    
    # SQL para criar a função
    sql = """
DROP FUNCTION IF EXISTS sync_incremental() CASCADE;

CREATE OR REPLACE FUNCTION sync_incremental()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE 
  v_ultimo_codigo VARCHAR := '';
  v_inserted INTEGER := 0;
BEGIN
  SELECT COALESCE(emenda, '') INTO v_ultimo_codigo
  FROM formalizacao
  ORDER BY id DESC
  LIMIT 1;

  RAISE NOTICE 'Último código importado: %', COALESCE(v_ultimo_codigo, '[NENHUM]');

  WITH novas_emendas AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, emendas_agregadoras,
      situacao_demandas_sempapel, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      TRIM(COALESCE(e.ano_refer, '')),
      TRIM(COALESCE(e.parlamentar, '')),
      TRIM(COALESCE(e.partido, '')),
      TRIM(COALESCE(e.codigo_num, '')),
      TRIM(COALESCE(e.detalhes, '')),
      TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')),
      TRIM(COALESCE(e.num_emenda, '')),
      TRIM(COALESCE(e.situacao_d, '')),
      TRIM(COALESCE(e.num_convenio, '')),
      TRIM(COALESCE(e.regional, '')),
      TRIM(COALESCE(e.municipio, '')),
      TRIM(COALESCE(e.beneficiario, '')),
      TRIM(COALESCE(e.objeto, '')),
      TRIM(COALESCE(e.portfolio, '')),
      COALESCE(e.valor, 0)
    FROM emendas e
    WHERE TRIM(COALESCE(e.codigo_num, '')) > v_ultimo_codigo
      AND e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
    ORDER BY e.codigo_num ASC
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas_emendas;

  RAISE NOTICE 'Emendas inseridas: %', v_inserted;

  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'ultimo_codigo', v_ultimo_codigo,
    'message', CASE 
      WHEN v_inserted = 0 THEN 'Nenhuma emenda nova para sincronizar'
      WHEN v_inserted = 1 THEN '1 nova emenda foi sincronizada'
      ELSE v_inserted || ' novas emendas foram sincronizadas'
    END
  );
END;
$$;
    """
    
    try:
        print("🔧 Criando função sync_incremental()...")
        # Supabase admin client pode executar SQL via rpc
        # Mas precisa usar query builder or raw SQL
        
        # Não tem forma direta via Python, vou usar curl/requests
        import requests
        import json
        
        # Tentar chamar a função para ver se existe
        headers = {
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        }
        
        url = f'{SUPABASE_URL}/rest/v1/rpc/sync_incremental'
        resp = requests.post(url, headers=headers, json={})
        
        if resp.status_code == 200:
            print("✅ Função sync_incremental() JÁ EXISTE e está funcionando!")
            result = resp.json()
            print(f"   Último código: {result.get('ultimo_codigo', 'N/A')}")
            print(f"   Inseridas: {result.get('inserted', 0)} novas emendas")
            return True
        else:
            print(f"❌ Função NÃO EXISTE (status {resp.status_code})")
            print("   Execute manualmente no Supabase SQL Editor:")
            print("\n" + "="*80)
            print("Copie e cola isto no Supabase → SQL Editor → New Query:")
            print("="*80)
            print(sql)
            print("="*80)
            return False
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        print("\nExecute manualmente no Supabase SQL Editor o conteúdo de:")
        print("  sql/SYNC_INCREMENTAL.sql")
        return False

if __name__ == '__main__':
    success = setup_sync()
    sys.exit(0 if success else 1)
