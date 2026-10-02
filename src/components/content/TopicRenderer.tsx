// src/components/content/TopicRenderer.tsx — renders a TopicContent block list
import type { ContentBlock } from "../../lib/types";
import { motion } from "motion/react";
import { cn, difficultyStars } from "../../lib/utils";
import { RichText } from "./RichText";
import { Diagram } from "./Diagram";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useStore } from "../../lib/store";

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
                "my-4 rounded-md px-4 py-3",
                palette[tone] ?? palette.info,
            )}
        >
            {title && (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider opacity-80">
                    {title}
                </p>
            )}
            <div className="rich text-[0.92rem]">
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
        <button
            type="button"
            aria-label={on ? "Remove bookmark" : "Bookmark section"}
            onClick={() => toggleBookmark(id)}
            className={cn(
                "rounded p-1 text-lg leading-none transition-colors hover:bg-neutral cursor-pointer",
                on ? "text-orange" : "text-rule hover:text-muted",
            )}
        >
            {on ? "★" : "☆"}
        </button>
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
                <CardTitle>{title ?? "🎤 Interview Q&A"}</CardTitle>
                <Badge variant="neutral">{items.length} questions</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {items.map((item, i) => (
                    <Collapsible key={i} defaultOpen={i === 0}>
                        <CollapsibleTrigger>
                            <span className="flex flex-1 items-center gap-2">
                                <span className="shrink-0 text-muted">
                                    Q{i + 1}.
                                </span>
                                <span>{item.q}</span>
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
                        <CollapsibleContent className="pt-1">
                            <RichText html={item.a} />
                            {item.probing && (
                                <p className="mt-3 border-l-2 border-focus pl-3 text-sm text-muted">
                                    <span className="font-semibold text-ink">
                                        What they're probing:{" "}
                                    </span>
                                    {item.probing}
                                </p>
                            )}
                            {item.followUp && (
                                <p className="mt-2 border-l-2 border-c2i pl-3 text-sm text-muted">
                                    <span className="font-semibold text-ink">
                                        Likely follow-up:{" "}
                                    </span>
                                    {item.followUp}
                                </p>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    );
}

function Block({ block }: { block: ContentBlock }) {
    switch (block.kind) {
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
            return <Diagram source={block.source} caption={block.caption} />;

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
            return (
                <Card className="mb-4">
                    <Collapsible defaultOpen={block.open}>
                        <CollapsibleTrigger>{block.title}</CollapsibleTrigger>
                        <CollapsibleContent>
                            <RichText html={block.html} />
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            );

        case "table":
            return (
                <Card className="mb-4">
                    {block.title && (
                        <CardHeader>
                            <CardTitle>{block.title}</CardTitle>
                        </CardHeader>
                    )}
                    <CardContent className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    {block.headers.map((hd) => (
                                        <th
                                            key={hd}
                                            className="border border-rule bg-c0 px-3 py-2 text-left text-c0i"
                                        >
                                            <RichText html={hd} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {block.rows.map((row, ri) => (
                                    <tr key={ri}>
                                        {row.map((cell, ci) => (
                                            <td
                                                key={ci}
                                                className="border border-rule px-3 py-2 align-top"
                                            >
                                                <RichText html={cell} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            );

        case "chips":
            return (
                <div className="my-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {block.items.map(([label, value, tone]) => (
                        <div
                            key={label}
                            className={cn(
                                "rounded-md border border-rule px-3 py-2.5 text-center",
                                tone === "good" && "bg-c1 border-c1i",
                                tone === "warn" && "bg-c3 border-c3i",
                                tone === "info" && "bg-c4 border-c4i",
                                !tone && "bg-neutral",
                            )}
                        >
                            <div className="font-serif text-lg leading-tight font-bold text-ink">
                                {value}
                            </div>
                            <div className="mt-0.5 text-[10px] tracking-wider text-muted uppercase">
                                {label}
                            </div>
                        </div>
                    ))}
                </div>
            );

        case "deflist":
            return (
                <dl className="my-4">
                    {block.pairs.map(([term, def]) => (
                        <div key={term} className="mt-3 first:mt-0">
                            <dt className="font-mono text-sm font-semibold text-focus">
                                {term}
                            </dt>
                            <dd className="mt-0.5 text-sm leading-relaxed text-muted">
                                {def}
                            </dd>
                        </div>
                    ))}
                </dl>
            );

        case "tabs":
            return (
                <Tabs className="mb-4">
                    <TabsList>
                        {block.tabs.map((t) => (
                            <TabsTrigger key={t.label} value={t.label}>
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {block.tabs.map((t) => (
                        <TabsContent key={t.label} value={t.label}>
                            <RichText html={t.html} />
                        </TabsContent>
                    ))}
                </Tabs>
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
                        <pre className="overflow-x-auto rounded-md bg-code p-4 text-[13px] leading-relaxed">
                            <code className="text-[#e6edf7]">{block.code}</code>
                        </pre>
                        {block.notes && (
                            <div className="mt-3 text-sm text-muted">
                                <RichText html={block.notes} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            );

        case "pipeline":
            return (
                <div className="my-5 flex flex-wrap items-stretch gap-1.5">
                    {block.stages.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-1.5">
                            <div className="min-w-32 flex-1 rounded-md border border-rule bg-neutral px-3 py-2">
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
                            </div>
                            {i < block.stages.length - 1 && (
                                <span className="text-muted">→</span>
                            )}
                        </div>
                    ))}
                </div>
            );
    }
}

export function TopicRenderer({ blocks }: { blocks: ContentBlock[] }) {
    return (
        <div>
            {blocks.map((block, i) => (
                <motion.div
                    key={i}
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
