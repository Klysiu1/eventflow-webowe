import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from 'react';
import { CalendarDays, Diamond, FileChartColumn, LayoutDashboard, Map, MoreHorizontal, TriangleAlert, Hexagon, Settings, UserRound } from 'lucide-react';
import { useEventStore } from '../store/useEventStore';
import { useDemoSession } from '../store/useDemoSession';
import { roleLabels } from '../api/demoAuth';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import PageErrorBoundary from './PageErrorBoundary';
import './MainLayout.css';
import '../pages/monitoring.css';
import '../pages/local-workspace.css';
import './mobile.css';

export default function MainLayout({ children }) {
const event = useEventStore(state => state.events[0]);
const session = useDemoSession(state => state.session);
const workspace = useWorkspaceStore(state => state.data);
const navigationSource = useWorkspaceStore(state => state.navigationSource);
const setNavigationSource = useWorkspaceStore(state => state.setNavigationSource);
const { pathname, search } = useLocation();
const routeEventId = pathname.startsWith('/map/demo/') ? pathname.split('/')[3] : ['/map/demo', '/reports'].includes(pathname) ? new URLSearchParams(search).get('event') : null;
const demoEvent = workspace?.events.find(item => item.id === (routeEventId || workspace.selectedEventId));
const routeSource = pathname === '/simulation' || pathname === '/alerts/demo' || pathname.startsWith('/map/demo') || pathname.startsWith('/events') || pathname === '/reports' ? 'demo' : pathname === '/' || pathname.startsWith('/map') || pathname === '/alerts' ? 'live' : null;
const isDemo = (routeSource ?? navigationSource) === 'demo';
useEffect(() => { if (routeSource) setNavigationSource(routeSource); }, [routeSource, setNavigationSource]);
const isSettings = pathname === '/settings';
const isEventWorkspace = pathname.startsWith('/events') || pathname.startsWith('/map/demo') || pathname === '/reports';
const mobileTitle = pathname === '/' ? 'Przegląd wydarzenia' : pathname === '/simulation' ? 'Symulacja „co jeśli?”' : ['/map', '/map/demo'].includes(pathname) ? 'Strefy i mapa' : ['/alerts', '/alerts/demo'].includes(pathname) ? 'Alerty miejskie' : null;
const mobileEvent = pathname === '/simulation' || pathname === '/alerts/demo' ? { name: 'Festiwal demonstracyjny', venue: 'Dane przykładowe' } : isDemo ? demoEvent : event;
const navLinkClass = ({ isActive }) => 
        `layout-nav-link px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive 
            ? 'bg-[var(--color-surface-highlight)] text-white'
            : 'text-gray-400 hover:text-white hover:bg-surface-highlight/50'
        }`;


    return (
        <div className={`app-layout ${mobileTitle ? 'mobile-monitoring' : ''} flex h-screen bg-dark text-white font-sans overflow-hidden`}>
            <header className="mobile-masthead">
                <div className="mobile-brand-row"><span className="mobile-brand"><Diamond size={22} aria-hidden="true" />EVENTFLOW CITY</span><span className="mobile-source">{isDemo ? 'DEMO' : 'DANE Z API'}</span>
                    <details className="mobile-more" key={pathname}><summary aria-label="Więcej stron"><MoreHorizontal size={22} aria-hidden="true" /></summary><nav aria-label="Dodatkowe strony"><NavLink to="/events">Wydarzenia</NavLink><NavLink to={routeEventId ? `/reports?event=${encodeURIComponent(routeEventId)}` : '/reports'}>Raporty</NavLink><NavLink to="/account">Konto</NavLink><NavLink to="/settings">Ustawienia</NavLink></nav></details>
                </div>
                {mobileTitle && <div className="mobile-title-row"><div><p>OPEN TASK SMART CITY</p><h1>{mobileTitle}</h1></div><div className="mobile-event-context"><strong>{mobileEvent?.name || 'Wydarzenie'}</strong><span>{mobileEvent?.venue || (isDemo ? 'Dane przykładowe' : 'Oczekiwanie na dane')}</span></div></div>}
            </header>
            <aside className="app-sidebar w-64 shrink-0 bg-surface border-r border-border flex flex-col justify-between z-10">
                <div>
                    <div className="app-brand p-6">
                       <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
                            <span className="text-white">❖</span> EVENTFLOW
                        </h1>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">
                            Command Center
                        </p>
                    </div>
                    <nav className="workspace-navigation" aria-label="Wydarzenia i konto">
                        <NavLink to="/events"><CalendarDays size={16} aria-hidden="true" />Wydarzenia</NavLink>
                        <NavLink to={routeEventId ? `/reports?event=${encodeURIComponent(routeEventId)}` : '/reports'}><FileChartColumn size={16} aria-hidden="true" />Raporty</NavLink>
                        <NavLink to="/account"><UserRound size={16} aria-hidden="true" />Konto</NavLink>
                    </nav>
                    <nav className="app-navigation px-4 space-y-2 mt-4" aria-label="Nawigacja główna">
                        <p className="app-event-label text-xs text-gray-500 font-semibold mb-3 px-2">WYDARZENIE</p>
<div className="app-event bg-surface-highlight rounded-lg p-3 mb-6 mx-2">
                            <p className="font-bold text-sm text-white break-words">{isSettings ? 'Ustawienia lokalne' : isEventWorkspace && demoEvent ? demoEvent.name : isDemo ? 'Środowisko demonstracyjne' : event?.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{isSettings ? 'Ta przeglądarka' : isDemo ? 'Dane przykładowe' : event?.venue}</p>
                        </div>

                        <NavLink to="/" end className={navLinkClass}><LayoutDashboard size={18} aria-hidden="true" />Przegląd</NavLink>
                        <NavLink to={isDemo ? routeEventId ? `/map/demo?event=${encodeURIComponent(routeEventId)}` : '/map/demo' : '/map'} className={navLinkClass}><Map size={18} aria-hidden="true" /><span className="desktop-nav-label">Strefy i mapa</span><span className="mobile-only">Strefy</span></NavLink>
                        <NavLink to={isDemo ? '/alerts/demo' : '/alerts'} className={navLinkClass}><TriangleAlert size={18} aria-hidden="true" />Alerty</NavLink>
                        <NavLink to="/simulation" className={navLinkClass}><Hexagon size={18} aria-hidden="true" />Symulacja</NavLink>
                        <NavLink to="/settings" className={navLinkClass}><Settings size={18} aria-hidden="true" />Ustawienia</NavLink>
                    </nav>
                </div>
<div className="app-sidebar-footer p-6">
                    {/* Blok statusu również z jaśniejszym tłem */}
                    <div className="bg-surface-highlight rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="text-xs font-semibold text-gray-300">{session ? `${roleLabels[session.role]} · demo` : 'Podgląd bez logowania'}</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="app-main min-w-0 flex-1 overflow-y-auto bg-dark p-8">
                <PageErrorBoundary key={pathname}>{children ?? <Outlet />}</PageErrorBoundary>
            </main>
        </div>
    )
}
