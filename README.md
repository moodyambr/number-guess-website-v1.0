# Number Guess Game API

## Syfte med projektet

**Number Guess** är ett REST API för ett gissningsspel där spelare försöker gissa ett hemligt nummer mellan 1-5. 

Applikationen hanterar:
- **Spelare** - Skapa och hantera användare (ingen admin)
- **Spel** - Starta nya spel med ett slumpmässigt hemligt nummer
- **Gissningar** - Registrera gissningar och få svar (för högt, för lågt, eller rätt)

## Mappstruktur

```
number-guess/
├── .env                          ← lokala credentials (pushas ej)
├── .env.example                  ← mall för credentials
├── .gitignore
├── docker-compose.yaml
├── pom.xml
├── mvnw / mvnw.cmd
└── src/
    └── main/
        ├── java/edu/mu25/number_guess/
        │   ├── Application.java
        │   ├── controller/
        │   │   ├── PlayerController.java
        │   │   ├── GameController.java
        │   │   ├── GuessController.java
        │   │   └── GlobalExceptionHandler.java
        │   ├── service/
        │   │   ├── PlayerService.java
        │   │   ├── GameService.java
        │   │   └── GuessService.java
        │   ├── repository/
        │   │   ├── PlayerRepository.java
        │   │   ├── GameRepository.java
        │   │   └── GuessRepository.java
        │   ├── entity/
        │   │   ├── Player.java
        │   │   ├── Game.java
        │   │   └── Guess.java
        │   ├── dto/
        │   │   ├── CreatePlayerRequestDto.java
        │   │   ├── PlayerResponseDto.java
        │   │   ├── CreateGameRequestDto.java
        │   │   ├── GameResponseDto.java
        │   │   ├── CreateGuessRequestDto.java
        │   │   └── GuessResponseDto.java
        │   ├── mapper/
        │   │   └── Mapper.java
        │   └── enums/
        │       ├── GameStatus.java
        │       └── GuessResult.java
        └── resources/
            ├── application.yaml
            └── static/              ← Frontend
                ├── index.html
                ├── style.css
                └── script.js
```



## CRUD Endpoints

### Player Endpoints

| Metod    | URL              | Beskrivning                      |
|----------|------------------|----------------------------------|
| `POST`   | `/players`       | Skapa en ny spelare              |
| `GET`    | `/players/{id}`  | Hämta en spelare via ID          |
| `PUT`    | `/players/{id}`  | Uppdatera en spelares uppgifter  |
| `DELETE` | `/players/{id}`  | Ta bort en spelare               |

### Game Endpoints

| Metod    | URL            | Beskrivning                         |
|----------|----------------|-------------------------------------|
| `POST`   | `/games`       | Starta ett nytt spel för en spelare |
| `GET`    | `/games/{id}`  | Hämta ett spel via ID               |
| `DELETE` | `/games/{id}`  | Ta bort ett spel                    |

### Guess Endpoints

| Metod    | URL              | Beskrivning                       |
|----------|------------------|-----------------------------------|
| `POST`   | `/guesses`       | Gör en gissning i ett aktivt spel |
| `GET`    | `/guesses/{id}`  | Hämta en gissning via ID          |
| `DELETE` | `/guesses/{id}`  | Ta bort en gissning               |

---

## Hur fungerar flera gissningar?

**Ja, en spelare kan gissa flera gånger!** Så här fungerar det:

1. **Obegränsade gissningar** - Det finns ingen gräns för hur många gissningar en spelare kan göra i ett spel
2. **Feedback efter varje gissning** - Spelaren får ett av tre resultat:
   - `LOW` - Gissningen var för låg
   - `HIGH` - Gissningen var för hög  
   - `CORRECT` - Rätt svar!
3. **Spelet avslutas vid rätt svar** - När spelaren gissar rätt ändras spelets status från `ACTIVE` till `FINISHED`
4. **Kan inte gissa på avslutat spel** - Om man försöker gissa på ett spel som är `FINISHED` får man felmeddelandet: *"Game is already finished"*

### Exempel på spelflöde

```
Hemligt nummer: 3

Gissning 1: 5 → HIGH (för högt)
Gissning 2: 1 → LOW (för lågt)
Gissning 3: 3 → CORRECT (rätt!) → Spelet avslutas
Gissning 4: 2 → FEL: "Game is already finished"
```

