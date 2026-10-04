import { create } from 'zustand';
import { getEventWorkspace } from '../api/eventWorkspace';

export const useWorkspaceStore = create(set => ({
    navigationSource: 'live',
    setNavigationSource: navigationSource => set({ navigationSource }),
    data: null, error: '',
    load: async () => {
        try { set({ data: await getEventWorkspace(), error: '' }); }
        catch (error) { set({ data: null, error: error.message }); }
    },
    update: async operation => {
        const data = await operation();
        set({ data, error: '' });
        return data;
    },
}));
