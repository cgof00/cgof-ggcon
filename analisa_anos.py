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

# Colunas: [2] Ano, [3] Código/Nº Emenda, [20] Nº Convênio
anos = {}
cod_por_ano = {}
conv_por_ano = {}

for row in rows[1:]:
    vals = cell_val(row)
    while len(vals) <= 44:
        vals.append('')
    ano = vals[2].strip()
    cod = vals[3].strip()
    conv = vals[20].strip()
    
    anos[ano] = anos.get(ano, 0) + 1
    if cod:
        if ano not in cod_por_ano:
            cod_por_ano[ano] = []
        if len(cod_por_ano[ano]) < 2:
            cod_por_ano[ano].append(cod)
    if conv:
        conv_por_ano[ano] = conv_por_ano.get(ano, 0) + 1

print("=== DISTRIBUIÇÃO POR ANO ===")
for ano in sorted(anos.keys()):
    print(f"  {ano}: {anos[ano]:5d} registros | {conv_por_ano.get(ano,0)} com convênio | ex código: {cod_por_ano.get(ano,['(sem)'])}")

print(f"\nTotal: {sum(anos.values())} | Com convênio: {sum(conv_por_ano.values())}")

# Verifica formato do código para anos recentes
print("\n=== FORMATO DO CÓDIGO POR ANO (exemplos) ===")
import re
for ano in sorted(cod_por_ano.keys()):
    for cod in cod_por_ano[ano]:
        digits = re.sub(r'[^0-9]', '', cod)
        print(f"  {ano}: '{cod}' → só dígitos: '{digits}' ({len(digits)} dígitos)")
