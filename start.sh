#!/usr/bin/env zsh
# ═══════════════════════════════════════════════
#  start.sh — Startar Number Guess Game
#  Kör med:  ./start.sh
# ═══════════════════════════════════════════════

set -e
cd "$(dirname "$0")"

JAVA21="/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home"
export JAVA_HOME="$JAVA21"
export PATH="$JAVA_HOME/bin:$PATH"

echo ""
echo "🎲 Number Guess Game — Starter"
echo "══════════════════════════════"

# ── 1. Kolla Java ──
echo "▶ Java version: $(java -version 2>&1 | head -1)"

# ── 2. Starta Docker om det inte körs ──
if ! docker info &>/dev/null; then
  echo "▶ Startar Docker..."
  open -a Docker
  echo "   Väntar på Docker (max 30s)..."
  for i in $(seq 1 30); do
    docker info &>/dev/null && break
    sleep 1
  done
fi
echo "✅ Docker körs"

# ── 3. Starta MySQL-container ──
if ! docker ps --format '{{.Names}}' | grep -q "number-guess-db"; then
  echo "▶ Startar MySQL-container..."
  docker compose up -d
  echo "   Väntar på MySQL (max 20s)..."
  for i in $(seq 1 20); do
    docker exec number-guess-db mysqladmin ping -ppassword --silent 2>/dev/null && break
    sleep 1
  done
fi
echo "✅ MySQL körs"

# ── 4. Döda eventuell gammal process på port 8080 ──
OLD_PID=$(lsof -ti :8080 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
  echo "▶ Stoppar gammal process på port 8080 (PID $OLD_PID)..."
  kill $OLD_PID 2>/dev/null || true
  sleep 2
fi

# ── 5. Bygga och starta Spring Boot ──
echo "▶ Bygger projektet..."
./mvnw package -DskipTests -q

echo "▶ Startar appen..."
echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Öppna http://localhost:8080 i webbläsaren"
echo "══════════════════════════════════════════════"
echo ""

java -jar target/number-guess-0.0.1-SNAPSHOT.jar

