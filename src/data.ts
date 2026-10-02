// src/data.ts — All static data
import type { Progress } from './store';

/** Sidebar entry: a top-level page, or a group owning `children` topics. */
export interface NavEntry {
    id: string;
    label: string;
    children?: NavEntry[];
}

export interface Flashcard {
    cat: string;
    front: string;
    back: string;
}

export interface InterviewQuestion {
    topic: string;
    question: string;
    hint: string;
}

export interface Stats {
    problemsSolved: number;
    topicsCompleted: number;
    streak: number;
    learningHours: number;
}

export const NAV: NavEntry[] = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'dsa', label: '🧠 Data Structures & Algorithms', children: [
        { id: 'dsa-arrays', label: 'Arrays' },
        { id: 'dsa-strings', label: 'Strings' },
        { id: 'dsa-hashmaps', label: 'Hash Maps' },
        { id: 'dsa-two-pointers', label: 'Two Pointers' },
        { id: 'dsa-sliding-window', label: 'Sliding Window' },
        { id: 'dsa-stack', label: 'Stack' },
        { id: 'dsa-queue', label: 'Queue' },
        { id: 'dsa-linked-list', label: 'Linked List' },
        { id: 'dsa-binary-tree', label: 'Binary Tree' },
        { id: 'dsa-bst', label: 'BST' },
        { id: 'dsa-heap', label: 'Heap' },
        { id: 'dsa-graph', label: 'Graph' },
        { id: 'dsa-backtracking', label: 'Backtracking' },
        { id: 'dsa-dp', label: 'Dynamic Programming' },
        { id: 'dsa-greedy', label: 'Greedy' },
    ]},
    { id: 'react', label: '⚛️ React', children: [
        { id: 'react-fundamentals', label: 'Fundamentals' },
        { id: 'react-hooks', label: 'Hooks' },
        { id: 'react-state', label: 'State Management' },
        { id: 'react-performance', label: 'Performance' },
        { id: 'react-rendering', label: 'Rendering' },
        { id: 'react-architecture', label: 'React Architecture' },
        { id: 'react-interview', label: 'Interview Questions' },
    ]},
    { id: 'python', label: '🐍 Python', children: [
        { id: 'py-fundamentals', label: 'Fundamentals' },
        { id: 'py-functions', label: 'Functions' },
        { id: 'py-oop', label: 'OOP' },
        { id: 'py-iterators', label: 'Iterators & Generators' },
        { id: 'py-decorators', label: 'Decorators' },
        { id: 'py-asyncio', label: 'AsyncIO' },
        { id: 'py-concurrency', label: 'Concurrency' },
        { id: 'py-gil', label: 'GIL' },
        { id: 'py-fastapi', label: 'FastAPI' },
        { id: 'py-interview', label: 'Interview Questions' },
    ]},
    { id: 'ai', label: '🤖 AI Engineering', children: [
        { id: 'ai-llm', label: 'LLM Fundamentals' },
        { id: 'ai-embeddings', label: 'Embeddings' },
        { id: 'ai-vector-db', label: 'Vector Databases' },
        { id: 'ai-rag', label: 'RAG' },
        { id: 'ai-advanced-rag', label: 'Advanced RAG' },
        { id: 'ai-rag-eval', label: 'RAG Evaluation' },
        { id: 'ai-agents', label: 'Agents' },
        { id: 'ai-tool-calling', label: 'Tool Calling' },
        { id: 'ai-agent-memory', label: 'Agent Memory' },
        { id: 'ai-multi-agent', label: 'Multi-Agent Systems' },
        { id: 'ai-orchestration', label: 'Agent Orchestration' },
        { id: 'ai-system-design', label: 'AI System Design' },
    ]},
    { id: 'system-design', label: '🏗️ System Design', children: [
        { id: 'sd-scalability', label: 'Scalability' },
        { id: 'sd-load-balancing', label: 'Load Balancing' },
        { id: 'sd-caching', label: 'Caching' },
        { id: 'sd-databases', label: 'Databases' },
        { id: 'sd-replication', label: 'Replication' },
        { id: 'sd-sharding', label: 'Sharding' },
        { id: 'sd-queues', label: 'Queues' },
        { id: 'sd-event-driven', label: 'Event Driven Architecture' },
        { id: 'sd-microservices', label: 'Microservices' },
        { id: 'sd-api', label: 'API Design' },
        { id: 'sd-distributed', label: 'Distributed Systems' },
        { id: 'sd-realworld', label: 'Real World Designs' },
    ]},
    { id: 'interview', label: '🎯 Interview Mode' },
    { id: 'flashcards', label: '📇 Flashcards' },
];

