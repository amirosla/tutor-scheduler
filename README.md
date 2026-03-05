# Tutor Scheduler

Nowoczesna aplikacja do zarządzania grafikiem korepetycji z funkcją AI — na podstawie wiadomości od ucznia automatycznie proponuje pasujące terminy.

## Uruchomienie

```bash
# Zainstaluj zależności (jednorazowo)
npm install

# Uruchom serwer deweloperski
npm run dev
# → http://localhost:5173

# Build produkcyjny
npm run build
npm run preview
```

## Struktura plików

```
src/
├── types/index.ts          — Model danych (Student, Event, Availability, Proposal…)
├── store/
│   ├── studentsStore.ts    — Zustand: CRUD uczniów
│   ├── eventsStore.ts      — Zustand: CRUD lekcji
│   └── uiStore.ts          — Zustand: nawigacja, modal, panel AI, propozycje
├── services/
│   ├── parser.ts           — Parser offline wiadomości PL → Availability
│   ├── ai.ts               — Stub AI + interfejs do podłączenia LLM
│   ├── proposals.ts        — Algorytm generowania propozycji terminów
│   └── storage.ts          — Adaptery LocalStorage (łatwa wymiana na backend)
├── utils/
│   ├── calendar.ts         — Operacje na tygodniu, resolveWeekLessons
│   ├── time.ts             — HH:mm ↔ minuty, pozycje pikseli w kalendarzu
│   └── color.ts            — Deterministyczne kolory uczniów (HSL)
├── data/seed.ts            — Dane przykładowe + przykładowe wiadomości
├── components/
│   ├── layout/             — Topbar, Sidebar
│   ├── calendar/           — WeekCalendar, DayColumn, LessonCard, GhostCard
│   ├── students/           — StudentModal (tworzenie/edycja)
│   ├── lessons/            — LessonModal (tworzenie/edycja + wyjątki recurring)
│   ├── ai/                 — MessagePanel (input), ProposalList (wyniki)
│   └── ui/                 — Button, Modal, EmptyState, Badge, FormField
└── hooks/useProposals.ts   — (zarezerwowany dla rozszerzeń)
```

## Jak działa parser wiadomości (services/parser.ts)

Parser jest w pełni offline — działa bez żadnego klucza API.

### Co rozpoznaje

| Wzorzec | Przykład | Wynik |
|---|---|---|
| Dni tygodnia | `wt`, `środę`, `w czwartek` | `dayOfWeek: 2/3/4` |
| Godziny dokładne | `17:30`, `o 16` | `startTime: "17:30"` |
| Zakresy | `od 16 do 18`, `między 10-12` | okno 16:00–18:00 |
| Po/przed | `po 17`, `przed 12` | okno 17:00–20:00 / 08:00–12:00 |
| Słowa kluczowe | `rano`, `wieczorem`, `popołudniu` | mapowane zakresy |
| Negacje | `nie mogę w środę`, `oprócz piątku` | `preference: "avoid"` |
| Preferencje | `najlepiej`, `wolałbym`, `awaryjnie` | `"preferred"` / `"ok"` |
| Tydzień | `w tym tygodniu`, `od przyszłego` | `weekOffset: 0/1` |
| Czas trwania | `90 min`, `1h`, `półtorej godziny` | `durationMin: 90` |
| Codziennie | `codziennie po 19 oprócz piątku` | 6 okien z wyjątkiem pt |

### Przykładowe wiadomości do testów

```
1. "Hej! Mogę wt i czw po 17, w sob rano też bym dała radę. Najlepiej 60 min."
2. "W tym tygodniu odpada środa, mogę pn 18-20 albo pt po 16."
3. "Od przyszłego tygodnia mogę w poniedziałki rano i w czwartki wieczorem, ale nie później niż 20."
4. "Tylko 90 minut, najlepiej we wtorek między 15 a 19."
5. "Mogę codziennie po 19 oprócz piątku."
```

W aplikacji dostępne jako gotowe przykłady w panelu AI (przycisk „Przykłady").

## Jak działa scoring propozycji (services/proposals.ts)

### Wejście
- `Availability` (okna dostępności sparsowane z wiadomości)
- `currentWeekStart` (tydzień aktualnie widoczny w kalendarzu)
- `existingLessons` (wszystkie lekcje w tym tygodniu — do sprawdzenia konfliktów)
- `durationMin` (z wiadomości lub domyślna ucznia)

### Algorytm

1. **Rozwiązywanie okien** — każde okno dostępności (dayOfWeek + startTime–endTime) jest mapowane na konkretne daty w wybranym tygodniu
2. **Generowanie slotów** — w każdym oknie generowane są możliwe starty co 30 min
3. **Filtrowanie konfliktów** — odrzucane są sloty nakładające się z istniejącymi lekcjami (`timesOverlap`)
4. **Scoring** (0–100 pkt):
   - `+30` — okno `preferred` przez ucznia
   - `+10` — okno `ok`
   - `+10` — sąsiaduje z inną lekcją (≤ 30 min przerwy → „ładne ułożenie")
   - `+5`  — sąsiaduje w przerwie ≤ 60 min
   - `+5`  — spełnia ograniczenie `notBefore`/`notAfter`
   - `+3`  — „okrągła" godzina (pełna godzina)
   - `−5`  — bardzo wczesna (< 9:00) lub późna (> 20:00)
   - `−20` — narusza `minBreakMin`
5. **Deduplikacja** — usuwane są nachodzące na siebie propozycje
6. **Sortowanie** — po score malejąco, zwracane top 8

### Gdy brak propozycji
Aplikacja wyświetla czytelne wyjaśnienie + sugestie (np. „skróć czas lekcji do X min").

## Podłączenie prawdziwego AI (Claude / OpenAI)

Plik `src/services/ai.ts` zawiera stub z gotowym interfejsem:

```ts
// Zainstaluj: npm install @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';

export async function parseAvailabilityWithAI(text: string) {
  const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: PARSE_AVAILABILITY_PROMPT + text }],
  });
  // Parsuj JSON z msg.content[0].text
}
```

Dodaj klucz do `.env`:
```
VITE_CLAUDE_API_KEY=sk-ant-...
```

> ⚠️ W produkcji proxuj klucz przez backend — nigdy nie eksponuj go w przeglądarce.

## Funkcje

- **Kalendarz tygodniowy** — siatka co 30 min, 07:00–22:00, pon–nd
- **Kolorowanie per uczeń** — deterministyczne kolory HSL, automatyczny kontrast tekstu
- **Klik w puste pole** — otwiera modal z wypełnioną datą i godziną
- **Lekcje cykliczne** — z wyjątkami (skip daty) i nadpisaniami (inna godzina w konkretnym dniu)
- **Panel AI** — parsowanie wiadomości PL + propozycje terminów jako ghost sloty w kalendarzu
- **Filtr po uczniu** — sidebar + klik filtruje widok kalendarza
- **Responsywność** — widok tygodniowy na desktop, dzienny z selektorem na mobile
- **Persistence** — LocalStorage, gotowy adapter pod wymianę na REST/GraphQL
