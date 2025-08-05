# Nazwa projektu: Konfigurowalny AI Avatar

## Podczas pracy nad tym projektem trzymają się następujących zasad:
1. Odpowiadaj w języku polskim, ale wygenerowany kod i wszelkie zmiany w kodzie łącznie z treścią komentarzy i dokumentacji w kodzie zawsze musi być w języku angielskim.
2. Wszelkie założenia dotyczące tego projektu są zapisane w tym pliku poniżej.
3. Jeśli jakiekolwiek założenia do projektu ulegną zmianie to sugeruj zmiany do treści tego pliku instruction.md.
4. Gdy dostaniesz polecenie commit to: 
   - **KRYTYCZNE**: Przed napisaniem opisu commita i dokumentacji, użyj komend `git status` i `git diff HEAD` do przeanalizowania wszystkich zmian w plikach w stosunku do ostatniego commita
   - **KRYTYCZNE**: Sprawdź jakie nowe pliki zostały utworzone, jakie usunięte, jakie zmodyfikowane
   - **KRYTYCZNE**: Przeanalizuj treść wszystkich zmian (dodane/usunięte linie) w każdym pliku
   - **KRYTYCZNE**: Użyj `git diff HEAD --name-only` aby zobaczyć listę zmienionych plików
   - **KRYTYCZNE**: Użyj `git diff HEAD <nazwa_pliku>` aby przeanalizować konkretny plik
   - **KRYTYCZNE**: Użyj `git log --oneline -1` aby zobaczyć ostatni commit i upewnić się, że analizujesz zmiany względem właściwego commita
   - **KRYTYCZNE**: Dopiero po pełnej analizie wszystkich zmian opisz dokładnie co zostało zrobione
   - Wygeneruj w języku angielskim odpowiedni opis do zrobionych zmian w kodzie do GIT.
   - Wygeneruj też nowy plik typu md w katalogu docs o nazwie <CommitNumber>-<Date>.md gdzie:
     * CommitNumber to kolejna liczba całkowita dodatnia zaczynając liczyć od 1 i rośnie o 1 z każdym kolejnym commitem
     * Date to aktualna data kiedy zostanie zrobiony commit w formacie YYYY-MM-DD gdzie YYYY to rok, MM to miesiąc, a DD to dzień
     * **WAŻNE**: Użyj aktualnej daty systemowej, nie szacowanej ani przykładowej daty
     * **SPRAWDŹ**: Przed utworzeniem pliku upewnij się, że data jest poprawna i aktualna
   - W tym pliku md masz opisać dokładnie wszystkie zmiany jakie zaszły w projekcie z ładnym formatowaniem.
   - **KRYTYCZNE**: Opisuj tylko rzeczywiste zmiany, które zostały wykonane. Nie dodawaj opisów funkcji, które już istnieją lub nie zostały zmienione.
   - **KRYTYCZNE**: Jeśli zmieniłeś tylko jedną rzecz, napisz krótki opis tej jednej zmiany. Nie rozszerzaj o funkcje, które już działają.
   - **KRYTYCZNE**: Przed napisaniem opisu przeanalizuj dokładnie co zostało zmienione i opisz tylko te zmiany.
   - **KRYTYCZNE**: Nie opisuj zmian, które nie zostały wykonane w tym commicie (np. usunięcie kodu, który nie istniał w poprzednim commicie).
   - Tych plików md razem z treścią tego pliku instruction.md z katalogu docs używaj jako kontekstu do odpowiedzi na pytania do tego projektu, abyś zawsze był na bieżąco z tym co się dzieje w projekcie i brał pod uwagę wszystkie dotychczasowe zmiany w projekcie.
   - Gdy zobaczę treść commita i treść nowego pliku md to sam zrobię commit.
5. Zasady do treści commita:
   - Tytuł: Ma zawierać jedno zdanie podsumowujące wykonaną pracę. Powinien zaczynać się wielką literą oraz nie powinien kończyć się kropką. Długość nie powinna przekraczać 50 znaków. Napisz komunikat o zatwierdzeniu w trybie rozkazującym np.: "Fix bug" („Napraw błąd”). Ta konwencja odpowiada komunikatom zatwierdzenia generowanym przez polecenia.
   - Opis: W razie potrzeby bardziej szczegółowy tekst wyjaśniający. W niektórych kontekstach pierwszy wiersz jest traktowany jako temat wiadomości e-mail, a reszta tekstu jako treść. Musi być poprzedzony pustą linią. Długość wierszy nie powinna przekraczać 72 znaków, a gdy jest więcej znaków to dawaj znaku końca linii póki nie przejdziesz do kolejnego zdania. W opisie powinna znaleźć się informacja o tym co i po co zostało zmienione. Każde zdanie w opsie zaczynaj od myślnika, potem jedna spacja i po tym zdanie zaczynając dużej litery.
   - **KRYTYCZNE**: Opisuj tylko rzeczywiste zmiany. Jeśli zmieniłeś jedną rzecz, napisz krótki opis tej jednej zmiany.
   - Gdy generujesz treść commita to go napisz dokładnie tak jak ma wyglądać do użycia w GIT.

