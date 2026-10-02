// src/ai/evaluate.ts — AI & heuristic interview evaluation engine

export interface RubricCategory {
    score: number;
    max: number;
    feedback: string;
}

export interface EvaluationResult {
    score: number;
    verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';
    summary: string;
    breakdown: {
        technicalCorrectness: RubricCategory;
        edgeCases: RubricCategory;
        complexityAnalysis: RubricCategory;
        communication: RubricCategory;
    };
    strengths: string[];
    improvements: string[];
    modelAnswer?: string;
    isLiveAI: boolean;
    provider?: string;
}

const TOPIC_KEYWORD_MAP: Record<string, string[]> = {
    AI: ['chunking', 'embedding', 'vector', 'retrieval', 'rerank', 'rag', 'context', 'latency', 'token', 'relevance', 'hallucination', 'dense', 'sparse', 'bm25'],
    DSA: ['time complexity', 'space complexity', 'prefix', 'pointer', 'window', 'hash', 'invariant', 'binary', 'heap', 'stack', 'queue', 'recursion', 'dynamic programming', 'memoization'],
    'System Design': ['scale', 'cache', 'redis', 'shard', 'replica', 'throughput', 'latency', 'load balancer', 'consistency', 'partition', 'idempotency', 'database', 'cdn', 'failover'],
    React: ['re-render', 'memo', 'usememo', 'usecallback', 'hook', 'state', 'closure', 'virtualization', 'reconciliation', 'props', 'lifecycle', 'effect'],
    Python: ['gil', 'thread', 'process', 'asyncio', 'event loop', 'generator', 'coroutine', 'memory', 'cpu-bound', 'io-bound', 'concurrency'],
};

/**
 * Deterministic heuristic evaluator for offline/fallback use.
 * Scores on a 0-100 rubric across 4 core engineering criteria.
 */
