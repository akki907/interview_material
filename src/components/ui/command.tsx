// src/components/ui/command.tsx
// A cmdk-shaped command palette built on the Dialog primitive. `cmdk` is not a
// dependency here, and this app's command surface is a single flat list, so the
// filtering and roving highlight are small enough to own directly.
//
// The query lives in `Command` rather than in the list: the input and the
// results are two views of one piece of state, so splitting them across
// components would mean lifting it anyway.
import * as React from "react";
import { SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { cn } from "../../lib/utils";

export interface CommandItemDef {
    id: string;
    label: string;
    hint?: string;
    onSelect: () => void;
}

function Command({
    items,
    emptyText = "No matches.",
    renderItem,
    placeholder = "Type a command or search…",
    className,
    ...props
}: React.ComponentProps<typeof Dialog> & {
    items: CommandItemDef[];
    emptyText?: string;
    placeholder?: string;
    /** Extra classes for the dialog panel itself, not the Dialog root. */
    className?: string;
    renderItem?: (
        item: CommandItemDef,
        state: { active: boolean; select: () => void },
    ) => React.ReactNode;
}) {
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(0);
    const listRef = React.useRef<HTMLDivElement>(null);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? items.filter(
                  (i) =>
                      i.label.toLowerCase().includes(q) ||
                      (i.hint ?? "").toLowerCase().includes(q),
              )
            : items;
    }, [items, query]);

    // A shorter result set must not leave the highlight pointing past the end,
    // so the index is clamped whenever the filtered list shrinks.
    React.useEffect(() => {
        setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
    }, [filtered.length]);

    const select = React.useCallback((item: CommandItemDef | undefined) => {
        if (!item) return;
        item.onSelect();
        setQuery("");
    }, []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) =>
                filtered.length
                    ? (a - 1 + filtered.length) % filtered.length
                    : 0,
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            select(filtered[active]);
        }
    };

    // Keyboard navigation moves the highlight; without this the selected row can
    // scroll out of view once the list is taller than the dialog.
    React.useEffect(() => {
        listRef.current
            ?.querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [active]);

    return (
        <Dialog {...props}>
            <DialogContent
                showClose={false}
                className={cn("overflow-hidden p-0", className)}
            >
                <DialogTitle className="sr-only">Command palette</DialogTitle>

                <div className="flex items-center gap-2.5 border-b border-rule px-4">
                    <SearchIcon className="size-4 shrink-0 text-muted" />
                    <input
                        data-slot="command-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        aria-label="Command palette"
                        aria-controls="command-list"
                        className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
                    />
                </div>

                <div
                    id="command-list"
                    ref={listRef}
                    role="listbox"
                    aria-label="Commands"
                    data-slot="command-list"
                    className="max-h-[22rem] overflow-y-auto p-2"
                >
                    {filtered.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted">
                            {emptyText}
                        </p>
                    ) : (
                        filtered.map((item, i) => {
                            const isActive = i === active;
                            return (
                                <div
                                    key={item.id}
                                    role="option"
                                    aria-selected={isActive}
                                    data-active={isActive}
                                    tabIndex={-1}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => select(item)}
                                    className={cn(
                                        "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm",
                                        isActive
                                            ? "bg-c2 text-c2i"
                                            : "text-ink hover:bg-neutral",
                                    )}
                                >
                                    {renderItem ? (
                                        renderItem(item, {
                                            active: isActive,
                                            select: () => select(item),
                                        })
                                    ) : (
                                        <>
                                            <span className="truncate">
                                                {item.label}
                                            </span>
                                            {item.hint && (
                                                <span className="shrink-0 text-[11px] text-muted">
                                                    {item.hint}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { Command };