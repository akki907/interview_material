// src/app/App.tsx — route table and topic completion toolbar
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./AppShell";
import { TOPIC_IDS } from "../lib/data";
import { idFromPath, isStandaloneRoute } from "../lib/routes";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";

const Dashboard = lazy(() =>
    import("../pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Todos = lazy(() =>
    import("../pages/Todos").then((m) => ({ default: m.Todos })),
);
const Flashcards = lazy(() =>
    import("../pages/Flashcards").then((m) => ({ default: m.Flashcards })),
);
const Interview = lazy(() =>
    import("../pages/Interview").then((m) => ({ default: m.Interview })),
);
const TopicPage = lazy(() =>
    import("../pages/TopicPage").then((m) => ({ default: m.TopicPage })),
);

function Loading() {
    return (
        <div className="flex h-64 items-center justify-center">
            <Spinner />
        </div>
    );
}

/** Marks a study topic complete; only meaningful on /topic/:id routes. */
function CompleteToggle({ topicId }: { topicId: string }) {
    const done = useStore((s) => !!s.checked[topicId]);
    const toggleCheck = useStore((s) => s.toggleCheck);

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => toggleCheck(topicId)}
            aria-pressed={done}
            className={cn(
                "gap-1.5 text-xs font-semibold",
                done
                    ? "border-c1i bg-c1 text-c1i"
                    : "border-rule bg-surface text-muted hover:bg-neutral",
            )}
        >
            {done ? "✓ Completed" : "Mark complete"}
        </Button>
    );
}

export function App() {
    const location = useLocation();
    const topicId = idFromPath(location.pathname);
    const isTopic =
        location.pathname.startsWith("/topic/") &&
        !isStandaloneRoute(topicId) &&
        TOPIC_IDS.includes(topicId);

    return (
        <AppShell>
            {isTopic && (
                <div className="mb-5">
                    <CompleteToggle topicId={topicId} />
                </div>
            )}

            <Suspense fallback={<Loading />}>
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/todos" element={<Todos />} />
                    <Route path="/flashcards" element={<Flashcards />} />
                    <Route path="/interview" element={<Interview />} />
                    <Route path="/topic/:id" element={<TopicPage />} />
                    <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                    />
                </Routes>
            </Suspense>
        </AppShell>
    );
}
