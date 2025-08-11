# 🧪 Moduł Symulacji Konwersacji AI

Zaawansowany system symulacji dialogów między AI Avatarami do analizy jakości konwersacji i ulepszania algorytmów.

## 🚀 Szybki start

### 1. Uruchomienie aplikacji
```bash
# Standardowe uruchomienie
docker-compose up -d
npm run dev

# Lub z build
npm run build
npm start
```

### 2. Dostęp do interfejsu
- **Główny dashboard:** http://localhost:3000/react-dashboard.html
- **Moduł symulacji:** http://localhost:3000/simulation-dashboard.html

### 3. Testowanie funkcjonalności
```bash
# Test symulacji przez CLI
npm run test-simulation

# Test knowledge engine (opcjonalnie)
npm run test-knowledge-engine
```

## 📋 Funkcjonalności

### ✅ Zaimplementowane
- **Dual-Avatar System** - Rozmowy między dwoma AI
- **3 gotowe scenariusze** - B2B sprzedaż, szkolenia, networking
- **Analiza w czasie rzeczywistym** - Monitorowanie jakości
- **Panel kontrolny** - React interface z 3 zakładkami
- **Eksport danych** - JSON i CSV
- **Metryki zaawansowane** - 15+ wskaźników jakości

### 🎯 Scenariusze dostępne

| Scenariusz | Uczestnicy | Czas | Cel |
|------------|------------|------|-----|
| **Sprzedaż B2B IT** | Networker vs Client | 15 min | Prezentacja oferty i umówienie spotkania |
| **Szkolenie zespołu** | Trainer vs Student | 20 min | Transfer wiedzy o zarządzaniu |
| **Networking** | Networker vs Startup founder | 12 min | Nawiązanie kontaktów biznesowych |

### 📊 Analiza obejmuje

- **Jakość konwersacji** (0-100%) - Kompozytowy wskaźnik
- **Koherencja** - Logiczny przebieg rozmowy
- **Zaangażowanie** - Aktywność uczestników  
- **Osiągnięcie celów** - Realizacja scenariusza
- **Flow completion** - Wykorzystanie zdefiniowanych flow
- **Response quality** - Jakość merytoryczna odpowiedzi

## 🎛️ API Endpoints

```bash
# Tworzenie symulacji
POST /api/simulation/create

# Monitoring
GET /api/simulation/:id
GET /api/simulation/:id/messages
GET /api/simulation/active

# Kontrola
POST /api/simulation/:id/pause
POST /api/simulation/:id/resume

# Analiza i eksport
GET /api/simulation/:id/analysis
POST /api/simulation/export/:id

# Szablony
GET /api/simulation/templates/scenarios
GET /api/simulation/templates/personas
```

## 🔧 Konfiguracja

### Parametry symulacji
- **auto_start** - Automatyczne uruchomienie (domyślnie: true)
- **turn_timeout_seconds** - Timeout tury (10-300s, domyślnie: 30s)
- **max_message_length** - Max długość wiadomości (100-2000 chars)
- **enable_real_time_analysis** - Analiza na żywo (domyślnie: true)
- **analysis_depth** - Głębokość analizy (basic/detailed/comprehensive)

### Zmienne środowiskowe
Wykorzystuje istniejące zmienne z głównej aplikacji:
- `OPENAI_API_KEY` - **Wymagany** do generowania odpowiedzi
- `VECTOR_DB_TYPE` - Typ bazy wektorowej (opcjonalnie dla RAG)
- Pozostałe z `.env`

## 💻 Struktura projektu

```
src/
├── services/
│   ├── simulation-manager.service.ts      # Główny manager
│   └── conversation-analyzer.service.ts   # Analiza jakości
├── controllers/
│   └── simulation.controller.ts           # API endpoints  
├── config/
│   ├── simulation-scenarios.json          # Scenariusze
│   └── simulation-avatars.json            # Profile avatarów
├── scripts/
│   └── test-simulation.ts                 # Skrypt testowy
└── public/
    └── simulation-dashboard.html           # Frontend
```

## 🧪 Przykład użycia

### Przez interfejs
1. Otwórz http://localhost:3000/simulation-dashboard.html
2. Wybierz scenariusz (np. "Sprzedaż B2B - Usługi IT")
3. Skonfiguruj parametry (czas, analiza)
4. Kliknij "🚀 Rozpocznij Symulację"
5. Monitoruj w zakładce "📊 Monitorowanie"
6. Przegląd wyników w "📈 Analiza"

### Przez API
```javascript
// Tworzenie symulacji
const response = await fetch('/api/simulation/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        scenario: scenarioObject,
        config: {
            auto_start: true,
            turn_timeout_seconds: 30,
            analysis_depth: 'detailed'
        }
    })
});

const result = await response.json();
console.log('Simulation ID:', result.data.simulation_id);
```

## 📈 Przykładowe wyniki

### Symulacja B2B (15 min)
```
✅ Simulation completed successfully!

=== RESULTS ===
Status: completed
Total messages: 24
Duration: 847s  
Quality score: 78%

=== ANALYSIS ===
Conversation Metrics:
  Total turns: 24
  Avg message length: 156 chars
  Topic consistency: 85%
  Goal achievement: 82%

Response Times:
  Average: 1247ms
  Min: 891ms
  Max: 2103ms

Insights:
  1. Dobra równowaga w konwersacji między uczestnikami
  2. Konwersacja była bardzo angażująca - duża liczba wymian
  3. Różnorodne tematy i intencje w konwersacji

Improvement Suggestions:
  1. Zwiększ zaangażowanie poprzez więcej pytań
  2. Lepsze rozpoznawanie intencji użytkownika
```

## 🔮 Roadmapa

### v1.1 (Q1 2025)
- [ ] Więcej scenariuszy (HR, Customer Support, Coaching)
- [ ] Porównanie między symulacjami
- [ ] Historia symulacji w bazie danych
- [ ] Analiza sentimentu

### v1.2 (Q2 2025)
- [ ] Symulacje wieloosobowe (3+ uczestników)
- [ ] Machine learning do optymalizacji
- [ ] A/B testing promptów
- [ ] Integracja z CRM

### v2.0 (Q3 2025)
- [ ] Voice-to-voice symulacje
- [ ] 3D avatary (Unreal Engine)
- [ ] VR/AR support
- [ ] Advanced analytics dashboard

## 🐛 Troubleshooting

### Błąd: "OPENAI_API_KEY not found"
```bash
# Dodaj klucz API do .env
echo "OPENAI_API_KEY=your_key_here" >> .env
```

### Symulacja nie startuje
- Sprawdź logi: `docker-compose logs -f`
- Verify endpoint: `curl http://localhost:3000/api/health`
- Sprawdź konfigurację scenariusza

### Błędy kompilacji TypeScript  
```bash
npm run build
# Sprawdź błędy w konsoli
```

## 🤝 Contributing

1. Dodawanie nowych scenariuszy → `src/config/simulation-scenarios.json`
2. Nowe metryki analizy → `conversation-analyzer.service.ts`
3. UI improvements → `simulation-dashboard.html`
4. Testowanie → `npm run test-simulation`

---

**Dokumentacja pełna:** `docs/14-2025-01-15-simulation-module.md`  
**Status:** ✅ Gotowe do użycia  
**Maintainer:** AI Assistant Team
