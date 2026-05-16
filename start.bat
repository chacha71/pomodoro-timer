@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 🍅 番茄钟启动中...
npx electron .
pause
