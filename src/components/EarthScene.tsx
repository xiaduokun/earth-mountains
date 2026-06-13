import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { MOUNTAINS, type Mountain } from '../data/mountains';
import { latLngToPosition } from '../utils/geo';

const EARTH_RADIUS = 1.5;
const MARKER_OFFSET = 0.06;

// --- Photo marker size matching the original 3D cone (~12–36px on screen) ---
const MIN_HEIGHT = 3724;
const MAX_HEIGHT = 8848;
const MARKER_MIN = 2;   // px width for smallest mountain
const MARKER_MAX = 4;   // px width for tallest mountain

function getMarkerSize(height: number) {
  return Math.round(
    MARKER_MIN + ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * (MARKER_MAX - MARKER_MIN)
  );
}

function MountainMarker({ mountain }: { mountain: Mountain }) {
  const photoRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { camera } = useThree();

  const normal = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, 1).normalize(),
    [mountain.lat, mountain.lng]
  );

  const photoPos = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS + MARKER_OFFSET),
    [mountain.lat, mountain.lng]
  );

  const labelPos = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS + 0.13),
    [mountain.lat, mountain.lng]
  );

  const markerPx = useMemo(() => getMarkerSize(mountain.height), [mountain.height]);

  useFrame(() => {
    const cameraDir = camera.position.clone().normalize();
    const facing = normal.dot(cameraDir);
    const targetOpacity = THREE.MathUtils.clamp((facing + 0.05) / 0.2, 0, 1);

    if (photoRef.current) {
      photoRef.current.style.opacity = String(targetOpacity);
    }
    if (labelRef.current) {
      labelRef.current.style.opacity = String(targetOpacity);
      labelRef.current.style.pointerEvents = targetOpacity > 0.3 ? 'auto' : 'none';
    }
  });

  return (
    <group>
      {/* Photo — tiny, on Earth surface */}
      <Html position={photoPos} center transform occlude={false}>
        <div
          ref={photoRef}
          className="mountain-photo-marker"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          style={{
            width: hovered ? Math.round(markerPx * 1.8) : markerPx,
            height: hovered ? Math.round(markerPx * 1.8 * 0.66) : Math.round(markerPx * 0.66),
          }}
        >
          {!imgError && (
            <img
              src={mountain.photoUrl}
              alt={mountain.nameZh}
              className="marker-photo"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </Html>

      {/* Label — original size, no transform, positioned to the side */}
      <Html position={labelPos} center style={{ pointerEvents: 'none' }}>
        <div
          ref={labelRef}
          className="mountain-label"
          style={{
            borderColor: mountain.color,
            opacity: 0.7,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <div className="mountain-name">{mountain.nameZh}</div>
          <div className="mountain-height">{mountain.height.toLocaleString()}m</div>
        </div>
      </Html>
    </group>
  );
}

export function Earth() {
  const earthTexture = useMemo(() => {
    const textureUrl =
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
    return new THREE.TextureLoader().load(textureUrl);
  }, []);

  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#4db8ff') },
    }),
    []
  );

  return (
    <group>
      {/* Earth sphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Inner atmosphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.02, 64, 64]} />
        <meshPhongMaterial
          color="#4db8ff"
          transparent
          opacity={0.08}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Outer atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.12, 64, 64]} />
        <shaderMaterial
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent
          uniforms={atmosphereUniforms}
        />
      </mesh>

      {/* Mountain photo markers */}
      {MOUNTAINS.map((mountain) => (
        <MountainMarker key={mountain.id} mountain={mountain} />
      ))}
    </group>
  );
}

const atmoVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 uColor;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float intensity = pow(0.68 - dot(vNormal, viewDirection), 3.5);
    intensity = clamp(intensity, 0.0, 1.0);
    gl_FragColor = vec4(uColor, intensity * 0.55);
  }
`;
