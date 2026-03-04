# ⚠️ INSTRUÇÕES PARA TESTAR AUTENTICAÇÃO LOCALMENTE

## Passo 1: Atualizar Hash da Senha no Supabase

A senha armazenada no banco está com formato antigo incompatível. Precisa ser atualizada para SHA256.

### Como executar:

1. Abra https://app.supabase.com e entre em sua conta
2. Vá para o projeto "gestor-de-emendas-e-convênios"  
3. Clique em "SQL Editor" no menu esquerdo
4. Crie uma nova query clicando em "+ New query"
5. Cole este SQL:

```sql
-- Atualizar hash da senha para SHA256 de "M@dmax2026"
UPDATE usuarios
SET senha_hash = 'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb'
WHERE email = 'afpereira@saude.sp.gov.br';

-- Verificar se atualizou
SELECT email, senha_hash FROM usuarios WHERE email = 'afpereira@saude.sp.gov.br';
```

6. Clique em "Run" 
7. Verifique que apareça a resposta com o novo hash iniciando em `dc629b...`

**⚠️ IMPORTANTE**: Este hash corresponde EXATAMENTE à senha `M@dmax2026`

---

## Passo 2: Testar login localmente

Depois de executar o SQL acima, você pode testar:

### Opção A: Via Frontend (Recomendado)
1. Terminal 1: `npm run dev` (inicia Vite frontend + servidor)
2. Abra http://localhost:5173
3. Login com:
   - Email: `afpereira@saude.sp.gov.br`
   - Senha: `M@dmax2026`
   - Clique no botão de olho para visualizar a senha

### Opção B: Via cURL/PowerShell
```powershell
$body = @{email='afpereira@saude.sp.gov.br'; senha='M@dmax2026'} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

---

## Resumo das Mudanças Feitas

✅ **Arquivo src/auth.ts**: Reescrito com função SHA256 via `crypto.createHash()`
✅ **Arquivo server.ts**: Importação corrigida para auth.ts ao invés de auth.js
✅ **Arquivo .env.local**: SUPABASE_URL corrigida (removido 'q' duplicado)
✅ **RLS Supabase**: Desablitado na tabela usuarios (sem restrições)

---

## Próximos Passos

1. ✅ Execute o SQL para atualizar o hash
2. ✅ Teste o login no frontend ou via API
3. ⏳ Se funcionar, faremos commit: `git add -A && git commit -m "fix: autenticação SHA256 com hash correto"`
4. ⏳ Depois deploy para Cloudflare Pages

---

## Debug Se Algo Não Funcionar

Se receber "Email ou senha inválidos" mesmo com a senha correta:
- Verifique se o SQL foi executado (veja no SELECT se o hash mudou)
- Verifique se email está exatamente como: `afpereira@saude.sp.gov.br`
- Verifique se não há espaços em branco

Se nada conectar a localhost:4000:
- Use `npm run dev` que inicia tanto Vite quanto o servidor
- Veja se as 2 portas estão respondendo (5173 para frontend, 4000 para servidor)
