// src/pages/Flashcards.tsx
//
// The deck is now a spaced-repetition queue rather than a browser. Cards come
// back when they are actually due (src/lib/srs.ts), the learner grades their
// own recall, and the next interval is derived from that grade.
import { useEffect, useMemo, useState } from "react";
import { FLASHCARDS } from "../lib/data";
import { useStore } from "../lib/store";
import { isDue, nextIntervalLabel, stageOf } from "../lib/srs";
import type { ReviewGrade } from "../lib/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { StatTiles } from "../components/app/StatTiles";
import { Diagram } from "../components/content/Diagram";
import { PageHeader } from "../components/app/PageHeader";

/** Grade buttons, in the order they are shown. Order is the difficulty ramp. */
const GRADES: { grade: ReviewGrade; label: string; variant: "danger" | "outline" | "default" | "primary" }[] = [
    { grade: "again", label: "Again", variant: "danger" },
    { grade: "hard", label: "Hard", variant: "outline" },
    { grade: "good", label: "Good", variant: "default" },
    { grade: "easy", label: "Easy", variant: "primary" },
];

export function Flashcards() {
    // The deck list is fixed by the card data, so it is accumulated in order
    // rather than rebuilt from a Set on every render.
    const cats = useMemo(() => {
        const decks: string[] = [];
        for (const card of FLASHCARDS) {
            if (!decks.includes(card.cat)) decks.push(card.cat);
        }
        return ["All", ...decks];
    }, []);
    const reviews = useStore((s) => s.reviews);
    const reviewCard = useStore((s) => s.reviewCard);

    const [cat, setCat] = useState("All");
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    // "due" is the drill; "all" is the old browse-everything behaviour, kept
    // for looking something up without disturbing the schedule.
    const [mode, setMode] = useState<"due" | "all">("due");

    // One clock read per render keeps every card in this render due/not-due
    // against the same instant.
    const now = Date.now();

    const pool = useMemo(
        () => (cat === "All" ? FLASHCARDS : FLASHCARDS.filter((f) => f.cat === cat)),
        [cat],
    );

    // Due counts span the whole deck, not the filtered view: the stat is a
    // measure of outstanding work, and narrowing a deck must not hide it.
    const dueAll = useMemo(
        () => FLASHCARDS.filter((c) => isDue(reviews[c.id], now)),
        // `now` changes every render, so this recomputes every render by
        // design — the list is 12 items and correctness matters more than the
        // memo.
        [reviews, now],
    );

    const due = useMemo(
        () => pool.filter((c) => isDue(reviews[c.id], now)),
        [pool, reviews, now],
    );

    const cards = mode === "due" ? due : pool;
    // Grading removes a card from `due`, so the index can point past the end;
    // clamping here is what keeps the drill from blanking out mid-session.
    const current = cards.length ? cards[Math.min(idx, cards.length - 1)] : undefined;

    const stages = useMemo(() => {
        const counts = { learning: 0, review: 0, graduated: 0 };
        for (const c of FLASHCARDS) {
            const stage = stageOf(reviews[c.id]);
            if (stage !== "new") counts[stage]++;
        }
        return counts;
    }, [reviews]);

    const pick = (c: string) => {
        setCat(c);
        setIdx(0);
        setFlipped(false);
    };

    const grade = (g: ReviewGrade) => {
        if (!current) return;
        reviewCard(current.id, g);
        // The next card slides into this slot, and it must be face down.
        setFlipped(false);
    };

    /**
     * A drill should be runnable without the mouse. Space flips, digits grade,
     * and in browse mode the arrows move between cards.
     *
     * Space is ignored while a button or link has focus: those elements
     * activate on space themselves, and handling it here too would flip the
     * card twice per press.
     */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target;
            if (
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
            ) {
                return;
            }

            const onControl =
                target instanceof HTMLElement &&
                target.closest("button, a, [role='button']");

            if (e.key >= "1" && e.key <= "4" && flipped && current) {
                e.preventDefault();
                grade(GRADES[Number(e.key) - 1].grade);
                return;
            }

            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                // The due queue has no meaningful order to walk through.
                if (mode !== "all" || !cards.length) return;
                e.preventDefault();
                const delta = e.key === "ArrowRight" ? 1 : -1;
                setIdx((i) => (i + delta + cards.length) % cards.length);
                setFlipped(false);
            } else if (e.key === " " || e.key === "Enter") {
                if (onControl) return;
                e.preventDefault();
                setFlipped((f) => !f);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [cards.length, current, flipped, mode]);

    return (
        <div>
            <PageHeader
                title="Flashcards"
                intro="Fast recall drills for definitions, invariants, and complexity classes — the facts you should not have to think about during an interview. Cards come back when they are due, not when you feel like reviewing them."
            />

            <StatTiles
                className="mb-4"
                columns={4}
                tiles={[
                    { label: "Due today", value: dueAll.length, tone: "text-c3i" },
                    { label: "Learning", value: stages.learning, tone: "text-c5i" },
                    { label: "In review", value: stages.review, tone: "text-c4i" },
                    { label: "Graduated", value: stages.graduated, tone: "text-c1i" },
                ]}
            />

            {/* Deck filter and mode sit together: both decide what the card
                area below is showing. */}
            <Card className="mb-4">
                <CardContent className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Deck
                    </span>
                    {cats.map((c) => (
                        <Button
                            key={c}
                            size="sm"
                            variant={cat === c ? "primary" : "outline"}
                            aria-pressed={cat === c}
                            onClick={() => pick(c)}
                        >
                            {c}
                        </Button>
                    ))}
                    <span className="ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={mode === "due" ? "primary" : "outline"}
                            aria-pressed={mode === "due"}
                            onClick={() => {
                                setMode("due");
                                setIdx(0);
                                setFlipped(false);
                            }}
                        >
                            Review due ({due.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === "all" ? "primary" : "outline"}
                            aria-pressed={mode === "all"}
                            onClick={() => {
                                setMode("all");
                                setIdx(0);
                                setFlipped(false);
                            }}
                        >
                            Browse all
                        </Button>
                    </span>
                </CardContent>
            </Card>

            {current ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {current.cat} · {(Math.min(idx, cards.length - 1) % cards.length) + 1}/
                            {cards.length}
                        </CardTitle>
                        <Badge variant="neutral">
                            {flipped ? "Answer" : "Question"}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            onClick={() => setFlipped((f) => !f)}
                            className="h-auto min-h-40 w-full justify-center rounded-md bg-neutral p-6 text-center hover:border-focus"
                        >
                            {flipped ? (
                                <span className="text-base leading-relaxed">
                                    {current.back}
                                </span>
                            ) : (
                                <span className="font-serif text-lg font-semibold">
                                    {current.front}
                                </span>
                            )}
                        </Button>

                        {/* Grading only makes sense once the answer is visible;
                            grading a question you have not seen is how a
                            schedule fills with cards marked "easy" for free. */}
                        {mode === "due" && flipped ? (
                            <div className="mt-4">
                                <p className="mb-2 text-center text-[11px] tracking-wider text-muted uppercase">
                                    How well did you recall it?
                                </p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {GRADES.map((g, i) => (
                                        <Button
                                            key={g.grade}
                                            variant={g.variant}
                                            onClick={() => grade(g.grade)}
                                            className="flex-col gap-0.5"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {g.label}
                                                <kbd className="rounded border border-current/30 px-1 font-mono text-[10px] font-normal opacity-70">
                                                    {i + 1}
                                                </kbd>
                                            </span>
                                            <span className="text-[11px] font-normal opacity-80">
                                                {nextIntervalLabel(
                                                    reviews[current.id],
                                                    g.grade,
                                                    now,
                                                )}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center justify-between">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIdx(
                                            (i) =>
                                                (i - 1 + cards.length) %
                                                cards.length,
                                        );
                                        setFlipped(false);
                                    }}
                                >
                                    ← Prev
                                </Button>
                                <p className="text-[11px] text-muted">
                                    <kbd className="rounded border border-rule bg-neutral px-1.5 py-0.5 font-mono">
                                        space
                                    </kbd>{" "}
                                    to flip
                                    {mode === "all" && (
                                        <>
                                            {" · "}
                                            <kbd className="rounded border border-rule bg-neutral px-1.5 py-0.5 font-mono">
                                                ←
                                            </kbd>
                                            <kbd className="rounded border border-rule bg-neutral px-1.5 py-0.5 font-mono">
                                                →
                                            </kbd>{" "}
                                            to move
                                        </>
                                    )}
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIdx((i) => (i + 1) % cards.length);
                                        setFlipped(false);
                                    }}
                                >
                                    Next →
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-sm font-semibold">
                            {mode === "due"
                                ? "Nothing due right now."
                                : "No cards in this deck."}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                            {mode === "due" && dueAll.length === 0
                                ? "Every card has been scheduled into the future. Come back when one is due, or browse the deck."
                                : "Pick another deck."}
                        </p>
                        {mode === "due" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => {
                                    setMode("all");
                                    setIdx(0);
                                }}
                            >
                                Browse all cards
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="mt-5">
                <CardHeader>
                    <CardTitle>
                       Why spaced repetition beats rereading
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-3 text-sm leading-relaxed">
                        Rereading feels productive because the material feels
                        familiar, but familiarity is not retrieval. The number
                        that predicts interview performance is how long you can
                        hold onto a concept after seeing it <em>once</em>, and
                        only <strong>active recall</strong> strengthens that
                        path.
                    </p>
                    <Diagram
                        source={`flowchart LR
    A["New card"] --> B{Recalled it<br/>without looking?}
    B -->|No| C[Review immediately]
    C --> B
    B -->|Yes| D[Schedule at 1 day]
    D --> E{Recalled?}
    E -->|No| F[Reset interval<br/>to 1 day]
    F --> D
    E -->|Yes| G[3 days]
    G --> H[7 days]
    H --> I[30 days]
    I --> J[Graduated]
    J -.->|a single miss<br/>drops you back| F`}
                        caption="A miss resets the interval — the schedule is driven entirely by whether you recalled it unaided"
                    />
                </CardContent>
            </Card>
        </div>
    );
}