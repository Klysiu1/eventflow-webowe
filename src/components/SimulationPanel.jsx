import { useState } from 'react';
import { api } from '../api/axios';

export default function SimulationPanel({ event}) {
    const [sliderValues, setSliderValues] = useState(
        event.zones.reduce((acc, zone) => ({ ...acc, [zone.id]: zone.current_count }), {})
    );
    const [isSending, setIsSending] = useState(false);

    const handleSliderChange = (zoneId, value) => {
        setSliderValues(prev => ({...prev, [zoneId]: parseInt(value)}));
    };

    const handleSliderCommit = async(zoneId) => {
        setIsSending(true);
        try {
            await api.post('zones/update', {
                zoneId: zoneId,
                count: sliderValues[zoneId]
            });
        }
        catch (error) {
            console.error("Błąd podczas symulacji:", error);
        }
        finally {
            setIsSending(false);
        }
    };

    return (
        <div className='bg-surface p-6 rounded-xl border border-border shadow-lg mt-8'>
            <h3 className='text-xl font-bold text-primary mb-6'>Panel Symulacji</h3>
            <div className='space-y-6'>
                {event.zones.map(zone => (
                    <div key={zone.id} className='p-4 bg-dark rounded-lg border border-gray-700'>
                        <div className='flex justify-between items-center mb-4'> 
                            <span className='font-semibold text-white'>{zone.name}</span>
                            <span className={`font-mono ${isSending ? 'text-gray-500' : 'text-gray-300'}`}>{sliderValues[zone.id]} / {zone.capacity}</span>    
                        </div>    
                        <input 
                        type='range'
                        min="0"
                        max={zone.capacity}
                        value={sliderValues[zone.id]}
                        onChange={(e) => handleSliderChange(zone.id, e.target.value)}
                        onMouseUp={() => handleSliderCommit(zone.id)}
                        onTouchEnd={() => handleSliderCommit(zone.id)}
                        className='w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary' />
                    </div>
                ))}
            </div>
        </div>
    )

}