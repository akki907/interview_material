// src/components/content/CodeBlock.tsx
//
// A <pre> with a copy button. Copying a snippet is a primary action on an
// interview-prep page, and without this the reader has to select the text by
// hand — awkward on a long, horizontally scrolling block.
//
// The button reports success by swapping its own icon for a beat; a toast
// system would be overkill for one affordance.
import { useEffect, useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "../../lib/utils";

/** How long the check mark stays up before the icon returns to a copy glyph. */
const COPIED_FEEDBACK_MS = 1600;

export function CodeBlock({
    children,
    code,
    className,
}: {
    children?: ReactNode;
    /** Plain text placed on the clipboard. */
    code: string;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    // The reset lives in an effect so a second copy restarts the timer, and a
    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
        return () => clearTimeout(id);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            // Clipboard access can be denied (insecure context, permissions).
            // Leave the button unacknowledged rather than claim a copy that
            // did not happen.
            return;
        }
        setCopied(true);
    };

    return (
        <div className={cn("code-block relative", className)}>
            <button
                type="button"
                onClick={copy}
                aria-label={copied ? "Copied" : "Copy code"}
                className={cn(
                    "absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-md",
                    "border border-rule bg-surface/90 text-muted backdrop-blur-sm transition",
                    "hover:border-focus/40 hover:text-ink",
                    "focus-visible:ring-[3px] focus:ring-focus/30",
                )}
            >
                {copied ? (
                    <CheckIcon className="size-4 text-c1i" />
                ) : (
                    <CopyIcon className="size-4" />
                )}
            </button>
            {children}
        </div>
    );
}