// src/app/Header.tsx — breadcrumb, search, sidebar trigger, theme toggle
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { TOPIC_LABELS } from "../lib/data";
import { NAV_INDEX, hrefFor, idFromPath } from "../lib/routes";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function Header({
    theme,
    onToggleTheme,
    sidebarTrigger,
}: {
    theme: "light" | "dark";
    onToggleTheme: () => void;
    sidebarTrigger: React.ReactNode;
}) {
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return NAV_INDEX.filter((t) => t.label.toLowerCase().includes(q)).slice(
            0,
            8,
        );
    }, [query]);

    const go = (id: string) => {
        setQuery("");
        navigate(hrefFor(id));
    };

    // Breadcrumb label comes from router state, not the global location object,
    // so it updates on client-side navigation.
    const topicId = idFromPath(location.pathname);
    const current = TOPIC_LABELS[topicId];

    return (
        <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-paper">
            <div className="flex h-header items-center gap-2 px-4 sm:gap-3 sm:px-8 lg:px-10">
                {sidebarTrigger}

                <span className="hidden shrink-0 font-serif text-sm font-bold lg:inline">
                    Interview OS
                </span>

                <div className="relative min-w-0 flex-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setQuery("");
                            if (e.key === "Enter" && results[0])
                                go(results[0].id);
                        }}
                        placeholder="Search topics…"
                        aria-label="Search topics"
                        className="pl-9"
                    />

                    <AnimatePresence>
                        {results.length > 0 && (
                            <motion.ul
                                key="results"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-md border border-rule bg-surface shadow-float"
                            >
                                {results.map((r, i) => (
                                    <motion.li
                                        key={r.id}
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => go(r.id)}
                                            className="flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left transition-colors hover:bg-neutral"
                                        >
                                            <span className="text-sm">
                                                {r.label}
                                            </span>
                                            <span className="text-[11px] text-muted">
                                                {r.group}
                                            </span>
                                        </button>
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>

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

            <AnimatePresence mode="wait">
                {current && (
                    <motion.p
                        key={current}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="px-4 pb-2 text-[11px] tracking-wider text-muted uppercase sm:px-8 lg:px-10"
                    >
                        {current}
                    </motion.p>
                )}
            </AnimatePresence>
        </header>
    );
}
