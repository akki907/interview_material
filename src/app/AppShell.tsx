// src/app/AppShell.tsx — layout chrome: sidebar, header, scroll rail
import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { useThemeSync } from "./theme";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "../components/ui/sidebar";

function ShellInner({ children }: { children: React.ReactNode }) {
    const { theme, toggle } = useThemeSync();

    const scrollRef = useRef<HTMLElement>(null);
    const railRef = useRef<HTMLDivElement>(null);

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

    // A new route starts at the top rather than inheriting the previous
    // scroll offset, which would otherwise open short pages mid-air.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [children]);

    return (
        <SidebarProvider className="h-svh overflow-hidden">
            <AppSidebar />

            <SidebarInset className="min-h-0">
                <Header
                    theme={theme}
                    onToggleTheme={toggle}
                    sidebarTrigger={<SidebarTrigger />}
                />

                <main
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto"
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
