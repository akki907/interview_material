// src/components/content/interactive/TwoSum.tsx — the Two Sum visualizer
//
// Owns the inputs, examples and tabs. The "Brute force" and "Hash map" tabs
// both render the shared Stepper; they differ only in which step builder
// produced the sequence. "Try it" is deliberately local to this file — asking
// the user to find the pair by hand is a Two Sum affordance, not a generic one.
import { useMemo, useState } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { RichText } from "../RichText";
import { Cells } from "./Cells";
import { Stepper } from "./Stepper";
import { getStepBuilder } from "../../../lib/interactive/registry";
import { CODE } from "../../../lib/interactive/twoSum";
import { parseTarget, parseValues } from "../../../lib/interactive/types";
import type { CellState } from "../../../lib/interactive/types";

const DEFAULT_PRESETS: Array<[string, number]> = [
    ["2, 7, 11, 15", 9],
    ["3, 2, 4", 6],
    ["3, 3", 6],
    ["1, 5, 8, 3, 9, 4", 12],
];

const TABS = [
    {
        id: "try",
        label: "Try it",
        blurb: "Solve it yourself first, then see what the map does for free.",
    },
    {
        id: "brute",
        label: "Brute force",
        blurb: "Check every possible pair, one after another, until a pair hits the target.",
    },
    {
        id: "hash",
        label: "Hash map",
        blurb: "For each number, ask “has its partner already appeared?” A map answers that instantly, so one pass is enough.",
    },
];

function findPair(values: number[], target: number): [number, number] | null {
    for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
            if (values[i] + values[j] === target) return [i, j];
        }
    }
    return null;
}

/** Solve it by hand: pick two cells, read the running sum. */
function TryIt({ values, target }: { values: number[]; target: number }) {
    const [sel, setSel] = useState<number[]>([]);
    const [show, setShow] = useState(false);
    const answer = useMemo(() => findPair(values, target), [values, target]);

    function toggle(i: number) {
        setShow(false);
        setSel((p) =>
            p.includes(i) ? p.filter((x) => x !== i) : p.length < 2 ? [...p, i] : [i],
        );
    }

    const sum = sel.length === 2 ? values[sel[0]] + values[sel[1]] : null;
    const ok = sum === target;
    const stateOf = (i: number): CellState => {
        if (show && answer && answer.includes(i)) return "ok";
        if (!sel.includes(i)) return "idle";
        return ok ? "ok" : "a";
    };

    let narration;
    if (sel.length < 2) {
        narration = `Choose ${2 - sel.length} more number${sel.length === 1 ? "" : "s"}.`;
    } else if (ok) {
        narration = `${values[sel[0]]} + ${values[sel[1]]} = ${sum}. Correct, the answer is [${Math.min(...sel)}, ${Math.max(...sel)}].`;
    } else {
        narration = `${values[sel[0]]} + ${values[sel[1]]} = ${sum}, which is too ${sum! > target ? "big" : "small"}.`;
    }

    return (
        <div>
            <p className="mb-2 text-ink">
                Pick two numbers whose sum is {target}. Tap a number to select
                it, tap again to unselect.
            </p>
            <Cells values={values} stateOf={stateOf} onPick={toggle} />
            <p
                role="status"
                aria-live="polite"
                className={`mt-3 min-h-[3.2em] text-[1.05rem] leading-relaxed ${
                    sel.length < 2
                        ? "text-ink"
                        : ok
                          ? "font-semibold text-c1i"
                          : "font-semibold text-c3i"
                }`}
            >
                {narration}
            </p>
            {show && (
                <p className="text-[0.95rem] text-muted">
                    {answer
                        ? `The pair is at indices [${answer[0]}, ${answer[1]}].`
                        : `No two numbers add up to ${target}.`}
                </p>
            )}
            <div className="mt-3.5 flex flex-wrap gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setSel([]);
                        setShow(false);
                    }}
                >
                    Clear
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShow(true)}>
                    Show the answer
                </Button>
            </div>
            <p className="mt-3 text-[0.9rem] text-muted">
                Notice how you did it: you probably saw a number and looked for
                its partner. That is exactly what the hash map approach automates.
            </p>
        </div>
    );
}

export function TwoSum({
    title,
    html,
    defaultInput = "2, 7, 11, 15",
    defaultTarget = 9,
    presets,
}: {
    title?: string;
    html?: string;
    defaultInput?: string;
    defaultTarget?: number;
    presets?: Array<[string, number]>;
}) {
    const [inputText, setInputText] = useState(defaultInput);
    const [targetText, setTargetText] = useState(String(defaultTarget));

    const values = useMemo(() => parseValues(inputText), [inputText]);
    const target = parseTarget(targetText);
    const valid = values.length >= 2 && target !== null;
    const presetList = presets ?? DEFAULT_PRESETS;

    const walk = (id: "brute" | "hash") => {
        const key = `two-sum:${id}`;
        return (
            <div>
                <p className="mb-2 text-ink">{TABS.find((t) => t.id === id)!.blurb}</p>
                <Stepper
                    values={values}
                    target={target!}
                    builder={getStepBuilder(key)!}
                    code={CODE[key]}
                />
            </div>
        );
    };

    return (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>{title ?? "▶️ Two Sum, step by step"}</CardTitle>
                <Badge variant="neutral">interactive</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {html && (
                    <div className="rich text-[0.92rem]">
                        <RichText html={html} />
                    </div>
                )}

                {/* Inputs */}
                <div className="rounded-xl border border-rule bg-neutral/40 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex min-w-48 flex-1 flex-col gap-1">
                            <Label
                                htmlFor="two-sum-input"
                                className="text-[0.85rem] text-muted"
                            >
                                Numbers (comma separated)
                            </Label>
                            <Input
                                id="two-sum-input"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="2, 7, 11, 15"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor="two-sum-target"
                                className="text-[0.85rem] text-muted"
                            >
                                Target
                            </Label>
                            <Input
                                id="two-sum-target"
                                className="w-24"
                                value={targetText}
                                onChange={(e) => setTargetText(e.target.value)}
                                placeholder="9"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[0.85rem] text-muted">Examples:</span>
                        {presetList.map(([pInput, pTarget]) => (
                            <Button
                                key={pInput + pTarget}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setInputText(pInput);
                                    setTargetText(String(pTarget));
                                }}
                            >
                                {pInput} → {pTarget}
                            </Button>
                        ))}
                    </div>
                </div>

                <Tabs defaultValue="try">
                    <TabsList>
                        {TABS.map((t) => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className="rounded-full"
                            >
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="try">
                        {valid ? (
                            <TryIt values={values} target={target!} />
                        ) : (
                            <Invalid />
                        )}
                    </TabsContent>
                    <TabsContent value="brute">
                        {valid ? walk("brute") : <Invalid />}
                    </TabsContent>
                    <TabsContent value="hash">
                        {valid ? walk("hash") : <Invalid />}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function Invalid() {
    return (
        <p role="status" aria-live="polite" className="font-semibold text-c3i">
            Enter at least two numbers and a target to start.
        </p>
    );
}