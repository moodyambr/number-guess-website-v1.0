#!/bin/bash
# ec2-start.sh - Start/restart the app on EC2
# Called automatically by deploy.sh
set -e
cd ~/app
if [ ! -f .env ]; then
  echo "ERROR: ~/app/.env not found. Create it first (see .env.example)."
  exit 1
fi
set -a
source .env
set +a
# Stop old Spring Boot process
if [ -f app.pid ]; then
  OLD=$(cat app.pid)
  if kill -0 "$OLD" 2>/dev/null; then
    echo "Stopping old process (PID $OLD)..."
    kill "$OLD" 2>/dev/null || true
    sleep 3
  fi
  rm -f app.pid
fi
# Start MySQL
echo "Starting MySQL..."
docker-compose up -d
echo "Waiting for MySQL (max 30s)..."
for i in $(seq 1 30); do
  docker exec number-guess-db mysqladmin ping -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null && break
  sleep 1
done
echo "MySQL ready"
# Start Spring Boot
echo "Starting Spring Boot with prod profile..."
export SPRING_PROFILES_ACTIVE=prod
nohup java -jar number-guess-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
echo $! > app.pid
echo "=== App is running on port 8080 ==="
echo "Logs:  tail -f ~/app/app.log"
echo "Stop:  kill $(cat ~/app/app.pid)"
