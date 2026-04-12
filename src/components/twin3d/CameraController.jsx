import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraController({ targetPosition }) {
  const lerpProgress = useRef(1);
  const startPos = useRef(new THREE.Vector3(5, 18, 30));
  const targetPos = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetPosition) {
      targetPos.current.set(targetPosition.x + 8, targetPosition.y + 10, targetPosition.z + 12);
      lerpProgress.current = 0;
    }
  }, [targetPosition]);

  useFrame(({ camera }) => {
    if (lerpProgress.current < 1) {
      if (lerpProgress.current === 0) {
        startPos.current.copy(camera.position);
      }
      lerpProgress.current += 0.02;
      const t = 1 - Math.pow(1 - Math.min(1, lerpProgress.current), 3);
      camera.position.lerpVectors(startPos.current, targetPos.current, t);
    }
  });

  return null;
}
