#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para processar CSV de Emenda/Tipo/Recurso e gerar INSERT SQL
para importar na tabela staging do Supabase
"""

import csv
import sys
from pathlib import Path

def process_csv(csv_file, output_file=None):
    """
    Processa CSV e gera SQL INSERT
    
    Args:
        csv_file: Caminho do arquivo CSV
        output_file: Arquivo SQL de saída (opcional)
    """
    
    try:
        # Ler CSV
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            rows = list(reader)
        
        if not rows:
            print("❌ Arquivo CSV vazio!")
            return
        
        # Gerar INSERT statements
        insert_values = []
        skipped = 0
        
        print(f"📊 Processando {len(rows)} linhas do CSV...\n")
        
        for i, row in enumerate(rows, 1):
            emenda = row.get('Emenda', '').strip()
            # Tentar múltiplas variações do nome da coluna
            tipo = ''
            for key in row.keys():
                if 'tipo' in key.lower() and 'formalizacao' in key.lower():
                    tipo = row.get(key, '').strip()
                    break
            
            recurso = row.get('Com ou Sem Recurso', '').strip()
            
            if not emenda:
                print(f"⚠️  Linha {i}: Emenda vazia, pulando...")
                skipped += 1
                continue
            
            # Limpar e normalizar valores
            tipo = tipo.replace("'", "''") if tipo else ''  # Escapar aspas
            recurso = recurso.replace("'", "''") if recurso else ''
            
            # Montar value tuple
            tipo_val = f"'{tipo}'" if tipo else 'NULL'
            recurso_val = f"'{recurso}'" if recurso else 'NULL'
            insert_values.append(f"('{emenda}', {tipo_val}, {recurso_val})")
        
        if not insert_values:
            print("❌ Nenhuma linha válida encontrada!")
            return
        
        # Criar SQL
        sql = """-- Importação de Recurso e Tipo de Formalização
-- Gerado automaticamente

INSERT INTO formalizacao_recursos_tipos_staging (emenda, tipo_formalizacao, recurso) VALUES
"""
        sql += ",\n".join(insert_values)
        sql += "\nON CONFLICT (emenda) DO UPDATE SET\n"
        sql += "  tipo_formalizacao = COALESCE(NULLIF(TRIM(EXCLUDED.tipo_formalizacao), ''), formalizacao_recursos_tipos_staging.tipo_formalizacao),\n"
        sql += "  recurso = COALESCE(NULLIF(TRIM(EXCLUDED.recurso), ''), formalizacao_recursos_tipos_staging.recurso),\n"
        sql += "  processed = FALSE;"
        
        # Salvar ou exibir
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(sql)
            print(f"✅ SQL salvo em: {output_file}")
        else:
            print(sql)
        
        # Resumo
        print(f"\n📈 Resumo:")
        print(f"  ✓ Total válido: {len(insert_values)}")
        print(f"  ✗ Pulados: {skipped}")
        
        # Contar linhas com valores
        count_tipo = 0
        count_recurso = 0
        for row in rows:
            for key in row.keys():
                if 'tipo' in key.lower() and 'formalizacao' in key.lower():
                    if row.get(key, '').strip():
                        count_tipo += 1
                    break
            if row.get('Com ou Sem Recurso', '').strip():
                count_recurso += 1
        
        print(f"  📋 Linhas com tipo_formalizacao: {count_tipo}")
        print(f"  📋 Linhas com recurso: {count_recurso}")
        
        print(f"\n⚠️  Próximas etapas:")
        print(f"  1. Execute UPDATE_RECURSO_E_TIPO_VIA_STAGING.sql - ETAPA 1")
        print(f"  2. Cole o SQL acima na ETAPA 2 do arquivo")
        print(f"  3. Execute a ETAPA 3 para atualizar")
        print(f"  4. Execute ETAPA 4 para validar")
        
    except FileNotFoundError:
        print(f"❌ Arquivo não encontrado: {csv_file}")
    except Exception as e:
        print(f"❌ Erro ao processar: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 import_recursos_tipos.py <arquivo.csv> [saida.sql]")
        print("\nExemplo:")
        print("  python3 import_recursos_tipos.py Copia_Dashboard_13032026_075157.csv import_data.sql")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    process_csv(csv_path, output_path)
