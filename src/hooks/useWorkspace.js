import { useEffect } from 'react';
import { EVENT_WORKSPACE_KEY } from '../api/eventWorkspace';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function useWorkspace() {
    const store = useWorkspaceStore();
    const load = store.load;
    useEffect(() => {
        load();
        const changed = event => { if (event.key === EVENT_WORKSPACE_KEY || event.key === null) load(); };
        window.addEventListener('storage', changed);
        return () => window.removeEventListener('storage', changed);
    }, [load]);
    return store;
}
