// src/pages/Flashcards.tsx
import { useMemo, useState } from 'react';
import { FLASHCARDS } from '../lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Diagram } from '../components/content/Diagram';

export function Flashcards() {
    const cats = useMemo(() => ['All', ...new Set(FLASHCARDS.map(f => f.cat))], []);
    const [cat, setCat] = useState('All');
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    const cards = cat === 'All' ? FLASHCARDS : FLASHCARDS.filter(f => f.cat === cat);
    const current = cards.length ? cards[idx % cards.length] : undefined;

    const pick = (c: string) => {
        setCat(c);
        setIdx(0);
        setFlipped(false);
    };

    return (
        <div>
            <h1 className="font-serif mb-1 text-3xl font-bold tracking-tight">📇 Flashcards</h1>
            <p className="mb-6 max-w-3xl text-muted">
                Fast recall drills for definitions, invariants, and complexity classes — the facts you
                should not have to think about during an interview.
            </p>

            <Card className="mb-5">
                <CardHeader>
                    <CardTitle>🔁 Why spaced repetition beats rereading</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-3 text-sm leading-relaxed">
                        Rereading feels productive because the material feels familiar, but familiarity is
                        not retrieval. The number that predicts interview performance is how long you can
                        hold onto a concept after seeing it <em>once</em>, and only{' '}
                        <strong>active recall</strong> strengthens that path.
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

            <div className="mb-4 flex flex-wrap gap-2">
                {cats.map(c => (
                    <Button
                        key={c}
                        size="sm"
                        variant={cat === c ? 'primary' : 'outline'}
                        onClick={() => pick(c)}
                    >
                        {c}
                    </Button>
                ))}
            </div>

            {current ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {current.cat} · {idx % cards.length + 1}/{cards.length}
                        </CardTitle>
                        <Badge variant="neutral">{flipped ? 'Answer' : 'Question'}</Badge>
                    </CardHeader>
                    <CardContent>
                        <button
                            type="button"
                            onClick={() => setFlipped(f => !f)}
                            className="flex min-h-40 w-full cursor-pointer items-center justify-center rounded-md border border-rule bg-neutral p-6 text-center transition-colors hover:border-focus"
                        >
                            {flipped ? (
                                <span className="text-base leading-relaxed">{current.back}</span>
                            ) : (
                                <span className="font-serif text-lg font-semibold">{current.front}</span>
                            )}
                        </button>
                        <div className="mt-4 flex items-center justify-between">
                            <Button
                                size="sm"
                                onClick={() => {
                                    setIdx(i => (i - 1 + cards.length) % cards.length);
                                    setFlipped(false);
                                }}
                            >
                                ← Prev
                            </Button>
                            <Button variant="primary" onClick={() => setFlipped(f => !f)}>
                                {flipped ? 'Show question' : 'Flip card'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setIdx(i => (i + 1) % cards.length);
                                    setFlipped(false);
                                }}
                            >
                                Next →
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-sm text-muted">No flashcards in this category.</p>
            )}
        </div>
    );
}