# Inteligentny NPC – Dokumentacja Architektury i Implementacji

## 📘 Wprowadzenie

**Cel:** Stworzenie inteligentnego NPC (Non-Player Character) zdolnego do prowadzenia naturalnej, głębokiej rozmowy z użytkownikiem w kontekście networkingu biznesowego. NPC powinien być świadomy kontekstu, historii rozmowy i celów biznesowych, oraz dynamicznie przełączać się między tzw. flow rozmowy.

**Stack technologiczny:**
- Backend: Node.js + TypeScript
- LLM: OpenAI (gpt-4o)
- Vector DB: Qdrant (cloud lub lokalnie)
- Głos/animacja: Inworld lub ElevenLabs
- Frontend/streaming: Unreal Engine 5 + Pixel Streaming

---

## 🧠 Struktura „Umysłu” NPC

### MindStateStack
Stos śledzący bieżący kontekst intencji rozmowy:
```json
[
  { "tag": "greeting", "timestamp": 17234800 },
  { "tag": "user_firm_info", "timestamp": 17234808 },
  { "tag": "user_needs", "timestamp": 17234820 }
]
```

Dodatkowo przechowujemy listę `fulfilled_intents` z informacją, czy dana intencja została zrealizowana i czy może być powtórzona:
```json
{
  "user_firm_info": { "fulfilled": true, "repeatable": true }
}
```

---

## 🧩 Warstwy wiedzy

1. **Wiedza ogólna** – pytania otwarte, komentarze: LLM.
2. **Wiedza specjalistyczna** – RAG z bazy firmy NPC (produkty, use-case, potrzeby).
3. **Pamięć krótkoterminowa** – aktualny stos intencji (MindStateStack).
4. **Pamięć długoterminowa** – historia rozmowy, ważne punkty zapisywane w bazie.
5. **Motywacja** – stały wektor celu NPC: _nawiązanie współpracy biznesowej_.

---

## 🔄 Pełny przepływ Flow (schemat rozmowy)

1. User Input (tekst/mowa)
2. Klasyfikacja intencji (intentionClassifier.ts)
3. Przełączenie aktywnego flow
4. Prompt Builder (promptBuilder.ts)
5. Weryfikator postępu (flowValidator.ts) – async
6. Generacja odpowiedzi (responseGenerator.ts)
7. Generowanie mowy i lipsync
8. Zapis historii i update MindStateStack

---

## 🧱 Struktura danych

### Firma użytkownika:
```json
{
  "name": "Tech Solutions",
  "industry": "Edukacja",
  "location": "Warszawa",
  "size": "średnia",
  "needs": ["wdrożenie AI", "szkolenia pracowników"]
}
```

### Dane do bazy wektorowej:
Chunki z pól:
- mission
- offer (produkty, usługi)
- use_cases
- strategic_goals
- business_needs
- owner_info

Z metadanymi: `intent_type`, `relevance`, `source`, `language`

---

## 🛠 Komponenty systemu (Node.js/TS)

- `intentClassifier.ts` – klasyfikator intencji użytkownika
- `promptBuilder.ts` – kompozytor promptów (stały system prompt + dynamiczne user prompty)
- `memoryManager.ts` – MindStateStack + fulfilled intents
- `flowValidator.ts` – async LLM do weryfikacji postępów
- `responseGenerator.ts` – wysyła żądanie do OpenAI + generuje output
- `ragRetriever.ts` – integracja z Qdrant
- `voiceOutput.ts` – integracja z Inworld lub ElevenLabs

---

## 🔁 Profile intencji (9 typów)

1. greeting
2. ask_about_npc_firm
3. ask_about_npc
4. user_needs
5. user_expectations
6. user_comments
7. general_questions
8. closing
9. summarization

Dodatkowo przypisane flow:
- Flow#1: poznanie firmy użytkownika
- Flow#2: dopasowanie współpracy
- Flow#3: mapa synergii
- Flow#4: prezentacja oferty NPC

---

## ⚙️ Integracje i infrastruktura

- **OpenAI**: GPT-4o (prompt + cache)
- **Qdrant**: Cloud z kolekcją `npc_knowledge_chunks`
- **Pixel Streaming**: GCP GPU instancje (0.026$/min)
- **Inworld**: API (0.025$/interakcję)

---

## 💸 Szacunkowe koszty (30 min sesji)

| Element                 | Koszt na 30 min         |
|-------------------------|-------------------------|
| OpenAI API (GPT-4o)     | 0.15–0.30 USD           |
| Qdrant (RAG)            | 0.01–0.03 USD           |
| ElevenLabs/Inworld      | ~0.40–0.75 USD          |
| Pixel Streaming (GCP)   | ~0.78 USD               |
| **Razem (1 sesja)**     | **1.3 – 1.9 USD**       |

---

## 🚀 Deployment

1. Docker + Node.js serwis na GCP
2. Wektorowa baza (Qdrant Cloud lub lokalna)
3. Endpoints REST do komunikacji z frontem:
   - `/chat`
   - `/classify`
   - `/memory`
   - `/flow-validator`
4. .env z kluczami do OpenAI, Qdrant, ElevenLabs

---

## 🧪 Testowanie i debug

- Panel debug: obserwacja stosu i flow
- Logger promptów i wyników
- Tryb `testMode: true` do verbose'owych outputów

---

## 📌 Roadmapa

### V1.0 – Biznesowy NPC
- 9 intencji + 4 główne flow
- Wektorowa baza wiedzy
- Asynchroniczny walidator
- Integracja z Inworld

### V2.0
- Dynamiczna agenda NPC
- Adaptacja pod edukatorów / HR
- Pamięć długoterminowa z aktualizacją
- Rozpoznawanie intencji u NPC (nie tylko usera)

---

_Data wygenerowania: 2025-07-15 19:31_  
