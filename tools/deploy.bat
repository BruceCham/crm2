@echo off
set cwd=%cd%
set module=%1
set mode=%2
set env=%3
set dist=%4
set msg=%5

if "%1"=="" goto usage
if "%1"=="/?" goto usage
if "%1"=="help" goto usage

PUSHD %cwd%
echo svn cleanup...
svn cleanup %cwd%

echo svn revert...
svn revert %cwd% -R --depth infinity

echo svn up...
svn up %cwd%
call npm run build-%mode%

PUSHD %env%
echo svn cleanup...
svn cleanup %env%

echo svn revert...
svn revert %env% -R --depth infinity

echo svn up...
svn up %env% --username dhp --password dhp

:copy
if "%mode%"=="product" set dest=%env%\%dist%\%module%-dist
if "%mode%"=="development" set dest=%env%\%dist%\%module%

XCOPY /E /C /F /I /R /Y %cwd%\%module%-dist %dest%
svn add %dest% --force --auto-props --parents --depth infinity
svn ci %dest% -m %msg% --username dhp --password dhp
goto end


:usage
echo npm run deploy --mode=product --env=sde
echo npm run deploy --mode=development --env=sde

:end
::pause & exit 0