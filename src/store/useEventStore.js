import { create } from "zustand";
import { echo } from "../api/echo";
import { api } from "../api/axios";

export const useEventStore = create((set) => ({
  events: [],
  alerts: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });

    try {
      const response = await api.get("/events");
      set({ events: response.data, loading: false });
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
      set({ error: error.message, loading: false });
    }
  },

  fetchActiveAlerts: async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}/alerts/active`);
      set({ alerts: response.data })
    }
    catch (error) {
      console.error("Błąd pobierania aktywnych alertów:", error);
    }
  },

  subscribeToEvent: (eventId) => {
    const channel = echo.channel(`events.${eventId}`);
    channel.listen(".zone:update", (eventData) => {
      const updatedZone = eventData.zone;

      const occupancyRate = updatedZone.current_count / updatedZone.capacity;
      
      set((state) => {
        const updatedEvents = state.events.map(event => {
          if (event.id === eventId) {
            return {
              ...event,
              zones: event.zones.map(zone =>
                zone.id === updatedZone.id ? updatedZone : zone,
              ),
            };
          }
          return event;
        })
        let updatedAlerts = state.alerts;
        if (occupancyRate < 0.70) {
          updatedAlerts = state.alerts.filter(alert => alert.zone_id !== updatedZone.id);

        }
        else if (occupancyRate >= 0.70 && occupancyRate < 0.90) {
          updatedAlerts = state.alerts.filter(alert => !(alert.zone_id === updatedZone.id && alert.level === 'critical')
        );
      }
      return {
        events: updatedEvents,
        alerts: updatedAlerts
      }
      });
    });


    channel.listen(".alert:new", (eventData) => {
      set((state) => ({
        alerts: [eventData.alert, ...state.alerts],
      }));
    });
  },

  unsubscribeFromEvent: (eventId) => {
    echo.leaveChannel(`events.${eventId}`);
  },
}));
