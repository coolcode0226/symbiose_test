const GEOSERVER_URL = '/geoserver'; // Proxy through Next.js
const WORKSPACE = process.env.NEXT_PUBLIC_GEOSERVER_WORKSPACE || 'prod';

export interface WMSLayerConfig {
    id: string;
    name: string;
    layerName: string;
    minZoom: number;
    maxZoom: number;
    opacity: number;
    visible: boolean;
    color?: string;
    description: string;
}

export const WMS_LAYERS: WMSLayerConfig[] = [
    {
        id: 'region',
        name: 'Region',
        layerName: 'region',
        minZoom: 0,
        maxZoom: 8,
        opacity: 0.6,
        visible: true,
        color: '#8B0000',
        description: 'Administrative regions',
    },
    {
        id: 'department',
        name: 'Department',
        layerName: 'department',
        minZoom: 8,
        maxZoom: 10,
        opacity: 0.6,
        visible: true,
        color: '#FF8C00',
        description: 'Departments',
    },
    {
        id: 'commune',
        name: 'Commune',
        layerName: 'cummune', // Note: typo in your URL
        minZoom: 10,
        maxZoom: 13,
        opacity: 0.5,
        visible: true,
        color: '#32CD32',
        description: 'Communes',
    },
    {
        id: 'forest',
        name: 'Forest (BD Forêt)',
        layerName: 'forest',
        minZoom: 0,
        maxZoom: 22,
        opacity: 0.9,
        visible: true,
        color: 'rgb(102,255,0)',
        description: 'Forest inventory data',
    },
    {
        id: 'cadastre',
        name: 'Cadastre',
        layerName: 'cadastre', // Adjust if different
        minZoom: 15,
        maxZoom: 22,
        opacity: 0.8,
        visible: false,
        color: '#8B4513',
        description: 'Land parcels (zoom > 15)',
    },
];

export const buildWMSUrl = (layerName: string): string => {
    return `${GEOSERVER_URL}/${WORKSPACE}/wms`;
};

export const getWMSTileUrl = (layerName: string): string => {
    return `${GEOSERVER_URL}/${WORKSPACE}/wms?` +
        `service=WMS&` +
        `version=1.1.0&` +
        `request=GetMap&` +
        `layers=${WORKSPACE}:${layerName}&` +
        `styles=&` +
        `format=image/png&` +
        `transparent=true&` +
        `srs=EPSG:3857&` +
        `bbox={bbox-epsg-3857}&` +
        `width=256&` +
        `height=256`;
};