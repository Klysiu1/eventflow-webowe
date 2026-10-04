import { create } from 'zustand';
import { endDemoSession, getDemoSession, startDemoSession } from '../api/demoAuth';

export const useDemoSession = create(set => ({
    session: getDemoSession(),
    login: async (values, register) => { const session = await startDemoSession(values, register); set({ session }); },
    logout: async () => { await endDemoSession(); set({ session: null }); },
}));
