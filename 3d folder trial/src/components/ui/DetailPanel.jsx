import usePlantStore from '../../hooks/usePlantStore';


/**
 * DetailPanel — shows information about the selected asset
 * including live sensor readings and associated valves.
 */
export default function DetailPanel() {
  const selectedAssetId = usePlantStore((s) => s.selectedAssetId);
  const selectAsset = usePlantStore((s) => s.selectAsset);
  const sensorValues = usePlantStore((s) => s.sensorValues);

  const plantLayout = usePlantStore((s) => s.plantLayout);
  
  const rawAssets = plantLayout?.assets || [];
  const rawValves = plantLayout?.valves || [];
  const rawSensors = plantLayout?.sensors || [];

  // Find the selected item (could be asset or valve)
  const selectedAsset = rawAssets.find((a) => a.id === selectedAssetId);
  const selectedValve = rawValves.find((v) => v.id === selectedAssetId);
  const selected = selectedAsset || selectedValve;

  if (!selected) {
    return (
      <div className="detail-panel">
        <div className="detail-panel-empty">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p>
            Select an asset from the 3D scene or sidebar to view its details and
            live sensor readings.
          </p>
        </div>
      </div>
    );
  }

  const isAsset = !!selectedAsset;
  const assetSensors = isAsset ? rawSensors.filter(s => s.asset_id === selected.id) : [];
  const assetValves = isAsset ? rawValves.filter(v => false) : []; // No explicit valve<->asset link implemented in SVG simple layout yet

  const ASSET_ICONS = {
    heater: '🔥',
    separator: '⚗️',
    pump: '⚙️',
    control: '🔧',
    shutdown: '🛑',
    relief: '⛑️',
  };

  return (
    <div className="detail-panel">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-icon">
          {ASSET_ICONS[selected.type] || '📦'}
        </div>
        <div className="detail-header-info">
          <div className="detail-header-id">{selected.id}</div>
          <div className="detail-header-name">{selected.name}</div>
          <span className="detail-header-type">{selected.type}</span>
        </div>
        <button
          className="detail-close-btn"
          onClick={() => selectAsset(null)}
          title="Close panel"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Status */}
      <div className="detail-section">
        <div className="detail-section-title">Status</div>
        <div
          className={`detail-status ${isAsset ? selected.status : selected.state === 'open' ? 'operational' : selected.state === 'closed' ? 'critical' : 'warning'}`}
        >
          <span className="topbar-status-dot" />
          {isAsset
            ? selected.status?.toUpperCase()
            : selected.state?.toUpperCase()}
        </div>
      </div>

      {/* Description */}
      {selected.description && (
        <div className="detail-section">
          <div className="detail-section-title">Description</div>
          <div className="detail-description">{selected.description}</div>
        </div>
      )}

      {/* Valve-specific info */}
      {!isAsset && (
        <div className="detail-section">
          <div className="detail-section-title">Valve Position</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span className={`valve-state ${selected.state}`}>
              {selected.state}
            </span>
            <span className="valve-percent">{selected.openPercent}% Open</span>
          </div>
          <div className="sensor-bar" style={{ marginTop: '8px' }}>
            <div
              className="sensor-bar-fill"
              style={{
                width: `${selected.openPercent}%`,
                background:
                  selected.state === 'open'
                    ? 'var(--status-operational)'
                    : selected.state === 'closed'
                      ? 'var(--status-critical)'
                      : 'var(--status-warning)',
              }}
            />
          </div>
        </div>
      )}

      {/* Sensor Readings */}
      {assetSensors.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            Live Sensor Readings ({assetSensors.length})
          </div>
          {assetSensors.map((sensor) => {
            const reading = sensorValues[sensor.id];
            const value = reading?.v ?? 0;
            const quality = reading?.q ?? 'UNKNOWN';

            return (
              <div key={sensor.id} className="sensor-reading">
                <span className="sensor-reading-icon">📡</span>
                <div className="sensor-reading-info">
                  <div className="sensor-reading-id">{sensor.id}</div>
                  <div className="sensor-reading-name">SVG Extracted Node</div>
                  <div className="sensor-bar">
                    <div
                      className="sensor-bar-fill"
                      style={{
                        width: '50%',
                        background: quality === 'BAD' ? 'var(--status-critical)' : 'var(--status-operational)'
                      }}
                    />
                  </div>
                </div>
                <div className={`sensor-reading-value ${quality === 'BAD' ? 'critical' : 'operational'}`}>
                  {value.toFixed(2)} [{quality}]
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Associated Valves */}
      {assetValves.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            Associated Valves ({assetValves.length})
          </div>
          {assetValves.map((valve) => (
            <div
              key={valve.id}
              className="valve-reading"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                selectAsset(valve.id);
              }}
            >
              <span className="sensor-reading-icon">🔧</span>
              <div className="sensor-reading-info">
                <div className="sensor-reading-id">{valve.id}</div>
                <div className="sensor-reading-name">{valve.name}</div>
              </div>
              <span className={`valve-state ${valve.state}`}>
                {valve.state}
              </span>
              <span className="valve-percent">{valve.openPercent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
