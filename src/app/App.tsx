// src/app/App.tsx — route table
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
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

export function App() {
    return (
        <AppShell>
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
                    {/* TopicPage resolves the id itself and renders a "missing"
                        state for anything unregistered, so no guard is needed
                        here. */}
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
