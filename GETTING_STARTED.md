# 🚀 Como Começar a Usar os Novos Componentes

## 1️⃣ Instalação / Setup

Tudo já está instalado! Os componentes estão prontos em:
```
src/components/
├── Button.tsx
├── Header.tsx
├── PageHeader.tsx
├── ...e mais 10 componentes
```

## 2️⃣ Importar Componentes

### Opção A: Import individual
```jsx
import { Button } from './components';
import { Header } from './components';
import { DataTable } from './components';
```

### Opção B: Import do index (recomendado)
```jsx
import {
  Button,
  Header,
  DataTable,
  Pagination,
  Badge,
  Modal,
  etc...
} from './components';
```

---

## 3️⃣ Substituições Práticas

### Projeto: Refatorar o Header do App.tsx

#### Passo 1: Identify o header antigo
Localize em `App.tsx` (linha ~1600):
```jsx
// ❌ ANTIGO - Header inline
<header className="bg-black border-b-2 border-black sticky top-0 z-30 shadow-lg">
  <div className="px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      <div className="flex items-center gap-3">
        <img src={logo1Img} alt="Logo" className="h-10 object-contain" />
        <h1 className="text-xl font-bold text-white">
          Controle Formalização CGOF-GGCON
        </h1>
      </div>
      {/* ... navegação e user menu ... */}
    </div>
  </div>
</header>
```

#### Passo 2: Preparar dados para novo Header
```jsx
// Adicionar no topo do component
import { Header, HeaderUser } from './components';

//... dentro do component
const headerUser: HeaderUser = user ? {
  nome: user.nome,
  role: user.role as 'admin' | 'intermediario' | 'usuario',
  email: user.email
} : undefined;

const navItems = [
  {
    label: 'Formalização',
    isActive: activeTab === 'formalizacao',
    onClick: () => setActiveTab('formalizacao'),
    icon: <FileText className="w-4 h-4" />
  },
  {
    label: 'Emendas',
    isActive: activeTab === 'emendas',
    onClick: () => setActiveTab('emendas'),
    icon: <DollarSign className="w-4 h-4" />,
    hidden: user?.role === 'usuario'
  },
  {
    label: 'Dashboard',
    isActive: activeTab === 'admin',
    onClick: () => setActiveTab('admin'),
    icon: <BarChart3 className="w-4 h-4" />,
    hidden: user?.role !== 'admin'
  }
].filter(item => !item.hidden);
```

#### Passo 3: Substituir por novo Header
```jsx
// ✅ NOVO - Component Header
<Header
  logo={logo1Img}
  title="Controle Formalização CGOF-GGCON"
  user={headerUser}
  onLogout={logout}
  navItems={navItems}
  rightContent={
    <div className="hidden md:flex items-center gap-2">
      {cacheStatus && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold`}>
          {/* ... cache status ... */}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Upload className="w-4 h-4" />}
        onClick={() => setIsImportOpen(true)}
      >
        Importar CSV
      </Button>
    </div>
  }
/>
```

---

### Projeto: Refatorar Botões

#### ❌ Antes
```jsx
<button
  onClick={() => setIsFilterOpen(!isFilterOpen)}
  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2"
  style={isFilterOpen ? {backgroundColor: '#AE1E25', color: 'white'} : {}}
  onMouseEnter={(e) => !isFilterOpen && (e.currentTarget.style.backgroundColor = '#AE1E25')}
  onMouseLeave={(e) => !isFilterOpen && (e.currentTarget.style.backgroundColor = 'white')}
>
  <Filter className="w-4 h-4" />
  Filtros
</button>
```

#### ✅ Depois
```jsx
import { Button } from './components';

<Button
  variant={isFilterOpen ? "primary" : "secondary"}
  size="sm"
  leftIcon={<Filter className="w-4 h-4" />}
  onClick={() => setIsFilterOpen(!isFilterOpen)}
>
  Filtros
</Button>
```

---

### Projeto: Refatorar Tabela

#### ❌ Antes
```jsx
// Custom table render com muita lógica inline
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        {/* ... 30+ colunas com lógica duplicada ... */}
      </tr>
    </thead>
    <tbody>
      {/* ... loops complexos para renderizar dados ... */}
    </tbody>
  </table>
</div>
```

#### ✅ Depois
```jsx
import { FormalizacaoDataTable } from './components';

