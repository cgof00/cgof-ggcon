#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ATUALIZAR situacao_emenda NO SUPABASE A PARTIR DO RELATÓRIO EMENDAS (XLS)
=========================================================================
Lê o arquivo "Relatório Emendas" (SpreadsheetML XML) e atualiza
formalizacao.situacao_emenda via Supabase REST API.

Estratégia de join (em ordem):
  1) Nº de Convênio
  2) Código/Nº Emenda (dígitos normalizados)

USO:
  python atualizar_situacao_emenda.py "C:\\caminho\\para\\Relatório Emendas (14).xls"

REQUISITOS:
  pip install requests python-dotenv lxml
"""

import os, sys, re, json, time
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

# ── Configuração ────────────────────────────────────────────────────────────

XLS_FILE = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\afpereira\Downloads\Relatório Emendas (14).xls"
BATCH_SIZE = 500   # registros por chamada PATCH
NS = 'urn:schemas-microsoft-com:office:spreadsheet'

# ── Credenciais ─────────────────────────────────────────────────────────────

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
    'Prefer': 'return=representation',
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def digits_only(s):
    return re.sub(r'[^0-9]', '', s or '')

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

# ── Ler XLS ──────────────────────────────────────────────────────────────────

print(f"\n📂 Lendo: {XLS_FILE}")
with open(XLS_FILE, 'rb') as f:
    content = f.read()

# Corrige encoding inválido no XML declaration
content = content.replace(b'encoding="UTF8"', b'encoding="UTF-8"')

root = etree.fromstring(content)
ws = root.findall(f'.//{{{NS}}}Worksheet')[0]
rows_xml = ws.findall(f'.//{{{NS}}}Row')

headers = cell_val(rows_xml[0])
print(f"✅ Arquivo lido: {len(rows_xml)-1} linhas, {len(headers)} colunas")

# Mapeia índices das colunas necessárias
col_idx = {}
for i, h in enumerate(headers):
    hl = h.lower()
    if 'convênio' in hl or 'convenio' in hl:
        col_idx['conv'] = i
    elif 'código' in hl or 'codigo' in hl:
        if 'emenda' in hl:
            col_idx['cod'] = i
    elif 'situação emenda' in hl or 'situacao emenda' in hl:
        col_idx['sit'] = i

# Fallback por índice fixo (sabemos os índices do arquivo)
if 'conv' not in col_idx: col_idx['conv'] = 20
if 'cod'  not in col_idx: col_idx['cod']  = 3
if 'sit'  not in col_idx: col_idx['sit']  = 6

print(f"   Coluna convênio    : [{col_idx['conv']}] {headers[col_idx['conv']]}")
print(f"   Coluna código      : [{col_idx['cod']}]  {headers[col_idx['cod']]}")
print(f"   Coluna situação    : [{col_idx['sit']}]  {headers[col_idx['sit']]}")

# Extrai dados relevantes
records = []
for row in rows_xml[1:]:
    vals = cell_val(row)
    while len(vals) <= max(col_idx.values()):
        vals.append('')
    
    sit = vals[col_idx['sit']].strip()
    cod = vals[col_idx['cod']].strip()
    conv = vals[col_idx['conv']].strip()
    
    if not sit:
        continue
    
    records.append({
        'situacao': sit,
        'cod_digits': digits_only(cod) if len(digits_only(cod)) >= 6 else '',
        'conv': conv,
    })

print(f"✅ Registros com situação emenda: {len(records)}")
print(f"   Com convênio: {sum(1 for r in records if r['conv'])}")
print(f"   Com código:   {sum(1 for r in records if r['cod_digits'])}")

# ── Busca IDs do formalizacao por convênio ──────────────────────────────────

print("\n⚙️  Fase 1: Atualizando por número de convênio...")

convs_com_sit = {r['conv']: r['situacao'] for r in records if r['conv']}
updated_by_conv = 0
errors_conv = 0

# Processa em lotes de BATCH_SIZE convênios únicos
conv_list = list(convs_com_sit.items())
for i in range(0, len(conv_list), BATCH_SIZE):
    batch = conv_list[i:i+BATCH_SIZE]
    
    for conv, sit in batch:
        # PATCH com filtro pelo numero_convenio
        url = f"{SUPABASE_URL}/rest/v1/formalizacao"
        params = {
            'numero_convenio': f'eq.{conv}',
        }
        body = {'situacao_emenda': sit}
        resp = requests.patch(url, headers=HEADERS, params=params, json=body, timeout=30)
        if resp.status_code in (200, 204):
            updated_by_conv += 1
        else:
            errors_conv += 1
    
    print(f"   Lote {i//BATCH_SIZE + 1}: {min(i+BATCH_SIZE, len(conv_list))}/{len(conv_list)} convênios", end='\r')

print(f"\n   ✅ Convênios processados: {len(conv_list)} | Erros: {errors_conv}")

# ── Atualiza por código de emenda (dígitos) ─────────────────────────────────

print("\n⚙️  Fase 2: Buscando IDs por código de emenda...")

# Busca todos os registros de formalizacao que ainda não têm situacao_emenda
# e têm campo emenda preenchido
page_size = 1000
offset = 0
sem_situacao = []

while True:
    url = f"{SUPABASE_URL}/rest/v1/formalizacao"
    params = {
        'select': 'id,emenda',
        'situacao_emenda': 'is.null',
        'emenda': 'neq.',
        'limit': str(page_size),
        'offset': str(offset),
    }
    resp = requests.get(url, headers={**HEADERS, 'Prefer': 'count=exact'}, params=params, timeout=60)
    batch = resp.json()
    if not batch:
        break
    sem_situacao.extend(batch)
    if len(batch) < page_size:
        break
    offset += page_size
    print(f"   Buscando sem situação... {len(sem_situacao)}", end='\r')

print(f"\n   Sem situação + com emenda: {len(sem_situacao)}")

# Indexa registros do arquivo por código de emenda (dígitos)
cod_to_sit = {r['cod_digits']: r['situacao'] for r in records if r['cod_digits']}

# Cruza formalizacao com emendas por dígitos
updated_by_cod = 0
errors_cod = 0

# Agrupa por situação para fazer PATCH em lote (menos chamadas API)
sit_to_ids = {}
for row in sem_situacao:
    emenda = row.get('emenda', '') or ''
    d = digits_only(emenda)
    sit = cod_to_sit.get(d)
    if sit:
        if sit not in sit_to_ids:
            sit_to_ids[sit] = []
        sit_to_ids[sit].append(row['id'])

print(f"   Formalizacao com match por código: {sum(len(v) for v in sit_to_ids.values())}")

for sit, ids in sit_to_ids.items():
    # PATCH em lotes de BATCH_SIZE IDs usando operador in
    for i in range(0, len(ids), BATCH_SIZE):
        batch_ids = ids[i:i+BATCH_SIZE]
        url = f"{SUPABASE_URL}/rest/v1/formalizacao"
        params = {'id': f'in.({",".join(str(x) for x in batch_ids)})'}
        body = {'situacao_emenda': sit}
        resp = requests.patch(url, headers={**HEADERS, 'Prefer': ''}, params=params, json=body, timeout=30)
        if resp.status_code in (200, 204):
            updated_by_cod += len(batch_ids)
        else:
            errors_cod += 1
            print(f"\n   ⚠️  Erro {resp.status_code}: {resp.text[:100]}")

print(f"   ✅ Por código: {updated_by_cod} atualizados | Erros: {errors_cod}")

# ── Resumo ────────────────────────────────────────────────────────────────────

print(f"""
{'='*60}
  RESUMO FINAL
{'='*60}
  Fase 1 (por convênio)  : {len(conv_list)} convênios → {updated_by_conv} OK
  Fase 2 (por código)    : {updated_by_cod} atualizados
  Erros                  : {errors_conv + errors_cod}
{'='*60}
""")
