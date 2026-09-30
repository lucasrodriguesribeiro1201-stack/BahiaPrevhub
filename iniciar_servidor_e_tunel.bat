@echo off
title Bahia Prev Hub - Inicializador do Banco e Tunel
chcp 65001 >nul
cls

echo ========================================================
echo       BAHIA PREV HUB - BANCO DOCKER & CLOUDFLARE TUNNEL
echo ========================================================
echo.
echo [1/3] Verificando se os containers do Supabase estao rodando...
docker ps | findstr "supabase_db_Bahia_Prev_Hub" >nul
if %errorlevel% neq 0 (
    echo [!] Iniciando Supabase no Docker...
    call npx supabase start
) else (
    echo [OK] Supabase Docker ja esta ativo!
)

echo.
echo [2/3] Iniciando Cloudflare Tunnel na porta 54321...
start "Cloudflare Tunnel - Bahia Prev Hub" "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:54321

echo.
echo [3/3] Iniciando servidor do frontend (Vite)...
start "Bahia Prev Hub Web" cmd /k "npm run dev"

echo.
echo ========================================================
echo Tudo pronto! O banco e o tunel estao em execucao.
echo O endereco do tunel HTTPS foi aberto na janela do Cloudflare.
echo ========================================================
echo.
pause
