@echo off
REM Instala o azul-agent como tarefa agendada que inicia com o login do Windows
SET SCRIPT=%~dp0azul-agent.py
SET TASK=AzulSyncAgent

schtasks /delete /tn %TASK% /f >nul 2>&1
schtasks /create /tn %TASK% /tr "python \"%SCRIPT%\"" /sc onlogon /rl highest /f

echo.
echo [OK] Agente instalado como tarefa "%TASK%"
echo      Inicia automaticamente no proximo login.
echo.
echo Para iniciar agora:
echo   python "%SCRIPT%"
echo.
pause
