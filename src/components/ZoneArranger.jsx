import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
    AlertTriangle, 
    Copy, 
    Grid, 
    MousePointer, 
    Plus, 
    Trash2, 
    X 
} from 'lucide-react';
import { getDemoZoneStatus } from '../utils/demoZones';
import { formatNumber } from '../utils/monitoring';
import './ZoneArranger.css';

const ZONE_PRESETS = [
    { name: 'Scena Główna', capacity: 10000, alert_threshold: 90, width: 50, height: 30, icon: '🎪' },
    { name: 'Food Court', capacity: 5000, alert_threshold: 85, width: 30, height: 30, icon: '🍔' },
    { name: 'Wejście Główne', capacity: 5000, alert_threshold: 90, width: 35, height: 22, icon: '🚪' },
    { name: 'Parking', capacity: 4000, alert_threshold: 85, width: 45, height: 22, icon: '🚗' },
    { name: 'Scena Boczna', capacity: 3000, alert_threshold: 90, width: 30, height: 23, icon: '🎸' },
    { name: 'Strefa VIP', capacity: 800, alert_threshold: 90, width: 20, height: 23, icon: '⭐' },
    { name: 'Toalety', capacity: 1000, alert_threshold: 90, width: 15, height: 20, icon: '🚻' },
    { name: 'Pomoc Medyczna', capacity: 100, alert_threshold: 80, width: 15, height: 20, icon: '🏥' },
];

function checkCollision(a, b) {
    if (!a || !b) return false;
    return (
        Number(a.x) < Number(b.x) + Number(b.width) &&
        Number(a.x) + Number(a.width) > Number(b.x) &&
        Number(a.y) < Number(b.y) + Number(b.height) &&
        Number(a.y) + Number(a.height) > Number(b.y)
    );
}

function findCollisions(zones) {
    const colliding = new Set();
    for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
            if (checkCollision(zones[i].area, zones[j].area)) {
                colliding.add(zones[i].id);
                colliding.add(zones[j].id);
            }
        }
    }
    return colliding;
}

function findEmptySlot(zones, width = 30, height = 25) {
    for (let y = 5; y <= 100 - height; y += 5) {
        for (let x = 5; x <= 100 - width; x += 5) {
            const candidate = { x, y, width, height };
            if (!zones.some(z => checkCollision(candidate, z.area))) {
                return candidate;
            }
        }
    }
    for (const [w, h] of [[20, 20], [15, 15], [10, 10], [5, 5]]) {
        for (let y = 0; y <= 100 - h; y += 5) {
            for (let x = 0; x <= 100 - w; x += 5) {
                const candidate = { x, y, width: w, height: h };
                if (!zones.some(z => checkCollision(candidate, z.area))) {
                    return candidate;
                }
            }
        }
    }
    return { x: 0, y: 0, width: 15, height: 15 };
}

function getUniqueName(baseName, existingZones) {
    const existingNames = new Set(existingZones.map(z => z.name.trim().toLocaleLowerCase('pl')));
    if (!existingNames.has(baseName.trim().toLocaleLowerCase('pl'))) return baseName;
    let counter = 2;
    while (existingNames.has(`${baseName} ${counter}`.toLocaleLowerCase('pl'))) {
        counter++;
    }
    return `${baseName} ${counter}`;
}

