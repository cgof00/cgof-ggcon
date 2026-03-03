# Script PowerShell para testar servidor
# Execute no terminal: .\test-server.ps1

Write-Host "🔍 Testando conexão com servidor..." -ForegroundColor Cyan
Write-Host ""

# Teste 1: Health check
Write-Host "1️⃣  Testando GET http://localhost:4000/api/usuarios (sem token)..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "http://localhost:4000/api/usuarios" -Method GET -ErrorAction Stop
  Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2️⃣  Se o servidor está rodando, tente:" -ForegroundColor Yellow
Write-Host "   - Abra http://localhost:5173 no navegador" -ForegroundColor Cyan
Write-Host "   - Abra DevTools (F12)" -ForegroundColor Cyan
Write-Host "   - Console tab" -ForegroundColor Cyan
Write-Host "   - Tente criar um usuário" -ForegroundColor Cyan
Write-Host "   - Compartilhe os logs que aparecerem" -ForegroundColor Cyan
