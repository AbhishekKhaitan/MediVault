# MediVault — Node.js 20 Setup Script
# Run this once in PowerShell as Administrator

Write-Host "Checking for nvm-windows..." -ForegroundColor Cyan

if (Get-Command nvm -ErrorAction SilentlyContinue) {
    Write-Host "nvm found. Installing Node.js 20 LTS..." -ForegroundColor Green
    nvm install 20
    nvm use 20
    Write-Host ""
    Write-Host "Node version:" (node --version) -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready! Now run the app:" -ForegroundColor Cyan
    Write-Host "  npm start      <- scan QR with Expo Go on your phone"
    Write-Host "  npm run web    <- open in browser at localhost:8081"
} else {
    Write-Host ""
    Write-Host "nvm-windows is not installed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Step 1: Download and install nvm-windows from:" -ForegroundColor White
    Write-Host "  https://github.com/coreybutler/nvm-windows/releases/latest" -ForegroundColor Cyan
    Write-Host "  (download nvm-setup.exe and run it)" -ForegroundColor White
    Write-Host ""
    Write-Host "Step 2: Close this terminal, open a NEW one, then run:" -ForegroundColor White
    Write-Host "  nvm install 20" -ForegroundColor Cyan
    Write-Host "  nvm use 20" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Step 3: Then start the app:" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor Cyan
    Start-Process "https://github.com/coreybutler/nvm-windows/releases/latest"
}
