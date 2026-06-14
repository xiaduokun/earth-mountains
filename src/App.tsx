import { useState, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Earth } from './components/EarthScene';
import { MOUNTAINS, type Mountain } from './data/mountains';
import { latLngToPosition } from './utils/geo';
import './App.css';

/** Camera fly-to animation via OrbitControls lerp */
function CameraAnimator({ zoomed, controlsRef }: { zoomed: boolean; controlsRef: React.MutableRefObject<any> }) {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    const chinaTarget = latLngToPosition(35, 105, 0.9);
    const goalTarget = zoomed ? chinaTarget : new THREE.Vector3(0, 0, 0);

    ctrl.target.lerp(goalTarget, 0.05);

    // Smoothly adjust camera distance
    const goalDist = zoomed ? 2.2 : 4.5;
    const camPos = ctrl.object.position as THREE.Vector3;
    const dirFromTarget = camPos.clone().sub(ctrl.target).normalize();
    const currentDist = camPos.distanceTo(ctrl.target);
    const newDist = THREE.MathUtils.lerp(currentDist, goalDist, 0.05);
    camPos.copy(ctrl.target).add(dirFromTarget.multiplyScalar(newDist));

    ctrl.update();
  });
  return null;
}

function App() {
  const [selectedMountain, setSelectedMountain] = useState<Mountain | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const controlsRef = useRef<any>(null);
  const zoomedRef = useRef(zoomed);
  zoomedRef.current = zoomed;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserInteractionStart = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  }, []);

  const handleChinaClick = useCallback(() => {
    setZoomed(true);
  }, []);

  const handleUserInteractionEnd = useCallback(() => {
    idleTimerRef.current = setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
      }
    }, 5 * 60 * 1000);
  }, []);

  return (
    <div className="app">
      <Canvas
        camera={{ position: [0, 0.3, 4.5], fov: 45 }}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 0 }}
        gl={{ antialias: true, alpha: false }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <directionalLight position={[-3, -1, -4]} intensity={0.3} color="#8ecae6" />

        <Stars
          radius={50}
          depth={50}
          count={1500}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={1.5}
          maxDistance={8}
          autoRotate={!zoomed}
          autoRotateSpeed={0.3}
          enableDamping
          dampingFactor={0.08}
          onStart={handleUserInteractionStart}
          onEnd={handleUserInteractionEnd}
        />

        <CameraAnimator zoomed={zoomed} controlsRef={controlsRef} />

        <Earth zoomed={zoomed} onChinaClick={handleChinaClick} />
      </Canvas>

      {/* === HTML Overlays === */}

      {/* Top info panel */}
      <div className="info-panel">
        <h1 className="title">🌍 世界名山</h1>
        <p className="subtitle">拖动旋转 · 滚轮缩放 · 点击中国区域查看省份</p>
      </div>

      {/* Back to globe button */}
      {zoomed && (
        <button className="china-back-btn" onClick={() => setZoomed(false)}>
          ← 返回地球
        </button>
      )}

      {/* Bottom legend */}
      <div className="legend">
        {MOUNTAINS.map((m) => (
          <button
            key={m.id}
            className={`legend-item ${selectedMountain?.id === m.id ? 'active' : ''}`}
            onClick={() =>
              setSelectedMountain((prev) => (prev?.id === m.id ? null : m))
            }
          >
            <span className="legend-dot" style={{ background: m.color }} />
            <span className="legend-name">{m.nameZh}</span>
            <span className="legend-region">{m.regionZh}</span>
            <span className="legend-height">{m.height.toLocaleString()}m</span>
          </button>
        ))}
      </div>

      {/* Mountain detail card */}
      {selectedMountain && (
        <div className="mountain-card">
          <div
            className="card-header"
            style={{ borderBottomColor: selectedMountain.color }}
          >
            <span className="card-dot" style={{ background: selectedMountain.color }} />
            <div>
              <h3>{selectedMountain.nameZh}</h3>
              <p className="card-eng">{selectedMountain.name}</p>
            </div>
            <button
              className="card-close"
              onClick={() => setSelectedMountain(null)}
            >
              ✕
            </button>
          </div>
          <div className="card-body">
            <div className="card-stat">
              <span className="stat-label">🌏 地区</span>
              <span className="stat-value">{selectedMountain.regionZh}</span>
            </div>
            <div className="card-stat">
              <span className="stat-label">⛰️ 海拔</span>
              <span className="stat-value">
                {selectedMountain.height.toLocaleString()}m
              </span>
            </div>
          </div>
          <p className="card-desc">{selectedMountain.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
