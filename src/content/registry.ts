// src/content/registry.ts — topic content lookup
import type { TopicContent } from "../lib/types";

const registry = new Map<string, TopicContent>();

export function registerContent(content: TopicContent) {
    registry.set(content.id, content);
}

export function getContent(id: string): TopicContent | undefined {
    return registry.get(id);
}
