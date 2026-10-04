// src/components/content/TopicDiagrams.tsx
//
// Every diagram in a topic, gathered into one place and laid out the way the
// reference page does it: a sticky pill index, then a flat reading surface
// where the source is copyable, collapsible, and steppable.
//
// The diagrams stay where they are in the body as well. This is a second view
// for studying them side by side, not a move — a topic that explains a
// pipeline still shows that pipeline inline where the explanation is.
//
// Deliberately not cards: the diagrams read as one continuous surface, and
// boxing each one adds chrome without separating anything. Hairline rules
// between sections do that job.
import { useCallback, useMemo, useState } from "react";
import { CheckIcon, CopyIcon, PauseIcon, PlayIcon } from "lucide-react";
import type { ContentBlock, DiagramBlock } from "../../lib/types";
import { Button } from "../ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import { Diagram } from "./Diagram";
import { DiagramWalk } from "./DiagramWalk";

interface Entry {
    key: string;
    title: string;
    block: DiagramBlock;
}

/**
 * Collect every diagram, including those folded into a titled group. The
 * group's heading becomes the diagram's title, because once `groupBlocks` has
 * folded it in that is the only place the information exists. A diagram with
 * no group falls back to its caption, which is far more use in an index than
 * the word "Diagram" repeated down the page.
 */
function collectDiagrams(
    blocks: ContentBlock[],
    parentTitle?: string,
): Entry[] {
    const out: { title: string; block: DiagramBlock }[] = [];
    for (const block of blocks) {
        if (block.kind === "diagram") {
            out.push({
                title:
                    parentTitle ??
                    block.caption?.split(/(?<=[.?!])\s/)[0]?.slice(0, 46) ??
                    "Diagram",
                block,
            });
        } else if (block.kind === "titled-group") {
            out.push(
                ...collectDiagrams(block.items, block.title ?? parentTitle),
            );
        }
    }
    // Keys are positional: content order is fixed per topic, so they are stable
    // across renders, and two identical diagrams cannot collide.
    return out.map((e, i) => ({ ...e, key: `diagram-${i}` }));
}

function CopySourceButton({ source }: { source: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(source);
        } catch {
            return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <CheckIcon className="text-c1i" /> : <CopyIcon />}
            {copied ? "Copied" : "Copy source"}
        </Button>
    );
}

export function TopicDiagrams({ blocks }: { blocks: ContentBlock[] }) {
    const entries = useMemo(() => collectDiagrams(blocks), [blocks]);
    const [roots, setRoots] = useState<Record<string, HTMLElement | null>>({});
    const [flow, setFlow] = useState(true);

    const setRoot = useCallback(
        (key: string) => (el: HTMLElement | null) =>
            setRoots((prev) =>
                prev[key] === el ? prev : { ...prev, [key]: el },
            ),
        [],
    );

    const toggleFlow = () => {
        setFlow((on) => {
            document.body.classList.toggle("still", on);
            return !on;
        });
    };

    if (entries.length === 0) return null;

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleFlow}
                    aria-pressed={flow}
                >
                    {flow ? <PauseIcon /> : <PlayIcon />}
                    Flow animation: {flow ? "on" : "off"}
                </Button>
                <p className="text-sm text-muted">
                    Use Play under a diagram to follow it step by step.
                </p>
            </div>

            <nav
                aria-label="Diagrams in this topic"
                className="sticky top-header z-20 mb-4 flex gap-2 overflow-x-auto py-2"
            >
                {entries.map((e, i) => (
                    <a
                        key={e.key}
                        href={`#${e.key}`}
                        className="shrink-0 rounded-full bg-neutral px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-accent hover:text-on-accent focus-visible:ring-[3px] focus-visible:ring-focus/30"
                    >
                        {i + 1}. {e.title}
                    </a>
                ))}
            </nav>

            <div className="divide-y divide-rule border-y border-rule">
                {entries.map((e, i) => (
                    <section key={e.key} id={e.key} className="scroll-mt-28 py-6">
                        <h2 className="mb-2 font-serif text-lg leading-snug font-extrabold tracking-[-0.02em] text-ink">
                            {i + 1}. {e.title}
                        </h2>

                        {e.block.caption && (
                            <p className="mb-3 max-w-[64ch] text-sm text-muted">
                                {e.block.caption}
                            </p>
                        )}

                        <Diagram
                            source={e.block.source}
                            bare
                            figureId={`${e.key}-fig`}
                            onReady={setRoot(e.key)}
                        />

                        <DiagramWalk root={roots[e.key] ?? null} />

                        <div className="mt-3 flex flex-wrap items-start gap-2">
                            <CopySourceButton source={e.block.source} />
                            <Collapsible className="min-w-64 flex-1">
                                <CollapsibleTrigger className="text-sm font-medium text-focus hover:underline">
                                    View Mermaid source
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <pre
                                        className="mt-2 overflow-x-auto rounded-card border border-rule bg-code p-4 text-[0.8rem] leading-relaxed text-code-ink"
                                        tabIndex={0}
                                        role="group"
                                        aria-label="Mermaid source, scrollable"
                                    >
                                        {e.block.source}
                                    </pre>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}