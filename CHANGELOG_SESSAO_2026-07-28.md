# Resumo das alterações — sessão de 28/07/2026

## 1. Nova funcionalidade: "Liberado para Conferência"

Fluxo completo: técnico analisa a demanda → clica em **"Demanda Analisada"** (seção "2. Análise da Demanda" do modal de edição) → a demanda fica com status virtual "liberada para conferência" (linha azul na tabela, filtro dedicado) → admin filtra essas demandas e usa o botão já existente **"Atribuir Conferencista"** para rotear.

- Nova coluna `data_liberacao_conferencia` (DATE) na tabela `formalizacao` — migração em [sql/ADD_DATA_LIBERACAO_CONFERENCIA.sql](sql/ADD_DATA_LIBERACAO_CONFERENCIA.sql).
- Botão "Demanda Analisada" agora grava **duas datas** no mesmo clique (`data_analise_demanda` + `data_liberacao_conferencia`).
- Admin pode clicar em **"Remover"** no aviso de liberação, caso tenha sido liberada por engano — o aviso some na hora.
- Novo chip de filtro **"Liberadas p/ Conferência"** na barra de filtros da tela Formalização.
- Linha da tabela fica azul (`bg-sky-50`) quando a demanda está liberada e ainda sem conferencista atribuído.
- Arquivos: `src/App.tsx`, `functions/api/formalizacao/[id].ts`.

## 2. Correção de bug crítico: salvar/remover liberação dava erro 500

Campos de data enviados como string vazia (`""`) quebravam colunas `DATE` do Postgres (`invalid input syntax for type date`). O Worker de produção já convertia `""` → `null`, mas o servidor Express local (`server.ts`) não fazia isso. Corrigido — agora os dois ambientes tratam data vazia da mesma forma.

- Arquivo: `server.ts`.

## 3. Modal "Editar Demanda" modernizado

- Removidas as cores de fundo cheias por seção (violeta/azul/verde/rosa/cinza) que deixavam o modal "arco-íris" — agora todo cartão é neutro (branco), a cor de cada papel (técnico/conferencista/admin/ambos) fica só na barra lateral esquerda, no selo do número e no pill do rótulo.
- Inputs/selects com bordas mais visíveis, cantos mais arredondados, foco mais suave.
- Legenda de cores compacta (bolinhas em vez de caixa alta).
- Rodapé do modal (Cancelar/Atualizar Registro) agora é **sticky** — sempre visível, mesmo rolando um formulário longo.
- Arquivo: `src/App.tsx`.

## 4. Reorganização da barra lateral (sidebar)

Achados dois pares de nomes quase idênticos, apontando para coisas diferentes:
- **"Demonstrativo"** (aba do topo, dashboard principal) vs **"Demonstrativo Lote"** (sidebar, relatório por lote) → renomeado para **"Relatório por Lote"**.
- **Dois botões de "Atualizar BD"** com efeitos diferentes (um só atualiza sua sessão, outro notifica todos os usuários conectados) → renomeados para **"Atualizar Meus Dados"** e **"Forçar Atualização p/ Todos"**, com tooltips explicando a diferença.
- Seções reagrupadas por propósito: Administração / Relatórios / **Minha Conta** (antes "Sistema").
- Arquivo: `src/components/AdminSidebar.tsx`.

## 5. Bug de segurança/funcionalidade: papel "Intermediário" inacessível

O papel `intermediario` existe e é usado de verdade (4 checagens de permissão em `server.ts`), mas a tela "Gerenciar Usuários" não oferecia essa opção, e o endpoint de **criar usuário** só aceitava `admin`/`usuario` — criar um usuário como "Visualizador" já dava erro 400. Corrigido nos três lugares:

- `server.ts` — validação de role no POST de criação.
- `functions/api/admin/usuarios.ts` — mesma validação no Worker de produção.
- `src/UserManagementPanel.tsx` — tipos, dropdowns de criar/editar, e o badge que mostrava "Padrão" para intermediário.

## 6. Tela de Demonstrativo (`src/DashboardTecnico.tsx`) — bugs de precisão corrigidos

