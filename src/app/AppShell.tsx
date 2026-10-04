// src/app/AppShell.tsx — layout chrome: sidebar, header, scroll rail
import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { useThemeSync } from "./theme";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "../components/ui/sidebar";

/** Target id for the skip link and for focus after a route change. */
const MAIN_ID = "main-content";

function ShellInner({ children }: { children: React.ReactNode }) {
    const { theme, toggle } = useThemeSync();
    const location = useLocation();

    const scrollRef = useRef<HTMLElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    // The path the shell is already showing. Comparing against it keeps the
    // focus call idempotent: StrictMode invokes effects twice on mount, and a
    // plain "have I mounted" flag would read the second pass as a navigation
    // and focus the content region on first paint.
    const shownPath = useRef<string | null>(null);

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
        const raf = requestAnimationFrame(syncProgress);
        return () => {
            el.removeEventListener("scroll", syncProgress);
            cancelAnimationFrame(raf);
        };
    }, [syncProgress, children]);

    /**
     * A new route starts at the top and takes focus with it. Left alone, focus
     * stays parked on the sidebar link that was just clicked while the content
     * scrolls away underneath — a keyboard user would have to tab back through
     * the whole nav, and a screen reader would never announce the new page.
     *
     * The container itself is focused rather than the page's <h1>: routes are
     * lazily loaded, so on a cold navigation the heading does not exist yet,
     * and focusing a missing node is a no-op.
     */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: 0 });

        if (shownPath.current === null) {
            shownPath.current = location.pathname;
            return;
        }
        if (shownPath.current === location.pathname) return;

        shownPath.current = location.pathname;
        el.focus({ preventScroll: true });
    }, [location.pathname]);

    return (
        <SidebarProvider className="h-svh overflow-hidden">
            {/*
                The sidebar holds ~60 focusable links, so reaching page content
                by keyboard means tabbing through the whole tree on every load.
                This link is the first tab stop and only becomes visible when
                focused. Clicking it focuses the content region directly
                rather than relying on the browser to follow the fragment.
            */}
            <a
                href={`#${MAIN_ID}`}
                onClick={(e) => {
                    e.preventDefault();
                    scrollRef.current?.focus();
                }}
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-float focus:ring-[3px] focus:ring-focus/30"
            >
                Skip to content
            </a>

            <AppSidebar />

            <SidebarInset className="min-h-0">
                <Header
                    theme={theme}
                    onToggleTheme={toggle}
                    sidebarTrigger={<SidebarTrigger />}
                />

                <main
                    id={MAIN_ID}
                    ref={scrollRef}
                    // Focusable so the skip link and post-navigation focus have
                    // somewhere to land; not in the tab order.
                    tabIndex={-1}
                    // The focus ring would wrap the entire page; the region is
                    // focused programmatically, so the ring carries no meaning.
                    className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10"
                    >
                        {children}
                    </motion.div>
                </main>

                <div className="h-0.5 shrink-0 bg-rule/40" aria-hidden>
                    <div
                        ref={railRef}
                        className="h-full bg-focus transition-[width] duration-100"
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return <ShellInner>{children}</ShellInner>;
}