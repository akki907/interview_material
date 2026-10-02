// src/types.ts — Shared application types

export type Progress = Record<string, number>;
export type CheckedMap = Record<string, boolean>;

export type TodoCategory = 'dsa' | 'react' | 'python' | 'ai' | 'systemDesign' | 'general';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface TodoItem {
    id: string;
    title: string;
    category: TodoCategory;
    priority: TodoPriority;
    completed: boolean;
    createdAt: number;
    dueDate?: string;
    linkedTopicId?: string;
    notes?: string;
}

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
