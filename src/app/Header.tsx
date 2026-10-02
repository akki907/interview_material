// src/app/Header.tsx — breadcrumb, search, theme toggle, mobile nav trigger
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    MenuIcon,
    MoonIcon,
    SearchIcon,
    SunIcon,
} from "lucide-react";
import { TOPIC_LABELS } from "../lib/data";
import { NAV_INDEX, hrefFor, idFromPath } from "../lib/routes";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function Header({
    theme,
    onToggleTheme,
    onOpenNav,
}: {
    theme: "light" | "dark";
    onToggleTheme: () => void;
    onOpenNav: () => void;
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={onOpenNav}
                    aria-label="Open navigation"
                >
                    <MenuIcon />
                </Button>

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
                            if (e.key === "Enter" && results[0]) go(results[0].id);
                        }}
                        placeholder="Search topics…"
                        aria-label="Search topics"
                        className="pl-9"
                    />
                    {results.length > 0 && (
                        <ul className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-md border border-rule bg-surface shadow-float">
                            {results.map((r) => (
                                <li key={r.id}>
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
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={onToggleTheme}
                    aria-label="Toggle dark mode"
                    aria-pressed={theme === "dark"}
                >
                    {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </Button>
            </div>

            {current && (
                <p className="px-4 pb-2 text-[11px] tracking-wider text-muted uppercase sm:px-8 lg:px-10">
                    {current}
                </p>
            )}
        </header>
    );
}