# 📐 Design System e Componentes Reutilizáveis

## Estrutura de Componentes

### Componentes Base
- **Button.tsx** - Botão com variantes (primary, secondary, outline, ghost, danger)
- **Badge.tsx** - Distintivos e tags
- **Modal.tsx** - Diálogos modais
- **SearchBox.tsx** - Campo de busca
- **ActionBar.tsx** - Barra de ações organizada

### Componentes de Layout
- **Header.tsx** - Cabeçalho com navegação e user menu
- **PageHeader.tsx** - Título de página com ações
- **Layout.tsx** - Container principal
- **AppLayout.tsx** - Layout completo da aplicação

### Componentes de Tabelas e Dados
- **DataTable.tsx** - Tabela com suporte a sorting, paginação, seleção
- **Pagination.tsx** - Controles de paginação
- **FilterPanel.tsx** - Painel de filtros organizado

---

## Sistema de Tokens CSS

Localizado em: `src/styles/designTokens.css`

### Cores Semânticas
```css
--color-primary: #AE1E25;           /* Ação principal */
--color-primary-light: #DC2626;     /* Hover/Focus */
--color-primary-dark: #7F1D1D;      /* Texto em vermelho */

--color-surface-primary: #000000;   /* Fundo escuro */
--color-surface-secondary: #1F1F1F; /* Fundo cinza escuro */
--color-surface-tertiary: #FFFFFF;  /* Fundo claro */

--color-feedback-success: #10B981;  /* Verde */
--color-feedback-warning: #F59E0B;  /* Amarelo */
--color-feedback-error: #EF4444;    /* Vermelho */
--color-feedback-info: #3B82F6;     /* Azul */
```

### Espaçamento (Escala 4px)
```
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

### Tipografia
```
Sizes: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px)
Weights: regular (400), medium (500), semibold (600), bold (700)
Line Heights: tight (1.2), normal (1.5), relaxed (1.75)
```

---

## Padrão de Uso

### Exemplo: Usar Header
```jsx
import { Header } from './components';

<Header
  logo={logoImg}
  title="Sistema de Formalização"
  user={{ nome: 'João Silva', role: 'admin' }}
  onLogout={() => logout()}
  navItems={[
    { label: 'Formalização', isActive: true, onClick: () => {} },
    { label: 'Emendas', isActive: false, onClick: () => {} },
  ]}
/>
```

### Exemplo: Usar DataTable
```jsx
import { DataTable, DataTableColumn } from './components';

const columns: DataTableColumn<Formalizacao>[] = [
  { key: 'ano', label: 'Ano', sortable: true, width: '100px' },
  { key: 'parlamentar', label: 'Parlamentar', sortable: true },
  { key: 'valor', label: 'Valor', render: (v) => formatCurrency(v) },
];

<DataTable
  columns={columns}
  data={data}
  sortColumn="ano"
  sortOrder="asc"
  onSort={(col, order) => handleSort(col, order)}
  fixedHeader={true}
  maxHeight="600px"
  hoverable={true}
  striped={true}
/>
```

### Exemplo: Usar Pagination
```jsx
import { Pagination } from './components';

<Pagination
  currentPage={page}
  totalPages={totalPages}
  totalRecords={10000}
  recordsPerPage={500}
  onPageChange={(page) => setPage(page)}
/>
```

### Exemplo: Usar Button com variantes
```jsx
import { Button } from './components';

{/* Primário */}
<Button variant="primary" onClick={() => {}}>Ação Principal</Button>

{/* Secundário */}
<Button variant="secondary">Ação Normal</Button>

{/* Outline */}
<Button variant="outline">Ação Extra</Button>

{/* Danger */}
<Button variant="danger" onClick={() => handleDelete()}>Deletar</Button>

{/* Com ícone */}
<Button leftIcon={<TrashIcon />}>Deletar</Button>
```

---

## Mudanças Visuais Implementadas

### ✅ Concluído
1. **Design System** - Paleta de cores semântica, espaçamento, tipografia
2. **Componentes Reutilizáveis** - 12 componentes base criados
3. **Estrutura clara** - Componentes organizados em `src/components/`

### 🔄 Próximo: Refatoração do App.tsx
1. Substituir Header inline por componente Header.tsx
2. Usar PageHeader para títulos de seção
3. Usar ActionBar para organizar botões
4. Implementar DataTable modernizada
5. Usar Pagination componente

### 🎨 Melhorias Visuais
- **Hierarquia de cores** - Cores semânticas em vez de hardcoded
- **Espacementoconsistente** - Escala 4px em toda parte
- **Tipografia profissional** - Pesos e tamanhos definidos
- **Componentes reutilizáveis** - Menos duplicação de código
- **Melhor responsividade** - Layout mobile-first
- **Acessibilidade** - Classes ARIA, ordem de foco

---

## Classe CSS Utilitárias Disponíveis

```css
/* Texto */
.text-primary          /* Cor de texto primária */
.text-secondary        /* Cor de texto secundária */
.text-inverse          /* Texto em fundo escuro */
.text-brand            /* Texto em cor da marca */

/* Fundos */
.bg-surface-primary    /* Fundo escuro */
.bg-surface-secondary  /* Fundo cinza */
.bg-surface-tertiary   /* Fundo claro */

/* Espaçamento */
.gap-sm, .gap-md, .gap-lg     /* Gaps */
.p-md, .p-lg                   /* Padding */
.m-md, .m-lg                   /* Margin */

/* Tipografia */
.font-semibold, .font-bold    /* Pesos */
.font-size-sm, .font-size-lg  /* Tamanhos */

/* Efeitos */
.shadow-md, .shadow-lg        /* Sombras */
.rounded-md, .rounded-lg      /* Bordas */
.transition-normal            /* Transições */
```

---

## Próximas Fases

### Fase 4: Refatoração de Seções Específicas
- [ ] Refatorar Header usando Header.tsx
- [ ] Refatorar Filtros com FilterPanel.tsx
- [ ] Refatorar Tabela com DataTable.tsx
- [ ] Refatorar Paginação com Pagination.tsx
- [ ] Refatorar AdminPanel.tsx

### Fase 5: Otimizações Finais
- [ ] Melhorar responsividade mobile
- [ ] Adicionar temas (dark/light)
- [ ] Melhorar performance de renderização
- [ ] Testes de acessibilidade

---

## Guia de Migração

Para converter componentes antigos para novos:

### Antigo
```jsx
<button 
  onClick={() => setIsFilterOpen(!isFilterOpen)}
  className="px-3 py-1.5 text-xs font-medium rounded-lg"
  style={{backgroundColor: '#AE1E25', color: 'white'}}
>
  Filtros
</button>
```

### Novo
```jsx
import { Button } from './components';

<Button 
  variant="primary" 
  size="md"
  onClick={() => setIsFilterOpen(!isFilterOpen)}
>
  Filtros
</Button>
```

Benefícios:
- ✅ Menos CSS duplicado
- ✅ Mais fácil manutenção
- ✅ Consistência visual
- ✅ Melhor performance
