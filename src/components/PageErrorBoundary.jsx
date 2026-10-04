import { Component } from 'react';

export default class PageErrorBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) return <div className="monitoring-empty"><h1 className="text-2xl font-bold">Nie udało się wyświetlić strony</h1><p role="alert">Odśwież stronę, aby spróbować ponownie. Zapisane dane lokalne nie zostaną usunięte.</p><button type="button" className="local-button" onClick={() => window.location.reload()}>Odśwież stronę</button></div>;
        return this.props.children;
    }
}
