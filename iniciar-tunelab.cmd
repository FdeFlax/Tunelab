@echo off
title Iniciar Tunelab
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar-tunelab.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Tunelab. Revisa los mensajes anteriores.
  pause
  exit /b 1
)
exit /b 0
