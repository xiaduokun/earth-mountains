import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { MOUNTAINS, type Mountain } from '../data/mountains';
import { latLngToPosition, createMountainGeometry } from '../utils/geo';

const EARTH_RADIUS = 1.5;
const MARKER_OFFSET = 0.06;

function MountainMarker({ mountain }: { mountain: Mountain }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS + MARKER_OFFSET),
    [mountain.lat, mountain.lng]
  );

  const normal = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, 1).normalize(),
    [mountain.lat, mountain.lng]
  );

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  const geometry = useMemo(
    () => createMountainGeometry(mountain.height),
    [mountain.height]
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      const target = hovered ? 1.6 : 1 + Math.sin(Date.now() * 0.003) * 0.15;
      meshRef.current.scale.lerp(
        new THREE.Vector3(target, target, target),
        delta * 5
      );
    }
  });

  const labelPosition = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS + 0.25),
    [mountain.lat, mountain.lng]
  );

  return (
    <group>
      {/* Mountain peak (cone) */}
      <mesh
        ref={meshRef}
        position={position}
        quaternion={quaternion}
        geometry={geometry}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={mountain.color}
          emissive={mountain.color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>

      {/* Base ring */}
      <mesh position={position} quaternion={quaternion}>
        <torusGeometry args={[0.028, 0.006, 16, 32]} />
        <meshBasicMaterial color={mountain.color} transparent opacity={0.8} />
      </mesh>

      {/* Glow point */}
      <mesh position={position}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color={mountain.color} transparent opacity={0.9} />
      </mesh>

      {/* HTML Label on the sphere */}
      <Html position={labelPosition} center style={{ pointerEvents: 'none' }}>
        <div
          className="mountain-label"
          style={{
            borderColor: mountain.color,
            opacity: hovered ? 1 : 0.7,
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
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
  const groupRef = useRef<THREE.Group>(null);

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

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
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

      {/* Mountain markers */}
      {MOUNTAINS.map((mountain) => (
        <MountainMarker key={mountain.id} mountain={mountain} />
      ))}

      {/* Floating particles */}
      <Sparkles
        count={300}
        scale={EARTH_RADIUS * 2.4}
        size={3}
        speed={0.15}
        opacity={0.25}
        color="#ffffff"
      />
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
