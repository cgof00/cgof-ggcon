#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script ESCALÁVEL para processar CSV grande (32k+ registros)
Gera múltiplos arquivos SQL para evitar limite de tamanho
"""

import csv
import sys
from pathlib import Path

def process_large_csv(csv_file, chunk_size=1000):
    """
    Processa CSV grande em chunks
    
    Args:
        csv_file: Arquivo CSV
        chunk_size: Quantos registros por arquivo SQL (default 1000)
    """
    
    print(f"📊 Processando {csv_file} (em chunks de {chunk_size})...\n")
    
    # Ler CSV
    rows = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        rows = list(reader)
    
    total = len(rows)
    print(f"✓ Total de registros: {total:,}\n")
    
    if total == 0:
        print("❌ Arquivo vazio!")
        return
    
    # Processar linhas
    insert_values = []
    skipped = 0
    
    for i, row in enumerate(rows, 1):
        emenda = row.get('Emenda', '').strip() if row.get('Emenda') else ''
        tipo = row.get('Tipo de formalização', '').strip() if row.get('Tipo de formalização') else ''
        recurso = row.get('Com ou Sem Recurso', '').strip() if row.get('Com ou Sem Recurso') else ''
        
        if not emenda:
            skipped += 1
            if i % 5000 == 0:
                print(f"  ⏳ Processado {i:,} linhas...")
            continue
        
        # Escapar aspas
        tipo = tipo.replace("'", "''") if tipo else ''
        recurso = recurso.replace("'", "''") if recurso else ''
        
        # Montar INSERT
        tipo_val = f"'{tipo}'" if tipo else 'NULL'
        recurso_val = f"'{recurso}'" if recurso else 'NULL'
        
        insert_values.append(f"('{emenda}', {tipo_val}, {recurso_val})")
    
    print(f"✓ {len(insert_values):,} registros válidos")
    print(f"✗ {skipped:,} registros pulados (emenda vazia)\n")
    
    # Dividir em chunks
    num_chunks = (len(insert_values) + chunk_size - 1) // chunk_size
    print(f"📦 Dividindo em {num_chunks} arquivo(s)...\n")
    
    total_files = 0
    for chunk_num in range(num_chunks):
        start_idx = chunk_num * chunk_size
        end_idx = min(start_idx + chunk_size, len(insert_values))
        chunk_values = insert_values[start_idx:end_idx]
        
        # Gerar SQL
        sql = f"""-- Importação de Recurso e Tipo de Formalização
-- Chunk {chunk_num + 1} de {num_chunks} ({len(chunk_values):,} registros)
-- Gerado automaticamente

INSERT INTO formalizacao_recursos_tipos_staging (emenda, tipo_formalizacao, recurso) VALUES
"""
        sql += ",\n".join(chunk_values)
        sql += """
ON CONFLICT (emenda) DO UPDATE SET
  tipo_formalizacao = COALESCE(NULLIF(TRIM(EXCLUDED.tipo_formalizacao), ''), formalizacao_recursos_tipos_staging.tipo_formalizacao),
  recurso = COALESCE(NULLIF(TRIM(EXCLUDED.recurso), ''), formalizacao_recursos_tipos_staging.recurso),
  processed = FALSE;

-- ✅ Verificar dados importados neste chunk
SELECT {chunk_num + 1} AS chunk, COUNT(*) as importados FROM formalizacao_recursos_tipos_staging WHERE created_at IS NOT NULL;
"""
        
        # Salvar arquivo
        output_file = f"import_data_chunk_{chunk_num + 1:02d}_de_{num_chunks:02d}.sql"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        
        print(f"  ✅ {output_file} ({len(chunk_values):,} registros)")
        total_files += 1
    
    # Criar arquivo de controle
    control_sql = f"""-- ============================================================
-- 🎯 ARQUIVO DE CONTROLE - Execute nesta ordem
-- ============================================================
-- Total de {total:,} registros em {total_files} chunk(s)
-- ============================================================

-- PASSO 1: CRIAR TABELA STAGING
DROP TABLE IF EXISTS formalizacao_recursos_tipos_staging CASCADE;

