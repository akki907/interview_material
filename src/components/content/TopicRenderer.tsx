// src/components/content/TopicRenderer.tsx — renders a TopicContent block list
import { useMemo } from "react";
import type {
    CardBlock,
    CollapsibleBlock,
    ContentBlock,
} from "../../lib/types";
import { motion } from "motion/react";
import { ArrowRightIcon } from "lucide-react";
import { cn, difficultyStars } from "../../lib/utils";
import { RichText } from "./RichText";
import { Diagram } from "./Diagram";
import { CodeBlock } from "./CodeBlock";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { useStore } from "../../lib/store";
import { TwoSum } from "./interactive/TwoSum";
import { Interactive } from "./interactive/Interactive";
import { getVisualizer } from "../../lib/interactive/registry";

function Callout({
    tone = "info",
    title,
    html,
}: {
    tone?: string;
    title?: string;
    html: string;
}) {
    const palette: Record<string, string> = {
        info: "bg-info text-ink",
        good: "bg-good text-ink",
        warn: "bg-warn text-ink",
        c0: "bg-c0 text-c0i",
        c1: "bg-c1 text-c1i",
        c2: "bg-c2 text-c2i",
        c3: "bg-c3 text-c3i",
        c4: "bg-c4 text-c4i",
        c5: "bg-c5 text-c5i",
    };
    return (
        <div
            className={cn(
                "my-4 overflow-hidden rounded-card border border-rule shadow-soft",
                palette[tone] ?? palette.info,
            )}
        >
            {title && (
                <p className="border-b border-current/10 px-4 py-2 text-[11px] font-bold tracking-wider uppercase opacity-80">
                    {title}
                </p>
            )}
            <div className="rich px-4 py-3 text-[0.92rem]">
                <RichText html={html} />
            </div>
        </div>
    );
}

function BookmarkToggle({ id }: { id: string }) {
    const bookmarks = useStore((s) => s.bookmarks);
    const toggleBookmark = useStore((s) => s.toggleBookmark);
    const on = bookmarks.includes(id);

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={on ? "Remove bookmark" : "Bookmark section"}
            aria-pressed={on}
            onClick={() => toggleBookmark(id)}
            className={cn(
                "size-auto p-1 text-lg leading-none",
                on ? "text-orange" : "text-rule hover:text-muted",
            )}
        >
            {on ? "" : ""}
        </Button>
    );
}

