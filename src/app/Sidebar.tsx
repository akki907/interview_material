// src/app/Sidebar.tsx — topic navigation with per-group progress
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRightIcon, RocketIcon } from "lucide-react";
import { NAV } from "../lib/data";
import { hrefFor } from "../lib/routes";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";
import { Progress } from "../components/ui/progress";

function NavGroup({ group }: { group: (typeof NAV)[number] }) {
    const [open, setOpen] = useState(true);
    const checked = useStore((s) => s.checked);
    const location = useLocation();

    const children = group.children ?? [];
    const done = children.filter((c) => checked[c.id]).length;

    if (!children.length) {
        return (
            <NavLink
                to={hrefFor(group.id)}
                className={({ isActive }) =>
                    cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                            ? "bg-c2 text-c2i"
                            : "text-ink hover:bg-neutral",
                    )
                }
            >
                {group.label}
            </NavLink>
        );
    }

    const groupActive = children.some(
        (c) => location.pathname === hrefFor(c.id),
    );

    return (
        <div className="mb-1">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-neutral"
            >
                <span className="flex items-center gap-2">
                    <ChevronRightIcon
                        className={cn(
                            "size-3.5 transition-transform",
                            open && "rotate-90",
                        )}
                    />
                    <span className={cn(groupActive && "text-c2i")}>
                        {group.label}
                    </span>
                </span>
                <span className="text-[10px] font-normal text-muted">
                    {done}/{children.length}
                </span>
            </button>

            {open && (
                <ul className="mt-0.5 mb-2 ml-4 space-y-0.5 border-l border-rule pl-2">
                    {children.map((child) => {
                        const isDone = !!checked[child.id];
                        return (
                            <li key={child.id}>
                                <NavLink
                                    to={hrefFor(child.id)}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                                            isActive
                                                ? "bg-c2 text-c2i font-semibold"
                                                : "text-muted hover:bg-neutral hover:text-ink",
                                        )
                                    }
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "size-1.5 shrink-0 rounded-full",
                                            isDone ? "bg-c1i" : "bg-rule",
                                        )}
                                    />
                                    <span className="truncate">
                                        {child.label}
                                    </span>
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/**
 * Navigation body, shared by the desktop rail and the mobile Sheet so the two
 * can never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const checked = useStore((s) => s.checked);
    const topicIds = NAV.flatMap((g) => g.children?.map((c) => c.id) ?? []);
    const done = topicIds.filter((id) => checked[id]).length;
    const pct = topicIds.length
        ? Math.round((done / topicIds.length) * 100)
        : 0;

    return (
        <>
            <div className="border-b border-rule px-4 py-4">
                <p className="flex items-center gap-2 font-serif text-base font-bold">
                    <RocketIcon className="size-4" />
                    Interview OS
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <Progress value={pct} tone="ai" className="h-1.5 flex-1" />
                    <span className="text-[11px] whitespace-nowrap text-muted">
                        {done}/{topicIds.length}
                    </span>
                </div>
            </div>

            {/* Close the mobile sheet after a link is chosen. */}
            <nav
                className="flex-1 overflow-y-auto px-2 py-3"
                onClick={onNavigate}
            >
                {NAV.map((group) => (
                    <NavGroup key={group.id} group={group} />
                ))}
            </nav>
        </>
    );
}

/** Desktop sidebar rail. Hidden below `lg`, where the Sheet takes over. */
export function Sidebar() {
    return (
        <aside className="hidden w-sidebar shrink-0 flex-col overflow-y-auto border-r border-rule bg-surface lg:flex">
            <SidebarNav />
        </aside>
    );
}
