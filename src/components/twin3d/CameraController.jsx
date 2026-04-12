import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(5, 18, 30);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 2);

export default function CameraController({ targetPosition }) {
  const lerpProgress = useRef(1);
  const startPos = useRef(DEFAULT_CAMERA_POSITION.clone());
  const targetPos = useRef(new THREE.Vector3());
  const startTarget = useRef(DEFAULT_CAMERA_TARGET.clone());
  const endTarget = useRef(DEFAULT_CAMERA_TARGET.clone());

  useEffect(() => {
    if (targetPosition) {
      targetPos.current.set(targetPosition.x + 10, targetPosition.y + 8, targetPosition.z + 14);
      endTarget.current.set(targetPosition.x, targetPosition.y + 1.5, targetPosition.z);
    } else {
      targetPos.current.copy(DEFAULT_CAMERA_POSITION);
      endTarget.current.copy(DEFAULT_CAMERA_TARGET);
    }
    lerpProgress.current = 0;
  }, [targetPosition]);

  useFrame(({ camera, controls }) => {
    if (lerpProgress.current < 1) {
      if (lerpProgress.current === 0) {
        startPos.current.copy(camera.position);
        if (controls?.target) {
          startTarget.current.copy(controls.target);
        }
      }
      lerpProgress.current += 0.02;
      const t = 1 - Math.pow(1 - Math.min(1, lerpProgress.current), 3);
      camera.position.lerpVectors(startPos.current, targetPos.current, t);
      if (controls?.target) {
        controls.target.lerpVectors(startTarget.current, endTarget.current, t);
        controls.update();
      } else {
        camera.lookAt(endTarget.current);
      }
    }
  });

  return null;
}
