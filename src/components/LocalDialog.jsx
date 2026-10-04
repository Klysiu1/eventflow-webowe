import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function LocalDialog({ title, busy, onClose, children }) {
    const ref = useRef(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        dialog.showModal();
        dialog.querySelector('input, select, textarea')?.focus();
        return () => { dialog.close(); previousFocus?.focus(); };
    }, []);
    return (
        <dialog ref={ref} className="local-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
            <header><h2 id={titleId}>{title}</h2><button type="button" className="monitoring-icon-button" onClick={onClose} disabled={busy} aria-label="Zamknij okno" title="Zamknij okno"><X size={18} aria-hidden="true" /></button></header>
            {children}
        </dialog>
    );
}