export default function ZoneArranger({ zones = [], onChange, maxCapacity = 0, readOnly = false }) {
    const [selectedId, setSelectedId] = useState(() => zones[0]?.id ?? null);
    const [snapGrid, setSnapGrid] = useState(true);
    const [snapStep, setSnapStep] = useState(5);
    const canvasRef = useRef(null);
    const dragState = useRef(null);

    const collidingIds = useMemo(() => findCollisions(zones), [zones]);
    const selectedZone = useMemo(() => zones.find(z => z.id === selectedId), [zones, selectedId]);
    const totalCapacity = useMemo(() => zones.reduce((sum, z) => sum + (Number(z.capacity) || 0), 0), [zones]);

    // Cleanup pointer capture if component unmounts
    useEffect(() => {
        return () => {
            dragState.current = null;
        };
    }, []);

    const updateZone = useCallback((id, patch) => {
        if (readOnly) return;
        onChange?.(zones.map(z => z.id === id ? { ...z, ...patch } : z));
    }, [zones, onChange, readOnly]);

    const updateZoneArea = useCallback((id, areaPatch) => {
        if (readOnly) return;
        onChange?.(zones.map(z => {
            if (z.id !== id) return z;
            return {
                ...z,
                area: {
                    ...z.area,
                    ...areaPatch,
                }
            };
        }));
    }, [zones, onChange, readOnly]);

    const addPresetZone = useCallback((preset) => {
        if (readOnly) return;
        const name = getUniqueName(preset.name, zones);
        const area = findEmptySlot(zones, preset.width, preset.height);
        const newId = `demo-zone-${crypto.randomUUID()}`;
        const newZone = {
            id: newId,
            name,
            capacity: preset.capacity,
            alert_threshold: preset.alert_threshold,
            current_count: 0,
            area,
        };
        const nextZones = [...zones, newZone];
        onChange?.(nextZones);
        setSelectedId(newId);
    }, [zones, onChange, readOnly]);

    const addCustomZone = useCallback(() => {
        addPresetZone({
            name: 'Nowa strefa',
            capacity: 1000,
            alert_threshold: 90,
            width: 25,
            height: 20,
        });
    }, [addPresetZone]);

    const duplicateZone = useCallback((id) => {
        if (readOnly) return;
        const source = zones.find(z => z.id === id);
        if (!source) return;
        const name = getUniqueName(`${source.name} (kopia)`, zones);
        const area = findEmptySlot(zones, source.area.width, source.area.height);
        const newId = `demo-zone-${crypto.randomUUID()}`;
        const newZone = {
            ...structuredClone(source),
            id: newId,
            name,
            current_count: 0,
            area,
        };
        onChange?.([...zones, newZone]);
        setSelectedId(newId);
    }, [zones, onChange, readOnly]);

    const deleteZone = useCallback((id) => {
        if (readOnly) return;
        const next = zones.filter(z => z.id !== id);
        onChange?.(next);
        if (selectedId === id) {
            setSelectedId(next[0]?.id ?? null);
        }
    }, [zones, onChange, selectedId, readOnly]);

    // Dragging & Resizing handling via Pointer Events
    const handlePointerDown = (e, zone, mode) => {
        if (readOnly) return;
        e.stopPropagation();
        setSelectedId(zone.id);

        const target = e.currentTarget;
        try {
            target.setPointerCapture(e.pointerId);
        } catch (err) {
            void err;
        }

        dragState.current = {
            pointerId: e.pointerId,
            zoneId: zone.id,
            mode,
            startX: e.clientX,
            startY: e.clientY,
            initialArea: { ...zone.area },
        };
    };

    const handlePointerMove = (e) => {
        if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
        const { zoneId, mode, startX, startY, initialArea } = dragState.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        const deltaY = ((e.clientY - startY) / rect.height) * 100;

        const step = snapGrid ? snapStep : 1;

        const nextZones = zones.map(z => {
            if (z.id !== zoneId) return z;

            const nextArea = { ...z.area };
            if (mode === 'move') {
                let nx = initialArea.x + deltaX;
                let ny = initialArea.y + deltaY;
                nx = Math.round(nx / step) * step;
                ny = Math.round(ny / step) * step;
                nx = Math.max(0, Math.min(100 - initialArea.width, nx));
                ny = Math.max(0, Math.min(100 - initialArea.height, ny));
                nextArea.x = nx;
                nextArea.y = ny;
            } else if (mode === 'resize-br') {
                let nw = initialArea.width + deltaX;
                let nh = initialArea.height + deltaY;
                nw = Math.round(nw / step) * step;
                nh = Math.round(nh / step) * step;
                nw = Math.max(5, Math.min(100 - initialArea.x, nw));
                nh = Math.max(5, Math.min(100 - initialArea.y, nh));
                nextArea.width = nw;
                nextArea.height = nh;
            } else if (mode === 'resize-r') {
                let nw = initialArea.width + deltaX;
                nw = Math.round(nw / step) * step;
                nw = Math.max(5, Math.min(100 - initialArea.x, nw));
                nextArea.width = nw;
            } else if (mode === 'resize-b') {
                let nh = initialArea.height + deltaY;
                nh = Math.round(nh / step) * step;
                nh = Math.max(5, Math.min(100 - initialArea.y, nh));
                nextArea.height = nh;
            }
            return { ...z, area: nextArea };
        });

        onChange?.(nextZones);
    };

    const handlePointerUp = (e) => {
        if (dragState.current && dragState.current.pointerId === e.pointerId) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {
                void err;
            }
            dragState.current = null;
        }
    };

    // Keyboard nudge for selected block
    const handleKeyDown = (e) => {
        if (readOnly || !selectedZone) return;
        const step = e.shiftKey ? 5 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                deleteZone(selectedZone.id);
            }
            return;
        } else if (e.key === 'Escape') {
            setSelectedId(null);
            return;
        } else {
            return;
        }

        e.preventDefault();
        const nx = Math.max(0, Math.min(100 - selectedZone.area.width, selectedZone.area.x + dx));
        const ny = Math.max(0, Math.min(100 - selectedZone.area.height, selectedZone.area.y + dy));
        updateZoneArea(selectedZone.id, { x: nx, y: ny });
    };

    // Double click canvas to add zone at clicked position
    const handleCanvasDoubleClick = (e) => {
        if (readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        let clickX = Math.round((((e.clientX - rect.left) / rect.width) * 100) / 5) * 5;
        let clickY = Math.round((((e.clientY - rect.top) / rect.height) * 100) / 5) * 5;
        const w = 25;
        const h = 20;
        clickX = Math.max(0, Math.min(100 - w, clickX));
        clickY = Math.max(0, Math.min(100 - h, clickY));

        const name = getUniqueName('Nowa strefa', zones);
        const newId = `demo-zone-${crypto.randomUUID()}`;
        const newZone = {
            id: newId,
            name,
            capacity: 1000,
            alert_threshold: 90,
            current_count: 0,
            area: { x: clickX, y: clickY, width: w, height: h },
        };
        onChange?.([...zones, newZone]);
        setSelectedId(newId);
    };

    return (
        <section className="zone-arranger" aria-label="Układ stref na planie obiektu" onKeyDown={handleKeyDown}>
            {/* Header & Controls */}
            <header className="zone-arranger-header">
                <div className="zone-arranger-title">
                    <h3>Układ stref na planie obiektu</h3>
                    <p>Przeciągaj strefy, zmieniaj ich rozmiary narożnikami i rozmieszczaj je na planie 100 × 100.</p>
                </div>
                {!readOnly && (
                    <div className="zone-arranger-toolbar">
                        <button
                            type="button"
                            className={`arranger-btn ${snapGrid ? 'active' : ''}`}
                            onClick={() => setSnapGrid(!snapGrid)}
                            title="Przyciągaj strefy do siatki podczas przeciągania"
                        >
                            <Grid size={15} />
                            Siatka: {snapGrid ? `${snapStep}% (Włączona)` : 'Wyłączona'}
                        </button>
                        {snapGrid && (
                            <button
                                type="button"
                                className="arranger-btn"
                                onClick={() => setSnapStep(snapStep === 5 ? 1 : 5)}
                                title="Zmień skok siatki (5% lub 1%)"
                            >
                                Skok: {snapStep}%
                            </button>
                        )}
                        <button
                            type="button"
                            className="arranger-btn active"
                            onClick={addCustomZone}
                            title="Dodaj nową pustą strefę"
                        >
                            <Plus size={15} />
                            Dodaj strefę
                        </button>
                    </div>
                )}
            </header>

            {/* Presets Strip */}
            {!readOnly && (
                <div className="zone-presets-bar">
                    <span className="zone-presets-label">
                        <Plus size={14} /> Szybkie dodawanie predefiniowanych stref:
                    </span>
                    <div className="zone-presets-list">
                        {ZONE_PRESETS.map(preset => (
                            <button
                                key={preset.name}
                                type="button"
                                className="preset-chip"
                                onClick={() => addPresetZone(preset)}
                                title={`Dodaj strefę "${preset.name}" (${preset.width}×${preset.height}, ${formatNumber(preset.capacity)} os.)`}
                            >
                                <span>{preset.icon}</span>
                                <strong>{preset.name}</strong>
                                <small style={{ color: '#94a3b8' }}>{preset.width}×{preset.height}</small>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Collision Alert Banner */}
            {collidingIds.size > 0 && (
                <div className="zone-collision-banner" role="alert">
                    <AlertTriangle size={18} />
                    <span>
                        Wykryto kolizję stref! Obszary zaznaczone czerwoną przerywaną linią nachodzą na siebie. Rozsuń je lub zmniejsz przed zapisaniem.
                    </span>
                </div>
            )}

            {/* Workspace Area: Canvas + Inspector */}
            <div className="zone-arranger-workspace">
                {/* Canvas Container */}
                <div className="zone-canvas-wrapper">
                    <div
                        ref={canvasRef}
                        className="zone-arranger-canvas"
                        tabIndex={0}
                        onClick={() => setSelectedId(null)}
                        onDoubleClick={handleCanvasDoubleClick}
                        title="Kliknij, aby odznaczyć. Kliknij dwukrotnie w wolne miejsce, aby dodać strefę."
                    >
                        {/* Grid markings */}
                        <div className="zone-canvas-grid" />
                        <div className="zone-canvas-grid-finer" />

                        {/* Rulers / labels */}
                        <div className="zone-canvas-rulers">
                            <span className="ruler-mark-x" style={{ left: '0%' }}>0</span>
                            <span className="ruler-mark-x" style={{ left: '25%' }}>25</span>
                            <span className="ruler-mark-x" style={{ left: '50%' }}>50</span>
                            <span className="ruler-mark-x" style={{ left: '75%' }}>75</span>
                            <span className="ruler-mark-x" style={{ left: '98%' }}>100</span>
                            <span className="ruler-mark-y" style={{ top: '25%' }}>25</span>
                            <span className="ruler-mark-y" style={{ top: '50%' }}>50</span>
                            <span className="ruler-mark-y" style={{ top: '75%' }}>75</span>
                            <span className="ruler-mark-y" style={{ top: '98%' }}>100</span>
                        </div>

                        {/* Render Zone Blocks */}
                        {zones.map(zone => {
                            if (!zone.area) return null;
                            const isSelected = zone.id === selectedId;
                            const isColliding = collidingIds.has(zone.id);
                            
                            const statusColor = (zone.current_count > 0 && zone.capacity > 0)
                                ? getDemoZoneStatus(zone).color
                                : '#22c55e';
                            const statusBg = (zone.current_count > 0 && zone.capacity > 0)
                                ? (statusColor === '#ef4444' 
                                    ? 'rgba(239, 68, 68, 0.28)'
                                    : statusColor === '#eab308' || statusColor === '#f59e0b'
                                    ? 'rgba(245, 158, 11, 0.28)'
                                    : 'rgba(34, 197, 94, 0.28)')
                                : 'rgba(34, 197, 94, 0.22)';

                            const { x, y, width, height } = zone.area;

                            return (
                                <div
                                    key={zone.id}
                                    className={`zone-block ${isSelected ? 'selected' : ''} ${isColliding ? 'colliding' : ''}`}
                                    style={{
                                        left: `${x}%`,
                                        top: `${y}%`,
                                        width: `${width}%`,
                                        height: `${height}%`,
                                        borderColor: isColliding ? '#ef4444' : isSelected ? '#ffffff' : statusColor,
                                        backgroundColor: isColliding ? 'rgba(239, 68, 68, 0.35)' : statusBg,
                                    }}
                                    onPointerDown={(e) => handlePointerDown(e, zone, 'move')}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(zone.id);
                                    }}
                                    role="button"
                                    aria-label={`Strefa ${zone.name}, pojemność: ${zone.capacity}`}
                                    title={`${zone.name} (${width}×${height}) · Przeciągnij, aby przesunąć`}
                                >
                                    <div className="zone-block-content">
                                        <span className="zone-block-name">{zone.name}</span>
                                        {zone.current_count > 0 && zone.capacity > 0 ? (
                                            <span className="zone-block-metric">
                                                {Math.round((zone.current_count / zone.capacity) * 100)}%
                                            </span>
                                        ) : (
                                            <span className="zone-block-capacity">
                                                {formatNumber(zone.capacity)} os.
                                            </span>
                                        )}
                                        {isColliding && (
                                            <span className="zone-block-collision-pill">
                                                Kolizja
                                            </span>
                                        )}
                                    </div>

                                    {/* Resize handles */}
                                    {isSelected && !readOnly && (
                                        <>
                                            <div
                                                className="zone-resize-handle handle-br"
                                                title="Zmień rozmiar (szerokość i wysokość)"
                                                onPointerDown={(e) => handlePointerDown(e, zone, 'resize-br')}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                            />
                                            <div
                                                className="zone-resize-handle handle-r"
                                                title="Zmień szerokość"
                                                onPointerDown={(e) => handlePointerDown(e, zone, 'resize-r')}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                            />
                                            <div
                                                className="zone-resize-handle handle-b"
                                                title="Zmień wysokość"
                                                onPointerDown={(e) => handlePointerDown(e, zone, 'resize-b')}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <span className="zone-canvas-hint">
                        Obszar roboczy 100 × 100 · Złap za strefę, by przesunąć · Pociągnij za narożnik, by zmienić rozmiar
                    </span>
                </div>

                {/* Properties Inspector Panel */}
                <aside className="zone-inspector" aria-label="Właściwości wybranej strefy">
                    {selectedZone ? (
                        <>
                            <div className="zone-inspector-header">
                                <h4>Właściwości strefy</h4>
                                <button
                                    type="button"
                                    className="arranger-btn"
                                    onClick={() => setSelectedId(null)}
                                    title="Odznacz strefę"
                                >
                                    <X size={14} /> Odznacz
                                </button>
                            </div>

                            <div className="inspector-field">
                                <label htmlFor="zone-name">Nazwa strefy</label>
                                <input
                                    id="zone-name"
                                    type="text"
                                    maxLength={100}
                                    value={selectedZone.name}
                                    disabled={readOnly}
                                    onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
                                />
                            </div>

                            <div className="inspector-field-grid">
                                <div className="inspector-field">
                                    <label htmlFor="zone-capacity">Pojemność (osoby)</label>
                                    <input
                                        id="zone-capacity"
                                        type="number"
                                        min="1"
                                        max="1000000"
                                        value={selectedZone.capacity}
                                        disabled={readOnly}
                                        onChange={(e) => updateZone(selectedZone.id, { capacity: Number(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="inspector-field">
                                    <label htmlFor="zone-threshold">Próg krytyczny (%)</label>
                                    <input
                                        id="zone-threshold"
                                        type="number"
                                        min="71"
                                        max="100"
                                        value={selectedZone.alert_threshold}
                                        disabled={readOnly}
                                        onChange={(e) => updateZone(selectedZone.id, { alert_threshold: Number(e.target.value) || 90 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                                    Położenie i rozmiar (0..100)
                                </label>
                                <div className="inspector-coords-grid">
                                    <div className="inspector-field">
                                        <label htmlFor="zone-x">Od lewej (X)</label>
                                        <input
                                            id="zone-x"
                                            type="number"
                                            min="0"
                                            max={100 - selectedZone.area.width}
                                            value={selectedZone.area.x}
                                            disabled={readOnly}
                                            onChange={(e) => updateZoneArea(selectedZone.id, { x: Math.max(0, Math.min(100 - selectedZone.area.width, Number(e.target.value) || 0)) })}
                                        />
                                    </div>
                                    <div className="inspector-field">
                                        <label htmlFor="zone-y">Od góry (Y)</label>
                                        <input
                                            id="zone-y"
                                            type="number"
                                            min="0"
                                            max={100 - selectedZone.area.height}
                                            value={selectedZone.area.y}
                                            disabled={readOnly}
                                            onChange={(e) => updateZoneArea(selectedZone.id, { y: Math.max(0, Math.min(100 - selectedZone.area.height, Number(e.target.value) || 0)) })}
                                        />
                                    </div>
                                    <div className="inspector-field">
                                        <label htmlFor="zone-width">Szerokość</label>
                                        <input
                                            id="zone-width"
                                            type="number"
                                            min="5"
                                            max={100 - selectedZone.area.x}
                                            value={selectedZone.area.width}
                                            disabled={readOnly}
                                            onChange={(e) => updateZoneArea(selectedZone.id, { width: Math.max(5, Math.min(100 - selectedZone.area.x, Number(e.target.value) || 5)) })}
                                        />
                                    </div>
                                    <div className="inspector-field">
                                        <label htmlFor="zone-height">Wysokość</label>
                                        <input
                                            id="zone-height"
                                            type="number"
                                            min="5"
                                            max={100 - selectedZone.area.y}
                                            value={selectedZone.area.height}
                                            disabled={readOnly}
                                            onChange={(e) => updateZoneArea(selectedZone.id, { height: Math.max(5, Math.min(100 - selectedZone.area.y, Number(e.target.value) || 5)) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {!readOnly && (
                                <div className="inspector-actions">
                                    <button
                                        type="button"
                                        className="arranger-btn"
                                        onClick={() => duplicateZone(selectedZone.id)}
                                        title="Zduplikuj tę strefę"
                                    >
                                        <Copy size={14} /> Duplikuj
                                    </button>
                                    <button
                                        type="button"
                                        className="arranger-btn danger"
                                        onClick={() => deleteZone(selectedZone.id)}
                                        title="Usuń tę strefę z wydarzenia"
                                    >
                                        <Trash2 size={14} /> Usuń strefę
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="inspector-empty">
                            <MousePointer size={28} />
                            <p>Wybierz dowolną strefę na planie, aby dostosować jej nazwę, pojemność oraz współrzędne.</p>
                            {!readOnly && (
                                <button
                                    type="button"
                                    className="arranger-btn active"
                                    style={{ marginTop: '8px' }}
                                    onClick={addCustomZone}
                                >
                                    <Plus size={15} /> Dodaj nową strefę
                                </button>
                            )}
                        </div>
                    )}

                    {/* Zone Quick List */}
                    <div className="zone-quick-list">
                        <div className="zone-quick-list-header">
                            <span>Strefy w wydarzeniu ({zones.length})</span>
                            <span style={{ color: '#94a3b8' }}>Wybierz do edycji</span>
                        </div>
                        <div className="zone-quick-chips">
                            {zones.map(z => {
                                const isSel = z.id === selectedId;
                                const isColl = collidingIds.has(z.id);
                                return (
                                    <div
                                        key={z.id}
                                        className={`zone-chip-row ${isSel ? 'selected' : ''} ${isColl ? 'colliding' : ''}`}
                                        onClick={() => setSelectedId(z.id)}
                                        title={`Kliknij, by zaznaczyć "${z.name}"`}
                                    >
                                        <div className="zone-chip-row-info">
                                            <span 
                                                className="zone-chip-indicator"
                                                style={{ background: isColl ? '#ef4444' : isSel ? '#60a5fa' : '#22c55e' }}
                                            />
                                            <span className="zone-chip-name">{z.name}</span>
                                        </div>
                                        <span className="zone-chip-meta">
                                            {z.area?.width}×{z.area?.height} · {formatNumber(z.capacity)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Summary Bar */}
            <footer className="zone-arranger-summary">
                <div className="zone-summary-stats">
                    <span className="zone-summary-item">
                        Liczba stref: <strong>{zones.length}</strong>
                    </span>
                    <span className="zone-summary-item">
                        Łączna pojemność stref: <strong>{formatNumber(totalCapacity)} osób</strong>
                    </span>
                    {maxCapacity > 0 && (
                        <span className="zone-summary-item">
                            Pojemność obiektu: <strong>{formatNumber(maxCapacity)} osób</strong>{' '}
                            {totalCapacity > maxCapacity && (
                                <span style={{ color: '#f59e0b' }}>(Suma stref przekracza pojemność obiektu)</span>
                            )}
                        </span>
                    )}
                </div>
                <div className="zone-summary-status">
                    {collidingIds.size === 0 ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Układ poprawny (brak kolizji)</span>
                    ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ Kolizja {collidingIds.size} stref</span>
                    )}
                </div>
            </footer>
        </section>
    );
}
