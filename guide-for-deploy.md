# guide-for-deploy.md — AWS EC2 Deployment Guide
## Number Guess Game — Spring Boot REST API + MySQL

---

## 1. FILANALYS — Vad är rätt/fel

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `application.yaml` | ✅ Korrekt | Använder `${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}` med defaults för lokal dev |
| `application-prod.yaml` | ✅ Korrekt | `ddl-auto: validate`, `show-sql: false`, kräver env-variabler (inga defaults) |
| `pom.xml` | ✅ Korrekt | Spring Boot 3.5.11, Java 21, Lombok, MySQL connector, spring-boot-maven-plugin |
| `docker-compose.yaml` | ✅ Fixad | Port `127.0.0.1:3306:3306` (ej publik), `healthcheck`, `restart: unless-stopped` |
| `docker-compose.prod.yaml` | ✅ Ny | Kör app + MySQL i Docker på EC2 med intern DNS (`mysql`-hostname) |
| `Dockerfile` | ✅ Ny | Multi-stage: Maven build → JRE runtime (minimalt image) |
| `number-guess.service` | ✅ Ny | systemd-tjänst för auto-restart vid omstart |
| `start.sh` | ⚠️ Lokal | Hårdkodad macOS Java-sökväg — används BARA lokalt, inte på EC2 |
| `.env` | ✅ Korrekt | Pushas INTE till git (i .gitignore) |
| `.env.example` | ✅ Korrekt | Mall för produktionsvärden |

---

## 2. ARKITEKTUR — AWS Free Tier

```
Internet
    │
    ▼  port 8080
┌─────────────────────────────────┐
│  EC2 t2.micro (Amazon Linux 2023)│
│  ┌─────────────────────────────┐│
│  │  Spring Boot JAR (Java 21)  ││
│  │  port 8080                  ││
│  └──────────┬──────────────────┘│
│             │ localhost:3306     │
│  ┌──────────▼──────────────────┐│
│  │  MySQL 8.0 (Docker)         ││
│  │  port 3306 (intern)         ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Kostnad:** Gratis 12 månader med AWS Free Tier
- EC2 t2.micro: 750 h/mån gratis
- Storage (EBS): 30 GB gratis
- MySQL körs i Docker på EC2 (ingen RDS-kostnad)

---

## 3. RDS vs EC2 MySQL — Val

| Kriterium | EC2 MySQL (Docker) | AWS RDS |
|-----------|-------------------|---------|
| **Kostnad** | ✅ Helt gratis | ⚠️ Gratis 12 mån, sedan kostnad |
| **Setup** | ✅ Enkelt | ⚠️ Lite mer konfiguration |
| **Backups** | ❌ Manuellt | ✅ Automatiskt |
| **Skalbarhet** | ❌ Manuellt | ✅ Enklare |
| **Produktion** | ⚠️ Funkar för litet projekt | ✅ Rekommenderat för prod |

**Rekommendation:** EC2 MySQL i Docker för detta projekt (gratis + enkelt).

---

## 4. ALTERNATIV — Vilket ska du välja?

| Alternativ | Vad | Bäst för |
|-----------|-----|----------|
| **A — JAR direkt** | Java JAR + MySQL Docker | ✅ Enklast, rekommenderat |
| **B — Full Docker** | App + MySQL i docker-compose | Mer isolerat, bra lärandeprojekt |
| **C — EC2 + RDS** | JAR + Amazon RDS MySQL | Produktion med hanterad DB |

---

## 5. ALTERNATIV A — JAR direkt på EC2 (REKOMMENDERAT)

### Steg 1 — Starta EC2-instans i AWS Console

1. Gå till: **AWS Console → EC2 → Launch Instance**
2. Inställningar:
   - **Name:** `number-guess-server`
   - **AMI:** Amazon Linux 2023 (gratis)
   - **Instance type:** t2.micro (gratis)
   - **Key pair:** Skapa nytt → ladda ner `.pem`-fil → spara i `~/.ssh/`
3. **Security Group** — öppna dessa portar:

| Port | Protokoll | Källa | Syfte |
|------|-----------|-------|-------|
| 22 | TCP | Din IP | SSH |
| 8080 | TCP | 0.0.0.0/0 | Spring Boot API + Frontend |

> ⚠️ Port 3306 öppnas INTE — MySQL nås bara internt

4. Klicka **Launch Instance**
5. Spara EC2:s **Public IPv4 address**

---

### Steg 2 — Installera beroenden på EC2 (EN GÅNG)

```bash
# På din Mac — kopiera setup-scriptet
scp -i ~/.ssh/din-nyckel.pem ec2-setup.sh ec2-user@<EC2-IP>:~/

