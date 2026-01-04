# Script to restart the frontend docker container
# Useful when installing new packages or when port mappings change

Write-Host "Restarting docker container..."
docker compose down
docker compose up -d --build
Write-Host "Container restarted! You can access the app at http://localhost:5173"
