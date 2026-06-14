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

  const invQuat = useMemo(() => quaternion.clone().invert(), [quaternion]);

  const mountainHeight = useMemo(() => calcMountainHeight(mountain.height), [mountain.height]);
  const baseRadius = mountainHeight * 0.4;

  const mountainGeom = useMemo(
    () => new THREE.LatheGeometry(mountainProfile(baseRadius, mountainHeight), 16),
    [baseRadius, mountainHeight]
  );

  // Pre-allocate line geometry (3 points = L-shaped connector)
  const lineObj = useMemo(() => {
    const arr = new Float32Array(9); // 3 points × xyz
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: mountain.color,
      dashSize: 0.012,
      gapSize: 0.006,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
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

    // Screen-right in WORLD space, then transform to LOCAL space
    const camRightWorld = new THREE.Vector3()
      .crossVectors(camera.up, cameraDir)
      .normalize();
    const camRightLocal = camRightWorld.clone().applyQuaternion(invQuat);

    // Peak and label anchor in LOCAL space
    const peakY = mountainHeight;
    const labelX = camRightLocal.x * 0.065;
    const labelY = peakY * 0.5;
    const labelZ = camRightLocal.z * 0.065;

    // Update label group position (local space)
    if (labelGroupRef.current) {
      labelGroupRef.current.position.set(labelX, labelY, labelZ);
    }

    // Update dashed line in LOCAL space: peak → elbow → label
    if (lineGeoRef.current && lineMatRef.current) {
      const elbowX = camRightLocal.x * 0.045;
      const elbowZ = camRightLocal.z * 0.045;
      const pos = lineGeoRef.current.attributes.position.array as Float32Array;
      // point 0: peak
      pos[0] = 0;       pos[1] = peakY;   pos[2] = 0;
      // point 1: elbow
      pos[3] = elbowX;  pos[4] = peakY;   pos[5] = elbowZ;
      // point 2: label anchor
      pos[6] = labelX;  pos[7] = labelY;  pos[8] = labelZ;
      lineGeoRef.current.attributes.position.needsUpdate = true;
      lineGeoRef.current.computeBoundingSphere();
      lineObj.computeLineDistances();

      lineMatRef.current.opacity = opacity;
      lineMatRef.current.transparent = true;
    }

    // Fade label DOM element
    if (labelDivRef.current) {
      labelDivRef.current.style.opacity = String(opacity);
      labelDivRef.current.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none';
    }
  });

  const targetScale = hovered ? 1.5 : 1;

  return (
    <group position={meshPos} quaternion={quaternion}>
      {/* 3D Mountain Mesh */}
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

      {/* Dashed connector — local space, updated each frame */}
      <primitive object={lineObj} />

      {/* Label — local space, always screen-right of peak */}
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