CREATE TABLE formalizacao_recursos_tipos_staging (
  emenda TEXT PRIMARY KEY,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_emenda ON formalizacao_recursos_tipos_staging(emenda);

SELECT 'Staging table created ✓' AS status;

-- PASSO 2: EXECUTAR OS CHUNKS EM ORDEM
-- Cole e execute cada arquivo na ordem:
"""
    
    for i in range(1, total_files + 1):
        control_sql += f"\n-- 2.{i}) Chunk {i} de {total_files}\n"
        control_sql += f"-- Cole: import_data_chunk_{i:02d}_de_{total_files:02d}.sql\n"
    
    control_sql += f"""

-- PASSO 3: ATUALIZAR FORMALIZACAO (DEPOIS DE TODOS OS CHUNKS)
BEGIN;

UPDATE formalizacao f
SET
  tipo_formalizacao = COALESCE(
    NULLIF(TRIM(s.tipo_formalizacao), ''),
    f.tipo_formalizacao
  ),
  recurso = COALESCE(
    NULLIF(TRIM(s.recurso), ''),
    f.recurso
  ),
  updated_at = NOW()
FROM formalizacao_recursos_tipos_staging s
WHERE TRIM(f.emenda) = TRIM(s.emenda)
  AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL);

UPDATE formalizacao_recursos_tipos_staging
SET processed = TRUE
WHERE tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL;

COMMIT;

SELECT 'Update complete ✓' AS status;

-- PASSO 4: VALIDAÇÃO
SELECT 
  COUNT(*) as total_staging,
  COUNT(CASE WHEN processed = TRUE THEN 1 END) as processados,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso
FROM formalizacao_recursos_tipos_staging;

-- PASSO 5: LIMPEZA (Depois de confirmar sucesso)
-- DROP TABLE formalizacao_recursos_tipos_staging;
"""
    
    with open("00_CONTROLE_CHUNKS.sql", 'w', encoding='utf-8') as f:
        f.write(control_sql)
    
    print(f"\n✅ Arquivo de controle: 00_CONTROLE_CHUNKS.sql")
    print(f"\n📈 RESUMO:")
    print(f"  • Total de registros: {total:,}")
    print(f"  • Registros válidos: {len(insert_values):,}")
    print(f"  • Registros pulados: {skipped:,}")
    print(f"  • Arquivos gerados: {total_files}")
    print(f"  • Registros por arquivo: ~{chunk_size:,}")
    
    # Contar linhas com dados
    count_tipo = sum(1 for r in rows if r.get('Tipo de formalização', '').strip())
    count_recurso = sum(1 for r in rows if r.get('Com ou Sem Recurso', '').strip())
    print(f"\n📊 DADOS ENCONTRADOS:")
    print(f"  • Com tipo_formalizacao: {count_tipo:,}")
    print(f"  • Com recurso: {count_recurso:,}")
    print(f"  • Com ambos: {sum(1 for r in rows if r.get('Tipo de formalização', '').strip() and r.get('Com ou Sem Recurso', '').strip()):,}")
    
    print(f"\n⚠️  PRÓXIMOS PASSOS:")
    print(f"  1. Abra o Supabase SQL Editor")
    print(f"  2. Execute: 00_CONTROLE_CHUNKS.sql (Passo 1)")
    print(f"  3. Para cada chunk, cole:")
    for i in range(1, min(total_files + 1, 6)):
        print(f"     - import_data_chunk_{i:02d}_de_{total_files:02d}.sql")
    if total_files > 5:
        print(f"     - ... (continue com outros chunks)")
    print(f"  4. Depois cole: Passo 3, 4, 5 do controle")
    
    return total_files

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 process_large_csv.py <arquivo.csv> [chunk_size]")
        print("\nExemplo:")
        print("  python3 process_large_csv.py Copia_Dashboard_13032026_075157.csv 1000")
        print("  python3 process_large_csv.py Copia_Dashboard_13032026_075157.csv 2000")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    
    process_large_csv(csv_path, chunk_size)
