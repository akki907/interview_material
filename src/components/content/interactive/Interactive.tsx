// src/components/content/interactive/Interactive.tsx — the spec-driven panel
//
// Renders any `VisualizerSpec`: editable fields, preset examples, one tab per
// algorithm tier, and the shared Stepper. Two Sum is the exception — it keeps
// its hand-written "Try it" pane and is rendered by TwoSum.tsx.
import { useMemo, useState } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { RichText } from "../RichText";
import { Stepper } from "./Stepper";
import type { VisualizerSpec } from "../../../lib/interactive/spec";
import type { InteractiveStep } from "../../../lib/interactive/types";

function initialFields(
    spec: VisualizerSpec,
    overrides?: Record<string, string>,
): Record<string, string> {
    const start: Record<string, string> = {};
    for (const field of spec.fields) start[field.id] = field.default ?? "";
    return { ...start, ...overrides };
}

export function Interactive({
    spec,
    title,
    html,
    defaults,
}: {
    spec: VisualizerSpec;
    title?: string;
    html?: string;
    /** Field values from the content block, overriding the spec defaults. */
    defaults?: Record<string, string>;
}) {
    const [fields, setFields] = useState(() => initialFields(spec, defaults));
    const invalid = useMemo(
        () => spec.invalid?.(fields) ?? null,
        [spec, fields],
    );

    function setField(id: string, value: string) {
        setFields((f) => ({ ...f, [id]: value }));
    }

    const message = (
        <p role="status" aria-live="polite" className="font-semibold text-c3i">
            {invalid}
        </p>
    );

    return (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>{title ?? spec.title}</CardTitle>
                <Badge variant="neutral">interactive</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {html && (
                    <div className="rich text-[0.92rem]">
                        <RichText html={html} />
                    </div>
                )}

                <div className="rounded-xl border border-rule bg-neutral/40 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        {spec.fields.map((field) => (
                            <div
                                key={field.id}
                                className={
                                    field.size === "sm"
                                        ? "flex w-28 flex-col gap-1"
                                        : "flex min-w-48 flex-1 flex-col gap-1"
                                }
                            >
                                <Label
                                    htmlFor={`viz-${spec.algo}-${field.id}`}
                                    className="text-[0.85rem] text-muted"
                                >
                                    {field.label}
                                </Label>
                                <Input
                                    id={`viz-${spec.algo}-${field.id}`}
                                    inputMode={
                                        field.kind === "number" ? "numeric" : undefined
                                    }
                                    value={fields[field.id] ?? ""}
                                    placeholder={field.placeholder}
                                    onChange={(e) => setField(field.id, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {spec.presets && spec.presets.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[0.85rem] text-muted">
                                Examples:
                            </span>
                            {spec.presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFields(initialFields(spec, preset.fields))}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                <Tabs defaultValue={spec.tiers[0]?.id}>
                    <TabsList>
                        {spec.tiers.map((tier) => (
                            <TabsTrigger
                                key={tier.id}
                                value={tier.id}
                                className="rounded-full"
                            >
                                {tier.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {spec.tiers.map((tier) => (
                        <TabsContent key={tier.id} value={tier.id}>
                            {invalid === null ? (
                                <div>
                                    <p className="mb-2 text-ink">{tier.blurb}</p>
                                    <Stepper
                                        values={[]}
                                        target={0}
                                        code={tier.code}
                                        builder={() => tier.build(fields) as InteractiveStep[]}
                                    />
                                </div>
                            ) : (
                                message
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}