---

## Testning i Insomnia

### Förutsättningar

1. Starta MySQL-databasen:
   ```bash
   docker compose up -d
   ```

2. Starta applikationen:
   ```bash
   ./mvnw spring-boot:run
   ```

API:et körs på `http://localhost:8080`

---

### 1. Skapa en spelare

**POST** `http://localhost:8080/players`

**Request Body:**
```json
{
  "username": "Anna"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "Anna",
  "createdAt": "2026-03-24T10:00:00.000+00:00"
}
```

---

### 2. Hämta en spelare

**GET** `http://localhost:8080/players/1`

**Response:**
```json
{
  "id": 1,
  "username": "Anna",
  "createdAt": "2026-03-24T10:00:00.000+00:00"
}
```

---

### 3. Uppdatera en spelare

**PUT** `http://localhost:8080/players/1`

**Request Body:**
```json
{
  "username": "Anna S"
}
```

---

### 4. Ta bort en spelare

**DELETE** `http://localhost:8080/players/1`

**Response:** `204 No Content`

---

### 5. Starta ett nytt spel

**POST** `http://localhost:8080/games`

**Request Body:**
```json
{
  "playerId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "playerId": 1,
  "status": "ACTIVE"
}
```

---

### 6. Hämta ett spel

**GET** `http://localhost:8080/games/1`

**Response:**
```json
{
  "id": 1,
  "playerId": 1,
  "status": "ACTIVE"
}
```

---

### 7. Gör en gissning

**POST** `http://localhost:8080/guesses`

**Request Body:**
```json
{
  "gameId": 1,
  "guessedNumber": 2
}
```

**Response (för lågt):**
```json
{
  "id": 1,
  "gameId": 1,
  "guessedNumber": 2,
  "result": "LOW"
}
```

**Response (för högt):**
```json
{
  "id": 2,
  "gameId": 1,
  "guessedNumber": 5,
  "result": "HIGH"
}
```

**Response (rätt gissning):**
```json
{
  "id": 3,
  "gameId": 1,
  "guessedNumber": 3,
  "result": "CORRECT"
}
```

---

### 8. Hämta en gissning

**GET** `http://localhost:8080/guesses/1`

**Response:**
```json
{
  "id": 1,
  "gameId": 1,
  "guessedNumber": 2,
  "result": "LOW"
}
```

---

## Spelflöde - Exempel

1. **Skapa spelare:** `POST /players` → Får `playerId: 1`
2. **Starta spel:** `POST /games` med `playerId: 1` → Får `gameId: 1`
3. **Gissa:** `POST /guesses` med `gameId: 1, guessedNumber: 2`
4. **Läs resultat:** `LOW` (för lågt), `HIGH` (för högt), eller `CORRECT`
5. **Fortsätt gissa** tills du får `CORRECT`

---

## SQL Queries att komma ihåg

### Se vilken player som gjort vilken guess

```sql
SELECT 
    player.username,
    guess.guessed_number,
    guess.result,
    guess.created_at
FROM guess
JOIN game ON guess.game_id = game.id
JOIN player ON game.player_id = player.id;
```

**Resultat:**

| username | guessed_number | result | created_at          |
|----------|----------------|--------|---------------------|
| Gunnar   | 22             | LOW    | 2026-03-18 22:43:29 |

### Visar med game_id

```sql
SELECT 
    player.username,
    game.id AS game_id,
    guess.guessed_number,
    guess.result
FROM guess
JOIN game ON guess.game_id = game.id
JOIN player ON game.player_id = player.id;
```

### Visa ALLA players (även de utan guesses) - LEFT JOIN

```sql
SELECT 
    player.username,
    guess.guessed_number
FROM player
LEFT JOIN game ON player.id = game.player_id
LEFT JOIN guess ON game.id = guess.game_id;
```



### Spel historik för alla spelare

```sql
SELECT 
    player.id         AS player_id,
    player.username,
    game.id           AS game_id,
    game.status       AS game_status,
    guess.id          AS guess_id,
    guess.guessed_number,
    guess.result      AS guess_result
FROM player
LEFT JOIN game  ON player.id   = game.player_id
LEFT JOIN guess ON game.id     = guess.game_id
ORDER BY player.id, game.id, guess.id;
```