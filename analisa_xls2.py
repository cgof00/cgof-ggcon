from lxml import etree

path = r"C:\Users\afpereira\Downloads\Relatório Emendas (14).xls"
with open(path, 'rb') as f:
    content = f.read()
content = content.replace(b'encoding="UTF8"', b'encoding="UTF-8"')

root = etree.fromstring(content)
ns = 'urn:schemas-microsoft-com:office:spreadsheet'

ws = root.findall(f'.//{{{ns}}}Worksheet')[0]
rows = ws.findall(f'.//{{{ns}}}Row')

def cell_val(row):
    cells = row.findall(f'{{{ns}}}Cell')
    vals = []
    for cell in cells:
        idx = cell.get(f'{{{ns}}}Index')
        if idx:
            while len(vals) < int(idx) - 1:
                vals.append('')
        d = cell.find(f'{{{ns}}}Data')
        vals.append(d.text if d is not None and d.text else '')
    return vals

headers_raw = cell_val(rows[0])
print(f"Total linhas: {len(rows)-1} | Total colunas: {len(headers_raw)}")
print("\n=== CABEÇALHOS (raw) ===")
for i, h in enumerate(headers_raw):
    print(f"  [{i}] {repr(h)}")

# Identifica colunas por índice (já sabemos da análise anterior)
# [3] Código/Nº Emenda, [6] Situação Emenda, [20] Nº de Convênio
conv_col = 20
emenda_col = 3
sit_col = 6

conv_nv = emenda_nv = sit_nv = 0
sit_vals = {}
cod_exemplos = []
conv_exemplos = []
anos = {}

for row in rows[1:]:
    vals = cell_val(row)
    while len(vals) <= 44:
        vals.append('')
    
    if vals[conv_col].strip():
        conv_nv += 1
        if len(conv_exemplos) < 3:
            conv_exemplos.append(vals[conv_col])
    
    if vals[emenda_col].strip():
        emenda_nv += 1
        if len(cod_exemplos) < 5:
            cod_exemplos.append(vals[emenda_col])
    
    v = vals[sit_col].strip()
    if v:
        sit_nv += 1
        sit_vals[v] = sit_vals.get(v, 0) + 1

print(f"\nConvênio não vazio: {conv_nv} — ex: {conv_exemplos}")
print(f"Código emenda não vazio: {emenda_nv} — ex: {cod_exemplos}")
print(f"Situação emenda não vazio: {sit_nv}")
print(f"\nTop 10 situações emenda:")
for k, v in sorted(sit_vals.items(), key=lambda x: -x[1])[:10]:
    print(f"  {v:6d} - {repr(k)}")
