// src/app/Sidebar.tsx — topic navigation built on the shadcn sidebar primitives
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRightIcon, RocketIcon } from "lucide-react";
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
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
} from "../components/ui/sidebar";

function NavGroup({ group }: { group: (typeof NAV)[number] }) {
    const [open, setOpen] = useState(true);
    const checked = useStore((s) => s.checked);
    const location = useLocation();

    const children = group.children ?? [];
    const done = children.filter((c) => checked[c.id]).length;

    if (!children.length) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    render={<NavLink to={hrefFor(group.id)} />}
                    className="font-medium"
                >
                    {group.label}
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    const groupActive = children.some(
        (c) => location.pathname === hrefFor(c.id),
    );

    return (
        <SidebarGroup>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold tracking-wider text-muted uppercase transition-colors hover:bg-neutral hover:text-ink"
            >
                <span className="flex min-w-0 items-center gap-1.5">
                    <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="shrink-0"
                    >
                        <ChevronRightIcon className="size-3.5" />
                    </motion.span>
                    <span className="truncate">{group.label}</span>
                </span>
                <span
                    className={cn(
                        "shrink-0 text-[10px] font-medium tabular-nums transition-colors",
                        groupActive && "text-c2i",
                    )}
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
                                {children.map((child) => {
                                    const isDone = !!checked[child.id];
                                    return (
                                        <SidebarMenuSubItem
                                            key={child.id}
                                            render={
                                                <NavLink
                                                    to={hrefFor(child.id)}
                                                />
                                            }
                                            isActive={isDone}
                                        >
                                            <SidebarMenuButton className="py-1 text-[13px]">
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        "size-1.5 shrink-0 rounded-full transition-colors",
                                                        isDone
                                                            ? "bg-c1i"
                                                            : "bg-rule",
                                                    )}
                                                />
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
    const topicIds = NAV.flatMap((g) => g.children?.map((c) => c.id) ?? []);
    const done = topicIds.filter((id) => checked[id]).length;
    const pct = topicIds.length
        ? Math.round((done / topicIds.length) * 100)
        : 0;

    return (
        <SidebarPrimitive collapsible="offcanvas">
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                        <RocketIcon className="size-4 text-c2i" />
                    </motion.span>
                    <div className="min-w-0">
                        <p className="truncate font-serif text-sm font-bold">
                            Interview OS
                        </p>
                        <p className="text-[11px] text-muted">Senior AI Engineer</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                {NAV.map((group) => (
                    <NavGroup key={group.id} group={group} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral">
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
                    <span className="text-[11px] whitespace-nowrap text-muted tabular-nums">
                        {done}/{topicIds.length}
                    </span>
                </div>
            </SidebarFooter>
        </SidebarPrimitive>
    );
}