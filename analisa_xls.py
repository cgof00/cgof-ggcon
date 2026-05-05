import sys, re
import pandas as pd

path = r"C:\Users\afpereira\Downloads\Relatório Emendas (14).xls"

# Lê como texto e corrige encoding inválido
with open(path, 'rb') as f:
    content = f.read()

# Corrige 'UTF8' -> 'UTF-8' no XML declaration
content = content.replace(b'encoding="UTF8"', b'encoding="UTF-8"')

# Parseia com lxml (mais tolerante)
from lxml import etree
root = etree.fromstring(content)

ns = 'urn:schemas-microsoft-com:office:spreadsheet'

worksheets = root.findall(f'.//{{{ns}}}Worksheet')
print(f"Worksheets: {len(worksheets)}")

ws = worksheets[0]
rows = ws.findall(f'.//{{{ns}}}Row')
print(f"Linhas: {len(rows)}")

data = []
for row in rows:
    cells = row.findall(f'{{{ns}}}Cell')
    row_data = []
    idx = 0
    for cell in cells:
        # Suporte a ss:Index (células esparsas)
        idx_attr = cell.get(f'{{{ns}}}Index')
        if idx_attr:
            while len(row_data) < int(idx_attr) - 1:
                row_data.append('')
        data_el = cell.find(f'{{{ns}}}Data')
        row_data.append(data_el.text if data_el is not None and data_el.text else '')
    data.append(row_data)

max_cols = max(len(r) for r in data)
for r in data:
    while len(r) < max_cols:
        r.append('')

headers = data[0]
df = pd.DataFrame(data[1:], columns=headers)

print(f"\nLinhas de dados: {len(df)} | Colunas: {len(df.columns)}")
print("\n=== CABECALHOS ===")
for i, c in enumerate(headers):
    print(f"  [{i}] {repr(c)}")

print("\n=== LINHA 1 (campos não vazios) ===")
for col, val in df.iloc[0].items():
    if str(val).strip() not in ('', 'nan', 'None', '0'):
        print(f"  {repr(col)}: {repr(val)}")

print("\n=== COLUNAS com 'situac' ou 'emend' ===")
for c in df.columns:
    if any(k in str(c).lower() for k in ['situac', 'emend']):
        nv = df[c].dropna().astype(str).str.strip()
        nv = nv[nv.str.len() > 0]
        print(f"  '{c}': {len(nv)} valores — ex: {list(nv.head(3))}")

print("\n=== COLUNAS com 'cód' ou 'conv' ou 'num' ===")
for c in df.columns:
    if any(k in str(c).lower() for k in ['cód', 'cod', 'conv', 'num']):
        nv = df[c].dropna().astype(str).str.strip()
        nv = nv[nv.str.len() > 0]
        print(f"  '{c}': {len(nv)} valores — ex: {list(nv.head(3))}")


print(f"Linhas: {len(df)} | Colunas: {len(df.columns)}")
print()
print("=== CABECALHOS ===")
for i, c in enumerate(df.columns):
    print(f"  [{i}] {repr(c)}")

print()
print("=== LINHA 1 (campos não vazios) ===")
row = df.iloc[0]
for col, val in row.items():
    if str(val).strip() not in ('', 'nan', 'NaN', '0'):
        print(f"  {repr(col)}: {repr(val)}")

print()
print("=== LINHA 2 (campos não vazios) ===")
row = df.iloc[1]
for col, val in row.items():
    if str(val).strip() not in ('', 'nan', 'NaN', '0'):
        print(f"  {repr(col)}: {repr(val)}")

# Verifica se tem coluna "Situação Emenda" ou similar
print()
print("=== COLUNAS COM 'situac' ou 'emenda' (case insensitive) ===")
for c in df.columns:
    if any(k in str(c).lower() for k in ['situac', 'emenda', 'emend']):
        nao_vazios = df[c].dropna().astype(str).str.strip()
        nao_vazios = nao_vazios[nao_vazios != '']
        print(f"  '{c}': {len(nao_vazios)} valores não vazios")
        print(f"    Exemplos: {list(nao_vazios.head(5))}")

# Verifica coluna com código de emenda
print()
print("=== COLUNA 'Código' ou 'Nº' ===")
for c in df.columns:
    if any(k in str(c).lower() for k in ['cód', 'cod', 'código', 'codigo', 'nº', 'num']):
        nao_vazios = df[c].dropna().astype(str).str.strip()
        nao_vazios = nao_vazios[nao_vazios != '']
        print(f"  '{c}': {len(nao_vazios)} valores não vazios")
        print(f"    Exemplos: {list(nao_vazios.head(3))}")
