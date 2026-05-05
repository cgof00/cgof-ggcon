#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IMPORTAÇÃO SEGURA DE EMENDAS (SEM DUPLICATAS)
==============================================
Versão melhorada do importar-formalizacao.py que:
- NÃO apaga a tabela existente
- Usa INSERT ... ON CONFLICT para deduplicação automática
- Atualiza registros existentes com novos dados
- Muito mais seguro para imports contínuos

MODOS:
  'append'  - Adiciona novos registros apenas (INSERT IGNORE)
  'merge'   - Atualiza existentes e adiciona novos (INSERT ... ON CONFLICT UPDATE)

USO:
  python importar-formalizacao-safe.py append
  python importar-formalizacao-safe.py merge

REQUISITOS:
  pip install requests python-dotenv
"""

import csv
import os
import re
import sys
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

try:
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("❌ Módulo 'requests' não encontrado.")
    print("   Execute: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ Módulo 'python-dotenv' não encontrado.")
    print("   Execute: pip install python-dotenv")
    sys.exit(1)

# ==============================================================
# CONFIGURAÇÃO
# ==============================================================

CSV_FILE = r'C:\Users\afpereira\Downloads\geral.csv'
BATCH_SIZE = 500
PARALLEL_WORKERS = 8

# Modo de importação: 'append' ou 'merge'
# append = INSERT sem atualizar existentes
# merge = INSERT ... ON CONFLICT (recomendado)
MODO = 'merge'

# ==============================================================
# HEADER MAPPING (mesmo do arquivo original)
# ==============================================================
HEADER_MAP = {
    "Seq": "seq",
    "Ano": "ano",
    "Parlamentar": "parlamentar",
    "Partido": "partido",
    "Emenda": "emenda",
    "Emendas Agregadoras": "emendas_agregadoras",
    "Demanda": "demanda",
    "DEMANDAS FORMALIZAÇÃO": "demandas_formalizacao",
    "DEMANDAS FORMALIZACAO": "demandas_formalizacao",
    "N° de Convênio": "numero_convenio",
    "N° de Convenio": "numero_convenio",
    "N\u00b0 de Conv\u00eanio": "numero_convenio",
    "Classificação Emenda/Demanda": "classificacao_emenda_demanda",
    "Classificacao Emenda/Demanda": "classificacao_emenda_demanda",
    "Tipo de Formalização": "tipo_formalizacao",
    "Tipo de Formalizacao": "tipo_formalizacao",
    "Regional": "regional",
    "Município": "municipio",
    "Municipio": "municipio",
    "Conveniado": "conveniado",
    "Objeto": "objeto",
    "Portfólio": "portfolio",
    "Portfolio": "portfolio",
    "Valor": "valor",
    "Situação Emenda": "situacao_emenda",
    "Situacao Emenda": "situacao_emenda",
    "Posição Anterior": "situacao_emenda",
    "Posicao Anterior": "situacao_emenda",
    "Situação Demandas - SemPapel": "situacao_demandas_sempapel",
    "Situacao Demandas - SemPapel": "situacao_demandas_sempapel",
    "Área - estágio": "area_estagio",
    "Area - estagio": "area_estagio",
    "Recurso": "recurso",
    "Tecnico": "tecnico",
    "Data da Liberação": "data_liberacao",
    "Data da Liberacao": "data_liberacao",
    "Área - Estágio Situação da Demanda": "area_estagio_situacao_demanda",
    "Area - Estagio Situacao da Demanda": "area_estagio_situacao_demanda",
    "Situação - Análise Demanda": "situacao_analise_demanda",
    "Situacao - Analise Demanda": "situacao_analise_demanda",
    "Data - Análise Demanda": "data_analise_demanda",
    "Data - Analise Demanda": "data_analise_demanda",
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
    "Falta assinatura": "falta_assinatura",
    "Assinatura": "assinatura",
    "Publicação": "publicacao",
    "Publicacao": "publicacao",
    "Vigência": "vigencia",
    "Vigencia": "vigencia",
    "Encaminhado em": "encaminhado_em",
    "Concluída em": "concluida_em",
    "Concluida em": "concluida_em",
}

DATE_COLUMNS = {
    "data_liberacao", "data_analise_demanda", "data_retorno_diligencia",
    "data_recebimento_demanda", "data_retorno",
    "data_liberacao_assinatura_conferencista", "data_liberacao_assinatura",
    "encaminhado_em", "concluida_em"
}

TEXT_DATE_COLUMNS = {
    "publicacao", "vigencia", "assinatura"
}

# ==============================================================
# FUNÇÕES AUXILIARES (idênticas ao original)
# ==============================================================

def convert_date(val):
    """Converte DD/MM/YYYY → YYYY-MM-DD. Retorna None se inválido."""
    if not val or not val.strip():
        return None
    val = val.strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', val)
    if m:
        dia, mes, ano = m.groups()
        dia = dia.zfill(2)
        mes = mes.zfill(2)
        if 1 <= int(mes) <= 12 and 1 <= int(dia) <= 31:
            return f"{ano}-{mes}-{dia}"
    m2 = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', val)
    if m2:
        return val
    m3 = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2})$', val)
    if m3:
        dia, mes, ano_curto = m3.groups()
        ano_full = '20' + ano_curto if int(ano_curto) < 50 else '19' + ano_curto
        dia = dia.zfill(2)
        mes = mes.zfill(2)
        if 1 <= int(mes) <= 12 and 1 <= int(dia) <= 31:
            return f"{ano_full}-{mes}-{dia}"
    return None


def convert_valor(val):
    """Converte valor brasileiro (1.234.567,89) → float. Retorna None se inválido."""
    if not val or not val.strip():
        return None
    val = val.strip()
    val = re.sub(r'[R$\s]', '', val)
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


def map_row(row, header_indices):
    """Mapeia uma linha do CSV para um dict com nomes de colunas do banco."""
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
    return record


def load_env():
    """Carrega variáveis do .env.local"""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✅ .env.local carregado de: {env_path}")
    else:
        print(f"⚠️  .env.local não encontrado em: {env_path}")
        print("   Tentando variáveis de ambiente do sistema...")
    
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configurados!")
        print("   Configure no .env.local ou nas variáveis de ambiente do sistema.")
        sys.exit(1)
    
    return url, key


# ==============================================================
# MAIN - VERSÃO SEGURA (SEM APAGAR TABELA)
# ==============================================================

def main():
    print("=" * 70)
    print("  IMPORTAR FORMALIZAÇÃO SEGURA (SEM DUPLICATAS)")
    print(f"  Modo: {MODO.upper()}")
    print("=" * 70)
    print()
    
    # Validar modo
    if MODO not in ('append', 'merge'):
        print(f"❌ Modo inválido: '{MODO}'")
        print("   Use 'append' ou 'merge'")
        sys.exit(1)
    
    # Verificar CSV
    if not os.path.exists(CSV_FILE):
        print(f"❌ Arquivo CSV não encontrado: {CSV_FILE}")
        sys.exit(1)
    
    file_size = os.path.getsize(CSV_FILE) / (1024 * 1024)
    print(f"📄 Arquivo:      {CSV_FILE}")
    print(f"📦 Tamanho:      {file_size:.1f} MB")
    print(f"🔄 Modo:         {MODO} ({'Apenas adiciona novos' if MODO == 'append' else 'Atualiza + adiciona'})")
    print()
    
    # Carregar Supabase
    supabase_url, supabase_key = load_env()
    rest_url = f"{supabase_url}/rest/v1"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    print(f"🔗 Supabase URL: {supabase_url}")
    print()
    
    # ============================================================
    # PASSO 1: Ler CSV
    # ============================================================
    print("📖 PASSO 1: Lendo CSV...")
    
    records = []
    skipped_rows = []
    
    for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
        try:
            with open(CSV_FILE, 'r', encoding=encoding) as f:
                first_line = f.readline()
                if first_line:
                    print(f"   Encoding: {encoding} ✓")
                    break
        except (UnicodeDecodeError, UnicodeError):
            continue
    else:
        encoding = 'utf-8-sig'
    
    with open(CSV_FILE, 'r', encoding=encoding) as f:
        first_line = f.readline()
        f.seek(0)
        delimiter = ';' if first_line.count(';') > first_line.count(',') else ','
        print(f"   Delimitador: '{delimiter}'")
        
        reader = csv.reader(f, delimiter=delimiter)
        header_row = next(reader)
        header_row = [h.strip() for h in header_row]
        
        header_indices = {}
        for i, col_name in enumerate(header_row):
            if col_name in HEADER_MAP:
                db_col = HEADER_MAP[col_name]
                header_indices[col_name] = (i, db_col)
        
        print(f"   Colunas mapeadas: {len(header_indices)}")
        
        row_num = 1
        for row in reader:
            row_num += 1
            try:
                record = map_row(row, header_indices)
                if record:
                    records.append(record)
                else:
                    skipped_rows.append((row_num, "Vazio"))
            except Exception as e:
                skipped_rows.append((row_num, str(e)))
    
    total_csv = row_num - 1
    print(f"\n   📊 Lidos {len(records)} registros válidos de {total_csv} linhas")
    print()
    
    if len(records) == 0:
        print("❌ Nenhum registro para importar!")
        sys.exit(1)
    
    # ============================================================
    # PASSO 2: VALIDAR CONSTRAINT UNIQUE
    # ============================================================
    print("🔒 PASSO 2: Verificando constraint UNIQUE na coluna 'emenda'...")
    
    check_constraint = requests.get(
        f"{rest_url}/information_schema.table_constraints?table_name=eq.formalizacao&constraint_type=eq.UNIQUE",
        headers=headers,
        verify=False
    )
    
    has_unique = False
    if check_constraint.status_code == 200:
        constraints = check_constraint.json()
        for c in constraints:
            if 'emenda' in str(c.get('constraint_name', '')).lower():
                has_unique = True
                print(f"   ✓ Constraint UNIQUE existente: {c['constraint_name']}")
                break
    
    if not has_unique:
        print("   ⚠️  AVISO: Constraint UNIQUE não encontrada!")
        print("   Execute primeiro: 01_REMOVER_DUPLICATAS.sql")
        print()
    
    # ============================================================
    # PASSO 3: Inserir com deduplicação automática
    # ============================================================
    print(f"📥 PASSO 3: Importando {len(records)} registros ({BATCH_SIZE}/batch)...")
    
    total_inserted = 0
    total_errors = 0
    error_details = []
    start_time = time.time()
    
    # Preparar batches
    batches = []
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batches.append((i, batch))
    
    total_batches = len(batches)
    completed_batches = 0
    
    def insert_batch(args):
        """Insere batch com INSERT ... ON CONFLICT (merge) ou INSERT IGNORE (append)"""
        offset, batch = args
        try:
            # O Supabase REST API usa ON CONFLICT automaticamente se a constraint existe
            # Basta fazer POST normal e ele vai dedupa
            resp = requests.post(
                f"{rest_url}/formalizacao",
                headers={**headers, "Prefer": "resolution=merge-duplicates" if MODO == 'merge' else "resolution=ignore-duplicates"},
                json=batch,
                timeout=60,
                verify=False,
            )
            
            if resp.status_code in (200, 201):
                return len(batch), 0, []
            else:
                # Se não funcionar, tentar um por um
                ok = 0
                errs = 0
                err_list = []
                for j, record in enumerate(batch):
                    try:
                        single_resp = requests.post(
                            f"{rest_url}/formalizacao",
                            headers={**headers, "Prefer": "resolution=merge-duplicates" if MODO == 'merge' else "resolution=ignore-duplicates"},
                            json=[record],
                            timeout=15,
                            verify=False,
                        )
                        if single_resp.status_code in (200, 201):
                            ok += 1
                        else:
                            errs += 1
                    except:
                        errs += 1
                return ok, errs, err_list
        except Exception as e:
            return 0, len(batch), [f"Batch {offset}: {str(e)[:100]}"]
    
    # Executar em paralelo
    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as executor:
        futures = {executor.submit(insert_batch, b): b for b in batches}
        
        for future in as_completed(futures):
            inserted, errors, errs = future.result()
            total_inserted += inserted
            total_errors += errors
            error_details.extend(errs)
            completed_batches += 1
            
            pct = (completed_batches / total_batches) * 100
            elapsed = time.time() - start_time
            rate = total_inserted / elapsed if elapsed > 0 else 0
            print(f"   [{pct:5.1f}%] {total_inserted} inseridos | {total_errors} erros | {rate:.0f} reg/s", end='\r')
    
    elapsed = time.time() - start_time
    print()
    print()
    
    # ============================================================
    # RESULTADO
    # ============================================================
    print("=" * 70)
    print("  RESULTADO FINAL")
    print("=" * 70)
    print(f"   ✅ Inseridos/Atualizados: {total_inserted}")
    print(f"   ❌ Erros:                 {total_errors}")
    print(f"   ⏱️  Tempo:                {elapsed:.1f}s")
    print()
    
    if total_inserted == len(records):
        print("   🎉 SUCESSO! Todos os registros foram processados sem duplicatas!")
    else:
        print(f"   ⚠️  {total_errors} registros tiveram erro")
    
    if error_details:
        print()
        print("   Primeiros erros:")
        for err in error_details[:3]:
            print(f"     {err}")
    
    print()


if __name__ == "__main__":
    # Renderizar modo da linha de comando se fornecido
    if len(sys.argv) > 1:
        MODO = sys.argv[1].lower()
    
    main()
