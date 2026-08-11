$body = @{email='stevenmuriuki15@gmail.com';newPassword='Steve@2019'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/reset-password' -Method POST -Body $body -ContentType 'application/json' | Out-Null

$body = @{user_role_id=1} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8060/api/users/edit/3' -Method POST -Body $body -ContentType 'application/json'