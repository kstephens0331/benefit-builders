@echo off
REM Script to initialize and seed the Supabase database (Windows)
REM This script applies the schema and seed data to your Supabase instance

echo.
echo Setting up Benefits Builder database...
echo.

REM Check if SUPABASE_DB_URL is set
if "%SUPABASE_DB_URL%"=="" (
  echo WARNING: SUPABASE_DB_URL not set!
  echo Please provide your Supabase PostgreSQL connection string.
  echo You can find this in your Supabase dashboard under Settings ^> Database
  echo.
  echo Example:
  echo   set SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres
  echo.
  pause
  exit /b 1
)

echo Applying schema...
psql "%SUPABASE_DB_URL%" -f schema.sql
if errorlevel 1 goto error

echo Seeding plan models...
psql "%SUPABASE_DB_URL%" -f seed/001_plan_models.sql
if errorlevel 1 goto error

echo Seeding federal tax parameters...
psql "%SUPABASE_DB_URL%" -f seed/002_federal_tax_2025.sql
if errorlevel 1 goto error

echo Seeding withholding tables...
psql "%SUPABASE_DB_URL%" -f seed/003_withholding_federal_15t_2025.sql
if errorlevel 1 goto error

echo Seeding state tax parameters...
psql "%SUPABASE_DB_URL%" -f seed/004_state_tax_sample.sql
if errorlevel 1 goto error

echo.
echo ============================================
echo Database setup complete!
echo ============================================
echo.
echo Next steps:
echo 1. Run the application: cd apps\web ^&^& npm run dev
echo 2. Visit http://localhost:3002
echo 3. Add companies and employees through the UI
echo 4. Configure additional state tax parameters at /admin/tax
echo.
pause
exit /b 0

:error
echo.
echo ERROR: Database setup failed!
echo Please check the error messages above.
echo.
pause
exit /b 1