<FormalizacaoDataTable
  data={formalizacoesPaginadas}
  visibleColumns={visibleColumns}
  sortColumn={sortColumn}
  sortOrder={sortOrder}
  onSort={(col, order) => {
    setSortColumn(col);
    setSortOrder(order);
  }}
  selectedRows={selectedRows}
  onRowSelect={(id, selected) => {
    const newRows = new Set(selectedRows);
    if (selected) newRows.add(id);
    else newRows.delete(id);
    setSelectedRows(newRows);
  }}
  onRowClick={(row) => setSelectedFormalizacao(row)}
  isDragging={isDraggingScroll}
  tableContainerRef={tableContainerRef}
  onMouseDown={handleTableMouseDown}
  onMouseMove={handleTableMouseMove}
  onMouseUp={handleTableMouseUp}
  onMouseLeave={handleTableMouseLeave}
/>
```

---

## 4️⃣ Timeline Recomendada

### Week 1: Foundation
- [ ] Day 1: Entender design system (DESIGN_SYSTEM.md)
- [ ] Day 2-3: Substituir Header
- [ ] Day 4-5: Substituir Botões (top 10 first)

### Week 2: Core Components
- [ ] Day 1-2: Substituir DataTable
- [ ] Day 3: Substituir Pagination
- [ ] Day 4-5: Substituir Filtros

### Week 3: Polish
- [ ] Day 1-2: Refatorar AdminPanel.tsx
- [ ] Day 3: Refatorar UserManagementPanel.tsx
- [ ] Day 4-5: Testing e ajustes

### Week 4: Deploy
- [ ] Day 1-2: QA final
- [ ] Day 3: Documentação
- [ ] Day 4-5: Deploy e monitoring

---

## 5️⃣ Checklist de Validação

Após cada substituição:

- [ ] Funcionalidade preservada (nenhuma regra de negócio quebrada)
- [ ] Visual correto (matches design system)
- [ ] Responsividade funciona (mobile, tablet, desktop)
- [ ] Acessibilidade OK (keyboard, contrast)
- [ ] Performance OK (sem lag ou reflows)
- [ ] Testes passam (todas as funcionalidades)
- [ ] Code review feito

---

## 6️⃣ Troubleshooting

### Problema: Componente não renderiza
**Solução:** Cheque imports
```jsx
// ❌ Errado
import Button from './components/Button';

// ✅ Correto
import { Button } from './components';
```

### Problema: Estilos não aplicados
**Solução:** Certifique-se que index.css está importando design tokens
```css
@import "./styles/designTokens.css";
```

### Problema: TypeScript errors
**Solução:** Use tipos corretamente
```jsx
// ✅ Com tipos
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  // ...
}
```

### Problema: Tailwind classes não funcionam
**Solução:** Rebuild tailwind
```bash
npm run build  # ou yarn build
```

---

## 7️⃣ Recursos Úteis

- **DESIGN_SYSTEM.md** - Documentação completa dos tokens
- **VISUAL_IMPROVEMENTS.md** - Guia visual antes/depois
- **src/components/** - Sourcecode de todos os componentes
- **tailwind.config.js** - Configuração dos tokens

---

## 8️⃣ Próximas Fases

Após refatoration estar 100%, considere:

### Fase 5: Dark Mode
```jsx
// themes/colors.ts
export const lightTheme = { primary: '#AE1E25', ... };
export const darkTheme = { primary: '#FF6B6B', ... };
```

### Fase 6: Animations
```jsx
// components/AnimatedButton.tsx
export function AnimatedButton({ ... }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      {children}
    </motion.button>
  );
}
```

### Fase 7: Storybook
```bash
npx storybook@latest init
```

---

## 🎯 Objetivo Final

✅ Interface moderna  
✅ Código limpo (85% menos CSS)  
✅ 13 componentes reutilizáveis  
✅ Design system forte  
✅ Fácil manutenção  
✅ Pronto para evolução  

**Estimado:** 2-3 semanas para refatoração completa

---

## 💬 Dúvidas?

Consulte:
1. DESIGN_SYSTEM.md
2. REFACTORING_SUMMARY.md
3. Sourcecode de componentes
4. Tailwind docs: https://tailwindcss.com/

**Happy refactoring!** 🚀
