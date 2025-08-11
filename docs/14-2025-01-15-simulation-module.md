# Moduł Symulacji Konwersacji AI - Dokumentacja

**Data:** 2025-01-15  
**Wersja:** 1.0  
**Autor:** AI Assistant  

## 📝 Przegląd

Moduł Symulacji Konwersacji umożliwia tworzenie automatycznych dialogów między dwoma AI Avatarami w celu analizy jakości konwersacji, testowania różnych scenariuszy i ulepszania algorytmów AI.

## 🎯 Cele modułu

1. **Analiza jakości konwersacji** - Ocena naturalności i efektywności dialogów AI
2. **Testowanie scenariuszy** - Symulacja różnych sytuacji biznesowych
3. **Ulepszanie avatarów** - Identyfikacja obszarów do rozwoju
4. **Szkolenie zespołu** - Dostarczanie przykładów dobrych praktyk

## 🏗️ Architektura

### Komponenty backend

```
src/
├── models/types.ts                          # Rozszerzone o typy symulacji
├── services/
│   ├── simulation-manager.service.ts        # Główny manager symulacji
│   └── conversation-analyzer.service.ts     # Analiza jakości dialogów
├── controllers/
│   └── simulation.controller.ts             # API endpoints
├── config/
│   ├── simulation-scenarios.json            # Gotowe scenariusze
│   └── simulation-avatars.json              # Konfiguracja avatarów
└── public/
    └── simulation-dashboard.html             # Interfejs użytkownika
```

### Kluczowe interfejsy

#### SimulationScenario
```typescript
interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    objective: string;
    duration_minutes: number;
    context: {
        industry: string;
        situation: string;
        constraints?: string[];
        success_metrics: string[];
    };
    participants: SimulationParticipant[];
    conversation_starters: string[];
    evaluation_criteria: string[];
}
```

#### SimulationExecution
```typescript
interface SimulationExecution {
    id: string;
    scenario: SimulationScenario;
    status: 'setting_up' | 'running' | 'paused' | 'completed' | 'failed';
    start_time: number;
    current_turn: number;
    max_turns: number;
    messages: SimulationMessage[];
    analysis: SimulationAnalysis;
    participants_sessions: Map<string, string>;
}
```

## 🔄 Przepływ symulacji

1. **Konfiguracja**
   - Wybór scenariusza (B2B sprzedaż, szkolenie, networking)
   - Konfiguracja parametrów (czas, głębokość analizy)
   - Przypisanie ról avatarów

2. **Uruchomienie**
   - Utworzenie sesji dla każdego uczestnika
   - Załadowanie odpowiednich flow definitions
   - Rozpoczęcie konwersacji starter message

3. **Wykonanie**
   - Rotacyjne generowanie odpowiedzi przez avatary
   - Klasyfikacja intencji w czasie rzeczywistym
   - Monitoring jakości i postępu

4. **Analiza**
   - Ocena jakości konwersacji (0-100)
   - Analiza wydajności uczestników
   - Generowanie insights i sugestii

## 📊 Metryki analizy

### Jakość konwersacji (wagi)
- **Koherencja** (30%) - Logiczny przebieg rozmowy
- **Zaangażowanie** (20%) - Aktywność uczestników
- **Osiągnięcie celów** (25%) - Realizacja scenariusza
- **Ukończenie flows** (15%) - Wykorzystanie flow
- **Jakość odpowiedzi** (10%) - Merytoryka wiadomości

### Metryki uczestników
- Liczba wiadomości
- Średni czas odpowiedzi
- Dokładność intencji
- Współczynnik ukończenia flow
- Udział w konwersacji

## 🎭 Gotowe scenariusze

### 1. Sprzedaż B2B - Usługi IT
**Uczestnicy:** Networker (sprzedawca) vs Client (właściciel MŚP)  
**Cel:** Prezentacja oferty i umówienie spotkania  
**Czas:** 15 minut  

### 2. Szkolenie - Zarządzanie zespołem
**Uczestnicy:** Trainer (ekspert HR) vs Student (nowy menedżer)  
**Cel:** Przekazanie wiedzy i narzędzi zarządzania  
**Czas:** 20 minut  

### 3. Networking - Konferencja branżowa
**Uczestnicy:** Networker (BD) vs Client (founder startupu)  
**Cel:** Nawiązanie kontaktu i identyfikacja synergii  
**Czas:** 12 minut  

## 🎛️ API Endpoints

