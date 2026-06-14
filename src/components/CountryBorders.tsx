import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { latLngToPosition } from '../utils/geo';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const R = 1.5 + 0.015;
const LABEL_R = 1.5 + 0.025;
const BORDER_COLOR = '#4dc9f6';

interface CountryLabel {
  name: string;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
}
type LabelEntry = { normal: THREE.Vector3; el: HTMLSpanElement };

export function CountryBorders() {
  const [lines, setLines] = useState<THREE.Line[]>([]);
  const [labels, setLabels] = useState<CountryLabel[]>([]);
  const labelRefs = useRef<LabelEntry[]>([]);
  const { camera } = useThree();

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then((topo: Topology) => {
        const geojson = feature(topo, topo.objects.countries as any);
        const lineResult: THREE.Line[] = [];
        const labelResult: CountryLabel[] = [];

        (geojson as any).features.forEach((f: any) => {
          const rings = extractPolygonCoords(f.geometry);
          const name: string =
            f.properties?.name ||
            f.properties?.NAME ||
            f.properties?.admin ||
            f.properties?.name_long ||
            '';

          if (name && rings.length > 0 && rings[0].length > 4) {
            const outerRing = rings[0];
            let sumLng = 0;
            let sumLat = 0;
            outerRing.forEach(([lng, lat]) => {
              sumLng += lng;
              sumLat += lat;
            });
            const avgLng = sumLng / outerRing.length;
            const avgLat = sumLat / outerRing.length;

            const lngVals = outerRing.map((c) => c[0]);
            const spanLng = Math.max(...lngVals) - Math.min(...lngVals);
            // Crosses antimeridian (e.g. Russia, Fiji) — use alternative check
            const effectiveSpan = spanLng > 300 ? 360 - spanLng : spanLng;
            if (effectiveSpan > 0.3) {
              const pos = latLngToPosition(avgLat, avgLng, LABEL_R);
              labelResult.push({
                name,
                pos,
                normal: latLngToPosition(avgLat, avgLng, 1).normalize(),
              });
            }
          }

          rings.forEach((ring: [number, number][]) => {
            if (ring.length < 3) return;
            const pts = ring.map(([lng, lat]) =>
              latLngToPosition(lat, lng, R)
            );
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({
              color: BORDER_COLOR,
              transparent: false,
              depthTest: true,
            });
            const line = new THREE.Line(geo, mat);
            line.frustumCulled = false;
            lineResult.push(line);
          });
        });

        setLines(lineResult);
        setLabels(labelResult);
      })
      .catch((err) => console.warn('Failed to load world borders:', err));
  }, []);

  // Clear refs when labels change
  useEffect(() => {
    labelRefs.current = [];
  }, [labels]);

  useFrame(() => {
    const cameraDir = camera.position.clone().normalize();
    for (const entry of labelRefs.current) {
      const facing = entry.normal.dot(cameraDir);
      const opacity = THREE.MathUtils.clamp((facing + 0.05) / 0.2, 0, 1);
      entry.el.style.opacity = String(opacity);
    }
  });

  if (lines.length === 0) return null;

  const registerLabel = (normal: THREE.Vector3) => (el: HTMLSpanElement | null) => {
    if (el) {
      labelRefs.current.push({ normal, el });
    }
  };

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={`line-${i}`} object={line} />
      ))}
      {labels.map((label, i) => (
        <Html
          key={`label-${i}`}
          position={label.pos}
          center
          style={{ pointerEvents: 'none' }}
        >
          <span
            ref={registerLabel(label.normal)}
            style={{
              fontSize: '8px',
              color: 'rgba(200,240,255,0.55)',
              whiteSpace: 'nowrap',
              textShadow: '0 0 3px rgba(0,150,200,0.6)',
              fontFamily: 'sans-serif',
            }}
          >
            {label.name}
          </span>
        </Html>
      ))}
    </group>
  );
}

function extractPolygonCoords(geometry: any): [number, number][][] {
  const rings: [number, number][][] = [];

  function collect(coords: any) {
    if (!coords || coords.length === 0) return;
    const isMulti =
      Array.isArray(coords[0]) &&
      Array.isArray(coords[0][0]) &&
      Array.isArray(coords[0][0][0]);
    const polygons = isMulti ? coords : [coords];
    polygons.forEach((polygon: any) => {
      polygon.forEach((ring: [number, number][]) => {
        if (ring.length > 0 && Array.isArray(ring[0])) {
          rings.push(ring);
        }
      });
    });
  }

  collect(geometry.coordinates);
  return rings;
}
