import { useEffect, useRef } from 'react';
import usePlantStore from './usePlantStore';

const useTimeSeries = () => {
  const { updateSensorValues, setTimeseriesData, setIsPlaying, setCurrentTimestamp } = usePlantStore();
  const isPlaying = usePlantStore(s => s.isPlaying);
  const timeseriesData = usePlantStore(s => s.timeseriesData);
  const setCurrentIndex = usePlantStore(s => s.setCurrentIndex);
  
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/data/timeseries.json')
      .then(res => res.json())
      .then(json => {
        setTimeseriesData(json);
        if (json.length > 0) {
          updateSensorValues(json[0].values);
          setCurrentTimestamp(json[0].timestamp);
        }
      })
      .catch(err => console.error("Could not load timeseries data", err));
  }, []);

  useEffect(() => {
    if (!timeseriesData || timeseriesData.length === 0) return;

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          let next = prev + 1;
          if (next >= timeseriesData.length) next = 0;
          
          updateSensorValues(timeseriesData[next].values);
          setCurrentTimestamp(timeseriesData[next].timestamp);
          return next;
        });
      }, 500); // 500ms playback steps
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, timeseriesData, updateSensorValues, setCurrentIndex, setCurrentTimestamp]);

  return { isPlaying, setIsPlaying };
};

export default useTimeSeries;
