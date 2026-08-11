# Check user roles and permissions
Write-Host "=== User 3 Details ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri 'http://localhost:8060/api/users/view/3' | ConvertTo-Json

Write-Host "`n=== All Roles ===" -ForegroundColor Cyan  
Invoke-RestMethod -Uri 'http://localhost:8060/api/roles/index' | ConvertTo-Json

Write-Host "`n=== User Login and Check Permissions ===" -ForegroundColor Cyan
$body = @{username='stevenmuriuki15@gmail.com';password='Steve@2019'} | ConvertTo-Json
$resp = Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.data.token
Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/me' -Method GET -Headers @{'Authorization'="Bearer $token"} | ConvertTo-Json -Depth 5