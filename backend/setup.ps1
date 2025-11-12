# WhatsApp SaaS Platform - Setup Script

Write-Host "🚀 WhatsApp SaaS Platform - Initial Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Edit .env and add your DATABASE_URL and other credentials!" -ForegroundColor Red
    Write-Host ""
}

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Generate Prisma Client
Write-Host "`n🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "1. Edit .env file and configure:" -ForegroundColor White
Write-Host "   - DATABASE_URL (PostgreSQL connection string)" -ForegroundColor Gray
Write-Host "   - REDIS_URL (Redis connection string)" -ForegroundColor Gray
Write-Host "   - JWT_SECRET (random secret key)" -ForegroundColor Gray
Write-Host "   - ENCRYPTION_KEY (32+ character key)" -ForegroundColor Gray
Write-Host "   - WEBHOOK_VERIFY_TOKEN (from Meta Developer Console)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Setup database:" -ForegroundColor White
Write-Host "   npm run db:push" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Start development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Start worker (in another terminal):" -ForegroundColor White
Write-Host "   npm run worker:dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Read docs/SETUP.md for detailed instructions" -ForegroundColor Cyan
