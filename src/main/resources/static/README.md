# 🎲 Number Guess Game — Frontend

Enkel frontend byggd med **HTML, CSS och Vanilla JavaScript** som kommunicerar med Spring Boot REST API.

---

## 📁 Struktur

```
static/
├── index.html   
├── style.css    
└── script.js    
```

---

##  Funktioner

### Flikar
| Flik | Innehåll |
|---|---|
| 🎮 **Spela** | Skapa spelare → starta spel → gissa → visa historik |
| 👤 **Spelare** | Hämta, uppdatera och ta bort spelare |
| 🎯 **Spel** | Hämta och ta bort spel |
| 🔍 **Gissningar** | Hämta och ta bort enskilda gissningar |

### Spelflöde (Spela-fliken)
1. Ange användarnamn → **Skapa spelare**
2. **Starta spel** (genererar hemligt tal 1–5)
3. Ange ett tal → **Gissa** → får svar: `LOW / HIGH / CORRECT`
4. Gissningshistorik uppdateras automatiskt efter varje gissning
5. 🎉 Konfetti-animation vid rätt svar

---

## 🎨 Design

- **Dark mode** (standard) — djup glassmorphism med lila/rosa aurora-blobs
- **Light mode** — lavenderbakgrund med frostat glas
- Toggle-knapp i headern — valet sparas i `localStorage`
- Responsiv layout för mobil

---

##  API-anrop

Alla anrop går mot `localhost:8080` (Spring Boot).

| Metod | Endpoint | Används i |
|---|---|---|
| `POST` | `/players` | Skapa spelare |
| `GET` | `/players/:id` | Hämta spelare |
| `PUT` | `/players/:id` | Uppdatera spelare |
| `DELETE` | `/players/:id` | Ta bort spelare |
| `POST` | `/games` | Starta spel |
| `GET` | `/games/:id` | Hämta spel |
| `DELETE` | `/games/:id` | Ta bort spel |
| `POST` | `/guesses` | Skicka gissning |
| `GET` | `/guesses/:id` | Hämta gissning |
| `GET` | `/guesses/game/:gameId` | Alla gissningar för ett spel |
| `DELETE` | `/guesses/:id` | Ta bort gissning |

---

## ▶️ Starta

Frontenden serveras automatiskt av Spring Boot — starta bara backend:

```bash
./mvnw spring-boot:run
```

Öppna sedan: [http://localhost:8080]

