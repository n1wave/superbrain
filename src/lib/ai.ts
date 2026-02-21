import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export interface DocumentMetrics {
    actionability: number;   // Gotowość do działania 1-10
    impact: number;          // Siła Wpływu 1-10
    ease: number;            // Łatwość wdrożenia 1-10
    evergreen: number;       // Termin ważności 1-10
    overall: number;         // Średnia arytmetyczna
    actionabilityNote: string;
    impactNote: string;
    easeNote: string;
    evergreenNote: string;
}

export interface AIAnalysisResult {
    documentType: string;
    mainTopic: string;
    tags: string[];
    tldr: string;
    keyFindings: string[];
    usage: string;
    actionItems: string[];
    metrics: DocumentMetrics;
}

const SYSTEM_PROMPT = `Jesteś ekspertem ds. analizy dokumentów biznesowych. Zanalizuj podany tekst i zwróć odpowiedź w ścisłym formacie JSON.
Użyj poniższego schematu JSON i nie dodawaj żadnego dodatkowego tekstu ani znaczników Markdown, tylko sformatowany poprawnie JSON.

Schemat oczekiwanej odpowiedzi JSON:
{
  "documentType": "[Określ typ: np. raport, umowa, polityka, notatka, analiza]",
  "mainTopic": "[Maksymalnie 3-4 słowa opisujące rdzeń dokumentu]",
  "tags": ["[Tag 1]", "[Tag 2]", "[Tag 3]"],
  "tldr": "[Napisz maksymalnie 2-3 zdania podsumowujące, czego dokładnie dotyczy dokument i dlaczego powstał. Format czysto informacyjny.]",
  "keyFindings": [
    "[Wniosek 1 - od 3 do 7 najważniejszych faktów, liczb, zasad lub wniosków płynących z dokumentu. Skup się na tzw. mięsie informacyjnym.]",
    "[Wniosek 2]",
    "[Wniosek 3]"
  ],
  "usage": "[Napisz jak użytkownik może wykorzystać ten dokument - 3-5 zdań]",
  "actionItems": [
    "[Wypunktuj, jakie konkretne działania, zmiany lub decyzje wynikają z tego dokumentu. Jeśli dokument ma charakter wyłącznie informacyjny i nie wymusza akcji, zwróc tablicę z pojedynczym elementem: 'Brak bezpośrednich akcji do podjęcia']"
  ],
  "metrics": {
    "actionability": [LICZBA 1-10],
    "impact": [LICZBA 1-10],
    "ease": [LICZBA 1-10],
    "evergreen": [LICZBA 1-10],
    "overall": [ŚREDNIA = (actionability + impact + ease + evergreen) / 4, zaokrąglona do 1 miejsca],
    "actionabilityNote": "[jedno zdanie chłodnego uzasadnienia]",
    "impactNote": "[jedno zdanie uzasadnienia w kontekście dziedziny]",
    "easeNote": "[jedno zdanie uzasadnienia progu wejścia]",
    "evergreenNote": "[jedno zdanie uzasadnienia cyklu życia wiedzy]"
  }
}

RYGORYSTYCZNA KALKULACJA METRYK (SKALA 1-10) — INSTRUKCJA BEZWZGLĘDNA:
Masz CAŁKOWITY ZAKAZ zawyżania ocen na podstawie entuzjastycznego języka w tekście. Oceniaj wyłącznie suche fakty.

1. Gotowość do działania (Actionability):
1-3 = Sucha teoria/filozofia.
4-7 = Ramy strategiczne, wymagają samodzielnego planowania zadań.
8-10 = Kompletna, gotowa instrukcja krok po kroku (SOP) / checklista.

2. Siła Wpływu w Dziedzinie (Impact): Oceniane przez pryzmat głównej dziedziny dokumentu.
1-3 = Drobna optymalizacja/ciekawostka.
4-7 = Zauważalne usprawnienie procesu, odczuwalna oszczędność.
8-10 = Game-changer (drastyczny wzrost zysków/zasięgów, radykalne cięcie kosztów, całkowita zmiana paradygmatu).

3. Łatwość wdrożenia (Ease): UWAGA: im wyższa ocena, tym łatwiej wdrożyć.
1-3 = Wymaga zespołu, dużego budżetu, zaawansowanego kodowania lub miesięcy pracy.
4-7 = Wymaga nauki nowego oprogramowania i kilku dni skupienia.
8-10 = Wdrożenie natychmiastowe (solopreneur), darmowe narzędzia, praca w jeden wieczór.

4. Termin ważności (Evergreen):
1-3 = Chwilowy trend, luka w algorytmie (działa najwyżej tygodnie/miesiące).
4-7 = Wiedza oparta na konkretnym, współczesnym oprogramowaniu (użyteczność 1-3 lata).
8-10 = Uniwersalne prawa marketingu/matematyki/psychologii, ponadczasowe frameworki.`;


