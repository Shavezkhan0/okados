@echo off
REM ============================================
REM OKADOS BACKEND API - WINDOWS cURL COMMANDS
REM ============================================

set BASE_URL=http://localhost:5000/api/v1

echo.
echo =======================================
echo OKADOS API TESTING
echo =======================================
echo.

echo [1] Testing Health Check...
curl -s %BASE_URL%/health
echo.

echo [2] Register User...
curl -s -X POST %BASE_URL%/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test%RANDOM%@test.com\",\"phone\":\"+1234567890\",\"password\":\"test123456\"}"
echo.

echo [3] Login...
curl -s -X POST %BASE_URL%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test123456\"}"
echo.

echo [4] Get All Restaurants...
curl -s %BASE_URL%/restaurants
echo.

echo [5] Get Nearby Restaurants...
curl -s "%BASE_URL%/restaurants/nearby?lat=40.7128&lng=-74.006"
echo.

echo [6] Get Product Categories...
curl -s %BASE_URL%/products/categories
echo.

echo [7] Search Products...
curl -s "%BASE_URL%/products/search?q=burger"
echo.

echo [8] Get Payment Methods...
curl -s %BASE_URL%/payments/methods
echo.

echo =======================================
echo TEST COMPLETE
echo =======================================
pause