- Export XLSX "Linha do Tempo": colunas Técnico/Conferencista liam campos inexistentes (`usuario_atribuido`, `usuario_atribuido_conferencista`) — sempre saíam vazias. Corrigido para `tecnico`/`conferencista`.
- Dois exports XLSX de atraso: coluna "Classificação" lia `r.classificacao` (campo inexistente, sem fallback) — sempre vazia. Corrigido para `r.classificacao_emenda_demanda`.
- Limpeza de referências mortas a `r.convenio_convenente` (campo que nunca existiu).
- Corrigido o offset do cabeçalho sticky da matriz (usava `top-12` fixo; agora mede a altura real da barra de filtros via `ResizeObserver`, corrigindo sobreposição quando o painel de filtros está aberto).

### Duas seções inteiras estavam calculadas mas nunca apareciam na tela — reconectadas
- **Linha do Tempo — Demandas Pendentes por Etapa** (matriz por estágio do processo, com drilldown).
- **Produtividade Mensal — Liberação → Publicação** (ranking mensal por técnico/conferencista).

### Quatro seções novas, extraídas de um arquivo antigo (`AdminPanel.tsx`, agora removido) e corrigidas para usar o helper `isConcluida()` (mais preciso que a versão antiga, que só olhava `concluida_em`)
- **Taxa de Conclusão por Técnico/Conferencista**
- **Demandas por Regional**
- **Publicações por Mês**
- **Composição das Demandas** (Classificação, Tipo, Objeto, Portfólio, Recurso)

### KPIs do topo modernizados
Cartões com ícone, gradiente e número grande, no mesmo padrão visual do resto do dashboard.

## 7. Export CSV da tela principal — inconsistência corrigida

O export **XLSX** ordenava a coluna "Falta Assinatura" pela hierarquia de cargos (Gestor DRS → Diretor → ... → Lote3); o export **CSV** não. Agora os dois formatos saem idênticos.

- Arquivo: `src/App.tsx`.

## 8. `src/LoginPage.tsx`

Classe CSS inválida `items-gap-3` (não existe no Tailwind) quebrava o alinhamento da mensagem de erro de login. Corrigido para `items-center gap-3`.

## 9. Limpeza de código morto (~2900 linhas removidas)

Todos os arquivos abaixo não eram importados em nenhum lugar do app (confirmado antes de remover):

| Arquivo | Motivo |
|---|---|
| `src/AdminPanel.tsx` (1828 linhas) | Versão antiga/menos precisa do dashboard atual; conteúdo único já extraído para `DashboardTecnico.tsx` (item 6) |
| `src/DashboardClassificacao.tsx` (668 linhas) | 100% duplicado do que já existia dentro do `AdminPanel.tsx` |
| `src/VirtualizedTable.tsx` (183 linhas) | Protótipo quebrado — memoização anulada (recriava objeto a cada render, zerando a otimização), componente `Row` interno nunca usado, lógica específica de domínio vazando num componente que deveria ser genérico |
| `src/components/*.tsx` (14 arquivos, ~1600 linhas) | Segunda biblioteca de componentes (Button, Badge, Modal, Pagination, etc.) nunca conectada ao app — mantido apenas `AdminSidebar.tsx`, que é o único realmente usado |
| `src/DEBUG.ts` | Utilitário de debug órfão, já desatualizado (referenciava chave de cache que não existe mais) |
| `src/hooks/usePerformance.ts` | Utilitário de debug órfão, nunca importado |

## 10. Auditoria de performance e responsividade (achados, sem alteração de código)

- **Performance:** `App.tsx` (8600+ linhas) tem apenas 1 uso de `useMemo` em todo o arquivo — funções como `getColumnFilterOptions` (varre toda a base carregada) recalculam do zero a cada re-render enquanto um filtro de coluna está aberto. Risco real, não medido em runtime (precisaria rodar com dados de produção + profiler do navegador).
- **Responsividade:** app é desktop-first. `App.tsx` tem 33 classes responsivas (`sm:`/`md:`/`lg:`) e `DashboardTecnico.tsx` tem 12, ambos muito esparsos para o tamanho dos arquivos. A tabela principal só sobrevive em telas pequenas via scroll horizontal. Única adaptação mobile real: a sidebar detecta `window.innerWidth < 768` e vira overlay.

---

**Build e type-check (`npx tsc --noEmit` + `npm run build`) passaram limpos após cada alteração.**
