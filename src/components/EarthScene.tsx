import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MOUNTAINS, type Mountain } from '../data/mountains';
import { latLngToPosition } from '../utils/geo';

const EARTH_RADIUS = 1.5;
const MIN_HEIGHT = 3724;
const MAX_HEIGHT = 8848;

/** Calculate 3D mountain height from real elevation (0.06-0.12 units) */
function calcMountainHeight(height: number): number {
  return 0.05 + ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * 0.07;
}

/** Generate mountain profile points for LatheGeometry */
function mountainProfile(baseRadius: number, height: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const segments = 10;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = Math.pow(1 - t, 0.55) * baseRadius;
    const y = t * height;
    points.push(new THREE.Vector2(r, y));
  }
  return points;
}

const LINE_SEGMENTS = 3; // peak → elbow → label, 3 points

function MountainMarker({ mountain }: { mountain: Mountain }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const labelDivRef = useRef<HTMLDivElement>(null);
  const lineGeoRef = useRef<THREE.BufferGeometry>(null);
  const lineMatRef = useRef<THREE.LineDashedMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const texture = useTexture(mountain.photoUrl);

  const normal = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, 1).normalize(),
    [mountain.lat, mountain.lng]
  );

  const meshPos = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS),
    [mountain.lat, mountain.lng]
  );

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  const mountainHeight = useMemo(() => calcMountainHeight(mountain.height), [mountain.height]);
  const baseRadius = mountainHeight * 0.4;

  const mountainGeom = useMemo(
    () => new THREE.LatheGeometry(mountainProfile(baseRadius, mountainHeight), 16),
    [baseRadius, mountainHeight]
  );

  // Peak relative to mountain base (local space)
  const peakLocal = useMemo(() => new THREE.Vector3(0, mountainHeight, 0), [mountainHeight]);

  // Pre-allocate line geometry positions (3 points × 3 coords)
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(LINE_SEGMENTS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: mountain.color,
      dashSize: 0.012,
      gapSize: 0.006,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geo, mat);
    lineGeoRef.current = geo;
    lineMatRef.current = mat;
    return line;
  }, [mountain.color]);

  useFrame(() => {
    const cameraDir = camera.position.clone().normalize();
    const facing = normal.dot(cameraDir);
    const opacity = THREE.MathUtils.clamp((facing + 0.05) / 0.2, 0, 1);

    // Mountain opacity
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity;
      mat.transparent = true;
    }

    // Compute screen-right vector in world space
    const camRight = new THREE.Vector3()
      .crossVectors(camera.up, cameraDir)
      .normalize();

    // Peak in world space
    const peakWorld = peakLocal.clone().applyQuaternion(quaternion).add(meshPos);

    // Label world position: peak + screen-right × offset - slight vertical drop
    const labelOffset = camRight.clone().multiplyScalar(0.07);
    const labelWorld = peakWorld.clone()
      .add(labelOffset)
      .add(new THREE.Vector3(0, -mountainHeight * 0.45, 0));

    // Update label group position
    if (labelGroupRef.current) {
      labelGroupRef.current.position.copy(labelWorld);
    }
    // Fade label DOM element
    if (labelDivRef.current) {
      labelDivRef.current.style.opacity = String(opacity);
    }

    // Update dashed line: peak → elbow → label
    if (lineGeoRef.current && lineMatRef.current) {
      const elbow = peakWorld.clone().add(camRight.clone().multiplyScalar(0.06));
      const pos = lineGeoRef.current.attributes.position.array as Float32Array;
      pos[0] = peakWorld.x; pos[1] = peakWorld.y; pos[2] = peakWorld.z;
      pos[3] = elbow.x;     pos[4] = elbow.y;     pos[5] = elbow.z;
      pos[6] = labelWorld.x; pos[7] = labelWorld.y; pos[8] = labelWorld.z;
      lineGeoRef.current.attributes.position.needsUpdate = true;
      lineObj.computeLineDistances();

      lineMatRef.current.opacity = opacity;
      lineMatRef.current.transparent = true;
    }
  });

  const targetScale = hovered ? 1.5 : 1;

  return (
    <>
      {/* Mountain — rotated group (aligned to Earth surface normal) */}
      <group position={meshPos} quaternion={quaternion}>
        <mesh
          ref={meshRef}
          geometry={mountainGeom}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          scale={[targetScale, targetScale, targetScale]}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.7}
            metalness={0.05}
            transparent
            opacity={1}
          />
        </mesh>
      </group>

      {/* Dashed connector — world space, updated each frame */}
      <primitive object={lineObj} />

      {/* Label — world space, always screen-right of the peak */}
      <group ref={labelGroupRef}>
        <Html center style={{ pointerEvents: 'none' }}>
          <div
            ref={labelDivRef}
            className="mountain-label"
            style={{ borderColor: mountain.color }}
          >
            <div className="mountain-name">{mountain.nameZh}</div>
            <div className="mountain-height">{mountain.height.toLocaleString()}m</div>
          </div>
        </Html>
      </group>
    </>
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

      {/* Mountain 3D markers */}
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