export const PROGRESS: Progress = { dsa: 72, react: 81, python: 64, ai: 83, design: 51 };

export const STATS: Stats = { problemsSolved: 347, topicsCompleted: 42, streak: 18, learningHours: 216 };

export const WEAK_AREAS = ['Advanced RAG pipelines', 'Distributed consensus', 'Python GIL edge cases', 'Multi-agent orchestration'];

export const RECENTLY_STUDIED = ['Sliding Window', 'React.useEffect', 'AsyncIO Event Loop', 'RAG Evaluation', 'CAP Theorem'];

export const FLASHCARDS: Flashcard[] = [
    { cat: 'DSA', front: 'What is the time complexity of binary search?', back: 'O(log n) — each step halves the search space.' },
    { cat: 'DSA', front: 'When should you use a heap over a sorted array?', back: 'When you need efficient access to min/max with O(log n) insert/delete.' },
    { cat: 'React', front: 'What causes a stale closure in useEffect?', back: 'When the effect captures a state/props value from a previous render due to missing dependencies.' },
    { cat: 'React', front: 'What does React.memo do?', back: 'Memoizes a component — skips re-render if props are shallow-equal.' },
    { cat: 'Python', front: 'What is the GIL?', back: 'Global Interpreter Lock — a mutex allowing only one thread to execute Python bytecode at a time in CPython.' },
    { cat: 'Python', front: 'Generator vs list comprehension?', back: 'Generators are lazy (yield one at a time). List comprehensions build the full list in memory.' },
    { cat: 'RAG', front: 'Dense vs sparse retrieval?', back: 'Dense uses vector embeddings (semantic). Sparse uses keyword matching (BM25). Hybrid combines both.' },
    { cat: 'RAG', front: 'Common RAG failure modes?', back: 'Chunk too small → loses context. Chunk too large → noise. Poor embedding → irrelevant results.' },
    { cat: 'Agents', front: 'What is ReAct?', back: 'Reason + Act — alternates between thinking (reasoning) and acting (tool calls) based on observations.' },
    { cat: 'Agents', front: 'Why is agent memory important?', back: 'Without memory, each interaction is stateless. Memory enables context retention and multi-step reasoning.' },
    { cat: 'System Design', front: 'Explain CAP theorem.', back: 'A distributed system can only guarantee 2 of 3: Consistency, Availability, Partition Tolerance.' },
    { cat: 'System Design', front: 'What is eventual consistency?', back: 'After a write, reads may return stale data temporarily, but all replicas eventually converge.' },
];

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
    { topic: 'AI', question: 'Design a RAG system for 10 million documents.', hint: 'Consider chunking strategy, embedding model, vector DB, retrieval pipeline, reranking, and evaluation.' },
    { topic: 'DSA', question: 'Given an array of integers, find the longest subarray with sum equals k.', hint: 'Consider prefix sums with a hash map for O(n) time.' },
    { topic: 'System Design', question: 'Design a URL shortener like bit.ly.', hint: 'Think about hash generation, storage, redirects, analytics, and collision handling.' },
    { topic: 'React', question: 'How would you optimize a large list rendering in React?', hint: 'Consider virtualization, React.memo, useMemo, and key strategy.' },
    { topic: 'Python', question: 'How would you design a concurrent web scraper?', hint: 'Consider asyncio, aiohttp, rate limiting, retries, and data pipeline.' },
];
