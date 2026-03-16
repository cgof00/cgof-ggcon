# 📋 GUIA: Importar Emendas com Filtro de Anos

## 🎯 O Que Mudou

Quando você clica no botão **"Importar Emendas"**, o sistema agora:

1. **Lê o arquivo CSV** (emendas)
2. **Envia os registros** para a tabela `emendas`
3. **Mostra um modal** para você selecionar quais anos sincronizar
4. **Sincroniza** apenas com os anos que você selecionou

---

## 📱 PASSO A PASSO: Como Usar

### 1️⃣ Clique no Botão "Importar Emendas"

Na barra superior do sistema, clique em:
```
📁 Importar Emendas
```

### 2️⃣ Selecione o Arquivo CSV

Uma janela vai abrir:
```
┌─────────────────────────────────────────┐
│ Importar Emendas                        │
├─────────────────────────────────────────┤
│ Selecione um arquivo CSV, XLS, XLSX     │
│                                          │
│ [Selecionar Arquivo]  [Nova importação] │
│                                          │
│ ✅ Leitura → 🔄 Upload → 🔄 Sync       │
└─────────────────────────────────────────┘
```

Clique em **"Selecionar Arquivo"** e escolha seu CSV de emendas.

### 3️⃣ Acompanhe o Upload

O sistema fará:
- ✅ **Leitura** do arquivo (detecta formato)
- 🔄 **Upload** dos registros (em lotes)
- ⏸️ **Pausa** antes de sincronizar

A barra de progresso mostra o avanço:
```
Lote 1/5 enviando 100 registros... ▓▓▓▓░ 45%
```

### 4️⃣ Selecione os Anos para Sincronização

**Quando atingir 91% (após upload), aparece um novo modal:**

```
┌─────────────────────────────────────────┐
│ 📅 Selecione os Anos                    │
├─────────────────────────────────────────┤
│                                          │
│ Selecione quais anos deseja sincronizar │
│ com a tabela de formalizações.          │
│                                          │
│ ☑️ 2024                                 │
│ ☑️ 2025                                 │
│ ☑️ 2026                                 │
│                                          │
│ ⚠️ Apenas emendas dos anos selecionados │
│    (2024, 2025, 2026) serão atualizadas│
│                                          │
│ [Cancelar]  [Confirmar Sincronização]  │
└─────────────────────────────────────────┘
```

**Opções:**
- ☑️ = Ano será sincronizado
- ☐ = Ano NÃO será sincronizado

**Default:** 2024, 2025, 2026 estão checkados

### 5️⃣ Confirme os Anos

Clique em **"Confirmar Sincronização"** com os anos desejados.

O sistema então vai:
- 🔄 Sincronizar apenas emendas dos anos selecionados
- 📊 Atualizar a tabela `formalizacao`
- ✅ Mostrar resumo final

---

## 📊 Exemplo Completo

### Cenário 1: Importar e sincronizar apenas 2026

```
1. Clica "Importar Emendas"
2. Seleciona arquivo com 5000 registros
3. Sistema faz upload de todas (independente do ano)
4. Modal aparece:
   ☑️ 2024  ← desmarcar
   ☑️ 2025  ← desmarcar
   ☑️ 2026  ← manter marcado
5. Clica "Confirmar Sincronização"
6. Resultado:
   ✅ 5000 emendas no banco de dados
   🔄 Apenas emendas de 2026 sincronizadas com formalizacao
   ⏸️ Emendas 2024, 2025 ficam em segundo plano
```

### Cenário 2: Importar tudo, sincronizar 2024-2026

```
1. Clica "Importar Emendas"
2. Seleciona arquivo com 8000 registros (2019-2026)
3. Sistema faz upload de todas
4. Modal aparece com default (2024, 2025, 2026) ✓
5. Clica "Confirmar Sincronização"
6. Resultado:
   ✅ 8000 emendas no banco (todas)
   🔄 ~3000 emendas (2024-2026) sincronizadas
   ⏸️ ~5000 emendas (2019-2023) não sincronizadas
```

---

## 🎯 Detalhes Técnicos

### Arquivo CSV
- **Fonte:** Dados de emendas (qualquer ano)
- **Destino:** Tabela `emendas` (sem filtro, all years)
- **Deduplicação:** Automática (por `codigo_num`)

