import { useState } from 'react';
import usePlantStore from '../../hooks/usePlantStore';

const ASSET_ICONS = {
  heater: '🔥',
  separator: '⚗️',
  pump: '⚙️',
};

const VALVE_ICON = '🔧';

/**
 * Sidebar — asset hierarchy tree with search and layer filters.
 */
export default function Sidebar() {
  const selectedAssetId = usePlantStore((s) => s.selectedAssetId);
  const selectAsset = usePlantStore((s) => s.selectAsset);
  const setCameraTarget = usePlantStore((s) => s.setCameraTarget);
  const searchQuery = usePlantStore((s) => s.searchQuery);
  const setSearchQuery = usePlantStore((s) => s.setSearchQuery);
  const layers = usePlantStore((s) => s.layers);
  const toggleLayer = usePlantStore((s) => s.toggleLayer);
  const sensorValues = usePlantStore((s) => s.sensorValues);

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showValves, setShowValves] = useState(true);

  const plantLayout = usePlantStore((s) => s.plantLayout);
  
  const rawAssets = plantLayout?.assets || [];
  const rawValves = plantLayout?.valves || [];
  const rawSensors = plantLayout?.sensors || [];

  const getAssetHierarchy = () => {
    return {
      'Heat Exchangers': rawAssets.filter((a) => a.id?.startsWith('E-')),
      'Vessels': rawAssets.filter((a) => a.id?.startsWith('V-')),
      'Pumps': rawAssets.filter((a) => a.id?.startsWith('P-')),
    };
  };

  const getSensorsForAsset = (assetId) => rawSensors.filter(s => s.asset_id === assetId);

  const hierarchy = getAssetHierarchy();

  const toggleGroup = (group) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSelectAsset = (asset) => {
    selectAsset(asset.id);
    setCameraTarget(asset.position);
  };

  // Determine asset status based on its sensors
  const getAssetStatus = (asset) => {
    if (asset.status === 'standby') return 'standby';
    const assetSensors = getSensorsForAsset(asset.id);
    const statuses = assetSensors
      .map((s) => sensorValues[s.id]?.status)
      .filter(Boolean);
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return asset.status || 'operational';
  };

  // Filter assets by search query
  const matchesSearch = (item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      (item.name && item.name.toLowerCase().includes(q))
    );
  };

  return (
    <div className="sidebar">
      {/* Header with search */}
      <div className="sidebar-header">
        <div className="sidebar-title">Asset Explorer</div>
        <div className="sidebar-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="sidebar-tree">
        {Object.entries(hierarchy).map(([groupName, groupAssets]) => {
          const filtered = groupAssets.filter(matchesSearch);
          if (filtered.length === 0) return null;
          const isCollapsed = collapsedGroups[groupName];

          return (
            <div className="tree-group" key={groupName}>
              <div
                className="tree-group-header"
                onClick={() => toggleGroup(groupName)}
              >
                <svg
                  className={`tree-group-chevron ${isCollapsed ? 'collapsed' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {groupName}
                <span className="tree-group-count">{filtered.length}</span>
              </div>

              {!isCollapsed &&
                filtered.map((asset) => {
                  const status = getAssetStatus(asset);
                  return (
                    <div
                      key={asset.id}
                      className={`tree-item ${selectedAssetId === asset.id ? 'selected' : ''
                        }`}
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <span className="tree-item-icon">
                        {ASSET_ICONS[asset.type] || '📦'}
                      </span>
                      <span className="tree-item-id">{asset.id}</span>
                      <span className="tree-item-name">{asset.name}</span>
                      <span className={`tree-item-status ${status}`} />
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* Valves section */}
        <div className="tree-group">
          <div
            className="tree-group-header"
            onClick={() => setShowValves(!showValves)}
          >
            <svg
              className={`tree-group-chevron ${!showValves ? 'collapsed' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Valves
            <span className="tree-group-count">
              {rawValves.filter(matchesSearch).length}
            </span>
          </div>

          {showValves &&
            rawValves.filter(matchesSearch).map((valve, idx) => (
              <div
                key={`${valve.id}-${idx}`}
                className={`tree-item ${selectedAssetId === valve.id ? 'selected' : ''
                  }`}
                onClick={() => {
                  selectAsset(valve.id);
                  setCameraTarget(valve.position);
                }}
              >
                <span className="tree-item-icon">{VALVE_ICON}</span>
                <span className="tree-item-id">{valve.id}</span>
                <span className="tree-item-name">{valve.name}</span>
                <span
                  className={`tree-item-status ${valve.state === 'open'
                      ? 'operational'
                      : valve.state === 'closed'
                        ? 'critical'
                        : 'warning'
                    }`}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Layer Filters */}
      <div className="sidebar-filters">
        <div className="sidebar-filters-title">Layers</div>
        <div className="filter-chips">
          {Object.entries(layers).map(([layer, active]) => (
            <div
              key={layer}
              className={`filter-chip ${active ? 'active' : ''}`}
              onClick={() => toggleLayer(layer)}
            >
              <span
                className="filter-chip-dot"
                style={{
                  background: active
                    ? 'var(--accent-cyan)'
                    : 'var(--text-muted)',
                }}
              />
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
