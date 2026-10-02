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
import { Button } from "../components/ui/button";

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
            className="mt-10 flex items-stretch justify-between gap-3 border-t border-rule pt-6"
        >
            {prev ? (
                <Button
                    variant="outline"
                    asChild
                    className="max-w-45 justify-start"
                >
                    <Link to={hrefFor(prev)}>
                        <ArrowLeftIcon className="size-4 shrink-0" />
                        <span className="truncate">{TOPIC_LABELS[prev]}</span>
                    </Link>
                </Button>
            ) : (
                <span />
            )}

            <span className="self-center text-xs text-muted">
                {i + 1} / {PAGED_IDS.length}
            </span>

            {next ? (
                <Button
                    variant="outline"
                    asChild
                    className="max-w-45 justify-end"
                >
                    <Link to={hrefFor(next)}>
                        <span className="truncate">{TOPIC_LABELS[next]}</span>
                        <ArrowRightIcon className="size-4 shrink-0" />
                    </Link>
                </Button>
            ) : (
                <span />
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
            <h1 className="font-serif mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
            </h1>

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
                <>
                    {content.intro && (
                        <p className="mb-6 max-w-3xl leading-relaxed text-muted">
                            {content.intro}
                        </p>
                    )}
                    <TopicRenderer blocks={content.blocks} />
                    <PrevNext id={id} />
                </>
            )}
        </article>
    );
}