### Sincronização
- **Função RPC:** `sync_step1_update_convenio_with_years`
- **Função RPC:** `sync_step2_update_emenda_with_years`
- **Função RPC:** `sync_step3_insert_novas_with_years`
- **Filtro:** `WHERE e.ano_refer IN ('2024', '2025', '2026')`
- **Timeout:** 120 segundos por etapa

### Resultado
```
✅ Importação Concluída!
• 5000 emendas processadas (UPSERT)
• 200 registros duplicados ignorados

🔄 Sincronização (2024, 2025, 2026):
• 3000 + 150 formalizações atualizadas
• 850 novas formalizações inseridas
```

---

## ⚠️ Pontos Importantes

### ✅ O QUE ACONTECE

- ✅ CSV é **sempre importado** para `emendas` (sem restrição de ano)
- ✅ Sincronização **filtrada** pelos anos selecionados
- ✅ Dados em `emendas` permanecem **intactos**
- ✅ Você pode importar novamente quantas vezes quiser

### ❌ O QUE NÃO ACONTECE

- ❌ Emendas de anos não selecionados **não são sincronizadas**
- ❌ Formalizações de anos não selecionados **permanecem unchanged**
- ❌ CSV com erros **interrompe o processo**

### 🎯 IMPORTANTE

Se quiser sincronizar tipos diferentes de dados:

| Caso | Ação |
|------|------|
| Importar e testar com 2026 | Desmarque 2024, 2025 |
| Sincronizar dados históricos | Selecione apenas anos antigos |
| Sincronizar tudo | Mantenha 2024, 2025, 2026 checked |
| Excluir um ano | Desmarque na próxima importação |

---

## 🔄 Trocando os Anos Padrão

Se quiser mudar o **default** de (2024, 2025, 2026) para outros anos:

### Opção 1: Via SQL (Supabase)
Execute as funções RPC com parâmetros diferentes:
```sql
SELECT sync_step1_update_convenio_with_years(ARRAY['2023', '2024', '2025']);
SELECT sync_step2_update_emenda_with_years(ARRAY['2023', '2024', '2025']);
SELECT sync_step3_insert_novas_with_years(ARRAY['2023', '2024', '2025']);
```

### Opção 2: No Frontend (src/App.tsx, linha ~520)
```typescript
const [importSyncYears, setImportSyncYears] = useState<string[]>(['2023', '2024', '2025']);
// Altere para os anos que desejar
```

---

## ✅ Check List Antes de Usar

- [ ] Arquivo CSV está pronto com os dados de emendas
- [ ] Colunas do CSV estão corretas (veja em `CSV_TO_EMENDAS_MAP`)
- [ ] Você tem acesso de admin/intermediário
- [ ] Token de autenticação está ativo
- [ ] Internet está estável (upload + sync = ~5 min para 5k registros)

---

## 🆘 Troubleshooting

### Problema: Modal não aparece após upload
**Solução:** Verifique se o upload chegou a 91% (verifique barra de progresso)

### Problema: Sincronização demorada
**Motivo:** Cada etapa tem timeout de 120 segundos
**Solução:** Reduzir número de anos selecionados

### Problema: Apenas alguns anos sincronizaram
**Verificar:** Se os registros têm o campo `ano_refer` preenchido no CSV

### Problema: Dados de 2023 também foram sincronizados
**Causa:** Funções RPC antigas (sem parâmetros) foram chamadas
**Solução:** Execute o SQL das funções parametrizadas: `FUNCOES_RPC_PARAMETRIZADAS.sql`

---

## 📞 Resumo Rápido

| Ação | Resultado |
|------|-----------|
| Clica "Importar" | Abre modal de seleção de arquivo |
| Seleciona arquivo | Começa upload (sem filtro) |
| Upload completa | Modal de seleção de anos aparece |
| Seleciona anos | Sincronização começa com filtro |
| Sincronização completa | Resumo final com estatísticas |

---

**Que legal!** Agora você tem controle total sobre quais anos sincronizar direto da interface. 🎉

Gerado em: 2026-03-16  
Versão: 1.0 integrada ao Sistema
