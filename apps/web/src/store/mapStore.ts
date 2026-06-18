import { create } from 'zustand';

interface MapFilters {
    regionCode?: string;
    departementCode?: string;
    communeCode?: string;
    lieuDit?: string;
}

interface MapState {
    lng: number;
    lat: number;
    zoom: number;
    filters: MapFilters;
    setViewState: (lng: number, lat: number, zoom: number) => void;
    setFilters: (filters: MapFilters) => void;
    resetFilters: () => void;
}

// Default to center of France
export const useMapStore = create<MapState>((set) => ({
    lng: 2.2137,
    lat: 46.2276,
    zoom: 5,
    filters: {},

    setViewState: (lng, lat, zoom) => set({ lng, lat, zoom }),

    setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
    })),

    resetFilters: () => set({
        filters: {},
        lng: 2.2137,
        lat: 46.2276,
        zoom: 5
    }),
}));