import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import usePlantStore from '../../hooks/usePlantStore';

/**
 * CameraController — smoothly animates the camera to the target
 * when an asset is selected from the sidebar.
 */
export default function CameraController() {
  const cameraTarget = usePlantStore((s) => s.cameraTarget);
  const clearCameraTarget = usePlantStore((s) => s.clearCameraTarget);
  const lerpProgress = useRef(0);
  const startPos = useRef(null);
  const targetPos = useRef(null);

  useFrame(({ camera }) => {
    if (!cameraTarget) return;

    if (!startPos.current) {
      startPos.current = camera.position.clone();
      const offset = new THREE.Vector3(8, 10, 12);
      targetPos.current = new THREE.Vector3(
        cameraTarget.x + offset.x,
        cameraTarget.y + offset.y,
        cameraTarget.z + offset.z
      );
      lerpProgress.current = 0;
    }

    lerpProgress.current += 0.02;

    if (lerpProgress.current >= 1) {
      camera.position.copy(targetPos.current);
      startPos.current = null;
      targetPos.current = null;
      clearCameraTarget();
      return;
    }

    // Smooth easing
    const t = 1 - Math.pow(1 - lerpProgress.current, 3);
    camera.position.lerpVectors(startPos.current, targetPos.current, t);
  });

  return null;
}