export function evaluateHeuristic(question: string, answerText: string, topic: string): EvaluationResult {
    const text = answerText.trim();
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Technical Accuracy & Depth (max 25)
    let techScore = 12;
    const topicKeywords = TOPIC_KEYWORD_MAP[topic] || [];
    const matchedKeywords = topicKeywords.filter(k => lower.includes(k));
    const keywordRatio = topicKeywords.length > 0 ? matchedKeywords.length / topicKeywords.length : 0.5;
    techScore += Math.round(keywordRatio * 10);
    if (wordCount >= 100) techScore += 3;
    techScore = Math.min(25, Math.max(8, techScore));

    const techFeedback = matchedKeywords.length >= 3
        ? `Strong domain terminology utilized (${matchedKeywords.slice(0, 4).join(', ')}). Answer reflects hands-on production awareness.`
        : `Covers foundational principles, but needs more specific architectural/algorithmic depth (${topicKeywords.slice(0, 3).join(', ')}).`;

    // 2. Edge Cases & Reliability (max 25)
    const edgeCaseTerms = ['edge case', 'null', 'empty', 'boundary', 'overflow', 'timeout', 'failure', 'retry', 'fallback', 'collision', 'race condition', 'stale', 'concurrency', 'error handling'];
    const matchedEdgeCases = edgeCaseTerms.filter(e => lower.includes(e));
    let edgeScore = 10 + matchedEdgeCases.length * 3;
    edgeScore = Math.min(25, Math.max(6, edgeScore));

    const edgeFeedback = matchedEdgeCases.length >= 2
        ? `Thoughtful consideration of failure modes (${matchedEdgeCases.slice(0, 3).join(', ')}). Senior engineers anticipate what breaks in production.`
        : 'Needs explicit discussion of boundary conditions, failure modes, and recovery patterns.';

    // 3. Complexity & Trade-offs Analysis (max 25)
    const hasBigO = /o\([0-9a-z\s\^\*\+\-\.]+\)/i.test(text);
    const hasTradeoffs = /trade-off|tradeoff|versus|vs|alternative|pros and cons|bottleneck|latency vs|memory vs/i.test(text);
    let compScore = 10;
    if (hasBigO) compScore += 8;
    if (hasTradeoffs) compScore += 7;
    compScore = Math.min(25, Math.max(5, compScore));

    const compFeedback = hasBigO && hasTradeoffs
        ? 'Explicit Big-O time/space complexity stated alongside architectural trade-offs.'
        : hasBigO
            ? 'Big-O complexity noted; consider elaborating on memory vs latency trade-offs.'
            : 'Missing formal Big-O time and space complexity derivation.';

    // 4. Communication & Structure (max 25)
    const hasCodeOrBullets = /```|[-*]\s|\d+\.\s/m.test(text);
    const hasParagraphs = text.split('\n\n').length >= 2;
    let commScore = 12;
    if (hasCodeOrBullets) commScore += 7;
    if (hasParagraphs) commScore += 6;
    commScore = Math.min(25, Math.max(8, commScore));

    const commFeedback = hasCodeOrBullets && hasParagraphs
        ? 'Well-structured response with clear progression from high-level design to implementation details.'
        : 'Good articulation, though formatting with bullet points or architectural stages would improve interview clarity.';

    const totalScore = techScore + edgeScore + compScore + commScore;

    let verdict: EvaluationResult['verdict'];
    if (totalScore >= 85) verdict = 'Strong Hire';
    else if (totalScore >= 72) verdict = 'Hire';
    else if (totalScore >= 58) verdict = 'Lean Hire';
    else if (totalScore >= 45) verdict = 'Lean No Hire';
    else verdict = 'No Hire';

    const strengths: string[] = [];
    if (matchedKeywords.length >= 2) strengths.push(`Applied key ${topic} constructs effectively`);
    if (hasBigO) strengths.push('Directly addressed algorithmic or system complexity');
    if (matchedEdgeCases.length >= 1) strengths.push('Demonstrated proactive thinking around failure modes');
    if (hasCodeOrBullets) strengths.push('Structured response logically for an interview setting');
    if (strengths.length === 0) strengths.push('Directly addressed the core interview prompt');

    const improvements: string[] = [];
    if (!hasBigO) improvements.push('State exact Time & Space complexities (e.g. O(N) time, O(1) auxiliary space)');
    if (matchedEdgeCases.length < 2) improvements.push('Explicitly name 2-3 boundary edge cases (empty inputs, peak traffic, network splits)');
    if (!hasTradeoffs) improvements.push('Contrast your chosen solution against at least one alternative design and defend your decision');
    if (wordCount < 80) improvements.push('Elaborate with concrete implementation mechanics or code snippets');

    const summary = `Candidate scored ${totalScore}/100 (${verdict}). Demonstrated solid engineering intuition on ${topic}. ${strengths[0] || 'Good high-level coverage'}.`;

    return {
        score: totalScore,
        verdict,
        summary,
        breakdown: {
            technicalCorrectness: { score: techScore, max: 25, feedback: techFeedback },
            edgeCases: { score: edgeScore, max: 25, feedback: edgeFeedback },
            complexityAnalysis: { score: compScore, max: 25, feedback: compFeedback },
            communication: { score: commScore, max: 25, feedback: commFeedback },
        },
        strengths,
        improvements,
        modelAnswer: generateModelAnswerHint(question, topic),
        isLiveAI: false,
    };
}

function generateModelAnswerHint(question: string, topic: string): string {
    if (topic === 'AI') {
        return 'Ideal response structure:\n1. Ingestion & Chunking: Recursive chunking (512 tokens with 50-token overlap) + metadata preservation.\n2. Hybrid Retrieval: Dense embeddings (e.g. text-embedding-3-small) + BM25 sparse search with Reciprocal Rank Fusion (RRF).\n3. Reranking: Cross-encoder (Cohere Rerank / BGE) on top-50 down to top-5.\n4. Scalability & Latency: HNSW vector indexing, Redis caching for hot queries, async embedding pipelines.\n5. Evaluation: RAGAS metrics (Faithfulness, Answer Relevance, Context Precision).';
    }
    if (topic === 'DSA') {
        return 'Ideal response structure:\n1. Clarify constraints: bounds on input size N, negative numbers, space restrictions.\n2. Invariant & Algorithm: Explain state transitions clearly before writing code.\n3. Complexity: Time O(N), Space O(N) or O(1) with detailed breakdown of auxiliary structures.\n4. Edge Cases: Empty array, single element, all duplicates, negative numbers, extreme values.';
    }
    if (topic === 'System Design') {
        return 'Ideal response structure:\n1. Requirements: Functional (shorten, redirect, analytics) & Non-functional (100:1 read/write, 99.99% availability, <10ms redirect).\n2. Capacity Estimation: Storage volume over 5 years, peak read/write QPS, bandwidth.\n3. Data Model & API: REST endpoints, base62 ID generation (distributed Snowflake or pre-allocated ranges), KV store vs RDBMS.\n4. Caching & CDN: Redis LRU cache for 20% hot links (80/20 rule), GeoDNS + Anycast CDN.\n5. Deep Dive: High concurrency idempotency, database replication, cross-region failover.';
    }
    if (topic === 'React') {
        return 'Ideal response structure:\n1. Architecture: Component tree hierarchy, virtualization (react-window/virtualizer) for >1,000 items.\n2. Reconciliation: Stable keys (never array indices for dynamic lists), shallow comparison with React.memo.\n3. Memoization: useCallback for stable callbacks, useMemo for heavy derived calculations.\n4. Server vs Client: Streaming SSR, Suspense boundaries, offloading server state to TanStack Query.';
    }
    return 'Ideal response structure:\n1. Direct conceptual answer with clear terminology.\n2. Internal execution mechanics (event loop, memory layout, or protocol).\n3. Production edge cases and trade-offs.\n4. Concrete code or architecture example demonstrating senior expertise.';
}

/**
 * Main evaluation entry point.
 * Attempts server-side `/api/evaluate` first (supports Vercel AI SDK and live LLMs),
 * then falls back seamlessly to the client-side heuristic engine.
 */
export async function evaluateAnswer(question: string, answerText: string, topic: string): Promise<EvaluationResult> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer: answerText, topic }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && typeof data.score === 'number' && data.breakdown) {
                return data as EvaluationResult;
            }
        }
    } catch {
        // Fall back gracefully to client-side heuristic evaluation
    }

    return evaluateHeuristic(question, answerText, topic);
}
