// src/components/content/interactive/TwoSum.tsx — the Two Sum visualizer
//
// Owns the inputs, presets and tabs. The "Brute force" and "Hash map" tabs
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
import { Stepper } from "./Stepper";
import { getStepBuilder } from "../../../lib/interactive/registry";
import { parseTarget, parseValues } from "../../../lib/interactive/types";

const DEFAULT_PRESETS: Array<[string, number]> = [
    ["2, 7, 11, 15", 9],
    ["3, 2, 4", 6],
    ["3, 3", 6],
    ["1, 5, 8, 3, 9, 4", 12],
];

function findPair(values: number[], target: number): [number, number] | null {
    for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
            if (values[i] + values[j] === target) return [i, j];
        }
    }
    return null;
}

function verdictFor(sum: number, target: number): string {
    if (sum === target) return "That is the target — correct!";
    return sum < target
        ? "That is too small. Try a bigger second number."
        : "That is too big. Try a smaller second number.";
}

/** Solve it by hand: pick two cells, read the running sum. */
function TryIt({ values, target }: { values: number[]; target: number }) {
    const [picked, setPicked] = useState<number[]>([]);
    const [answer, setAnswer] = useState<string | null>(null);

    function toggle(i: number) {
        setAnswer(null);
        setPicked((sel) =>
            sel.includes(i)
                ? sel.filter((x) => x !== i)
                : sel.length < 2
                  ? [...sel, i]
                  : sel,
        );
    }

    function showAnswer() {
        const pair = findPair(values, target);
        if (pair) {
            setPicked(pair);
            setAnswer(
                `${values[pair[0]]} and ${values[pair[1]]} add up to ${target}, at indices [${pair[0]}, ${pair[1]}].`,
            );
        } else {
            setPicked([]);
            setAnswer(`No pair in this array adds up to ${target}.`);
        }
    }

    let narration =
        "Tap a number, then a second one. You are looking for two numbers in this array that add up to the target.";
    if (picked.length === 1) {
        narration = `Picked ${values[picked[0]]} at index ${picked[0]}. Now pick one more number.`;
    } else if (picked.length === 2) {
        const [i, j] = picked;
        const sum = values[i] + values[j];
        narration = `${values[i]} + ${values[j]} = ${sum}, target ${target}. ${verdictFor(sum, target)}`;
    }

    return (
        <div className="rounded-lg border border-rule bg-neutral/50 p-4">
            <div className="flex flex-wrap gap-2">
                {values.map((v, i) => {
                    const slot = picked.indexOf(i);
                    const pressed = slot !== -1;
                    return (
                        <Button
                            key={i}
                            variant="outline"
                            aria-pressed={pressed}
                            aria-label={`Number ${v} at index ${i}`}
                            onClick={() => toggle(i)}
                            className={`size-11 shrink-0 rounded-md border font-mono text-sm font-bold ${
                                slot === 0
                                    ? "border-c4i bg-c4 text-c4i"
                                    : slot === 1
                                      ? "border-c3i bg-c3 text-c3i"
                                      : "border-rule bg-surface text-ink hover:border-focus"
                            }`}
                        >
                            {v}
                        </Button>
                    );
                })}
            </div>
            <p
                role="status"
                aria-live="polite"
                className="mt-4 min-h-10 text-sm leading-relaxed text-ink"
            >
                {narration}
            </p>
            {answer && (
                <p className="mt-2 text-sm leading-relaxed text-ink">{answer}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={showAnswer}>
                    Show the answer
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setPicked([]);
                        setAnswer(null);
                    }}
                >
                    Reset
                </Button>
            </div>
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
    // Bumped on every input change so the Try-it pane starts over.
    const [epoch, setEpoch] = useState(0);

    const values = useMemo(() => parseValues(inputText), [inputText]);
    const target = parseTarget(targetText);

    const brute = getStepBuilder("two-sum:brute")!;
    const hash = getStepBuilder("two-sum:hash")!;
    const presetList = presets ?? DEFAULT_PRESETS;

    const invalidReason =
        values.length < 2
            ? "Enter at least two numbers to step through."
            : target === null
              ? "Enter a numeric target to step through."
              : null;

    const onInput = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setEpoch((e) => e + 1);
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

                <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="two-sum-input">Numbers</Label>
                        <Input
                            id="two-sum-input"
                            value={inputText}
                            onChange={(e) => onInput(setInputText)(e.target.value)}
                            placeholder="2, 7, 11, 15"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="two-sum-target">Target</Label>
                        <Input
                            id="two-sum-target"
                            inputMode="numeric"
                            value={targetText}
                            onChange={(e) => onInput(setTargetText)(e.target.value)}
                            placeholder="9"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-muted uppercase">
                        Presets
                    </span>
                    {presetList.map(([presetInput, presetTarget]) => (
                        <Button
                            key={presetInput + presetTarget}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setInputText(presetInput);
                                setTargetText(String(presetTarget));
                                setEpoch((e) => e + 1);
                            }}
                        >
                            {presetInput} → {presetTarget}
                        </Button>
                    ))}
                </div>

                {invalidReason === null ? (
                    <Tabs defaultValue="try">
                        <TabsList>
                            <TabsTrigger value="try">Try it</TabsTrigger>
                            <TabsTrigger value="brute">Brute force</TabsTrigger>
                            <TabsTrigger value="hash">Hash map</TabsTrigger>
                        </TabsList>

                        <TabsContent value="try">
                            <TryIt
                                key={epoch}
                                values={values}
                                target={target as number}
                            />
                        </TabsContent>

                        <TabsContent value="brute">
                            <Stepper
                                values={values}
                                target={target as number}
                                builder={brute}
                            />
                        </TabsContent>

                        <TabsContent value="hash">
                            <Stepper
                                values={values}
                                target={target as number}
                                builder={hash}
                            />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <p
                        role="status"
                        aria-live="polite"
                        className="rounded-md bg-warn px-3 py-2 text-sm text-ink"
                    >
                        {invalidReason}
                    </p>
                )}

                {invalidReason === null && (
                    <p className="text-xs leading-relaxed text-muted">
                        The pair you just reasoned about by hand is exactly what the
                        hash map automates: instead of re-testing every pair, it
                        remembers what it has already seen and asks for the
                        complement once per number.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}