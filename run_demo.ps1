# Start ml-service + gateway for local demo (run from robit/)
Start-Process -NoNewWindow python -ArgumentList "-m","uvicorn","app:app","--port","8000" -WorkingDirectory "$PSScriptRoot\ml-service"
Start-Sleep -Seconds 5
Start-Process -NoNewWindow node -ArgumentList "server.js" -WorkingDirectory "$PSScriptRoot\gateway"
Start-Sleep -Seconds 3
python "$PSScriptRoot\stream-simulator\replay.py" --scenario demo_golden_hour --speed 20
Write-Host "Dashboard: open frontend/index.html (gateway http://localhost:3000)"
