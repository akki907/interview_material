// src/pages/TopicPage.tsx — renders a topic's content blocks
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { CONTENT_LOADERS } from "../content/loaders";
import { getContent } from "../content/registry";
import { TOPIC_IDS, TOPIC_LABELS } from "../lib/data";
import { hrefFor, isStandaloneRoute } from "../lib/routes";
import type { TopicContent } from "../lib/types";
import { TopicRenderer } from "../components/content/TopicRenderer";
import { PageSkeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { TopicDiagrams } from "../components/content/TopicDiagrams";
import {
    Card,
    CardContent,
    CardEyebrow,
} from "../components/ui/card";
import { PageHeader } from "../components/app/PageHeader";
import { CompleteToggle } from "../components/app/CompleteToggle";

/** Ordered ids of the navigable study topics, for prev/next paging. */
const PAGED_IDS = TOPIC_IDS.filter((id) => !isStandaloneRoute(id));

function PrevNext({ id }: { id: string }) {
    const i = PAGED_IDS.indexOf(id);
    if (i === -1) return null;

    const prev = i > 0 ? PAGED_IDS[i - 1] : undefined;
    const next = i < PAGED_IDS.length - 1 ? PAGED_IDS[i + 1] : undefined;

    if (!prev && !next) return null;

    return (
        <nav
            aria-label="Topic pagination"
            className="mt-10 grid grid-cols-[1fr_auto] items-stretch gap-3 sm:grid-cols-3"
        >
            {prev ? (
                <Link
                    to={hrefFor(prev)}
                    className="group min-w-0 focus-visible:outline-none"
                >
                    <Card interactive className="h-full">
                        <CardContent className="flex h-full items-center gap-3 py-3.5">
                            <ArrowLeftIcon className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-x-0.5" />
                            <div className="min-w-0">
                                <CardEyebrow>Previous</CardEyebrow>
                                <p className="truncate text-sm font-semibold">
                                    {TOPIC_LABELS[prev]}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ) : (
                <span className="hidden sm:block" />
            )}

            <div className="col-span-2 flex items-center justify-center sm:col-span-1">
                <span className="rounded-full bg-neutral px-3 py-1 text-xs tabular-nums text-muted">
                    {i + 1} / {PAGED_IDS.length}
                </span>
            </div>

            {next ? (
                <Link
                    to={hrefFor(next)}
                    className="group col-start-2 min-w-0 focus-visible:outline-none sm:col-start-3"
                >
                    <Card interactive className="h-full">
                        <CardContent className="flex h-full items-center justify-end gap-3 py-3.5 text-right">
                            <div className="min-w-0">
                                <CardEyebrow>Next</CardEyebrow>
                                <p className="truncate text-sm font-semibold">
                                    {TOPIC_LABELS[next]}
                                </p>
                            </div>
                            <ArrowRightIcon className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                        </CardContent>
                    </Card>
                </Link>
            ) : (
                <span className="hidden sm:block" />
            )}
        </nav>
    );
}

export function TopicPage() {
    const { id = "" } = useParams();
    const title = TOPIC_LABELS[id] ?? id;
    const [content, setContent] = useState<TopicContent | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "missing">(
        "loading",
    );

    useEffect(() => {
        let cancelled = false;
        const loader = CONTENT_LOADERS[id];

        if (!loader) {
            setContent(null);
            setStatus("missing");
            return;
        }

        setStatus("loading");
        setContent(null);
        // Content modules self-register on import, so the module for this route
        // must be evaluated before the registry can be read.
        loader().then(() => {
            if (cancelled) return;
            const found = getContent(id);
            setContent(found ?? null);
            setStatus(found ? "ready" : "missing");
        });

        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <article>
            <PageHeader
                title={title}
                intro={status === "ready" ? (content?.intro ?? undefined) : undefined}
                action={<CompleteToggle topicId={id} />}
            />

            {status === "loading" && (
                <div className="mt-6">
                    <PageSkeleton />
                </div>
            )}

            {status === "missing" && (
                <p className="mt-6 rounded-md border border-rule bg-neutral px-4 py-3 text-sm text-muted">
                    No content is registered for this topic.
                </p>
            )}

            {status === "ready" && content && (
                <Tabs defaultValue="content">
                    <TabsList>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content">
                        <TopicRenderer blocks={content.blocks} />
                        <PrevNext id={id} />
                    </TabsContent>

                    <TabsContent value="diagrams">
                        <TopicDiagrams blocks={content.blocks} />
                    </TabsContent>
                </Tabs>
            )}
        </article>
    );
}
