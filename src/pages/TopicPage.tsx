// src/pages/TopicPage.tsx — renders any topic's content blocks
import { useParams } from 'react-router-dom';
import { getContent } from '../content/registry';
import { TOPIC_LABELS } from '../lib/data';
import { TopicRenderer } from '../components/content/TopicRenderer';
import { Card, CardContent } from '../components/ui/card';

export function TopicPage() {
    const { id = '' } = useParams();
    const content = getContent(id);
    const title = TOPIC_LABELS[id] ?? id;

    return (
        <article>
            <h1 className="font-serif mb-1 text-3xl font-bold tracking-tight">{title}</h1>
            {content?.intro && <p className="mb-5 max-w-3xl text-muted">{content.intro}</p>}

            {content ? (
                <TopicRenderer blocks={content.blocks} />
            ) : (
                <Card>
                    <CardContent>
                        <p className="text-sm text-muted">
                            This topic is being migrated to the new React architecture and its content is not
                            wired up yet. It remains available on the{' '}
                            <code className="rounded border border-rule bg-neutral px-1 py-0.5 font-mono text-xs">
                                pre-react-rewrite
                            </code>{' '}
                            branch.
                        </p>
                    </CardContent>
                </Card>
            )}
        </article>
    );
}