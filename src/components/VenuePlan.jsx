import { useEffect } from 'react';
import { CRS } from 'leaflet';
import { MapContainer, Polygon, Rectangle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getDemoZoneStatus } from '../utils/demoZones';
import { Maximize } from 'lucide-react';

function FitPlan() {
    const map = useMap();
    useEffect(() => {
        const fit = () => { map.invalidateSize(); map.fitBounds([[0, 0], [100, 100]], { padding: [18, 18] }); };
        const observer = new ResizeObserver(fit);
        observer.observe(map.getContainer());
        fit();
        return () => observer.disconnect();
    }, [map]);
    return <button type="button" className="venue-fit" aria-label="Dopasuj plan" title="Dopasuj plan" onClick={() => map.fitBounds([[0, 0], [100, 100]], { padding: [18, 18] })}><Maximize size={18} aria-hidden="true" /></button>;
}

export default function VenuePlan({ zones, selectedId, onSelect }) {
    return <div className="venue-plan" aria-label="Schemat obiektu z obszarami stref">
        <MapContainer crs={CRS.Simple} center={[50, 50]} zoom={1} minZoom={0} maxZoom={4} scrollWheelZoom={false} attributionControl={false}>
            <FitPlan />
            <Rectangle bounds={[[0, 0], [100, 100]]} pathOptions={{ color: '#64748b', fillColor: '#262f38', fillOpacity: 1, weight: 1 }} interactive={false} />
            {zones.filter(zone => zone.area).map(zone => {
                const { x, y, width, height } = zone.area;
                const color = getDemoZoneStatus(zone).color;
                return <Polygon key={zone.id} positions={[[100 - y, x], [100 - y, x + width], [100 - y - height, x + width], [100 - y - height, x]]}
                    pathOptions={{ color: zone.id === selectedId ? '#fff' : color, fillColor: color, fillOpacity: .28, weight: zone.id === selectedId ? 3 : 2 }}
                    eventHandlers={{ click: () => onSelect?.(zone.id) }}>
                    <Tooltip permanent={width >= 15 && height >= 15} direction="center" className="venue-zone-label">{width >= 20 && height >= 15 && <span>{zone.name}</span>}<strong>{zone.current_count / zone.capacity > 9.99 ? '>999%' : `${Math.round(zone.current_count / zone.capacity * 100)}%`}</strong></Tooltip>
                </Polygon>;
            })}
        </MapContainer>
    </div>;
}
