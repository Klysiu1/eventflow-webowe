import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useEventStore } from '../store/useEventStore';
import { loadSettings } from '../api/settings';
import { formatNumber } from '../utils/monitoring';
import { useMonitoringData } from '../hooks/useMonitoringData';
import './dashboard.css';

export default function DashboardPage() {
    const { events, alerts, loading, error } = useEventStore();
    const [profile] = useState(() => loadSettings().settings.profile);
    const monitoring = useMonitoringData(events[0]?.id);

    if (loading) return <div className="text-white p-8">Ładowanie danych...</div>;
    if (error) return <div className="text-danger p-8">Błąd: {error}</div>;
    if (events.length === 0) return <div className="text-white p-8">Brak aktywnych wydarzeń.</div>;

    const activeEvent = events[0];

    // --- OBLICZENIA DANYCH DO DASHBOARDU ---
    // 1. Całkowita pojemność i obciążenie obiektu
    const totalCapacity = activeEvent.zones.reduce((sum, zone) => sum + Number(zone.capacity || 0), 0);
    const totalCount = activeEvent.zones.reduce((sum, zone) => sum + Number(zone.current_count || 0), 0);
    const overallOccupancy = totalCapacity > 0 ? Math.round((totalCount / totalCapacity) * 100) : 0;

    // 2. Sortowanie stref od najbardziej obciążonych do top 3 kluczowych
    const sortedZones = [...activeEvent.zones].sort((a, b) => {
        return (b.capacity > 0 ? b.current_count / b.capacity : -1) - (a.capacity > 0 ? a.current_count / a.capacity : -1);
    });
    const keyZones = sortedZones.slice(0, 3);

    // 3. Priorytetowe alerty (top 2 z góry)
    const priorityAlerts = [...alerts].sort((a, b) => Number(b.level === 'critical') - Number(a.level === 'critical')).slice(0, 2);

    // Funkcja pomocnicza: pobieranie koloru na podstawie obciążenia
    const getZoneStatus = (rate) => {
        if (rate === null) return { colorClass: 'text-gray-400', bgClass: 'bg-gray-500', text: 'BRAK DANYCH' };
        if (rate >= 0.90) return { colorClass: 'text-danger', bgClass: 'bg-danger', text: 'KRYTYCZNE' };
        if (rate >= 0.70) return { colorClass: 'text-warning', bgClass: 'bg-warning', text: 'UWAGA' };
        return { colorClass: 'text-safe', bgClass: 'bg-safe', text: 'BEZPIECZNA' };
    };

    return (
        <div className="dashboard-page max-w-[1400px] mx-auto pb-12">
            
            {/* NAGŁÓWEK */}
<header className="dashboard-header flex justify-between items-start mb-8">
                <div><p className="text-sm text-gray-400">Przegląd wydarzenia · dane z API</p><h1>{activeEvent.name}</h1><p className="text-sm text-gray-400">{activeEvent.venue}</p></div>
                <Link to="/settings" className="bg-surface rounded-lg px-5 py-2"><p className="text-sm text-white font-medium">{profile.name || 'Profil organizatora'}</p><p className="text-xs text-gray-400 mt-0.5">Ustawienia lokalne</p></Link>
            </header>
            {monitoring.error && <div className="monitoring-error" role="alert"><p>{monitoring.error} Wyświetlane są ostatnio pobrane dane.</p><button className="local-button mt-3" onClick={monitoring.refresh} disabled={monitoring.loading}>Spróbuj ponownie</button></div>}

            {/* KAFELKI STATYSTYK (4 kolumny) */}
            <section className="dashboard-stats grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="text-4xl font-bold text-danger mb-2">{alerts.length}</div>
                    <div className="text-sm text-gray-400"><span className="desktop-nav-label">Aktywne alerty</span><span className="mobile-only">alerty</span></div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="text-4xl font-bold text-primary mb-2">{activeEvent.zones.length}</div>
                    <div className="text-sm text-gray-400"><span className="desktop-nav-label">Monitorowane strefy</span><span className="mobile-only">strefy</span></div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="text-4xl font-bold text-warning mb-2">{overallOccupancy}%</div>
                    <div className="text-sm text-gray-400">Pojemność obiektu</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className={`text-4xl font-bold ${monitoring.error ? 'text-warning' : 'text-safe'} mb-2`}>{monitoring.error ? 'Błąd' : '5 s'}</div>
                    <div className="text-sm text-gray-400">Odświeżanie danych</div>
                </div>
            </section>

            {/* OBCIĄŻENIE KLUCZOWYCH STREF */}
            <section className="mb-10">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-white">Obciążenie kluczowych stref</h2>
                    <Link to="/map" className="dashboard-link text-sm text-primary font-semibold hover:underline">Wszystkie strefy <ArrowUpRight size={16} aria-hidden="true" /></Link>
                </div>
                
                <div className="dashboard-key-zones grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {!keyZones.length && <p className="text-sm text-gray-400">Brak stref w tym wydarzeniu.</p>}
                    {keyZones.map((zone) => {
                        const rate = zone.capacity > 0 ? zone.current_count / zone.capacity : null;
                        const status = getZoneStatus(rate);
                        
                        return (
                            <div key={zone.id} className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between">
                                <div className="font-semibold text-white mb-4 text-sm">{zone.name}</div>
                                {/* ZMIANA: Zbliżenie procentów i licznika do siebie */}
                                <div className="flex flex-wrap items-baseline gap-3 mb-4">
                                    <span className={`text-4xl font-bold ${status.colorClass}`}>
                                        {rate === null ? 'Brak danych' : `${Math.round(rate * 100)}%`}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        {formatNumber(zone.current_count)} / {formatNumber(zone.capacity)} osób
                                    </span>
                                </div>
                                
                                <div>
                                    <div className="h-2 w-full bg-dark rounded-full mb-2 overflow-hidden">
                                        <div 
                                            className={`h-full ${status.bgClass} rounded-full transition-all duration-500`} 
                                            style={{ width: `${Math.min(Math.round(rate * 100), 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className={`text-[10px] font-bold tracking-wider ${status.colorClass}`}>
                                        {status.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* PRIORYTETOWE ALERTY */}
            <section className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Priorytetowe alerty</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {priorityAlerts.length > 0 ? priorityAlerts.map(alert => {
                        const isCritical = alert.level === 'critical';
                        const borderColor = isCritical ? 'border-l-danger' : 'border-l-warning';
                        const textColor = isCritical ? 'text-danger' : 'text-warning';
                        const buttonClass = isCritical 
                            ? 'bg-danger text-white hover:bg-danger/80' 
                            : 'bg-dark border border-border text-white hover:bg-gray-800';

                        // Szukamy danych strefy dla tego alertu
                        const zone = activeEvent.zones.find(z => z.id === alert.zone_id);
                        const rate = zone?.capacity > 0 ? Math.round((zone.current_count / zone.capacity) * 100) : null;
                        const capacityText = zone ? `${formatNumber(zone.current_count)} / ${formatNumber(zone.capacity)} osób${rate === null ? '' : ` · ${rate}% pojemności`}` : '';

                        return (
                            <div key={alert.id} className={`bg-surface border-y border-r border-border border-l-4 ${borderColor} rounded-xl p-6 flex flex-col items-start`}>
                                {/* ZMIANA: Myślnik zamiast kropki */}
                                <div className={`text-[10px] font-bold tracking-wider uppercase ${textColor} mb-2`}>
                                    {isCritical ? 'KRYTYCZNE' : 'UWAGA'} - {zone?.name.split(' - ')[0] || 'STREFA'}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{alert.message.split('! ')[0] || 'Przeciążenie'}</h3>
                                <p className="text-sm text-gray-400 mb-6">{capacityText}</p>
                                
                                {/* ZMIANA: Zwarta szerokość przycisku */}
                                <Link to={`/alerts?zone=${encodeURIComponent(alert.zone_id)}`} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${buttonClass}`}>
                                    {isCritical ? 'Otwórz alert' : 'Monitoruj'}
                                </Link>
                            </div>
                        );
                    }) : (
                        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 text-gray-400 text-center">
                            Brak priorytetowych alertów.
                        </div>
                    )}
                </div>
            </section>

            {/* WSKAZÓWKA OPERACYJNA */}
            <section>
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="text-sm font-bold text-primary mb-2">Wskazówka operacyjna</div>
                    <p className="text-gray-300 text-sm">
                        {priorityAlerts.length ? 'Są aktywne zgłoszenia. Otwórz szczegóły alertów i zweryfikuj sytuację w odpowiednich strefach.' : 'Brak aktywnych zgłoszeń. Aktualne obciążenie poszczególnych stref znajdziesz na mapie.'}
                    </p>
                </div>
            </section>

        </div>
    );
}