## 1. Architektura systemu
Aplikacja będzie składać się z następujących komponentów backendowych:
1. **Moduł przetwarzania zapytań**
   - Przyjmowanie zapytań użytkownika przez API
   - Zarządzanie sesją komunikacji
2. **Moduł analizy zapytań**
   - **Klasyfikator Celu** - identyfikuje konkretny cel użytkownika i mapuje go na pre-definiowane cele biznesowe
   - Klasyfikator intencji (np. pytanie, przywitanie, krytyka)
   - Analiza tonu wypowiedzi (np. wkurzony, miły, neutralny)
   - Weryfikacja tematyki zapytania (np. leasing, finansowanie, inne)
3. **Moduł odpowiedzi AI**
   - System prompt - definiujący rolę AI Avatara np. doradca leasingowy, sposób odpowiedzi, ton
   - User prompt - przekazujący zapytanie użytkownika
   - System wyszukiwania wiedzy (baza wiedzy z bazy wektorowej)
   - Generacja kontekstu merytorycznego
   - Dodanie do user prompt historii rozmowy dla utrzymania kontekstu odpowiedzi 
4. **Moduł przetwarzania odpowiedzi**
   - Konwersja odpowiedzi tekstowej na XML dla Eleven Labs (synteza mowy)
   - Obsługa generowania audio
5. **Baza wiedzy**
   - Repozytorium informacji o wybranej tematyce np. leasingu i finansowaniu
   - System adaptera dla baz wektorowych z obsługą Pinecone (chmura) i Qdrant (lokalny Docker)
   - Automatyczne przełączanie między bazami wektorowymi na podstawie konfiguracji
## 2. Przepływ danych
1. System otrzymuje zapytanie użytkownika przez API
2. **Klasyfikator Celu** analizuje zapytanie:
   - Jeśli wykryto konkretny cel biznesowy, aktywuje odpowiednie akcje
   - Jeśli nie wykryto celu, przekazuje do dalszej analizy
3. Klasyfikator intencji analizuje zapytanie:
   - Określa TON użytkownika (wkurzony, miły, neutralny)
   - Identyfikuje rodzaj komunikatu (pytanie, przywitanie, krytyka)
   - Sprawdza czy pytanie dotyczy określonej tematyki np. leasingu i finansowania
   - Sprawdza czy zapytanie wpasowuje się w określony cel
4. W zależności od klasyfikacji:
   - Jeśli wykryto konkretny cel biznesowy, aktywuje odpowiednie akcje
   - Jeśli nie wykryto celu, przekazuje do dalszej analizy
      - Jeśli to pytanie dotyczące tematyki np. leasingu:
        - System zamienia pytanie na wektor za pomocą API embeddings
        - Odpytuje aktywną bazę wektorową (Pinecone lub Qdrant) za pomocą adaptera
        - Generuje kontekst merytoryczny dla odpowiedzi
      - Jeśli to inna intencja:
        - System generuje odpowiednią odpowiedź bez wyszukiwania w bazie wiedzy
        - Może modyfikować stan NPC (emocje, dostępne cele)
5. Przygotowanie zapytania do modelu językowego:
   - System prompt V1 (rola Doradcy Leasingowego)
   - Zapytanie użytkownika
   - Kontekst merytoryczny (jeśli dotyczy)
   - Historia konwersacji
6. Odpowiedź AI jest przekształcana do XML dla Eleven Labs
7. System generuje audio za pomocą Eleven Labs i zwraca odpowiedź tekstową wraz z URL do audio
8. Aktualizacja stanu systemu (historia, aktywne cele)
## 3. Działanie Klasyfikatora Celu
Klasyfikator Celu to kluczowy element systemu, który mapuje intencje użytkownika na predefiniowane cele biznesowe.
### Struktura danych dla celów (JSON)
```json
{
  "goals": [
    {
      "name": "nazwa_celu",
      "repeatable": true,
      "enabled_by_default": true,
      "activation": {
        "trigger": "nazwa_triggera",
        "intent": "nazwa_intencji"
      },
      "actions": [
        {
          "instruction": "Tekst lub polecenie do wykonania",
          "emotion_change": "JOY",
          "character_changes": {
            "enable_goals": ["cel1", "cel2"],
            "disable_goals": ["cel3"]
          },
          "say_verbatim": "Tekst do wypowiedzenia",
          "send_trigger": "nazwa_triggera",
          "trigger_params": [
            {
              "name": "parametr",
              "value": "{{p.parametr}}"
            }
          ]
        }
      ],
      "extracted_entities": [
        {
          "name": "nazwa_encji"
        }
      ],
      "activation_condition": {
        "logical_expression": "warunek_logiczny"
      }
    }
  ]
}
```
### Przepływ w Klasyfikatorze Celu
1. Przyjmuje pytanie użytkownika
2. Analizuje zapytanie pod kątem dopasowania do zdefiniowanych celów
3. Jeśli wykryje konkretny cel:
   - Aktywuje odpowiedni cel zgodnie z definicją JSON
   - Wykonuje zdefiniowane akcje (instruction)
   - Może modyfikować stan NPC (emotion_change, character_changes)
   - Może generować bezpośrednią odpowiedź (say_verbatim)
   - Może wyzwalać kolejne triggery (send_trigger)
