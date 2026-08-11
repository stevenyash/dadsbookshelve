# Set user role
$body = @{email='stevenmuriuki15@gmail.com';roleId=1} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8060/api/auth/set-role' -Method POST -Body $body -ContentType 'application/json'