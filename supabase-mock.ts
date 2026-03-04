// Mock do Supabase para testar localmente sem conexão
// Simula as tabelas em memória

const usuariosMock = [
  {
    id: 1,
    email: 'afpereira@saude.sp.gov.br',
    nome: 'AF Pereira',
    role: 'admin',
    senha_hash: 'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb',
    ativo: true,
  },
];

// Dados de exemplo para formalização
const formalizacaoMock = [
  {
    id: 1,
    numero: 'FORM-2024-001',
    status: 'Em Análise',
    data_criacao: '2024-01-15',
    descricao: 'Formalização de apresentação de proposta',
    parlamentar: 'Dep. João Silva',
    conveniado: 'Prefeitura Municipal',
    objeto: 'Construção de Centro de Saúde',
    created_at: '2024-01-15T10:00:00Z',
    usuario_atribuido_id: null,
  },
  {
    id: 2,
    numero: 'FORM-2024-002',
    status: 'Aprovada',
    data_criacao: '2024-02-10',
    descricao: 'Formalização de convênio',
    parlamentar: 'Dep. Maria Santos',
    conveniado: 'Secretaria de Saúde',
    objeto: 'Aquisição de equipamentos médicos',
    created_at: '2024-02-10T14:30:00Z',
    usuario_atribuido_id: 1,
  },
  {
    id: 3,
    numero: 'FORM-2024-003',
    status: 'Pendente',
    data_criacao: '2024-03-01',
    descricao: 'Formalização de emenda parlamentar',
    parlamentar: 'Senador Pedro Costa',
    conveniado: 'Hospital Regional',
    objeto: 'Manutenção de infraestrutura',
    created_at: '2024-03-01T09:15:00Z',
    usuario_atribuido_id: null,
  },
];

// Mock do SDK Supabase
export function createClientMock() {
  return {
    from: (table: string) => ({
      select: (columns: string = "*", options?: any) => {
        return new Promise((resolve) => {
          let tableData: any[] = [];
          if (table === 'usuarios') tableData = usuariosMock;
          else if (table === 'formalizacao') tableData = formalizacaoMock;
          resolve({ data: tableData, error: null });
        });
      },
      
      // Para .ilike().single()
      ilike: (field: string, value: string) => ({
        single: () => {
          return new Promise((resolve) => {
            let tableData: any;
            if (table === 'usuarios') tableData = usuariosMock;
            else if (table === 'formalizacao') tableData = formalizacaoMock;
            else tableData = [];
            
            const record = tableData.find(u => 
              u[field as keyof typeof u]?.toString?.().toLowerCase() === value.toLowerCase()
            );
            
            if (!record) {
              resolve({
                data: null,
                error: { message: `${table} not found`, code: 'PGRST116', details: 'No rows found' }
              });
            } else {
              resolve({ data: record, error: null });
            }
          });
        }
      }),
      
      // Para .order().range()
      order: (orderField: string, opts?: any) => ({
        range: (start: number, end: number) => {
          return new Promise((resolve) => {
            let tableData: any[] = [];
            if (table === 'formalizacao') {
              tableData = formalizacaoMock.slice(start, end + 1);
            } else if (table === 'usuarios') {
              tableData = usuariosMock.slice(start, end + 1);
            }
            resolve({ data: tableData, error: null });
          });
        }
      }),
      
      eq: (field: string, value: any) => ({
        order: (orderField: string, opts?: any) => ({
          then: (onFulfilled: any) => {
            return new Promise((resolve) => {
              let tableData: any[] = [];
              if (table === 'usuarios') {
                tableData = usuariosMock.filter(u => u[field as keyof typeof u] === value);
              } else if (table === 'formalizacao') {
                tableData = formalizacaoMock.filter(u => u[field as keyof typeof u] === value);
              }
              if (opts?.ascending === false) tableData = tableData.reverse();
              resolve(onFulfilled({ data: tableData, error: null }));
            });
          }
        })
      }),
      
      count: () => ({
        then: (onFulfilled: any) => {
          return new Promise((resolve) => {
            let count = 0;
            if (table === 'formalizacao') count = formalizacaoMock.length;
            else if (table === 'usuarios') count = usuariosMock.length;
            resolve(onFulfilled({ count, error: null }));
          });
        }
      }),
    })
  };
}
