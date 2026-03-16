import csv

with open('Copia_Dashboard_13032026_075157.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    print('Colunas encontradas:')
    for col in reader.fieldnames:
        print(f'  - "{col}"')
    
    # Primeira linha
    f.seek(0)
    reader = csv.DictReader(f, delimiter=';')
    first_row = next(reader)
    print('\nPrimeira linha de dados:')
    for k, v in first_row.items():
        val = str(v)[:50] if v else 'vazio'
        print(f'  {k}: {val}')
