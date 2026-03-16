#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script robusto para processar CSV com delimitador ';' e gerar SQL INSERT
"""

import csv

csv_file = "Copia_Dashboard_13032026_075157.csv"
output_file = "import_data_fixed.sql"

print(f"📊 Processando {csv_file}...")

# Ler CSV com delimitador correto
rows = []
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    rows = list(reader)

print(f"✓ {len(rows)} linhas lidas\n")

# Mostrar primeira linha para debug
if rows:
    print("Colunas encontradas:")
    for key in rows[0].keys():
        print(f"  - '{key}'")
    print()

# Gerar INSERT
insert_values = []

for i, row in enumerate(rows, 1):
    emenda = row.get('Emenda', '').strip() if row.get('Emenda') else ''
    tipo = row.get('Tipo de formalização', '').strip() if row.get('Tipo de formalização') else ''
    recurso = row.get('Com ou Sem Recurso', '').strip() if row.get('Com ou Sem Recurso') else ''
    
    if not emenda:
        print(f"⚠️  Linha {i}: Emenda vazia")
        continue
    
    # Escapar aspas
    tipo = tipo.replace("'", "''") if tipo else ''
    recurso = recurso.replace("'", "''") if recurso else ''
    
    # Montar INSERT
    tipo_val = f"'{tipo}'" if tipo else 'NULL'
    recurso_val = f"'{recurso}'" if recurso else 'NULL'
    
    insert_values.append(f"('{emenda}', {tipo_val}, {recurso_val})")

print(f"✓ {len(insert_values)} registros processados\n")

# Gerar SQL
sql = """-- Importação automática de Recurso e Tipo de Formalização
-- Gerado automaticamente - total de registros: """ + str(len(insert_values)) + """

INSERT INTO formalizacao_recursos_tipos_staging (emenda, tipo_formalizacao, recurso) VALUES
"""

sql += ",\n".join(insert_values)

sql += """
ON CONFLICT (emenda) DO UPDATE SET
  tipo_formalizacao = COALESCE(NULLIF(TRIM(EXCLUDED.tipo_formalizacao), ''), formalizacao_recursos_tipos_staging.tipo_formalizacao),
  recurso = COALESCE(NULLIF(TRIM(EXCLUDED.recurso), ''), formalizacao_recursos_tipos_staging.recurso),
  processed = FALSE;

-- ✅ Verificar dados importados
SELECT COUNT(*) as importados FROM formalizacao_recursos_tipos_staging;
"""

# Salvar
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"✅ SQL salvo em: {output_file}")

# Verificar dados
count_tipo = sum(1 for r in rows if r.get('Tipo de formalização', '').strip())
count_recurso = sum(1 for r in rows if r.get('Com ou Sem Recurso', '').strip())

print(f"\n📈 Dados encontrados:")
print(f"  • Total de emendas: {len(insert_values)}")
print(f"  • Com tipo_formalizacao: {count_tipo}")
print(f"  • Com recurso: {count_recurso}")

print(f"\n⚠️  PRÓXIMAS ETAPAS:")
print(f"  1. Execute: GUIA_COMPLETO_ATUALIZAR_STAGING.sql - ETAPA 1")
print(f"  2. Cole: {output_file} - no final da ETAPA 1B")
print(f"  3. Execute: ETAPA 2 para atualizar")
print(f"  4. Execute: ETAPA 3 para validar")
