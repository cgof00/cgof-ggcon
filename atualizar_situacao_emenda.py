#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ATUALIZAR situacao_emenda NO SUPABASE A PARTIR DO RELATÓRIO EMENDAS (XLS)
=========================================================================
Lê o arquivo "Relatório Emendas" (SpreadsheetML XML) e atualiza
formalizacao.situacao_emenda via Supabase REST API.

Estratégia: match pelos 5 últimos dígitos do Código/Nº Emenda.
  XLS:          '2024.293.53155' → últimos 5 dígitos → '53155'
  formalizacao: '202429353155'   → últimos 5 dígitos → '53155' ✅

USO:
  python atualizar_situacao_emenda.py "C:\\caminho\\para\\Relatório Emendas (14).xls"

REQUISITOS:
  pip install requests python-dotenv lxml
"""

import os, sys, re, time
from lxml import etree
from pathlib import Path

try:
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("❌ pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ pip install python-dotenv")
    sys.exit(1)

# ── Configuração ─────────────────────────────────────────────────────────────

XLS_FILE   = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\afpereira\Downloads\Relatório Emendas (14).xls"
BATCH_SIZE = 200   # IDs por chamada PATCH
TAIL_DIGITS = 5    # quantos dígitos finais usar como chave
NS = 'urn:schemas-microsoft-com:office:spreadsheet'

# ── Credenciais ──────────────────────────────────────────────────────────────

script_dir = Path(__file__).parent
env_path = script_dir / '.env.local'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ .env.local carregado")
else:
    print(f"⚠️  .env.local não encontrado, usando variáveis de ambiente")

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local")
    sys.exit(1)

print(f"🔗 Supabase: {SUPABASE_URL}")

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': '',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def digits_only(s):
    return re.sub(r'[^0-9]', '', s or '')

def tail(s):
    """Retorna os N últimos dígitos de uma string."""
    d = digits_only(s)
    return d[-TAIL_DIGITS:] if len(d) >= TAIL_DIGITS else ''

def cell_val(row):
    cells = row.findall(f'{{{NS}}}Cell')
    vals = []
    for cell in cells:
        idx = cell.get(f'{{{NS}}}Index')
        if idx:
            while len(vals) < int(idx) - 1:
                vals.append('')
        d = cell.find(f'{{{NS}}}Data')
        vals.append(d.text if d is not None and d.text else '')
    return vals

# ── Ler XLS ───────────────────────────────────────────────────────────────────

print(f"\n📂 Lendo: {XLS_FILE}")
with open(XLS_FILE, 'rb') as f:
    content = f.read()

content = content.replace(b'encoding="UTF8"', b'encoding="UTF-8"')
root = etree.fromstring(content)
ws = root.findall(f'.//{{{NS}}}Worksheet')[0]
rows_xml = ws.findall(f'.//{{{NS}}}Row')

headers = cell_val(rows_xml[0])
print(f"✅ Arquivo lido: {len(rows_xml)-1} linhas, {len(headers)} colunas")

# Índices fixos (confirmados na análise):
# [3] Código/Nº Emenda  [6] Situação Emenda
COL_COD = 3
COL_SIT = 6
print(f"   Coluna código   : [{COL_COD}] {headers[COL_COD]}")
print(f"   Coluna situação : [{COL_SIT}] {headers[COL_SIT]}")

# Constrói mapa: 5 últimos dígitos → situação emenda
# Se houver conflito de chave, o mais recente (linha menor do XLS) ganha
tail_to_sit = {}
sem_chave = 0
for row in rows_xml[1:]:
    vals = cell_val(row)
    while len(vals) <= max(COL_COD, COL_SIT):
        vals.append('')
    sit = vals[COL_SIT].strip()
    cod = vals[COL_COD].strip()
    k = tail(cod)
    if not sit or not k:
        sem_chave += 1
        continue
    tail_to_sit[k] = sit  # última ocorrência sobrescreve

print(f"   Chaves únicas (5 dígitos): {len(tail_to_sit)}")
print(f"   Sem chave / sem situação:  {sem_chave}")
print(f"   Exemplos de chave: {list(tail_to_sit.items())[:5]}")

# ── Busca todos os registros de formalizacao com emenda preenchida ────────────

print(f"\n⚙️  Buscando registros de formalizacao com emenda preenchida...")

page_size = 1000
offset = 0
formalizacao_rows = []

while True:
    url = f"{SUPABASE_URL}/rest/v1/formalizacao"
    params = {
        'select': 'id,emenda,situacao_emenda',
        'emenda': 'neq.',
        'limit': str(page_size),
        'offset': str(offset),
    }
    resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
    if resp.status_code != 200:
        print(f"❌ Erro ao buscar formalizacao: {resp.status_code} {resp.text[:200]}")
        sys.exit(1)
    batch = resp.json()
    if not batch:
        break
    formalizacao_rows.extend(batch)
    if len(batch) < page_size:
        break
    offset += page_size
    print(f"   Buscados: {len(formalizacao_rows)}", end='\r')

print(f"\n   Total registros com emenda: {len(formalizacao_rows)}")

# ── Cruza e agrupa por situação → lista de IDs ───────────────────────────────

sit_to_ids = {}
sem_match = 0
ja_preenchido = 0

for row in formalizacao_rows:
    emenda = row.get('emenda') or ''
    k = tail(emenda)
    sit_nova = tail_to_sit.get(k)
    if not sit_nova:
        sem_match += 1
        continue
    # Atualiza mesmo se já preenchido (para refletir versão mais atual do XLS)
    if row.get('situacao_emenda') == sit_nova:
        ja_preenchido += 1
        continue
    if sit_nova not in sit_to_ids:
        sit_to_ids[sit_nova] = []
    sit_to_ids[sit_nova].append(row['id'])

total_para_atualizar = sum(len(v) for v in sit_to_ids.values())
print(f"   Com match: {total_para_atualizar}")
print(f"   Sem match: {sem_match}")
print(f"   Já correto (sem mudança): {ja_preenchido}")

if not sit_to_ids:
    print("\n⚠️  Nenhum registro para atualizar. Verifique se os dados do XLS já estão no banco.")
    sys.exit(0)

# ── PATCH em lotes por situação ───────────────────────────────────────────────

print(f"\n⚙️  Atualizando {total_para_atualizar} registros...")

updated = 0
errors = 0
lote_num = 0

for sit, ids in sit_to_ids.items():
    for i in range(0, len(ids), BATCH_SIZE):
        batch_ids = ids[i:i + BATCH_SIZE]
        lote_num += 1
        url = f"{SUPABASE_URL}/rest/v1/formalizacao"
        params = {'id': f'in.({",".join(str(x) for x in batch_ids)})'}
        body = {'situacao_emenda': sit}
        resp = requests.patch(url, headers=HEADERS, params=params, json=body, timeout=30)
        if resp.status_code in (200, 204):
            updated += len(batch_ids)
        else:
            errors += 1
            print(f"\n   ⚠️  Lote {lote_num} erro {resp.status_code}: {resp.text[:120]}")
        if lote_num % 10 == 0:
            print(f"   Progresso: {updated}/{total_para_atualizar} atualizados...", end='\r')

print(f"\n\n{'='*60}")
print(f"  RESUMO FINAL")
print(f"{'='*60}")
print(f"  Atualizados : {updated}")
print(f"  Sem match   : {sem_match}")
print(f"  Já correto  : {ja_preenchido}")
print(f"  Erros       : {errors}")
print(f"{'='*60}")
