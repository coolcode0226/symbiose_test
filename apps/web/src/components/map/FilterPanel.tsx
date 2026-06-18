'use client';

import { useMapStore } from '@/store/mapStore';
import { MapPin, TreePine, ChevronRight, RotateCcw } from 'lucide-react';

// Regions with center coordinates and zoom levels — selecting one flies the map there.
const REGIONS = [
    { code: 'NORMANDIE', name: 'Normandie', lat: 49.1829, lng: 0.37, zoom: 7 },
    { code: 'PAYS_DE_LA_LOIRE', name: 'Pays de la Loire', lat: 47.7633, lng: -0.3297, zoom: 7 },
    { code: 'CENTRE_VAL_DE_LOIRE', name: 'Centre-Val de Loire', lat: 47.7516, lng: 1.6751, zoom: 7 },
];

interface FilterPanelProps {
    onRegionSelect?: (lat: number, lng: number, zoom: number) => void;
}

export function FilterPanel({ onRegionSelect }: FilterPanelProps) {
    const { filters, setFilters, resetFilters } = useMapStore();

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const selectedRegion = REGIONS.find((r) => r.code === value);
        if (selectedRegion && onRegionSelect) {
            onRegionSelect(selectedRegion.lat, selectedRegion.lng, selectedRegion.zoom);
        }
        setFilters({ regionCode: value || undefined });
    };

    return (
        <div className="absolute top-4 left-4 z-10 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4" style={{ background: 'linear-gradient(to right, #0b4a59, #0d5a6b)' }}>
                <div className="flex items-center gap-2">
                    <TreePine size={20} className="text-white" />
                    <h3 className="font-semibold text-lg text-white">Forest Explorer</h3>
                </div>
                <p className="text-gray-200 text-sm mt-1">Jump to a region</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Region Select */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                        <MapPin size={14} />
                        Region
                    </label>
                    <div className="relative">
                        <select
                            value={filters.regionCode || ''}
                            onChange={handleRegionChange}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b4a59] focus:border-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Select a region...</option>
                            {REGIONS.map((region) => (
                                <option key={region.code} value={region.code}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Reset Button */}
                {filters.regionCode && (
                    <button
                        onClick={resetFilters}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}
