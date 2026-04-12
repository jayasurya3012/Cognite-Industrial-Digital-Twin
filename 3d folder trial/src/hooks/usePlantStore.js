import { create } from 'zustand';

/**
 * Global state store for the Digital Twin Platform.
 */
const usePlantStore = create((set, get) => ({
  // --- Selection ---
  selectedAssetId: null,
  hoveredAssetId: null,

  selectAsset: (id) =>
    set({ selectedAssetId: id === get().selectedAssetId ? null : id }),
  hoverAsset: (id) => set({ hoveredAssetId: id }),
  clearHover: () => set({ hoveredAssetId: null }),

  // --- SVG Parsed Data ---
  plantLayout: null,
  setPlantLayout: (layout) => set({ plantLayout: layout }),

  // --- TimeSeries Data ---
  timeseriesData: [],
  currentIndex: 0,
  currentTimestamp: null,
  isPlaying: true,
  
  setTimeseriesData: (data) => set({ timeseriesData: data }),
  setCurrentIndex: (updater) => set((state) => ({ 
    currentIndex: typeof updater === 'function' ? updater(state.currentIndex) : updater 
  })),
  setCurrentTimestamp: (ts) => set({ currentTimestamp: ts }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  // --- Sensor Values ---
  // Map of sensorId → { v: value, q: quality_flag }
  sensorValues: {},

  updateSensorValues: (updates) =>
    set((state) => ({
      sensorValues: updates // Fast wholesale replace for time series frame
    })),

  // --- Layer Visibility ---
  layers: {
    equipment: true,
    valves: true,
    sensors: true,
    pipes: true,
    labels: true,
  },

  toggleLayer: (layerName) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerName]: !state.layers[layerName],
      },
    })),

  // --- Filters ---
  statusFilter: 'all', 
  searchQuery: '',

  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // --- Camera Target ---
  cameraTarget: null,

  setCameraTarget: (position) => set({ cameraTarget: position }),
  clearCameraTarget: () => set({ cameraTarget: null }),

  // --- Sidebar ---
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // --- Detail Panel ---
  detailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
}));

export default usePlantStore;
