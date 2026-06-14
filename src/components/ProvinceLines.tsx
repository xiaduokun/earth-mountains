import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { latLngToPosition } from '../utils/geo';

const CHINA_GEO_URL =
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
const R = 1.5 + 0.015; // slightly above Earth surface
const LINE_COLOR = 'rgba(100, 180, 255, 0.6)';
const BORDER_COLOR = 'rgba(255, 200, 100, 0.8)'; // national border

interface ProvinceLinesProps {
  visible: boolean;
}

export function ProvinceLines({ visible }: ProvinceLinesProps) {
  const [geoJSON, setGeoJSON] = useState<any>(null);

  useEffect(() => {
    fetch(CHINA_GEO_URL)
      .then((r) => r.json())
      .then((data) => setGeoJSON(data))
      .catch(() => console.warn('Failed to load China GeoJSON'));
  }, []);

  const lines = useMemo(() => {
    if (!geoJSON) return [];

    const result: THREE.Line[] = [];

    geoJSON.features.forEach((feature: any, idx: number) => {
      const coords = extractPolygonCoords(feature.geometry);
      coords.forEach((ring: [number, number][]) => {
        if (ring.length < 3) return;
        const pts = ring.map(([lng, lat]) =>
          latLngToPosition(lat, lng, R)
        );
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const isOuter = idx === 0; // first feature = national outline
        const mat = new THREE.LineBasicMaterial({
          color: isOuter ? BORDER_COLOR : LINE_COLOR,
          transparent: true,
          opacity: isOuter ? 0.9 : 0.5,
          depthTest: true,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        result.push(line);
      });
    });

    return result;
  }, [geoJSON]);

  if (!visible) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

/** Extract all polygon ring coordinates from a GeoJSON geometry */
function extractPolygonCoords(geometry: any): [number, number][][] {
  const rings: [number, number][][] = [];

  function collect(multiPolygonCoords: any) {
    if (!multiPolygonCoords) return;
    // MultiPolygon: [[[ring1], [ring2]], [[ring3]]]
    // Polygon: [[ring1], [ring2]]
    const isMulti =
      Array.isArray(multiPolygonCoords[0]) &&
      Array.isArray(multiPolygonCoords[0][0]) &&
      Array.isArray(multiPolygonCoords[0][0][0]);

    const polygons = isMulti ? multiPolygonCoords : [multiPolygonCoords];
    polygons.forEach((polygon: any) => {
      polygon.forEach((ring: [number, number][]) => {
        // ring is [[lng, lat], [lng, lat], ...]
        if (ring.length > 0 && Array.isArray(ring[0])) {
          rings.push(ring);
        }
      });
    });
  }

  collect(geometry.coordinates);
  return rings;
}