export async function analyzeDocumentWithAI(documentText: string): Promise<AIAnalysisResult> {
    if (!ai) {
        throw new Error("Klucz VITE_GEMINI_API_KEY nie został poprawnie skonfigurowany w pliku .env");
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nOto dokument do analizy:\n${documentText}` }]
                }
            ],
            config: {
                // Ensure the model outputs JSON
                responseMimeType: "application/json",
            }
        });

        if (!response.text) {
            throw new Error("Pusta odpowiedź od modelu AI.");
        }

        const result: AIAnalysisResult = JSON.parse(response.text);
        return result;

    } catch (error) {
        console.error("Błąd podczas analizy AI:", error);
        throw error;
    }
}

export async function chatWithDocument(
    documentContent: string,
    documentName: string,
    userMessage: string,
    history: { role: 'user' | 'model'; text: string }[]
): Promise<string> {
    if (!ai) {
        throw new Error("Klucz VITE_GEMINI_API_KEY nie został poprawnie skonfigurowany w pliku .env");
    }

    const systemContext = `Jesteś asystentem AI pomagającym użytkownikowi rozmawiać o dokumencie o nazwie "${documentName}".
Masz dostęp do pełnej treści dokumentu poniżej. Odpowiadaj wyłącznie na podstawie treści dokumentu.
Jeśli pytanie wykracza poza zakres dokumentu, powiedz o tym grzecznie.
Odpowiadaj po polsku, chyba że użytkownik pisze po angielsku.

=== TREŚĆ DOKUMENTU ===
${documentContent.slice(0, 15000)}
=== KONIEC DOKUMENTU ===
`;

    const contents = [
        { role: 'user' as const, parts: [{ text: systemContext }] },
        { role: 'model' as const, parts: [{ text: 'Rozumiem. Jestem gotowy do rozmowy o tym dokumencie.' }] },
        ...history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }]
        })),
        { role: 'user' as const, parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
    });

    return response.text ?? 'Brak odpowiedzi od AI.';
}

// ── Chat Analysis ──

export interface ChatMetrics {
    timeSavings: number;
    completeness: number;
    criticality: number;
    transferability: number;
    roi: number;
    roiBreakdown: string;
    timeSavingsNote: string;
    completenessNote: string;
    criticalityNote: string;
    transferabilityNote: string;
}

export interface ChatAnalysisResult {
    title: string;
    tags: string[];
    situationSummary: string;
    progressAndResults: string;
    openIssues: string;
    metrics: ChatMetrics;
}

const CHAT_ANALYSIS_PROMPT = `Przeanalizuj naszą całą rozmowę i stwórz notatkę do mojej bazy wiedzy. Zanim zaczniesz pisać, oceń skalę i złożoność tej rozmowy. Jeśli to był krótki czat na jeden temat – bądź zwięzły. Jeśli to była długa, wielodniowa praca – podziel notatkę na odrębne "Wątki". Pomiń grzeczności i wstępy.

Zastosuj poniższą strukturę i zwróć odpowiedź WYŁĄCZNIE jako JSON bez żadnych dodatkowych znaków ani markdown:

{
  "title": "[Precyzyjny tytuł rozmowy]",
  "tags": ["tag1", "tag2", "tag3"],
  "situationSummary": "[Po co zaczął się ten czat i co było głównym celem — 2-4 zdania]",
  "progressAndResults": "[Przebieg i wyniki: omawiane kwestie, ustalenia, podjęte decyzje, wiedza zdobyta. Podziel na wątki jeśli rozmowa była długa.]",
  "openIssues": "[Otwarte kwestie: co zostało niedokończone. Jeśli brak — 'Brak otwartych kwestii.']",
  "metrics": {
    "timeSavings": [LICZBA 1-10 wg definicji poniżej],
    "timeSavingsNote": "[jedno zdanie chłodnego uzasadnienia oceny czasu]",
    "completeness": [LICZBA 1-10],
    "completenessNote": "[jedno zdanie uzasadnienia stopnia gotowości rozwiązania]",
    "criticality": [LICZBA 1-10],
    "criticalityNote": "[jedno zdanie uzasadnienia krytyczności problemu]",
    "transferability": [LICZBA 1-10],
    "transferabilityNote": "[jedno zdanie uzasadnienia poziomu uniwersalności]",
    "roi": [LICZBA = timeSavings*0.4 + completeness*0.3 + criticality*0.2 + transferability*0.1, ZAOKRĄGLONA DO 1 miejsca po przecinku],
    "roiBreakdown": "[Czas: X×0.4=A] + [Kompletność: Y×0.3=B] + [Krytyczność: Z×0.2=C] + [Transferowalność: W×0.1=D] = ROI"
  }
}

INSTRUKCJA BEZWZGLĘDNA: Ignoruj ton rozmowy i potoczne pochwały użytkownika. Oceniaj chłodno na podstawie wyłącznie poniższych rygorystycznych definicji:

1. timeSavings (Waga 0.4) — Zaoszczędzony Czas:
1-2: oszczędność trywialna (< 15 min, łatwe do znalezienia)
3-4: 1-2 roboczogodziny szukania i testowania
5-6: pół dnia roboczego (~4 godz.)
7-8: pełny dzień roboczy (~8 godz.)
9-10: 2 dni do kilku tygodni pracy badawczej

2. completeness (Waga 0.3) — Kompletność i Autonomia Rozwiązania:
1-2: tylko wskazówki teoretyczne, hipotezy
3-4: częściowe rozwiązanie, wymaga znacznego wkładu własnego
5-6: solidna baza, wymaga debugowania/dostosowania
7-8: działa natychmiast, tylko wpięcie w środowisko
9-10: 100% produkcyjne, plug-and-play, zamyka temat

3. criticality (Waga 0.2) — Krytyczność Architektoniczna:
1-2: kosmetyczna optymalizacja, brak wpływu na postęp
3-4: przydatna funkcja, istniały obejścia
5-6: ważny komponent, brak spowalniał inne zadania
7-8: główne wąskie gardło, wstrzymywało kluczowy etap
9-10: absolutny bloker — bez rozwiązania projekt nie mógł funkcjonować

4. transferability (Waga 0.1) — Transferowalność:
1-2: hiper-specyficzne, zhardkodowane, zerowa przydatność gdzie indziej
3-4: reużywalne tylko w tym samym projekcie
5-6: modułowe, łatwa adaptacja do podobnych projektów
7-8: uniwersalna funkcja/algorytm, niezależna od środowiska
9-10: trwały framework/SOP/architektura, zmienia metodykę pracy na lata`;

export async function analyzeChatWithAI(
    messages: { role: 'user' | 'model'; text: string }[],
    documentName: string
): Promise<ChatAnalysisResult> {
    if (!ai) {
        throw new Error("Klucz VITE_GEMINI_API_KEY nie został poprawnie skonfigurowany w pliku .env");
    }

    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Użytkownik' : 'AI'}: ${m.text}`)
        .join('\n\n');

    const prompt = `Dokument: "${documentName}"\n\nRozmowa:\n${conversationText}\n\n${CHAT_ANALYSIS_PROMPT}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
    });

    if (!response.text) throw new Error('Pusta odpowiedź od modelu AI.');
    return JSON.parse(response.text) as ChatAnalysisResult;
}
