// src/pages/TopicPage.tsx — renders any topic's content blocks
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CONTENT_LOADERS } from "../content/loaders";
import { getContent } from "../content/registry";
import { TOPIC_LABELS } from "../lib/data";
import type { TopicContent } from "../lib/types";
import { TopicRenderer } from "../components/content/TopicRenderer";
import { Spinner } from "../components/ui/spinner";

export function TopicPage() {
    const { id = "" } = useParams();
    const title = TOPIC_LABELS[id] ?? id;
    const [content, setContent] = useState<TopicContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // Content modules register themselves on import, so the module for this
        // route has to be pulled in before the registry can be read.
        const loader = CONTENT_LOADERS[id];
        if (!loader) {
            setLoading(false);
            return;
        }
        setLoading(true);
        loader().then(() => {
            if (!cancelled) {
                setContent(getContent(id) ?? null);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <article>
            <h1 className="font-serif mb-1 text-3xl font-bold tracking-tight">
                {title}
            </h1>
            {content?.intro && (
                <p className="mb-5 max-w-3xl text-muted">{content.intro}</p>
            )}

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Spinner />
                </div>
            ) : content ? (
                <TopicRenderer blocks={content.blocks} />
            ) : (
                <p className="text-sm text-muted">
                    No content is registered for this topic.
                </p>
            )}
        </article>
    );
}
