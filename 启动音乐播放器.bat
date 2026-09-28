@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0" || goto :failed

set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE_EXE (
  echo 未找到 Node.js。请先安装 Node.js 22，再重新双击此文件。
  goto :failed
)
for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"

if not exist "node_modules\vite\bin\vite.js" call :install || goto :failed

"%NODE_EXE%" scripts\patch-rolling-number.mjs || goto :failed
echo 音乐播放器正在启动。关闭本窗口即可停止服务。
"%NODE_EXE%" node_modules\vite\bin\vite.js --host 127.0.0.1 --open
if errorlevel 1 goto :failed
exit /b 0

:install
set "NPM_CMD="
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"
if not defined NPM_CMD (
  echo 未找到 npm，无法安装项目依赖。请安装完整版 Node.js 22。
  exit /b 1
)
echo 首次启动，正在安装项目依赖...
call "%NPM_CMD%" ci
exit /b %errorlevel%

:failed
echo 启动失败。请查看上方错误信息。
pause
exit /b 1