# SSH in
ssh -i ~/.ssh/din-nyckel.pem ec2-user@<EC2-IP>

# Kör setup (installerar Java 21 + Docker + Docker Compose)
bash ec2-setup.sh

# Logga ut och in igen för Docker-rättigheter
exit
ssh -i ~/.ssh/din-nyckel.pem ec2-user@<EC2-IP>
```

---

### Steg 3 — Skapa .env på EC2 (EN GÅNG)

```bash
# SSH in
ssh -i ~/.ssh/din-nyckel.pem ec2-user@<EC2-IP>

# Skapa app-mapp och .env
mkdir -p ~/app
nano ~/app/.env
```

Klistra in och fyll i riktiga lösenord (ändra `<...>`):

```dotenv
# Spring Boot databas-URL (localhost = MySQL i Docker på samma EC2)
DB_URL=jdbc:mysql://localhost:3306/numbergame?serverTimezone=UTC
DB_USERNAME=root
DB_PASSWORD=<starkt-lösenord-minst-12-tecken>

# MySQL Docker container
MYSQL_ROOT_PASSWORD=<samma-lösenord-som-ovan>
MYSQL_DATABASE=numbergame
```

> ⚠️ `DB_PASSWORD` och `MYSQL_ROOT_PASSWORD` MÅSTE vara samma värde

Spara: `Ctrl+O` → `Enter` → `Ctrl+X`

---

### Steg 4 — Bygg och deploya från din Mac

```bash
# På din Mac — gör scripts körbara (en gång)
chmod +x deploy.sh ec2-setup.sh ec2-start.sh

# Deploya
EC2_HOST=<EC2-IP> KEY_FILE=~/.ssh/din-nyckel.pem ./deploy.sh
```

`deploy.sh` gör automatiskt:
1. Bygger JAR med Maven (`./mvnw clean package -DskipTests`)
2. Kopierar JAR + `docker-compose.yaml` + `ec2-start.sh` till EC2 via SCP
3. SSH:ar in och kör `ec2-start.sh`
4. `ec2-start.sh` startar MySQL-container + Spring Boot med `SPRING_PROFILES_ACTIVE=prod`

---

### Steg 5 — Installera systemd för auto-restart

```bash
# Kopiera service-filen till EC2
scp -i ~/.ssh/din-nyckel.pem number-guess.service ec2-user@<EC2-IP>:~/

# SSH in och aktivera
ssh -i ~/.ssh/din-nyckel.pem ec2-user@<EC2-IP>

sudo cp ~/number-guess.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable number-guess
sudo systemctl start number-guess
sudo systemctl status number-guess
```

Nu startar appen automatiskt om EC2 startas om.

---

### Steg 6 — Verifiera att det fungerar

```bash
# Testa API:et
curl http://<EC2-IP>:8080/players

# Öppna frontend i webbläsaren
http://<EC2-IP>:8080

