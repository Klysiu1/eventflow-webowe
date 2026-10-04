import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEventStore } from './store/useEventStore';
import DashboardPage from './pages/DashboardPage';
import HeatmapPage from './pages/HeatmapPage';
import AlertsPage from './pages/AlertsPage';
import MainLayout from './components/MainLayout';

const SimulationPage = lazy(() => import('./pages/SimulationPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DemoAlertsPage = lazy(() => import('./pages/DemoAlertsPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventEditorPage = lazy(() => import('./pages/EventEditorPage'));
const DemoZonesPage = lazy(() => import('./pages/DemoZonesPage'));
const ZoneDetailsPage = lazy(() => import('./pages/ZoneDetailsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

function Loading({ children }) {
    return <Suspense fallback={<p role="status">Ładowanie strony...</p>}>{children}</Suspense>;
}

function LiveEventLayout() {
    const location = useLocation();
    const { events, fetchEvents, fetchActiveAlerts, loading, error, subscribeToEvent, unsubscribeFromEvent } = useEventStore();
    const activeEventId = events[0]?.id;

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (!activeEventId) return;
        subscribeToEvent(activeEventId);
        fetchActiveAlerts(activeEventId);
        return () => unsubscribeFromEvent(activeEventId);
    }, [activeEventId, subscribeToEvent, unsubscribeFromEvent, fetchActiveAlerts]);

    if (loading) return <MainLayout><div className="monitoring-empty" role="status">Ładowanie danych wydarzenia...</div></MainLayout>;
    if (error || !events.length) return <MainLayout><div className="monitoring-empty"><h1 className="text-2xl font-bold">{error ? 'Nie udało się pobrać danych' : 'Brak wydarzeń w API'}</h1><p role={error ? 'alert' : 'status'}>{error ? 'Sprawdź połączenie z backendem lub otwórz dane demonstracyjne.' : 'Nie ma jeszcze wydarzeń do wyświetlenia.'}</p><button className="local-button" onClick={fetchEvents}>Spróbuj ponownie</button><Link className="text-primary underline" to={location.pathname === '/alerts' ? '/alerts/demo' : '/events'}>Otwórz dane demonstracyjne</Link></div></MainLayout>;

    return <MainLayout />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<LiveEventLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/map" element={<HeatmapPage />} />
                    <Route path="/map/:zoneId" element={<Loading><ZoneDetailsPage live /></Loading>} />
                    <Route path="/alerts" element={<AlertsPage />} />
                </Route>
                <Route element={<MainLayout />}>
                    <Route path="/events" element={<Loading><EventsPage /></Loading>} />
                    <Route path="/events/new" element={<Loading><EventEditorPage /></Loading>} />
                    <Route path="/events/:eventId/edit" element={<Loading><EventEditorPage /></Loading>} />
                    <Route path="/map/demo" element={<Loading><DemoZonesPage /></Loading>} />
                    <Route path="/map/demo/:eventId/:zoneId" element={<Loading><ZoneDetailsPage /></Loading>} />
                    <Route path="/account" element={<Loading><AccountPage /></Loading>} />
                    <Route path="/reports" element={<Loading><ReportsPage /></Loading>} />
                    <Route path="/settings" element={<Suspense fallback={<p role="status">Ładowanie ustawień…</p>}><SettingsPage /></Suspense>} />
                    <Route path="/alerts/demo" element={<Suspense fallback={<p role="status">Ładowanie alertów demo…</p>}><DemoAlertsPage /></Suspense>} />
                    <Route path="/simulation" element={<Suspense fallback={<p role="status">Ładowanie symulacji…</p>}><SimulationPage /></Suspense>} />
                    <Route path="*" element={<div className="space-y-4"><h1 className="text-2xl font-bold">Nie znaleziono strony</h1><Link className="text-primary underline" to="/">Wróć do przeglądu</Link></div>} />
                </Route>
                <Route path="/login" element={<Loading><AuthPage key="login" /></Loading>} />
                <Route path="/register" element={<Loading><AuthPage key="register" register /></Loading>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
