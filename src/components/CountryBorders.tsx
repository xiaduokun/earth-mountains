import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { latLngToPosition } from '../utils/geo';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const R = 1.5 + 0.015;
const LABEL_R = 1.5 + 0.025;
const BORDER_COLOR = '#887744';

interface CountryLabel {
  name: string;
  pos: THREE.Vector3;
}

export function CountryBorders() {
  const [lines, setLines] = useState<THREE.Line[]>([]);
  const [labels, setLabels] = useState<CountryLabel[]>([]);
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
          const name: string = f.properties?.name;

          // First ring = outer boundary → compute centroid for label
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

            // Only show labels for reasonably-sized countries
            const spanLng = Math.max(...outerRing.map((c) => c[0])) -
              Math.min(...outerRing.map((c) => c[0]));
            if (spanLng > 0.5) {
              labelResult.push({
                name,
                pos: latLngToPosition(avgLat, avgLng, LABEL_R),
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

  if (lines.length === 0) return null;

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
            style={{
              fontSize: '8px',
              color: 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
              textShadow: '0 0 2px rgba(0,0,0,0.8)',
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
