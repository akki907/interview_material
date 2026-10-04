// src/app/Sidebar.tsx — topic navigation built on the shadcn sidebar primitives
//
// The sidebar is the app's only map of a 56-topic syllabus, so it carries three
// things a plain link list cannot: a filter box to jump straight to a topic, a
// progress readout per group, and a clear highlight on the topic in view.
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
    ChevronRightIcon,
    CircleCheckIcon,
    GaugeIcon,
    LayersIcon,
    LayoutDashboardIcon,
    ListChecksIcon,
    MicIcon,
    RocketIcon,
    SearchIcon,
    XIcon,
    type LucideIcon,
} from "lucide-react";
import { NAV } from "../lib/data";
import { hrefFor } from "../lib/routes";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";
import {
    Sidebar as SidebarPrimitive,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
} from "../components/ui/sidebar";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";

/** Icons for the four top-level pages, which carry no children to nest under. */
const TOP_LEVEL_ICONS: Record<string, LucideIcon | undefined> = {
    dashboard: LayoutDashboardIcon,
    todos: ListChecksIcon,
    interview: MicIcon,
    flashcards: LayersIcon,
};

function NavGroup({
    group,
    query,
}: {
    group: (typeof NAV)[number];
    /** Active filter text; an empty string shows every child. */
    query: string;
}) {
    const checked = useStore((s) => s.checked);
    const location = useLocation();
    const path = location.pathname;

    const children = group.children ?? [];
    const activeId = children.find((c) => hrefFor(c.id) === path)?.id;
    const done = children.filter((c) => checked[c.id]).length;

    // The group holding the current topic opens automatically, so following a
    // link from search or the pager always reveals where you landed.
    const [open, setOpen] = useState(() => query === "");

    useEffect(() => {
        if (activeId) setOpen(true);
    }, [activeId]);

    // While filtering, a group only expands if it has a match to show.
    useEffect(() => {
        if (query) setOpen(true);
    }, [query]);

    const q = query.trim().toLowerCase();
    const visible = q
        ? children.filter((c) => c.label.toLowerCase().includes(q))
        : children;

    if (!children.length) {
        const isActive = path === hrefFor(group.id);
        const Icon = TOP_LEVEL_ICONS[group.id];
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        isActive={isActive}
                        render={<NavLink to={hrefFor(group.id)} />}
                        className="font-medium"
                    >
                        {Icon && <Icon className="size-4 shrink-0" />}
                        {group.label}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    if (q && !visible.length) return null;

    const pct = children.length
        ? Math.round((done / children.length) * 100)
        : 0;
    const groupActive = !!activeId;

    return (
        <SidebarGroup>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={cn(
                    "flex w-full cursor-pointer items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold tracking-wide uppercase transition-colors",
                    "hover:bg-neutral focus-visible:ring-[3px] focus-visible:ring-focus/30 focus-visible:outline-none",
                    groupActive ? "text-ink" : "text-muted hover:text-ink",
                )}
            >
                <span className="flex min-w-0 items-center gap-1.5">
                    <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="shrink-0"
                    >
                        <ChevronRightIcon className="size-3.5" />
                    </motion.span>
                    <span className="min-w-0 leading-tight">
                        {group.label}
                    </span>
                </span>
                <span
                    className={cn(
                        "shrink-0 text-[10px] font-medium tabular-nums transition-colors",
                        pct === 100 ? "text-c1i" : groupActive && "text-c2i",
                    )}
                    title={`${done} of ${children.length} complete`}
                >
                    {done}/{children.length}
                </span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="sub"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <SidebarGroupContent>
                            <SidebarMenuSub>
                                {visible.map((child) => {
                                    const isDone = !!checked[child.id];
                                    const isActive = child.id === activeId;
                                    return (
                                        <SidebarMenuSubItem key={child.id}>
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                className="py-1 text-[13px]"
                                                render={
                                                    <NavLink
                                                        to={hrefFor(child.id)}
                                                    />
                                                }
                                            >
                                                {isDone ? (
                                                    <CircleCheckIcon
                                                        aria-hidden
                                                        className="size-3.5 shrink-0 text-c1i"
                                                    />
                                                ) : (
                                                    <span
                                                        aria-hidden
                                                        className="size-1.5 shrink-0 rounded-full bg-rule transition-colors group-hover/menu-sub-item:bg-muted"
                                                    />
                                                )}
                                                <span className="truncate">
                                                    {child.label}
                                                </span>
                                            </SidebarMenuButton>
                                        </SidebarMenuSubItem>
                                    );
                                })}
                            </SidebarMenuSub>
                        </SidebarGroupContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </SidebarGroup>
    );
}

export function AppSidebar() {
    const checked = useStore((s) => s.checked);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const topicIds = NAV.flatMap((g) => g.children?.map((c) => c.id) ?? []);
    const done = topicIds.filter((id) => checked[id]).length;
    const pct = topicIds.length
        ? Math.round((done / topicIds.length) * 100)
        : 0;

    // "/" focuses the filter, the way most docs sites and file pickers behave.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = document.activeElement;
            const typing =
                el instanceof HTMLInputElement ||
                el instanceof HTMLTextAreaElement ||
                (el as HTMLElement | null)?.isContentEditable;
            if (e.key === "/" && !typing) {
                e.preventDefault();
                inputRef.current?.focus();
            }
            // Clear the filter but keep focus in the box, so typing another
            // letter filters immediately instead of needing "/" again.
            if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [query, inputRef]);

    return (
        <SidebarPrimitive collapsible="offcanvas" aria-label="Topic navigation">
            <SidebarHeader>
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-c2 text-c2i">
                        <RocketIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-serif text-sm font-bold">
                            Interview OS
                        </p>
                        <p className="text-[11px] text-muted">
                            Senior AI Engineer
                        </p>
                    </div>
                </div>

                {/* Filter — with 56 topics the list is too long to scan */}
                <div className="relative mt-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter topics"
                        aria-label="Filter topics"
                        className="h-8 pr-7 pl-8 text-[13px]"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Clear filter"
                            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:bg-neutral hover:text-ink"
                        >
                            <XIcon className="size-3.5" />
                        </button>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <ScrollArea viewportClassName="h-full w-full">
                    {NAV.map((group) => (
                        <NavGroup key={group.id} group={group} query={query} />
                    ))}
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter>
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-c0 text-c0i">
                        <GaugeIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                                Progress
                            </span>
                            <span className="text-[11px] font-semibold tabular-nums">
                                {pct}%
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral">
                            <motion.div
                                className="h-full rounded-full bg-c2i"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                    duration: 0.6,
                                    ease: [0.4, 0, 0.2, 1],
                                }}
                            />
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-muted tabular-nums">
                    {done} of {topicIds.length} topics complete · press{" "}
                    <kbd className="rounded border border-rule bg-neutral px-1 font-mono">
                        /
                    </kbd>{" "}
                    to filter
                </p>
            </SidebarFooter>
        </SidebarPrimitive>
    );
}