4. Jeśli nie wykryje celu:
   - Przekazuje zapytanie do standardowej ścieżki przetwarzania
   - Kontynuuje przez klasyfikator intencji
## 4. Struktura JSON komunikacji
Dla standaryzacji komunikacji między modułami, system będzie wykorzystywał strukturę JSON:
```json
{
  "user_message": "content",
  "is_question": "true/false",
  "history": "content",
  "context_knowledge": "content",
  "tone": "angry/nice/neutral"
}
```
## 5. Technologie
1. **Backend**:
   - **Node.js** jako podstawa systemu
   - Express.js dla API RESTowych
   - OpenAI API lub inna usługa AI do generowania odpowiedzi i embeddingów
   - **Adapter baz wektorowych** z obsługą Pinecone (chmura) i Qdrant (lokalny Docker)
   - Redis/MongoDB do przechowywania stanu sesji i historii konwersacji
2. **Zewnętrzne API**:
   - Eleven Labs do syntezy mowy
   - OpenAI lub alternatywne API dla modeli językowych
3. **Infrastruktura**:
   - Docker Compose z różnymi konfiguracjami (lokalna, zewnętrzna, domyślna)
   - Qdrant jako lokalna baza wektorowa w kontenerze Docker
   - Pinecone jako chmurowa baza wektorowa
## 6. Infrastruktura danych
1. **Baza wiedzy**:
   - Dokumenty o leasingu przekształcone na embeddingi za pomocą OpenAI
   - Przechowywanie wektorów w Pinecone (chmura) lub Qdrant (lokalny) z odpowiednimi metadanymi
   - Efektywne wyszukiwanie podobieństwa semantycznego przez adapter baz wektorowych
   - Konfiguracja przez zmienną środowiskową `VECTOR_DB_TYPE` (pinecone/qdrant)
2. **Obsługa kontekstu**:
   - MongoDB do przechowywania historii konwersacji
   - Zarządzanie kontekstem między zapytaniami
   - Cache'owanie często używanych danych w Redis
3. **Stan NPC**:
   - Aktywne/nieaktywne cele przechowywane w bazie dokumentowej
   - Aktualne emocje
   - Metadane konwersacji
## 7. Moduły uzupełniające
1. **System aktualizacji promptów**:
   - Mechanizm dostosowywania System Promptu na podstawie tonu użytkownika
   - Utrzymywanie spójnej osobowości NPC
2. **System mapowania celów Inworld**:
   - Mapowanie celów systemu NPC na format kompatybilny z Inworld
   - Zapewnienie interoperacyjności
## 8. Plan rozwoju
1. **Faza 1: Podstawowa funkcjonalność**
   - Konfiguracja projektu Node.js i Express
   - Implementacja System Promptu V1
   - Prosty klasyfikator intencji
   - Integracja z API modelu językowego
   - Podstawowe API dla klientów
2. **Faza 2: Baza wiedzy i wyszukiwanie**
   - Przygotowanie dokumentów o leasingu
   - Utworzenie embeddingów za pomocą OpenAI
   - Konfiguracja i wdrożenie adaptera baz wektorowych (Pinecone/Qdrant)
   - Implementacja wyszukiwania semantycznego za pomocą metryk podobieństwa
3. **Faza 3: Klasyfikator Celu**
   - Implementacja parsera JSON dla celów
   - Logika aktywacji celów
   - System zarządzania stanem NPC w MongoDB
4. **Faza 4: Synteza mowy**
   - Integracja z Eleven Labs
   - Konwersja odpowiedzi na format XML
   - API do pobierania wygenerowanego audio
5. **Faza 5: Optymalizacja**
   - Ulepszony system analizy tonu
   - Dokładniejsza klasyfikacja intencji
   - Optymalizacja wyszukiwania
   - Skalowanie systemu i zabezpieczenie wydajności API