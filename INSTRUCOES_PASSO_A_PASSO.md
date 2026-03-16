# 🎯 Guia Passo a Passo: Atualizar Recurso e Tipo de Formalização via Staging

## O Problema Anterior
A atualização com múltiplos UPDATEs individuais (um para cada emenda) pode ter timeout, falhas de RLS ou ser muito lenta.

## A Solução: Tabela Staging
Criar uma tabela intermediária, importar os dados lá, e depois fazer um UPDATE único em batch.

---

## ✅ Etapa 1: Preparar o Supabase

No **Supabase SQL Editor**, execute o arquivo:
```
GUIA_COMPLETO_ATUALIZAR_STAGING.sql
```

Execute APENAS a **ETAPA 1** (seções 1A e 1B):
- 1A cria a tabela staging
- 1B vai importar os dados

---

## ✅ Etapa 2: Importar os Dados do CSV

Depois que executar a ETAPA 1A, execute o SQL gerado:
```
import_data_fixed.sql
```

Cole esse arquivo **INTEIRO** no Supabase SQL Editor (ou na seção 1B do guia).

Este arquivo contém:
- 234 linhas do seu CSV convertidas em INSERT SQL
- Todas as emendas com seus tipos e valores de recurso

---

## ✅ Etapa 3: Fazer a Atualização Principal

No Supabase SQL Editor, execute a **ETAPA 2** do arquivo:
```
GUIA_COMPLETO_ATUALIZAR_STAGING.sql
```

Isso vai:
- Copiar dados da tabela staging para a tabela formalizacao
- Atualizar os campos `tipo_formalizacao` e `recurso`
- Marcar registros como processados

---

## ✅ Etapa 4: Validar os Resultados

Execute a **ETAPA 3** do arquivo:
```
GUIA_COMPLETO_ATUALIZAR_STAGING.sql
```

Você vai ver:
- **3A**: Quantos registros foram atualizados
- **3B**: Quais emendas NÃO foram encontradas (check de erros)
- **3C**: Amostra de registros atualizados
- **3D**: Distribuição de tipos de formalização
- **3E**: Distribuição de recursos
- **3F**: Resumo final com totais

---

## 📊 O Que Será Atualizado

Do seu CSV foram encontrados:
- **234 emendas** no total
- **234** com `tipo_formalizacao` 
- **79** com `recurso`

Tipos de formalização encontrados:
- `Repasse fundo a fundo`
- `Convênio normal`
- `Cancelada`
- `Impedida Tecnicamente`

Valores de recurso:
- `NÃO`
- `Cancelada`
- `Impedida Tecnicamente`

---

## ⚠️ Etapa 5: Limpeza (Opcional)

Após validar que tudo funcionou, pode deletar a tabela staging:

```sql
DROP TABLE formalizacao_recursos_tipos_staging;
```

> ⚠️ **Nota**: Só faça isso DEPOIS de confirmar que os dados estão certos!

---

## 🔍 Troubleshooting

### Problema: "Staging table not found"
- Confirme que executou a ETAPA 1A

### Problema: "Nenhum registro foi atualizado"
- Verifique 3B para ver quais emendas não foram encontradas
- Pode ser que o formato da emenda seja diferente

### Problema: Valores vazios em tipo_formalizacao ou recurso
- Isso é normal! Nem todas as emendas têm ambos os campos
- Veja 3D e 3E para saber quantos foram realmente preenchidos

### Problema: Quer reverter as mudanças
- Se executou com sucesso, difícil reverter
- Faça backup antes!

---

## 📈 Benefícios desta Abordagem

✅ **Mais Rápido**: Um único UPDATE em batch é muito mais rápido que 234 UPDATEs individuais  
✅ **Mais Seguro**: Evita timeouts e problemas de RLS  
✅ **Rastreável**: Vê exatamente o que foi atualizado  
✅ **Reversível**: Staging fica em memória até você limpar  
✅ **Auditável**: Pode manter histórico se precisar  

---

## 🎬 Resumo Visual do Fluxo

```
CSV (seu arquivo)
    ↓
import_data_fixed.sql (INSERT na staging)
    ↓
formalizacao_recursos_tipos_staging (tabela temporária)
    ↓
JOIN + UPDATE (copia para formalizacao)
    ↓
formalizacao (tabela principal atualizada!)
    ↓
DROP table staging (limpeza)
```

---

## 📝 Checklis Final

- [ ] Executou ETAPA 1A (criar tabela staging)
- [ ] Executou import_data_fixed.sql (importar dados)
- [ ] Executou ETAPA 2 (fazer update)
- [ ] Executou ETAPA 3 (validar resultados)
- [ ] Verificou 3B (check de erros)
- [ ] Confirmou 3F (resumo final)
- [ ] Executou limpeza (DROP table)

---

**✅ Pronto!** Seus dados de Recurso e Tipo de Formalização foram atualizados com segurança!