# Visa loggar live
ssh -i ~/.ssh/key.pem ec2-user@<EC2-IP> "tail -f ~/app/app.log"
```

---

## 6. ALTERNATIV B — Full Docker på EC2

### Steg 1–3 — Samma som Alternativ A

### Steg 4 — Bygg Docker-image lokalt

```bash
# På din Mac
docker build -t number-guess:latest .
```

### Steg 5 — Spara och kopiera image till EC2

```bash
# Spara image som tar-fil
docker save number-guess:latest | gzip > number-guess-image.tar.gz

# Kopiera till EC2
scp -i ~/.ssh/din-nyckel.pem number-guess-image.tar.gz docker-compose.prod.yaml ec2-user@<EC2-IP>:~/app/

# SSH in och ladda imagen
ssh -i ~/.ssh/din-nyckel.pem ec2-user@<EC2-IP>
cd ~/app
docker load < number-guess-image.tar.gz
```

### Steg 6 — Starta hela stacken

```bash
# På EC2 — skapa .env (se Steg 3 ovan)
# Starta med prod compose-filen
docker-compose -f docker-compose.prod.yaml --env-file .env up -d

# Kontrollera att allt körs
docker-compose -f docker-compose.prod.yaml ps
```

> **Obs:** I docker-compose.prod.yaml används `mysql` (service-namn) som hostname, inte `localhost`

---

## 7. ALTERNATIV C — EC2 + RDS MySQL (Bonus)

### Skapa RDS i AWS Console

1. **AWS Console → RDS → Create database**
2. Välj: `MySQL 8.0`, `Free tier template`, `db.t3.micro`
3. Spara: `Endpoint`, `port`, `username`, `password`, `databasnamn`
4. **Security Group på RDS:** Tillåt inkommande port 3306 från EC2:s Security Group

### Konfigurera .env på EC2

```dotenv
DB_URL=jdbc:mysql://<RDS-ENDPOINT>:3306/<DB-NAME>?serverTimezone=UTC
DB_USERNAME=<rds-admin>
DB_PASSWORD=<rds-lösenord>
```

> Behöver ej `MYSQL_ROOT_PASSWORD` eller `MYSQL_DATABASE` (ingen lokal MySQL)

---

## 8. FELSÖKNINGSKOMMANDON

### Applikation

```bash
# Visa loggar live
tail -f ~/app/app.log

# Visa sista 100 rader
tail -100 ~/app/app.log

# Kontrollera om appen lyssnar på port 8080
ss -tlnp | grep 8080

# Kontrollera process
ps aux | grep number-guess

# Starta om via systemd
sudo systemctl restart number-guess

# Visa systemd-status
sudo systemctl status number-guess
journalctl -u number-guess -n 50
```

### MySQL / Docker

```bash
# Kontrollera att containern körs
docker ps

# Loggar för MySQL-container
docker logs number-guess-db

# Anslut till MySQL
docker exec -it number-guess-db mysql -u root -p

# Visa tabeller i databasen
docker exec -it number-guess-db mysql -u root -p -e "SHOW TABLES;" numbergame

# Starta om MySQL-container
docker restart number-guess-db

# Starta om alla containers
docker-compose restart
```

### Nätverksproblem

```bash
# Testa API lokalt på EC2
curl -v http://localhost:8080/players

# Testa utifrån (på din Mac)
curl -v http://<EC2-IP>:8080/players

# Kontrollera säkerhetsgrupp (port 8080 öppen?)
# → AWS Console → EC2 → Security Groups → Inbound rules

# Kontrollera brandvägg på EC2
sudo iptables -L -n | grep 8080

# Testa MySQL-anslutning
nc -zv localhost 3306
```

### Spring Boot startar inte

```bash
# Vanliga orsaker:
# 1. DB_URL, DB_USERNAME, DB_PASSWORD saknas eller är felaktiga
cat ~/app/.env

# 2. MySQL inte klar ännu när appen startar
docker logs number-guess-db | tail -20

# 3. Port 8080 redan används
ss -tlnp | grep 8080
kill $(lsof -ti :8080 2>/dev/null) 2>/dev/null || true

# 4. Fel Java-version
java -version   # Ska visa 21

