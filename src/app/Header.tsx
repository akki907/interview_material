// src/app/Header.tsx — breadcrumb, command palette, theme toggle
import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { TOPIC_LABELS } from "../lib/data";
import { NAV_INDEX, hrefFor, idFromPath } from "../lib/routes";
import { Button, buttonVariants } from "../components/ui/button";
import { Command } from "../components/ui/command";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { cn } from "../lib/utils";

export function Header({
    theme,
    onToggleTheme,
    sidebarTrigger,
}: {
    theme: "light" | "dark";
    onToggleTheme: () => void;
    sidebarTrigger: React.ReactNode;
}) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Breadcrumb labels come from router state, not the global location object,
    // so they update on client-side navigation. The group is the second level:
    // a topic lives under exactly one group in NAV.
    const topicId = idFromPath(location.pathname);
    const current = TOPIC_LABELS[topicId];
    const group = NAV_INDEX.find((t) => t.id === topicId)?.group;
    const crumbs =
        current && group && group !== "Overview"
            ? [group, current]
            : current
              ? [current]
              : [];

    const go = (id: string) => {
        navigate(hrefFor(id));
        setPaletteOpen(false);
    };

    // Cmd+K / Ctrl+K opens the palette. Bound on the document rather than the
    // input so the shortcut works from anywhere, including a topic body.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setPaletteOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const commands = useMemo(
        () =>
            NAV_INDEX.map((t) => ({
                id: t.id,
                label: t.label,
                hint: t.group,
                onSelect: () => go(t.id),
            })),
        // `go` closes over navigate, which is stable for the router's lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    return (
        <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-paper/85 backdrop-blur-md">
            <div className="flex h-header items-center gap-2 px-4 sm:gap-3 sm:px-8 lg:px-10">
                {sidebarTrigger}

                <span className="hidden shrink-0 font-serif text-sm font-bold lg:inline">
                    Interview OS
                </span>

                <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "group ml-auto min-w-0 flex-1 justify-start gap-2 px-3 font-normal text-muted md:max-w-md",
                    )}
                >
                    <SearchIcon className="size-4 shrink-0" />
                    <span className="truncate">Search topics…</span>
                    <kbd className="ml-auto hidden shrink-0 rounded border border-rule bg-neutral px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block">
                       K
                    </kbd>
                </button>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={onToggleTheme}
                    aria-label="Toggle dark mode"
                    aria-pressed={theme === "dark"}
                >
                    <motion.span
                        key={theme}
                        initial={{ rotate: -60, opacity: 0, scale: 0.8 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 20,
                        }}
                        className="flex"
                    >
                        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                    </motion.span>
                </Button>
            </div>

            {crumbs.length > 0 && (
                <motion.div
                    key={crumbs.join("/")}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="px-4 pb-2 sm:px-8 lg:px-10"
                >
                    <Breadcrumb>
                        {/* The list holds only <li> children; the route-change
                            animation lives on this wrapper so the markup stays
                            valid. */}
                        <BreadcrumbList className="text-[11px] tracking-wider uppercase">
                            {crumbs.map((crumb, i) => {
                                const last = i === crumbs.length - 1;
                                return (
                                    <Fragment key={crumb}>
                                        <BreadcrumbItem>
                                            {last ? (
                                                <BreadcrumbPage>
                                                    {crumb}
                                                </BreadcrumbPage>
                                            ) : (
                                                <span className="text-muted">
                                                    {crumb}
                                                </span>
                                            )}
                                        </BreadcrumbItem>
                                        {/* The separator is itself an <li>, so it
                                            sits beside the item rather than
                                            inside it. */}
                                        {!last && <BreadcrumbSeparator />}
                                    </Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </motion.div>
            )}

            <Command
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
                items={commands}
            />
        </header>
    );
}
