import { useEffect } from 'react';
import './App.css';
import TopBar from './components/ui/TopBar';
import Sidebar from './components/ui/Sidebar';
import DetailPanel from './components/ui/DetailPanel';
import SceneCanvas from './components/3d/Scene';
import usePlantStore from './hooks/usePlantStore';
import useTimeSeries from './hooks/useTimeSeries';

/**
 * App — Root layout for the Digital Twin Platform.
 */
function App() {
  const selectedAssetId = usePlantStore((s) => s.selectedAssetId);
  const setPlantLayout = usePlantStore((s) => s.setPlantLayout);
  
  // Mount telemetry stream
  useTimeSeries();

  // Load primary layout layer extracted from SVG
  useEffect(() => {
    fetch('/data/data.json')
      .then(res => res.json())
      .then(data => setPlantLayout(data))
      .catch(e => console.error("Could not load data.json", e));
  }, [setPlantLayout]);

  return (
    <div className={`app-layout ${!selectedAssetId ? 'detail-closed' : ''}`}>
      <TopBar />
      <Sidebar />
      <div className="scene-canvas">
        <SceneCanvas />
      </div>
      {selectedAssetId && <DetailPanel />}
    </div>
  );
}

export default App;