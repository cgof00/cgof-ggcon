# 🎯 DIAGRAMA VISUAL: Filtro de Anos na Importação

## Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO FINAL                                │
│              "Importar Emendas" Button Click                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Step 1: Seleciona arquivo
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: src/App.tsx                              │
│                                                                  │
│  [Importar Emendas Button] → handleImportCSV()                 │
│                                 │                               │
│                                 ├─→ Papa.parse (CSV)            │
│                                 ├─→ Valida registros            │
│                                 └─→ Deduplica por codigo_num    │
│                                                                  │
│  Arquivo em memória: 5000 records                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Step 2: Upload em lotes
┌─────────────────────────────────────────────────────────────────┐
│     API: functions/api/admin/import-emendas.ts                 │
│                                                                  │
│  POST /api/admin/import-emendas                                │
│  Body: { records: [...50...] }                                 │
│                                                                  │
│  Loop: 5000 / 50 = 100 lotes                                   │
│  ├─ Batch 1/100: INSERT ... ON CONFLICT (upsert)              │
│  ├─ Batch 2/100: ✓ 50 records                                 │
│  ├─ ...                                                        │
│  └─ Batch 100/100: ✓ 50 records                               │
│                                                                  │
│  Resultado: 5000 emendas na tabela (sem filtro)               │
│  Progress: 0% → 91%                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    (Upload Completo)
                         │
        [⏸️ PAUSA AQUI - NOVO NO SISTEMA]
                         │
                         ▼ Step 3: Modal de Seleção
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Modal de Anos                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📅 Selecione os Anos para Sincronização                   │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │ Selecione quais anos sincronizar com formalizacao:        │ │
│  │                                                              │ │
│  │  ☑️ 2024   ← Default checked                              │ │
│  │  ☑️ 2025   ← Default checked                              │ │
│  │  ☑️ 2026   ← Default checked                              │ │
│  │                                                              │ │
│  │  [Cancelar]  [Confirmar Sincronização]                    │ │
│  │                                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  State: importSyncYears = ['2024', '2025', '2026']            │
│  Aguarda: Clique em "Confirmar"                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                 (Usuario clica)
                         │
 ┌─────────────────┬─────┴──────────┬──────────────┐
 │                 │                │              │
 ▼                 ▼                ▼              ▼
2024           2025            2026          (Sem mais)
 ✓              ✓              ✓ → Enviado para API

Step 4: Sincronização com Filtro
┌─────────────────────────────────────────────────────────────────┐
│              API: functions/api/admin/sync-emendas.ts           │
│                                                                  │
│  POST /api/admin/sync-emendas                                  │
│  Body: {                                                        │
│    "years": ["2024", "2025", "2026"]  ← NOVO!                │
│  }                                                              │
│                                                                  │
│  Chama RPC com parâmetro:                                      │
│  ├─ sync_step1_update_convenio_with_years(                    │
│  │    p_years => ['2024', '2025', '2026']                    │
│  │  )                                                           │
│  │  → UPDATE formalizacao                                      │
│  │    WHERE numero_convenio matches                            │
│  │    AND e.ano_refer IN ('2024','2025','2026')              │
│  │  → Resultado: 1200 atualizadas                             │
│  │  Progress: 92-94%                                          │
│  │                                                             │
│  ├─ sync_step2_update_emenda_with_years(                      │
│  │    p_years => ['2024', '2025', '2026']                    │
│  │  )                                                           │
│  │  → UPDATE formalizacao                                      │
│  │    WHERE emenda matches                                     │
│  │    AND e.ano_refer IN ('2024','2025','2026')              │
│  │  → Resultado: 150 atualizadas                              │
│  │  Progress: 94-97%                                          │
│  │                                                             │
│  └─ sync_step3_insert_novas_with_years(                       │
│     p_years => ['2024', '2025', '2026']                       │
│   )                                                            │
│   → INSERT INTO formalizacao                                   │
│     WHERE NOT EXISTS                                           │
│     AND e.ano_refer IN ('2024','2025','2026')                │
│   → Resultado: 450 inseridas                                   │
│   Progress: 97-100%                                            │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    (Sync Completo)
                         │
                         ▼ Step 5: Resultado Final
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Mensagem de Sucesso                       │
│                                                                  │
│  ✅ Importação Concluída!                                       │
│  • 5000 emendas processadas (UPSERT)                           │
│  • 200 registros duplicados ignorados                          │
│                                                                  │
│  🔄 Sincronização (2024, 2025, 2026):                          │
│  • 1200 + 150 formalizações atualizadas                        │
│  • 450 novas formalizações inseridas                           │
│                                                                  │
│  Progress: 100%                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Dados no Banco
┌─────────────────────────────────────────────────────────────────┐
│           SUPABASE DATABASE                                     │
│                                                                  │
│  Tabela: emendas                                               │
│  ├─ 5000 registros NOVOS (de qualquer ano)                     │
│  └─ (Sem restrição de ano, todos adicionados)                 │
│                                                                  │
│  Tabela: formalizacao                                          │
│  ├─ 1200 atualizadas (por convenio, anos 2024-2026)           │
│  ├─ 150 atualizadas (por emenda, anos 2024-2026)              │
│  ├─ 450 inseridas (novas, anos 2024-2026)                     │
│  └─ Dados de 2023 ou antes = INTACTOS                         │
│                                                                  │
│  Diferença com anos não selecionados:                         │
│  ├─ Se selecionar APENAS 2026:                                │
│  │  ├─ 2026 = Sincronizado ✓                                 │
│  │  ├─ 2025 = NÃO sincronizado ✗                             │
│  │  └─ 2024 = NÃO sincronizado ✗                             │
│  │                                                             │
│  └─ Se selecionar 2024-2026:                                  │
│     ├─ 2026 = Sincronizado ✓                                 │
│     ├─ 2025 = Sincronizado ✓                                 │
│     └─ 2024 = Sincronizado ✓                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparação: Antes vs Depois

