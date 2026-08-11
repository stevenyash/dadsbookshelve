$body = @{username='stevenmuriuki15@gmail.com';password='Steve@2019'} | ConvertTo-Json
$resp = Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.data.token
Write-Host "Token: $token"
$me = Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/me' -Method GET -Headers @{'Authorization'="Bearer $token"}
$me | ConvertTo-Json -Depth 5