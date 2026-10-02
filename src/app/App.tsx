// src/app/App.tsx — router + application shell
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useThemeSync } from './theme';
import { useStore } from '../lib/store';
import { TOPIC_IDS } from '../lib/data';
import { Spinner } from '../components/ui/spinner';

const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Todos = lazy(() => import('../pages/Todos').then(m => ({ default: m.Todos })));
const Flashcards = lazy(() => import('../pages/Flashcards').then(m => ({ default: m.Flashcards })));
const Interview = lazy(() => import('../pages/Interview').then(m => ({ default: m.Interview })));
const TopicPage = lazy(() => import('../pages/TopicPage').then(m => ({ default: m.TopicPage })));

function Loading() {
    return (
        <div className="flex h-64 items-center justify-center">
            <Spinner />
        </div>
    );
}

export function App() {
    const { theme, toggle } = useThemeSync();
    const checked = useStore(s => s.checked);
    const toggleCheck = useStore(s => s.toggleCheck);
    const location = useLocation();

    const topicId = location.pathname.replace(/^\/topic\//, '');
    const isTopic = topicId !== location.pathname && TOPIC_IDS.includes(topicId);
    const done = isTopic ? !!checked[topicId] : false;

    return (
        <div className="flex h-screen overflow-hidden bg-paper text-ink">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <Header theme={theme} onToggleTheme={toggle} />

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 lg:px-10">
                        {isTopic && (
                            <div className="mb-5">
                                <button
                                    type="button"
                                    onClick={() => toggleCheck(topicId)}
                                    className={
                                        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ' +
                                        (done
                                            ? 'border-c1i bg-c1 text-c1i'
                                            : 'border-rule bg-surface text-muted hover:bg-neutral')
                                    }
                                >
                                    {done ? '✓ Completed' : 'Mark complete'}
                                </button>
                            </div>
                        )}

                        <Suspense fallback={<Loading />}>
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/todos" element={<Todos />} />
                                <Route path="/flashcards" element={<Flashcards />} />
                                <Route path="/interview" element={<Interview />} />
                                <Route path="/topic/:id" element={<TopicPage />} />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}