import csv
import sys
import os

input_file = r'C:\Users\afpereira\Downloads\geral.csv'
output_file = r'C:\Users\afpereira\Downloads\FORMALIZACAO_LIMPO.csv'

# Colunas a remover
REMOVE_COLS = {'5ultimos', ''}

rows_read = 0
rows_written = 0
cols_to_keep = []

with open(input_file, 'r', encoding='utf-8') as infile:
    # Detectar se usa ; ou ,
    first_line = infile.readline()
    infile.seek(0)
    
    delimiter = ';' if first_line.count(';') > first_line.count(',') else ','
    print(f"Delimitador detectado: '{delimiter}'")
    
    reader = csv.reader(infile, delimiter=delimiter)
    
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        
        for i, row in enumerate(reader):
            rows_read += 1
            
            if i == 0:
                # Header - identificar colunas a manter
                for j, col in enumerate(row):
                    clean_name = col.strip()
                    if clean_name not in REMOVE_COLS:
                        cols_to_keep.append((j, clean_name))
                    else:
                        print(f"  Removendo coluna {j}: [{col}]")
                
                # Escrever header limpo
                header = [name for _, name in cols_to_keep]
                writer.writerow(header)
                print(f"  Mantendo {len(header)} colunas: {header[:5]}...{header[-3:]}")
                rows_written += 1
            else:
                # Data rows - pegar só as colunas que queremos
                new_row = []
                for j, _ in cols_to_keep:
                    if j < len(row):
                        new_row.append(row[j].strip())
                    else:
                        new_row.append('')
                writer.writerow(new_row)
                rows_written += 1

print(f"\nResultado:")
print(f"  Linhas lidas: {rows_read}")
print(f"  Linhas escritas: {rows_written}")
print(f"  Colunas: {len(cols_to_keep)}")
print(f"  Arquivo: {output_file}")

# Verificar resultado
print(f"\nVerificando arquivo limpo...")
with open(output_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    problems = 0
    expected = len(cols_to_keep)
    for i, row in enumerate(reader):
        if len(row) != expected:
            problems += 1
            if problems <= 5:
                print(f"  PROBLEMA linha {i+1}: {len(row)} campos (esperado {expected})")
    if problems == 0:
        print(f"  OK! Todas as linhas tem {expected} campos")
    else:
        print(f"  {problems} linhas com problemas")