# 5. ddl-auto: validate hittar inte tabellerna
# Lösning: Kör appen EN GÅNG med ddl-auto: update i prod för att skapa tabeller,
# sedan byt tillbaka till validate
# ELLER: Skapa tabellerna manuellt via MySQL
```

---

## 9. ROLLBACK-PLAN

### Snabb rollback (föregående version)

```bash
# Spara den gamla JAR-filen INNAN deploy
ssh -i ~/.ssh/key.pem ec2-user@<EC2-IP> "cp ~/app/number-guess-0.0.1-SNAPSHOT.jar ~/app/number-guess-backup.jar"

# Om ny version kraschar — återställ
ssh -i ~/.ssh/key.pem ec2-user@<EC2-IP> << 'EOF'
  kill $(cat ~/app/app.pid) 2>/dev/null || true
  cp ~/app/number-guess-backup.jar ~/app/number-guess-0.0.1-SNAPSHOT.jar
  bash ~/app/ec2-start.sh
EOF
```

### Full rollback (återställ databas)

```bash
# Skapa backup INNAN deploy
docker exec number-guess-db mysqldump -u root -p<lösenord> numbergame > ~/backup-$(date +%Y%m%d).sql

# Återställ databas
docker exec -i number-guess-db mysql -u root -p<lösenord> numbergame < ~/backup-YYYYMMDD.sql
```

### Rollback checklist

```
1. [ ] Stoppa appen: kill $(cat ~/app/app.pid)
2. [ ] Kopiera backup-JAR: cp backup.jar number-guess-0.0.1-SNAPSHOT.jar
3. [ ] Återställ DB om schema ändrades (se ovan)
4. [ ] Starta om: bash ~/app/ec2-start.sh
5. [ ] Verifiera: curl http://localhost:8080/players
```

---

## 10. SNABB REFERENS — Alla kommandon

### Lokal Mac (varje deploy)

```bash
# Bygg JAR
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./mvnw clean package -DskipTests

# Deploya till EC2
EC2_HOST=<IP> KEY_FILE=~/.ssh/key.pem ./deploy.sh

# SSH in
ssh -i ~/.ssh/key.pem ec2-user@<EC2-IP>
```

### EC2 (daglig drift)

```bash
# Starta om appen
sudo systemctl restart number-guess

# Visa loggar
tail -f ~/app/app.log

# Kontrollera status
sudo systemctl status number-guess
docker ps

# Stoppa allt
sudo systemctl stop number-guess
docker-compose down
```

---

## 11. DEPLOY-CHECKLISTA

```
Före första deploy:
[ ] EC2 t2.micro lanserad (Amazon Linux 2023)
[ ] Security Group: port 22 (din IP) + port 8080 (0.0.0.0/0)
[ ] .pem-fil nedladdad och i ~/.ssh/ med rättigheter: chmod 400 key.pem
[ ] ec2-setup.sh kopierat och kört på EC2
[ ] ~/app/.env skapad på EC2 med riktiga värden
[ ] chmod +x deploy.sh ec2-setup.sh ec2-start.sh (på Mac)

Varje deploy:
[ ] EC2_HOST=<IP> KEY_FILE=~/.ssh/key.pem ./deploy.sh
[ ] curl http://<EC2-IP>:8080/players (verifiera)
[ ] tail -f ~/app/app.log (kontrollera inga fel)

Engångsinställning (auto-restart):
[ ] number-guess.service kopierat till /etc/systemd/system/
[ ] sudo systemctl enable number-guess
```

1. AWS Console: Starta EC2 t2.micro + Security Group (port 22 + 8080)
2. scp ec2-setup.sh → SSH → bash ec2-setup.sh
3. Skapa ~/app/.env på EC2 med lösenord
4. Lokalt: EC2_HOST=<IP> KEY_FILE=~/.ssh/key.pem ./deploy.sh
5. Engång: Kopiera number-guess.service → systemctl enable