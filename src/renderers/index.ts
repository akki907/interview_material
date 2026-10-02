// src/renderers/index.ts — Renderer registry
import { renderDashboard } from './dashboard';
import { renderStrings, renderHashMaps, renderBinaryTree, renderBST, renderDP, renderGreedy } from './dsa';
import { renderSlidingWindow, renderTwoPointers, renderArrays } from './dsa-fundamentals';
import { renderStack, renderQueue, renderLinkedList } from './dsa-structures';
import { renderHeap, renderGraph, renderBacktracking } from './dsa-algorithms';
import { renderReactFundamentals, renderReactHooks, renderReactState, renderReactPerformance, renderReactRendering, renderReactArchitecture, renderReactInterview } from './react';
import { renderPyFundamentals, renderPyDecorators, renderPyAsyncio, renderPyConcurrency, renderPyGIL, renderPyOOP, renderPyIterators, renderPyFunctions, renderPyFastAPI, renderPyInterview } from './python';
import { renderAILLM, renderAIEmbeddings, renderAIVectorDB, renderAIRAG, renderAIAdvancedRAG, renderAIRAGEval, renderAIAgents, renderAIToolCalling, renderAIAgentMemory, renderAIMultiAgent, renderAIOrchestration, renderAISystemDesign } from './ai';
import { renderSDScalability, renderSDLoadBalancing, renderSDCaching, renderSDDatabases, renderSDReplication, renderSDSharding, renderSDQueues, renderSDEventDriven, renderSDMicroservices, renderSDAPI, renderSDDistributed, renderSDRealWorld } from './systemDesign';
import { renderInterview } from './interview';
import { renderFlashcards } from './flashcards';
import { renderTodos } from './todos';

/** A topic page: fills `container` with its content. */
export type Renderer = (container: HTMLElement) => void;

export const RENDERERS: Record<string, Renderer> = {
    dashboard: renderDashboard,
    'dsa-sliding-window': renderSlidingWindow,
    'dsa-two-pointers': renderTwoPointers,
    'dsa-arrays': renderArrays,
    'dsa-strings': renderStrings,
    'dsa-hashmaps': renderHashMaps,
    'dsa-stack': renderStack,
    'dsa-queue': renderQueue,
    'dsa-linked-list': renderLinkedList,
    'dsa-binary-tree': renderBinaryTree,
    'dsa-bst': renderBST,
    'dsa-heap': renderHeap,
    'dsa-graph': renderGraph,
    'dsa-backtracking': renderBacktracking,
    'dsa-dp': renderDP,
    'dsa-greedy': renderGreedy,
    'react-fundamentals': renderReactFundamentals,
    'react-hooks': renderReactHooks,
    'react-state': renderReactState,
    'react-performance': renderReactPerformance,
    'react-rendering': renderReactRendering,
    'react-architecture': renderReactArchitecture,
    'react-interview': renderReactInterview,
    'py-fundamentals': renderPyFundamentals,
    'py-decorators': renderPyDecorators,
    'py-asyncio': renderPyAsyncio,
    'py-concurrency': renderPyConcurrency,
    'py-gil': renderPyGIL,
    'py-oop': renderPyOOP,
    'py-iterators': renderPyIterators,
    'py-functions': renderPyFunctions,
    'py-fastapi': renderPyFastAPI,
    'py-interview': renderPyInterview,
    'ai-llm': renderAILLM,
    'ai-embeddings': renderAIEmbeddings,
    'ai-vector-db': renderAIVectorDB,
    'ai-rag': renderAIRAG,
    'ai-advanced-rag': renderAIAdvancedRAG,
    'ai-rag-eval': renderAIRAGEval,
    'ai-agents': renderAIAgents,
    'ai-tool-calling': renderAIToolCalling,
    'ai-agent-memory': renderAIAgentMemory,
    'ai-multi-agent': renderAIMultiAgent,
    'ai-orchestration': renderAIOrchestration,
    'ai-system-design': renderAISystemDesign,
    'sd-scalability': renderSDScalability,
    'sd-load-balancing': renderSDLoadBalancing,
    'sd-caching': renderSDCaching,
    'sd-databases': renderSDDatabases,
    'sd-replication': renderSDReplication,
    'sd-sharding': renderSDSharding,
    'sd-queues': renderSDQueues,
    'sd-event-driven': renderSDEventDriven,
    'sd-microservices': renderSDMicroservices,
    'sd-api': renderSDAPI,
    'sd-distributed': renderSDDistributed,
    'sd-realworld': renderSDRealWorld,
    interview: renderInterview,
    flashcards: renderFlashcards,
    todos: renderTodos,
};
