import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useEventStore } from '../store/useEventStore';

export function useMonitoringData(eventId) {
    const [request, setRequest] = useState(0);
    const [status, setStatus] = useState({ loading: true, error: null, updatedAt: null });

    useEffect(() => {
        const controller = new AbortController();
        let timer;

        async function refresh() {
            setStatus(previous => ({ ...previous, loading: true }));
            try {
                // Commit a consistent snapshot only when both requests succeed.
                const [events, alerts] = await Promise.all([
                    api.get('/events', { signal: controller.signal, timeout: 10000 }),
                    api.get(`/events/${eventId}/alerts/active`, { signal: controller.signal, timeout: 10000 }),
                ]);
                if (controller.signal.aborted) return;
                useEventStore.setState({ events: events.data, alerts: alerts.data });
                setStatus({ loading: false, error: null, updatedAt: new Date() });
            } catch {
                if (controller.signal.aborted) return;
                setStatus(previous => ({ ...previous, loading: false, error: 'Nie udało się odświeżyć danych. Sprawdź połączenie z serwerem.' }));
            } finally {
                if (!controller.signal.aborted) timer = window.setTimeout(refresh, 5000);
            }
        }

        if (eventId) refresh();
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [eventId, request]);

    return { ...status, refresh: () => setRequest(value => value + 1) };
}