### ANTES (Sem Filtro)
```
Botão "Importar"
     ↓
Upload CSV (5000 records)
     ↓
Sincroniza TUDO (todas emendas, todos anos)
     ↓
❌ Problema: Emendas de 2019, 2020, etc. também sincronizam
```

### DEPOIS (Com Filtro 🆕)
```
Botão "Importar"
     ↓
Upload CSV (5000 records)
     ↓
⏸️ Modal: "Quais anos?"
     ↓
Usuário seleciona: 2024, 2025, 2026
     ↓
Sincroniza FILTRADO (apenas 2024-2026)
     ↓
✅ Benefício: Controle total dos anos
```

---

## 🔧 Detalhes Técnicos: Onde Cada Filtro Age

### 1. IMPORT-EMENDAS (Sem Filtro)
```sql
-- Todos os registros entram
INSERT INTO emendas (codigo_num, ano_refer, ...)
VALUES ('2020.001.12345', '2020', ...)  ← Entra
VALUES ('2024.001.12345', '2024', ...)  ← Entra
VALUES ('2026.001.12345', '2026', ...)  ← Entra
```

### 2. SYNC-STEP1 (Com Filtro 🆕)
```sql
-- Apenas anos selecionados sincronizam
UPDATE formalizacao SET ... 
FROM emendas e
WHERE match AND e.ano_refer IN ('2024','2025','2026')
-- 2020 NÃO atualiza ✓
-- 2024-2026 ATUALIZAM ✓
```

---

## 🎛️ Possibilidades de Configuração

### Cenário 1: Sincronizar Apenas 2026 (mais novo)
```
Default: ☑️ 2024, ☑️ 2025, ☑️ 2026
Usuário desmarcar 2024 e 2025:
         ☐ 2024, ☐ 2025, ☑️ 2026
Resultado: APENAS 2026 sincroniza
```

### Cenário 2: Sincronizar Tudo (2024-2026)
```
Default: ☑️ 2024, ☑️ 2025, ☑️ 2026
Usuário deixar tudo marcado
Resultado: Todos sincronizam
```

### Cenário 3: Sincronizar 2023 + 2024
```
Modificar src/App.tsx linha ~525 para:
['2023', '2024']

Default: ☑️ 2023, ☑️ 2024

Resultado: 2023 e 2024 sincronizam, 2025-2026 não
```

---

## 💾 Arquitetura de Dados

```
Banco de Dados:
┌─────────────────────────────────────────┐
│ Tabela EMENDAS (Fonte)                  │
├─────────────────────────────────────────┤
│ codigo_num | ano_refer | num_convenio   │
│ 2020.001.x │ 2020      | Conv-2020-001  │ ← Importada mas não sincroniza*
│ 2024.001.x │ 2024      | Conv-2024-001  │ ← Sincroniza ✓
│ 2025.001.x │ 2025      | Conv-2025-001  │ ← Sincroniza ✓
│ 2026.001.x │ 2026      | Conv-2026-001  │ ← Sincroniza ✓
└─────────────────────────────────────────┘
                  │ (Filtro aqui)
                  │ WHERE ano_refer IN (2024,2025,2026)
                  ▼
┌─────────────────────────────────────────┐
│ Tabela FORMALIZACAO (Destino)           │
├─────────────────────────────────────────┤
│ emenda    | ano | numero_convenio       │
│ (vazio)   | ... | (vazio)               │ ← Não muda
│ 2024.001.x| 2024| Conv-2024-001         │ ← Atualizada ✓
│ 2025.001.x| 2025| Conv-2025-001         │ ← Atualizada ✓
│ 2026.001.x| 2026| Conv-2026-001         │ ← Atualizada ✓
└─────────────────────────────────────────┘

* Fica na tabela emendas mas não sincroniza para formalizacao
```

---

## ✅ Implementação Completa

```
[SQL] FUNCOES_RPC_PARAMETRIZADAS.sql ✓
      └─ Cria 3 funções com parâmetros
      
[API] sync-emendas.ts ✓
      └─ Lê body.years e passa para RPC
      
[UI]  App.tsx ✓
      ├─ Modal de seleção de anos
      ├─ Estados para guardar seleção
      └─ Função handleConfirmYearsAndSync
      
[DOC] Documentação ✓
      ├─ GUIA_IMPORTAR_COM_FILTRO_ANOS.md
      └─ IMPLEMENTACAO_FILTRO_ANOS_RESUMO.md
```

Tudo pronto! 🎉
