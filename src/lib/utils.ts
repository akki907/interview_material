import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Difficulty pips (★/☆) used by the interview Q&A banks. */
export function difficultyStars(level: 1 | 2 | 3 | 4 | 5): string {
    return "★".repeat(level) + "☆".repeat(5 - level);
}

/** Two-digit zero pad, for the interview timer. */
export function pad(n: number): string {
    return n < 10 ? "0" + n : "" + n;
}

/** Strip emoji/punctuation down to a url-safe anchor slug. */
export function slugify(text: string): string {
    return (
        text
            .replace(
                /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu,
                "",
            )
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 48) || "section"
    );
}
