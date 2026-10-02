// src/app/AppShell.tsx — layout chrome: sidebar, mobile sheet, header, scroll rail
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar, SidebarNav } from "./Sidebar";
import { useThemeSync } from "./theme";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "../components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
    const { theme, toggle } = useThemeSync();
    const [navOpen, setNavOpen] = useState(false);
    const location = useLocation();

    const scrollRef = useRef<HTMLElement>(null);
    const railRef = useRef<HTMLDivElement>(null);

    // Close the mobile sheet on navigation, since the link click alone is not
    // enough — router state changes without a click event on some paths.
    useEffect(() => setNavOpen(false), [location.pathname]);

    /**
     * Reading progress is written straight to the rail's width via a ref rather
     * than held in state: a scroll listener that re-renders on every frame
     * would repaint the whole page 60+ times a second.
     */
    const syncProgress = useCallback(() => {
        const el = scrollRef.current;
        const rail = railRef.current;
        if (!el || !rail) return;
        const max = el.scrollHeight - el.clientHeight;
        const pct = max <= 0 ? 0 : Math.min(100, (el.scrollTop / max) * 100);
        rail.style.width = `${pct}%`;
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", syncProgress, { passive: true });
        // Content renders after mount, so measure once the first paint settles.
        const raf = requestAnimationFrame(syncProgress);
        return () => {
            el.removeEventListener("scroll", syncProgress);
            cancelAnimationFrame(raf);
        };
    }, [syncProgress, children]);

    return (
        <div className="flex h-screen overflow-hidden bg-paper text-ink">
            <Sidebar />

            <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetContent side="left" className="w-sidebar p-0">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                        <SheetDescription>
                            Browse interview preparation topics
                        </SheetDescription>
                    </SheetHeader>
                    <SidebarNav onNavigate={() => setNavOpen(false)} />
                </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col">
                <Header
                    theme={theme}
                    onToggleTheme={toggle}
                    onOpenNav={() => setNavOpen(true)}
                />

                <main
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto"
                >
                    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
                        {children}
                    </div>
                </main>

                <div className="h-0.5 shrink-0 bg-rule/40" aria-hidden>
                    <div
                        ref={railRef}
                        className="h-full bg-focus transition-[width] duration-100"
                    />
                </div>
            </div>
        </div>
    );
}
