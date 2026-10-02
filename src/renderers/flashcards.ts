// src/renderers/flashcards.ts
import { h } from "../utils";
import { FLASHCARDS } from "../data";
import { card, diagram, statChips, callout, defList } from "../components";

export function renderFlashcards(container: HTMLElement): void {
    const section = h("div", { className: "page-enter" });
    section.appendChild(h("h2", {}, "📇 Flashcards"));
    section.appendChild(
        h(
            "p",
            { style: "color:var(--muted);margin-bottom:18px;max-width:760px;" },
            "Fast recall drills for definitions, invariants, and complexity classes — the facts you should not have to think about during an interview.",
        ),
    );

    section
        .appendChild(
            card(
                "🔁 Why spaced repetition beats rereading",
                `
<p>Rereading feels productive because the material feels familiar, but familiarity is not
retrieval. The number that predicts interview performance is how long you can hold onto a
concept after seeing it <em>once</em>, and only <b>active recall</b> strengthens that path.
Recognizing a definition on a page never exercises the same retrieval pathway that answering
a question under pressure will.</p>
<p>Spacing matters because memory decays exponentially. Reviewing an item just before it would
have decayed past the point of usefulness is wasted effort; reviewing it once it has partially
decayed — so it is still recoverable, but not effortless — is exactly what deepens the trace.
That window is what makes intervals grow.</p>
    `,
                { bookmark: false },
            ),
        )
        .appendChild(
            diagram(
                `
flowchart LR
    A["New card"] --> B{Recall it<br/>without looking?}
    B -->|No| C[Review immediately]
    C --> B
    B -->|Yes| D[Schedule at<br/>1 day]
    D --> E{Recalled?}
    E -->|No| F[Reset interval<br/>to 1 day]
    F --> D
    E -->|Yes| G[Schedule at<br/>3 days]
    G --> H{Recalled?}
    H -->|No --> F
    H -->|Yes| I[7 days]
    I --> J[30 days]
    J --> K[Graduated —<br/>review monthly]
    K -.-> L[A single miss<br/>drops you back to 1 day]
`,
                "A miss resets the interval — the schedule is driven entirely by whether you recalled it unaided",
            ),
        );

    section
        .appendChild(
            card(
                "📐 How to run a session well",
                `
<p>Sessions fail for predictable reasons: too many new cards at once, counting recognition as
recall, and re-reading cards you already know. A workable session keeps new material to roughly
<b>ten cards</b> and spends the remaining time reviewing overdue items.</p>
    `,
                { bookmark: false },
            ),
        )
        .appendChild(
            h(
                "div",
                { style: "padding:0 2px 16px;" },
                statChips([
                    ["New cards per day", "10", "chip-info"],
                    ["Target recall", "≥ 90%", "chip-good"],
                    ["Review load / week", "~40 cards", ""],
                    ["Cards per sitting", "20–30 min", ""],
                ]),
            ),
        );

    section
        .appendChild(
            card(
                "🎯 What belongs on a card",
                `
<p>The best card is the one that tests the thing you will actually be asked. Apply these filters
before writing any — if a card cannot survive them, it belongs in the topic notes instead.</p>
    `,
                { bookmark: false },
            ),
        )
        .appendChild(
            h(
                "div",
                { style: "padding:0 2px 16px;" },
                defList([
                    [
                        "One fact per card",
                        "Two facts means the second is never retrieved alone, and you cannot tell which one you forgot.",
                    ],
                    [
                        "Ask, don’t just state",
                        "A card that reads “Hash maps are O(1)” teaches nothing. “Average lookup complexity of a hash map, and what breaks it?” forces retrieval.",
                    ],
                    [
                        "Include the failure case",
                        "“O(1) average — but O(n) once collisions degrade the table past its load factor” is the version that survives a follow-up question.",
                    ],
                    [
                        "Skip the derivable",
                        "Anything you can re-derive in under ten seconds while talking does not need to be memorized.",
                    ],
                ]),
            ),
        );

    section.appendChild(
        h(
            "div",
            { style: "margin:0 0 20px;" },
            callout(
                "c3",
                `
<p><b>Active recall must be spoken, not just thought.</b> Silently recognizing the answer and
saying it out loud are different skills — only the second is what the interview exercises. If a
card feels easy, say the full answer aloud before flipping it; that is the signal the schedule
should be keyed to.</p>`,
                "The single biggest source of false confidence",
            ),
        ),
    );

    const catFilters = h("div", { className: "btn-group" });
    const cats = ["All", ...new Set(FLASHCARDS.map((f) => f.cat))];
    let currentFilter = "All";
    let currentIdx = 0;

    cats.forEach((c) => {
        const btn = h("button", {
            className: "btn" + (c === "All" ? " btn-primary" : ""),
            textContent: c,
        });
        btn.addEventListener("click", () => {
            currentFilter = c;
            currentIdx = 0;
            renderFiltered();
            catFilters.querySelectorAll(".btn").forEach((b) => {
                b.classList.remove("btn-primary");
            });
            btn.classList.add("btn-primary");
        });
        catFilters.appendChild(btn);
    });
    section.appendChild(catFilters);

    const filtered = () =>
        currentFilter === "All"
            ? FLASHCARDS
            : FLASHCARDS.filter((f) => f.cat === currentFilter);

    function renderFiltered(): void {
        const cards = filtered();
        if (cards.length === 0) {
            section.appendChild(
                h("p", { textContent: "No flashcards in this category." }),
            );
            return;
        }
        const fc = cards[currentIdx % cards.length];
        const front = h("div", { className: "flashcard-front" });
        front.appendChild(h("h3", {}, fc.front));
        front.appendChild(
            h(
                "p",
                {
                    style: "color:var(--muted);margin-top:8px;font-size:0.8rem;",
                },
                fc.cat + " · " + (currentIdx + 1) + "/" + cards.length,
            ),
        );

        const back = h("div", { className: "flashcard-back hidden" });
        back.appendChild(h("h4", {}, "Answer"));
        back.appendChild(h("p", {}, fc.back));

        const flipBtn = h("button", {
            className: "btn btn-primary",
            textContent: "FLIP CARD",
        });
        flipBtn.addEventListener("click", () => {
            front.classList.toggle("hidden");
            back.classList.toggle("hidden");
        });

        const nav = h("div", { className: "flashcard-nav" });
        nav.appendChild(
            h("button", {
                className: "btn btn-sm",
                textContent: "← Prev",
                onClick: () => {
                    currentIdx = (currentIdx - 1 + cards.length) % cards.length;
                    renderFiltered();
                },
            }),
        );
        nav.appendChild(
            h("span", { textContent: `${currentIdx + 1} / ${cards.length}` }),
        );
        nav.appendChild(
            h("button", {
                className: "btn btn-sm",
                textContent: "Next →",
                onClick: () => {
                    currentIdx = (currentIdx + 1) % cards.length;
                    renderFiltered();
                },
            }),
        );

        const cardContainer = document.getElementById("fc-container");
        if (cardContainer) {
            cardContainer.innerHTML = "";
            cardContainer.appendChild(front);
            cardContainer.appendChild(back);
            cardContainer.appendChild(flipBtn);
            cardContainer.appendChild(nav);
        } else {
            const c = card("", "", { id: "fc-container" });
            c.appendChild(front);
            c.appendChild(back);
            c.appendChild(flipBtn);
            c.appendChild(nav);
            section.appendChild(c);
        }
    }

    renderFiltered();
    container.appendChild(section);
}
