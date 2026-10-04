import { useEffect, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatNumber, formatPercent, getZoneCoordinates, getZoneStatus } from '../utils/monitoring';

function MapBounds({ positionsKey }) {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(JSON.parse(positionsKey), { padding: [45, 45], maxZoom: 16 });
    }, [map, positionsKey]);
    return null;
}

export default function ZoneMap({ event }) {
    const [tileError, setTileError] = useState(false);
    const located = event.zones.map(zone => ({ zone, position: getZoneCoordinates(zone) })).filter(item => item.position);
    const positions = located.map(item => item.position);
    const missing = event.zones.length - located.length;

    if (!located.length) return (
        <div className="monitoring-empty">
            <MapPinOff size={32} aria-hidden="true" />
            <h2>Brak lokalizacji stref</h2>
            <p>Strefy tego wydarzenia nie mają zapisanych współrzędnych.</p>
        </div>
    );

    return (
        <div>
            {missing > 0 && <p className="monitoring-notice">Strefy bez lokalizacji: {missing}. Nie są widoczne na mapie.</p>}
            {tileError && <p className="monitoring-notice" role="status">Nie udało się wczytać części mapy. Sprawdź połączenie z internetem.</p>}
            <div className="monitoring-map">
                <MapContainer center={positions[0]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <MapBounds positionsKey={JSON.stringify(positions)} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' eventHandlers={{ tileerror: () => setTileError(true) }} />
                    {located.map(({ zone, position }) => {
                        const status = getZoneStatus(zone);
                        return (
                            <CircleMarker key={zone.id} center={position} pathOptions={{ color: status.color, fillColor: status.color, fillOpacity: 0.45 }} radius={24}>
                                <Popup><strong>{zone.name}</strong><br />{formatNumber(zone.current_count)} / {formatNumber(zone.capacity)} osób<br />{formatPercent(status.percent)} · {status.label}</Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}
