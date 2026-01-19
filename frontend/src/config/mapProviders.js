// Map Provider Configuration
// Defines all supported map tile providers with their URLs and attributions

export const MAP_PROVIDERS = {
  openstreetmap: {
    id: 'openstreetmap',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    isFree: true,
  },
  mapbox: {
    id: 'mapbox',
    name: 'Mapbox',
    url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}',
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: [],
    maxZoom: 20,
    isFree: false,
    requiresApiKey: true,
    apiKeyEnv: 'REACT_APP_MAPBOX_ACCESS_TOKEN',
  },
  google_maps: {
    id: 'google_maps',
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://about.google/brand-resource-center/">Google</a>',
    subdomains: [],
    maxZoom: 20,
    isFree: false,
    requiresApiKey: true,
    apiKeyEnv: 'REACT_APP_GOOGLE_MAPS_API_KEY',
  },
  stamen: {
    id: 'stamen',
    name: 'Stamen Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: [],
    maxZoom: 18,
    isFree: true,
  },
  cartodb: {
    id: 'cartodb',
    name: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    isFree: true,
  },
};

// Default provider settings
export const DEFAULT_PROVIDER = 'openstreetmap';

// Provider categories for UI grouping
export const PROVIDER_CATEGORIES = {
  free: {
    name: 'Free Providers',
    providers: ['openstreetmap', 'stamen', 'cartodb'],
  },
  premium: {
    name: 'Premium Providers',
    providers: ['mapbox', 'google_maps'],
  },
};

// Get provider by ID
export const getProviderById = (providerId) => {
  return MAP_PROVIDERS[providerId] || MAP_PROVIDERS[DEFAULT_PROVIDER];
};

// Get all free providers
export const getFreeProviders = () => {
  return Object.values(MAP_PROVIDERS).filter(p => p.isFree);
};

// Check if provider requires API key
export const requiresApiKey = (providerId) => {
  const provider = getProviderById(providerId);
  return provider?.requiresApiKey || false;
};

// Get API key from environment
export const getApiKey = (providerId) => {
  const provider = getProviderById(providerId);
  if (!provider?.apiKeyEnv) return null;
  return process.env[provider.apiKeyEnv] || '';
};