```bash
# Tworzenie symulacji
POST /api/simulation/create
{
  "scenario": SimulationScenario,
  "config": SimulationConfig
}

# Pobieranie informacji o symulacji
GET /api/simulation/:id

# Pobieranie wiadomości
GET /api/simulation/:id/messages?limit=50&offset=0

# Analiza symulacji
GET /api/simulation/:id/analysis

# Kontrola symulacji
POST /api/simulation/:id/pause
POST /api/simulation/:id/resume

# Lista aktywnych symulacji
GET /api/simulation/active

# Szablony
GET /api/simulation/templates/scenarios
GET /api/simulation/templates/personas

# Eksport
POST /api/simulation/export/:id
{
  "format": "json" | "csv"
}
```

## 💻 Interfejs użytkownika

### Zakładki
1. **Nowa Symulacja** - Konfiguracja i uruchomienie
2. **Monitorowanie** - Śledzenie w czasie rzeczywistym
3. **Analiza** - Przegląd wyników i metryk

### Funkcje
- ✅ Wybór z gotowych scenariuszy
- ✅ Konfiguracja parametrów symulacji
- ✅ Podgląd uczestników i ich ról
- ✅ Monitoring konwersacji na żywo
- ✅ Kontrola symulacji (pauza/wznów)
- ✅ Analiza jakości i wydajności
- ✅ Eksport danych (JSON/CSV)

## 🔧 Konfiguracja

### Parametry symulacji
```typescript
interface SimulationConfig {
    auto_start: boolean;              // Automatyczne rozpoczęcie
    turn_timeout_seconds: number;     // Timeout tury (10-300s)
    max_message_length: number;       // Max długość wiadomości
    enable_real_time_analysis: boolean; // Analiza na żywo
    save_to_database: boolean;        // Zapis do bazy
    export_format: 'json' | 'csv';    // Format eksportu
    analysis_depth: 'basic' | 'detailed' | 'comprehensive';
}
```

### Zmienne środowiskowe
Moduł korzysta z istniejących zmiennych:
- `OPENAI_API_KEY` - Do generowania odpowiedzi
- `VECTOR_DB_*` - Do RAG (jeśli używany)
- Wszystkie inne z głównej aplikacji

## 📈 Przykładowe wyniki

### Symulacja sprzedażowa IT (15 min)
- **Jakość konwersacji:** 78%
- **Liczba tur:** 24
- **Osiągnięcie celów:** 85%
- **Główne insights:**
  - Dobra identyfikacja potrzeb klienta
  - Skuteczne odpowiedzi na obiekcje
  - Konkretne następne kroki (spotkanie umówione)

### Szkolenie zarządzania (20 min)
- **Jakość konwersacji:** 82%
- **Liczba tur:** 18
- **Transfer wiedzy:** 90%
- **Główne insights:**
  - Efektywne dostosowanie do poziomu ucznia
  - Praktyczne przykłady i narzędzia
  - Plan rozwoju określony

## 🚀 Uruchomienie

1. **Backend** - automatycznie dostępny z główną aplikacją
2. **Frontend** - dostępny pod `/simulation-dashboard.html`
3. **API** - endpointy pod `/api/simulation/*`

## 🔮 Plany rozwoju

### Wersja 1.1
- [ ] Więcej gotowych scenariuszy (HR, Sales, Support)
- [ ] Analiza sentimentu wiadomości
- [ ] Porównanie między symulacjami
- [ ] Dashboard z historią symulacji

### Wersja 1.2  
- [ ] Symulacje wieloosobowe (3+ uczestników)
- [ ] Integracja z systemami CRM
- [ ] Machine learning do poprawy jakości
- [ ] A/B testing różnych promptów

### Wersja 2.0
- [ ] Integracja z Unreal Engine (avatar 3D)
- [ ] Voice-to-voice symulacje
- [ ] VR/AR support
- [ ] Advanced analytics dashboard

## 🐛 Znane ograniczenia

1. **Maksymalnie 2 uczestników** - obecnie obsługiwane
2. **Brak persystencji** - symulacje w pamięci
3. **Analiza podstawowa** - można rozbudować NLP
4. **Brak voice synthesis** - tylko tekst

## 📚 Wykorzystane technologie

- **Backend:** Node.js + TypeScript + Express
- **AI:** OpenAI GPT-4o
- **Frontend:** React (inline w HTML)
- **Styling:** Custom CSS (GitHub dark theme)
- **Analiza:** Custom algorithms + OpenAI

## 🤝 Wkład w projekt

Moduł symulacji znacznie rozszerza możliwości aplikacji AI Avatar:

1. **Jakość** - Systematyczne testowanie i ulepszanie
2. **Szkolenie** - Materiały edukacyjne dla zespołu
3. **Development** - Szybsze iteracje i debugowanie
4. **Business value** - Demonstracja możliwości klientom

---

**Status:** ✅ Implementacja zakończona  
**Następne kroki:** Testowanie z prawdziwymi scenariuszami i zbieranie feedbacku
