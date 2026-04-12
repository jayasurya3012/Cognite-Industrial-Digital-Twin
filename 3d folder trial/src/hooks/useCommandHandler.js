import { useCallback } from 'react';
import usePlantStore from './usePlantStore';
import { assets, valves, sensors } from '../data/plantData';

/**
 * AI-ready command handler.
 * Parses structured commands and executes actions on the plant store.
 *
 * Usage:
 *   const { executeCommand } = useCommandHandler();
 *   executeCommand({ action: 'highlight', target: 'high-pressure' });
 *
 * Future: plug in an LLM to parse natural language → command objects.
 */
export default function useCommandHandler() {
  const selectAsset = usePlantStore((s) => s.selectAsset);
  const setCameraTarget = usePlantStore((s) => s.setCameraTarget);
  const setStatusFilter = usePlantStore((s) => s.setStatusFilter);
  const sensorValues = usePlantStore((s) => s.sensorValues);

  const executeCommand = useCallback(
    (command) => {
      const { action, target, params } = command;

      switch (action) {
        case 'select': {
          // Select a specific asset by ID
          const asset = assets.find(
            (a) => a.id.toLowerCase() === target?.toLowerCase()
          );
          if (asset) {
            selectAsset(asset.id);
            setCameraTarget(asset.position);
          }
          break;
        }

        case 'highlight-warnings': {
          // Filter to show only warning/critical assets
          setStatusFilter('warning');
          break;
        }

        case 'highlight-critical': {
          setStatusFilter('critical');
          break;
        }

        case 'show-all': {
          setStatusFilter('all');
          break;
        }

        case 'goto': {
          // Navigate camera to specific asset
          const target_asset =
            assets.find(
              (a) => a.id.toLowerCase() === target?.toLowerCase()
            ) ||
            valves.find(
              (v) => v.id.toLowerCase() === target?.toLowerCase()
            );
          if (target_asset) {
            setCameraTarget(target_asset.position);
            selectAsset(target_asset.id);
          }
          break;
        }

        case 'find-high-pressure': {
          // Find sensors with high pressure readings
          const highPressure = sensors
            .filter((s) => s.type === 'pressure')
            .filter((s) => {
              const val = sensorValues[s.id];
              return val && val.value > s.thresholds.warning;
            });

          if (highPressure.length > 0) {
            const firstAsset = highPressure[0].attachedTo;
            selectAsset(firstAsset);
            const asset = assets.find((a) => a.id === firstAsset);
            if (asset) setCameraTarget(asset.position);
          }
          break;
        }

        default:
          console.warn(`Unknown command action: ${action}`);
      }
    },
    [selectAsset, setCameraTarget, setStatusFilter, sensorValues]
  );

  return { executeCommand };
}