/** One collapsible question row. */
function CollapsibleItem({ block }: { block: ContentBlock }) {
    if (block.kind !== "collapsible") return null;
    return (
        <Collapsible defaultOpen={block.open}>
            <CollapsibleTrigger>{block.title}</CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-rule px-3 pb-3">
                    <RichText html={block.html} />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * A title card plus the block(s) that follow it, drawn as one card.
 *
 * Produced by groupBlocks for the legacy "title-only card" pattern. Handles
 * both shapes found in the content: a title card followed by a run of
 * collapsible Q&A blocks, and a title card followed by a single diagram or
 * pipeline block.
 */
function TitledGroup({
    title,
    items,
}: {
    title?: string;
    items: ContentBlock[];
}) {
    const collapsible = items.every((b) => b.kind === "collapsible");
    const questions = collapsible ? items.length : 0;

    return (
        <Card className="mb-4">
            {title && (
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    {questions > 0 && (
                        <Badge variant="neutral">
                            {questions} question{questions === 1 ? "" : "s"}
                        </Badge>
                    )}
                </CardHeader>
            )}
            <CardContent
                className={cn(collapsible && "flex flex-col gap-1 p-2")}
            >
                {collapsible ? (
                    items.map((b, i) => (
                        <CollapsibleItem key={i} block={b} />
                    ))
                ) : (
                    items.map((b, i) => (
                        // Nested blocks bring their own margin and border; the
                        // group owns both.
                        <div
                            key={i}
                            className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        >
                            <Block block={b} bare />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function QABlockView({
    items,
    title,
}: {
    items: import("../../lib/types").QAItem[];
    title?: string;
}) {
    return (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>{title ?? "Interview Q&A"}</CardTitle>
                <Badge variant="neutral">{items.length} questions</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {items.map((item, i) => (
                    <Collapsible key={i} defaultOpen={i === 0}>
                        <CollapsibleTrigger>
                            <span className="flex flex-1 items-start gap-2.5">
                                <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-c2 text-[10px] font-bold text-c2i">
                                    {i + 1}
                                </span>
                                <span className="leading-snug">{item.q}</span>
                            </span>
                            {item.level && (
                                <span
                                    className="shrink-0 tracking-widest text-c3i"
                                    aria-label={`Difficulty ${item.level} of 5`}
                                    title={`Difficulty ${item.level}/5`}
                                >
                                    {difficultyStars(item.level)}
                                </span>
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-1 ml-7 border-l-2 border-rule pl-4">
                            <RichText html={item.a} />
                            {item.probing && (
                                <p className="mt-3 rounded-md border-l-2 border-focus bg-neutral px-3 py-2 text-sm text-muted">
                                    <span className="font-semibold text-ink">
                                        What they're probing:{" "}
                                    </span>
                                    {item.probing}
                                </p>
                            )}
                            {item.followUp && (
                                <p className="mt-2 rounded-md border-l-2 border-c2i bg-neutral px-3 py-2 text-sm text-muted">
                                    <span className="font-semibold text-ink">
                                        Likely follow-up:{" "}
                                    </span>
                                    {item.followUp}
                                </p>
                            )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    );
}

function Block({
    block,
    bare = false,
}: {
    block: ContentBlock;
    /** Render without the block's own chrome when nested in a group. */
    bare?: boolean;
}) {
    switch (block.kind) {
        // Synthetic: produced by groupBlocks from a title-only card.
        case "titled-group":
            return <TitledGroup title={block.title} items={block.items} />;

        case "card":
            return (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>{block.title}</CardTitle>
                        <BookmarkToggle id={block.id ?? block.title} />
                    </CardHeader>
                    <CardContent>
                        {block.html && <RichText html={block.html} />}
                        {block.after}
                    </CardContent>
                </Card>
            );

        case "diagram":
            return (
                <Diagram
                    source={block.source}
                    caption={block.caption}
                    bare={bare}
                />
            );

        case "callout":
            return (
                <Callout
                    tone={block.tone}
                    title={block.title}
                    html={block.html}
                />
            );

        case "qa":
            return <QABlockView items={block.items} title={block.title} />;

        case "collapsible":
            // Normally wrapped by TitledGroup (see groupBlocks), which renders
            // a run of these as a single titled card.
            return <CollapsibleItem block={block} />;

        case "table":
            return (
                <Card className="mb-4">
                    {block.title && (
                        <CardHeader>
                            <CardTitle>{block.title}</CardTitle>
                        </CardHeader>
                    )}
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {block.headers.map((hd) => (
                                        <TableHead key={hd}>
                                            <RichText html={hd} />
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {block.rows.map((row, ri) => (
                                    <TableRow key={ri}>
                                        {row.map((cell, ci) => (
                                            <TableCell key={ci}>
                                                <RichText html={cell} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            );

        case "chips":
            return (
                <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {block.items.map(([label, value, tone]) => (
                        <Card
                            key={label}
                            className={cn(
                                "text-center",
                                tone === "good" && "border-c1i/30 bg-c1",
                                tone === "warn" && "border-c3i/30 bg-c3",
                                tone === "info" && "border-c4i/30 bg-c4",
                                !tone && "bg-neutral",
                            )}
                        >
                            <CardContent className="px-3 py-3">
                                <div className="font-serif text-lg leading-tight font-bold text-ink">
                                    {value}
                                </div>
                                <div className="mt-0.5 text-[10px] tracking-wider text-muted uppercase">
                                    {label}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );

        case "deflist":
            return (
                <Card className="mb-4">
                    <CardContent>
                        <dl className="flex flex-col">
                            {block.pairs.map(([term, def], i) => (
                                <div
                                    key={term}
                                    className={cn(
                                        "py-3",
                                        i > 0 && "border-t border-rule",
                                    )}
                                >
                                    <dt className="font-mono text-sm font-semibold text-focus">
                                        {term}
                                    </dt>
                                    <dd className="mt-1 text-sm leading-relaxed text-muted">
                                        {def}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </CardContent>
                </Card>
            );

        case "tabs":
            return (
                <Card className="mb-4 gap-0 p-0">
                    <Tabs>
                        <TabsList className="rounded-t-card border-b border-rule bg-neutral/50 p-2">
                            {block.tabs.map((t) => (
                                <TabsTrigger key={t.label} value={t.label}>
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {block.tabs.map((t) => (
                            <TabsContent
                                key={t.label}
                                value={t.label}
                                className="px-5 py-4"
                            >
                                <RichText html={t.html} />
                            </TabsContent>
                        ))}
                    </Tabs>
                </Card>
            );

        case "code":
            return (
                <Card className="mb-4">
                    {block.title && (
                        <CardHeader>
                            <CardTitle>{block.title}</CardTitle>
                            <Badge variant="neutral">{block.language}</Badge>
                        </CardHeader>
                    )}
                    <CardContent>
                        <CodeBlock code={block.code}>
                            <pre
                                // A code line longer than the column scrolls;
                                // without a tab stop that scroll is mouse-only.
                                tabIndex={0}
                                role="group"
                                aria-label="Code block, scrollable"
                                className="overflow-x-auto rounded-md bg-code p-4 text-[13px] leading-relaxed"
                            >
                                <code className="text-code-ink">{block.code}</code>
                            </pre>
                        </CodeBlock>
                        {block.notes && (
                            <div className="mt-3 text-sm text-muted">
                                <RichText html={block.notes} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            );

        case "interactive": {
            // Registry-keyed: adding an algorithm means adding a spec, not
            // touching this switch. Two Sum keeps a hand-written try-it pane.
            const spec = getVisualizer(block.algo);
            if (spec) {
                return (
                    <Interactive
                        spec={spec}
                        title={block.title}
                        html={block.html}
                        defaults={block.defaults?.fields}
                    />
                );
            }
            if (block.algo !== "two-sum") return null;
            return <TwoSum title={block.title} html={block.html} />;
        }

        case "pipeline":
            return (
                <Card className="mb-4">
                    <CardContent>
                        <div className="flex flex-wrap items-stretch gap-2">
                            {block.stages.map((s, i) => (
                                <div
                                    key={`${s.name}-${i}`}
                                    className="flex items-center gap-2"
                                >
                                    <Card className="min-w-32 flex-1 bg-neutral">
                                        <CardContent className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-c2 text-[10px] font-bold text-c2i">
                                                    {i + 1}
                                                </span>
                                                <span className="text-xs font-semibold">
                                                    {s.name}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] leading-snug text-muted">
                                                {s.desc}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    {i < block.stages.length - 1 && (
                                        <ArrowRightIcon className="size-3.5 shrink-0 text-muted" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            );
    }
}

/**
 * Fold a run of `collapsible` blocks into a single CollapsibleGroup, using a
 * preceding title-only `card` as the group's heading when there is one.
 */
/** True for a card block that carries only a title (legacy section header). */
function isTitleOnlyCard(b: ContentBlock): b is CardBlock {
    return b.kind === "card" && !b.html && !b.after;
}

function isCollapsible(b: ContentBlock): b is CollapsibleBlock {
    return b.kind === "collapsible";
}

/**
 * Fold a title-only card together with the block(s) that follow it.
 *
 * Collapsible runs and single following blocks are both adopted, so the title
 * becomes the header of one card instead of an empty card sitting above the
 * real content. A run of collapsibles with no title card still groups, just
 * without a heading.
 */
function groupBlocks(blocks: ContentBlock[]): ContentBlock[] {
    const out: ContentBlock[] = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        if (isTitleOnlyCard(block)) {
            // Adopt a following run of collapsibles...
            let j = i + 1;
            while (j < blocks.length && isCollapsible(blocks[j])) j++;
            if (j > i + 1) {
                out.push({
                    kind: "titled-group",
                    title: block.title,
                    items: blocks.slice(i + 1, j),
                });
                i = j - 1;
                continue;
            }
            // ...or a single following block (diagram, pipeline, ...).
            const next = blocks[i + 1];
            if (
                next &&
                next.kind !== "card" &&
                next.kind !== "collapsible"
            ) {
                out.push({
                    kind: "titled-group",
                    title: block.title,
                    items: [next],
                });
                i += 1;
                continue;
            }
        }

        if (isCollapsible(block)) {
            let j = i;
            while (j < blocks.length && isCollapsible(blocks[j])) j++;
            out.push({ kind: "titled-group", items: blocks.slice(i, j) });
            i = j - 1;
            continue;
        }

        out.push(block);
    }

    return out;
}

/** Prefix for the per-block anchor ids the contents list links to. */
const SECTION_ID_PREFIX = "topic-section-";

/**
 * Leading symbols are dropped from contents entries: section titles are
 * authored with a leading emoji as a visual anchor, and repeating 13 of them
 * down a nav column is noise that assistive tech also reads aloud.
 */
const LEADING_SYMBOLS = /^[^\p{L}\p{N}]+/u;


interface Section {
    id: string;
    title: string;
}

export function TopicRenderer({ blocks: rawBlocks }: { blocks: ContentBlock[] }) {
    const blocks = useMemo(() => groupBlocks(rawBlocks), [rawBlocks]);
    const sections = useMemo<Section[]>(
        () =>
            blocks.flatMap((block, i) => {
                // Not every block kind carries a title, so the union is
                // narrowed rather than asserted.
                if (!("title" in block) || typeof block.title !== "string") {
                    return [];
                }
                const label = block.title.trim().replace(LEADING_SYMBOLS, "");
                if (!label) return [];
                return [{ id: `${SECTION_ID_PREFIX}${i}`, title: label }];
            }),
        [blocks],
    );


    // A two-section page does not need a contents list; the heading above it
    // costs more space than it saves.
    const showContents = sections.length >= 3;

    return (
        <div>
            {showContents && (
                <nav
                    aria-label="On this page"
                    className="mb-5 rounded-card border border-rule bg-surface p-4"
                >
                    <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                        On this page
                    </p>
                    {/* `min-w-0` on each item: a grid item defaults to
                        min-width:auto, so without it an entry sizes to its
                        content, the column overflows the card, and `truncate`
                        never engages. */}
                    <ul className="grid gap-1 sm:grid-cols-2">
                        {sections.map((s) => (
                            <li key={s.id} className="min-w-0">
                                <a
                                    href={`#${s.id}`}
                                    onClick={(e) => {
                                        // The content column, not the window, is
                                        // the scroll container, so the anchor is
                                        // resolved by hand.
                                        e.preventDefault();
                                        document
                                            .getElementById(s.id)
                                            ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                    }}
                                    className="block truncate rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-neutral hover:text-ink focus-visible:ring-[3px] focus-visible:ring-focus/30"
                                >
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}

            {blocks.map((block, i) => (
                <motion.div
                    key={i}
                    // scroll-mt clears the sticky header when a contents link
                    // scrolls its section to the top of the viewport.
                    id={`${SECTION_ID_PREFIX}${i}`}
                    className="scroll-mt-24"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.3,
                        // Cap the stagger: a topic can hold 20+ blocks and an
                        // uncapped delay makes the tail feel unresponsive.
                        delay: Math.min(i, 8) * 0.04,
                        ease: [0.4, 0, 0.2, 1],
                    }}
                >
                    <Block block={block} />
                </motion.div>
            ))}
        </div>
    );
}
