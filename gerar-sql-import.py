#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GERAR SQL DE IMPORTAÇÃO PARA SUPABASE
======================================
Gera arquivos .sql com INSERT em batches.
Modo 1 (padrão): Gera arquivos SQL para colar no SQL Editor
Modo 2 (--psycopg2): Executa direto via psycopg2 (requer connection string)

USO:
  python gerar-sql-import.py
  python gerar-sql-import.py --psycopg2 "postgresql://postgres.REF:PASS@host:6543/postgres"
"""

import csv
import os
import re
import sys

# ==============================================================
# CONFIGURAÇÃO
# ==============================================================
CSV_FILE = r'C:\Users\afpereira\Downloads\geral.csv'
OUTPUT_DIR = r'C:\Users\afpereira\Downloads\sql_import'
ROWS_PER_FILE = 5000   # Registros por arquivo SQL (~2-4MB cada)
BATCH_SIZE = 1000       # Registros por INSERT statement

# ==============================================================
# MAPEAMENTO
# ==============================================================
HEADER_MAP = {
    "Seq": "seq", "Ano": "ano", "Parlamentar": "parlamentar", "Partido": "partido",
    "Emenda": "emenda", "Emendas Agregadoras": "emendas_agregadoras",
    "Demanda": "demanda",
    "DEMANDAS FORMALIZAÇÃO": "demandas_formalizacao", "DEMANDAS FORMALIZACAO": "demandas_formalizacao",
    "N° de Convênio": "numero_convenio", "N° de Convenio": "numero_convenio",
    "Classificação Emenda/Demanda": "classificacao_emenda_demanda",
    "Classificacao Emenda/Demanda": "classificacao_emenda_demanda",
    "Tipo de Formalização": "tipo_formalizacao", "Tipo de Formalizacao": "tipo_formalizacao",
    "Regional": "regional",
    "Município": "municipio", "Municipio": "municipio",
    "Conveniado": "conveniado", "Objeto": "objeto",
    "Portfólio": "portfolio", "Portfolio": "portfolio",
    "Valor": "valor",
    "Posição Anterior": "posicao_anterior", "Posicao Anterior": "posicao_anterior",
    "Situação Demandas - SemPapel": "situacao_demandas_sempapel",
    "Situacao Demandas - SemPapel": "situacao_demandas_sempapel",
    "Área - estágio": "area_estagio", "Area - estagio": "area_estagio",
    "Recurso": "recurso", "Tecnico": "tecnico",
    "Data da Liberação": "data_liberacao", "Data da Liberacao": "data_liberacao",
    "Área - Estágio Situação da Demanda": "area_estagio_situacao_demanda",
    "Area - Estagio Situacao da Demanda": "area_estagio_situacao_demanda",
    "Situação - Análise Demanda": "situacao_analise_demanda",
    "Situacao - Analise Demanda": "situacao_analise_demanda",
    "Data - Análise Demanda": "data_analise_demanda", "Data - Analise Demanda": "data_analise_demanda",
    "Motivo do Retorno da Diligência": "motivo_retorno_diligencia",
    "Motivo do Retorno da Diligencia": "motivo_retorno_diligencia",
    "Data do Retorno da Diligência": "data_retorno_diligencia",
    "Data do Retorno da Diligencia": "data_retorno_diligencia",
    "Conferencista": "conferencista",
    "Data recebimento demanda": "data_recebimento_demanda",
    "Data do Retorno": "data_retorno",
    "Observação - Motivo do Retorno": "observacao_motivo_retorno",
    "Observacao - Motivo do Retorno": "observacao_motivo_retorno",
    "Data liberação da Assinatura - Conferencista": "data_liberacao_assinatura_conferencista",
    "Data liberacao da Assinatura - Conferencista": "data_liberacao_assinatura_conferencista",
    "Data liberação de Assinatura": "data_liberacao_assinatura",
    "Data liberacao de Assinatura": "data_liberacao_assinatura",
    "Falta assinatura": "falta_assinatura", "Assinatura": "assinatura",
    "Publicação": "publicacao", "Publicacao": "publicacao",
    "Vigência": "vigencia", "Vigencia": "vigencia",
    "Encaminhado em": "encaminhado_em",
    "Concluída em": "concluida_em", "Concluida em": "concluida_em",
}

# Colunas DATE no banco
DATE_COLUMNS = {
    "data_liberacao", "data_analise_demanda", "data_retorno_diligencia",
    "data_recebimento_demanda", "data_retorno",
    "data_liberacao_assinatura_conferencista", "data_liberacao_assinatura",
    "encaminhado_em", "concluida_em"
}

# Ordem fixa das colunas no INSERT
ALL_COLUMNS = [
    "seq", "ano", "parlamentar", "partido", "emenda", "emendas_agregadoras",
    "demanda", "demandas_formalizacao", "numero_convenio",
    "classificacao_emenda_demanda", "tipo_formalizacao",
    "regional", "municipio", "conveniado", "objeto", "portfolio",
    "valor", "posicao_anterior", "situacao_demandas_sempapel",
    "area_estagio", "recurso", "tecnico", "data_liberacao",
    "area_estagio_situacao_demanda", "situacao_analise_demanda",
    "data_analise_demanda", "motivo_retorno_diligencia",
    "data_retorno_diligencia", "conferencista",
    "data_recebimento_demanda", "data_retorno",
    "observacao_motivo_retorno",
    "data_liberacao_assinatura_conferencista",
    "data_liberacao_assinatura", "falta_assinatura",
    "assinatura", "publicacao", "vigencia",
    "encaminhado_em", "concluida_em"
]


def convert_date(val):
    if not val or not val.strip():
        return None
    val = val.strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', val)
    if m:
        dia, mes, ano = m.groups()
        if 1 <= int(mes) <= 12 and 1 <= int(dia) <= 31:
            return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"
    m2 = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', val)
    if m2:
        return val
    m3 = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2})$', val)
    if m3:
        dia, mes, ac = m3.groups()
        af = '20' + ac if int(ac) < 50 else '19' + ac
        if 1 <= int(mes) <= 12 and 1 <= int(dia) <= 31:
            return f"{af}-{mes.zfill(2)}-{dia.zfill(2)}"
    return None


def convert_valor(val):
    if not val or not val.strip():
        return None
    val = re.sub(r'[R$\s]', '', val.strip())
    if not val:
        return None
    if ',' in val:
        val = val.replace('.', '').replace(',', '.')
    elif val.count('.') > 1:
        val = val.replace('.', '')
    try:
        return float(val)
    except (ValueError, OverflowError):
        return None


def sql_escape(val):
    """Escape string for SQL single quotes."""
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def main():
    print("=" * 70)
    print("  GERAR SQL DE IMPORTAÇÃO DE FORMALIZAÇÃO")
    print("=" * 70)
    
    if not os.path.exists(CSV_FILE):
        print(f"❌ CSV não encontrado: {CSV_FILE}")
        sys.exit(1)
    
    # Verificar modo psycopg2
    use_psycopg2 = False
    conn_string = None
    if len(sys.argv) > 1 and sys.argv[1] == '--psycopg2':
        if len(sys.argv) < 3:
            print("❌ Forneça a connection string: --psycopg2 \"postgresql://...\"")
            sys.exit(1)
        conn_string = sys.argv[2]
        use_psycopg2 = True
    
    # Ler CSV
    print(f"\n📖 Lendo CSV: {CSV_FILE}")
    records = []
    
    for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
        try:
            with open(CSV_FILE, 'r', encoding=encoding) as f:
                f.readline()
                print(f"   Encoding: {encoding}")
                break
        except (UnicodeDecodeError, UnicodeError):
            continue
    else:
        encoding = 'utf-8-sig'
    
    with open(CSV_FILE, 'r', encoding=encoding) as f:
        first_line = f.readline()
        f.seek(0)
        delimiter = ';' if first_line.count(';') > first_line.count(',') else ','
        
        reader = csv.reader(f, delimiter=delimiter)
        header_row = [h.strip() for h in next(reader)]
        
        # Mapear cabeçalhos
        header_indices = {}
        for i, col_name in enumerate(header_row):
            if col_name in HEADER_MAP:
                header_indices[col_name] = (i, HEADER_MAP[col_name])
            else:
                for csv_key, db_key in HEADER_MAP.items():
                    if csv_key.lower().replace(' ', '') == col_name.lower().replace(' ', ''):
                        header_indices[col_name] = (i, db_key)
                        break
        
        print(f"   Colunas mapeadas: {len(header_indices)}")
        
        row_num = 1
        for row in reader:
            row_num += 1
            record = {}
            for csv_col, (idx, db_col) in header_indices.items():
                if idx >= len(row):
                    continue
                val = row[idx].strip() if row[idx] else ''
                if not val:
                    continue
                if db_col == 'valor':
                    converted = convert_valor(val)
                    if converted is not None:
                        record[db_col] = converted
                elif db_col in DATE_COLUMNS:
                    converted = convert_date(val)
                    if converted is not None:
                        record[db_col] = converted
                else:
                    record[db_col] = val
            if record:
                records.append(record)
    
    total = len(records)
    print(f"   ✅ Registros válidos: {total}")
    
    # ==========================================
    # MODO PSYCOPG2: Inserção direta via SQL
    # ==========================================
    if use_psycopg2:
        try:
            import psycopg2
            from psycopg2.extras import execute_values
        except ImportError:
            print("❌ psycopg2 não instalado. Execute: pip install psycopg2-binary")
            sys.exit(1)
        
        print(f"\n🔗 Conectando ao banco via psycopg2...")
        conn = psycopg2.connect(conn_string)
        conn.autocommit = False
        cur = conn.cursor()
        
        print("🗑️  TRUNCATE formalizacao...")
        cur.execute("TRUNCATE formalizacao RESTART IDENTITY CASCADE")
        
        col_list = ", ".join(ALL_COLUMNS)
        template = "(" + ", ".join(["%s"] * len(ALL_COLUMNS)) + ")"
        
        print(f"📥 Inserindo {total} registros...")
        for i in range(0, total, 2000):
            batch = records[i:i + 2000]
            values = []
            for rec in batch:
                row = []
                for col in ALL_COLUMNS:
                    row.append(rec.get(col))
                values.append(tuple(row))
            execute_values(cur, f"INSERT INTO formalizacao ({col_list}) VALUES %s", values)
            pct = min(100, (i + len(batch)) * 100 // total)
            print(f"   [{pct:3d}%] {min(i + 2000, total)}/{total}")
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"\n✅ {total} registros inseridos com sucesso via psycopg2!")
        return
    
    # ==========================================
    # MODO SQL: Gerar arquivos SQL
    # ==========================================
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    col_list = ", ".join(ALL_COLUMNS)
    num_files = (total + ROWS_PER_FILE - 1) // ROWS_PER_FILE
    
    print(f"\n📝 Gerando {num_files} arquivos SQL em: {OUTPUT_DIR}")
    
    # Arquivo 0: TRUNCATE
    trunc_file = os.path.join(OUTPUT_DIR, "00_TRUNCATE.sql")
    with open(trunc_file, 'w', encoding='utf-8') as f:
        f.write("-- PASSO 0: Limpar tabela antes de importar\n")
        f.write("TRUNCATE formalizacao RESTART IDENTITY CASCADE;\n")
    print(f"   📄 00_TRUNCATE.sql (TRUNCATE)")
    
    file_num = 0
    for file_start in range(0, total, ROWS_PER_FILE):
        file_num += 1
        file_end = min(file_start + ROWS_PER_FILE, total)
        file_batch = records[file_start:file_end]
        
        filename = f"{file_num:02d}_INSERT_{file_start + 1}_a_{file_end}.sql"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"-- Arquivo {file_num}/{num_files}: registros {file_start + 1} a {file_end}\n")
            f.write("SET datestyle = 'ISO, DMY';\n\n")
            
            for i in range(0, len(file_batch), BATCH_SIZE):
                batch = file_batch[i:i + BATCH_SIZE]
                abs_start = file_start + i + 1
                abs_end = file_start + i + len(batch)
                
                f.write(f"-- Batch: registros {abs_start}-{abs_end}\n")
                f.write(f"INSERT INTO formalizacao ({col_list}) VALUES\n")
                
                values_list = []
                for rec in batch:
                    values = []
                    for col in ALL_COLUMNS:
                        val = rec.get(col)
                        if val is None:
                            values.append("NULL")
                        elif col == 'valor':
                            values.append(str(val))
                        elif col in DATE_COLUMNS:
                            values.append(f"'{val}'::DATE")
                        else:
                            values.append(sql_escape(val))
                    values_list.append(f"({', '.join(values)})")
                
                f.write(",\n".join(values_list))
                f.write(";\n\n")
        
        file_size = os.path.getsize(filepath) / (1024 * 1024)
        print(f"   📄 {filename} ({file_size:.1f} MB, {len(file_batch)} registros)")
    
    # Arquivo final: verificação
    verify_file = os.path.join(OUTPUT_DIR, f"{file_num + 1:02d}_VERIFICAR.sql")
    with open(verify_file, 'w', encoding='utf-8') as f:
        f.write("-- VERIFICAÇÃO: deve retornar " + str(total) + "\n")
        f.write("SELECT COUNT(*) as total_formalizacao FROM formalizacao;\n")
    
    total_size = sum(
        os.path.getsize(os.path.join(OUTPUT_DIR, fn)) 
        for fn in os.listdir(OUTPUT_DIR) if fn.endswith('.sql')
    ) / (1024 * 1024)
    
    print(f"\n   📊 Total: {total_size:.1f} MB em {num_files + 2} arquivos")
    print()
    print("=" * 70)
    print("  INSTRUÇÕES PARA IMPORTAR:")
    print("=" * 70)
    print(f"  1. Abra o SQL Editor no Supabase Dashboard")
    print(f"  2. Execute os arquivos EM ORDEM:")
    print(f"     📂 {OUTPUT_DIR}")
    print(f"     → 00_TRUNCATE.sql  (limpa tudo)")
    for fn in sorted(os.listdir(OUTPUT_DIR)):
        if fn.startswith(('0', '1')) and 'INSERT' in fn:
            print(f"     → {fn}")
    print(f"     → {file_num + 1:02d}_VERIFICAR.sql  (conferir total)")
    print(f"  3. Depois, execute PASSO2_SINCRONIZAR.sql para sync com emendas")
    print("=" * 70)


if __name__ == '__main__':
    main()
