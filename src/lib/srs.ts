// src/lib/srs.ts — spaced-repetition scheduling
//
// An SM-2 variant. The original (SuperMemo 2) asks for a 0–5 recall quality on
// every review; a learner grading themselves four buttons is close enough to
// the same signal, so the grades map onto quality values and the rest of the
// algorithm is unchanged.
//
// Everything here is pure and takes `now` explicitly: the schedule has to be
// reproducible in a test without freezing the clock or reaching for the store.
import type { ReviewGrade, ReviewState } from "./types";

const DAY_MS = 86_400_000;

/**
 * SM-2 quality per grade. Below 3 is a failed recall: the card lapses and its
 * repetition count resets. "hard" is a genuine pass — recalling something
 * slowly is not the same as not recalling it.
 */
const QUALITY: Record<ReviewGrade, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
};

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DEFAULT_EASE = 2.5;

/** "again" comes back inside the same sitting, not tomorrow. */

/**
 * Ceiling on a single interval. SM-2 is unbounded, so a card answered well
 * repeatedly drifts past a year — at which point it never resurfaces and the
 * schedule is decorative. A year is already far longer than this deck needs.
 */
const MAX_INTERVAL_DAYS = 365;
const AGAIN_DELAY_MS = 10 * 60 * 1000;

/** At or beyond this interval a card is treated as learned, not just seen. */
const GRADUATION_DAYS = 21;

/** Where a card sits in its learning life. */
export type CardStage = "new" | "learning" | "review" | "graduated";

/** A never-seen card: due immediately so the first session sees everything. */
export function initialReview(now: number): ReviewState {
    return {
        ease: DEFAULT_EASE,
        intervalDays: 0,
        due: now,
        reps: 0,
        lapses: 0,
        lastReviewed: null,
    };
}

export function isDue(state: ReviewState | undefined, now: number): boolean {
    return (state ?? initialReview(now)).due <= now;
}

export function stageOf(state: ReviewState | undefined): CardStage {
    if (!state) return "new";
    if (state.intervalDays >= GRADUATION_DAYS) return "graduated";
    return state.reps >= 2 ? "review" : "learning";
}

/**
 * The next schedule for a card given a grade.
 *
 * Ease moves by the SM-2 formula, clamped so a run of easy recalls cannot
 * push intervals to absurdity and a run of lapses cannot make a card
 * unreviewable. Intervals are the textbook 1 / 6 / interval×ease progression.
 */
export function applyReview(
    prev: ReviewState | undefined,
    grade: ReviewGrade,
    now: number,
): ReviewState {
    const base = prev ?? initialReview(now);
    const quality = QUALITY[grade];

    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    const ease = Math.min(MAX_EASE, Math.max(MIN_EASE, base.ease + delta));

    if (quality < 3) {
        return {
            ease,
            intervalDays: 0,
            due: now + AGAIN_DELAY_MS,
            reps: 0,
            lapses: base.lapses + 1,
            lastReviewed: now,
        };
    }

    const reps = base.reps + 1;
    const intervalDays = Math.min(
        MAX_INTERVAL_DAYS,
        reps === 1 ? 1 : reps === 2 ? 6 : Math.round(base.intervalDays * ease),
    );

    return {
        ease,
        intervalDays,
        due: now + intervalDays * DAY_MS,
        reps,
        lapses: base.lapses,
        lastReviewed: now,
    };
}

/**
 * Human label for the interval a grade would produce, so the buttons can show
 * the consequence of pressing them instead of making the learner remember the
 * schedule. Derived from {@link applyReview} rather than recomputed, so the
 * preview can never disagree with what actually happens.
 */
export function nextIntervalLabel(
    prev: ReviewState | undefined,
    grade: ReviewGrade,
    now: number,
): string {
    const next = applyReview(prev, grade, now);
    if (next.intervalDays === 0) return "10m";
    if (next.intervalDays < 30) return `${next.intervalDays}d`;
    const months = Math.round(next.intervalDays / 30);
    return `${months}mo`;
}