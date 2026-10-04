import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Keep the desktop toolbar intact; let compact screens reveal its controls on demand.
export default function MobileControls({ children, label = 'Filtry i opcje' }) {
    const [expanded, setExpanded] = useState(false);
    const id = useId();
    return <div className={`mobile-controls ${expanded ? 'is-expanded' : ''}`}>
        <button type="button" className="mobile-disclosure-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{label}<ChevronDown size={16} aria-hidden="true" /></button>
        <div id={id} className="mobile-controls-content">{children}</div>
    </div>;
}
