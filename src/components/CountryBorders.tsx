import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { latLngToPosition } from '../utils/geo';

const WORLD_GEO_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/refs/heads/main/data/countries.geojson';
const R = 1.5 + 0.004;
const BORDER_COLOR = 'rgba(180, 200, 220, 0.4)';
const COAST_COLOR = 'rgba(160, 190, 210, 0.35)';

export function CountryBorders() {
  const [geoJSON, setGeoJSON] = useState<any>(null);

  useEffect(() => {
    fetch(WORLD_GEO_URL)
      .then((r) => r.json())
      .then((data) => setGeoJSON(data))
      .catch(() => console.warn('Failed to load world GeoJSON'));
  }, []);

  const lines = useMemo(() => {
    if (!geoJSON) return [];

    const result: THREE.Line[] = [];

    geoJSON.features.forEach((feature: any) => {
      const rings = extractPolygonCoords(feature.geometry);
      rings.forEach((ring: [number, number][]) => {
        if (ring.length < 3) return;
        const pts = ring.map(([lng, lat]) =>
          latLngToPosition(lat, lng, R)
        );
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: BORDER_COLOR,
          transparent: true,
          opacity: 0.4,
          depthTest: true,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        result.push(line);
      });
    });

    return result;
  }, [geoJSON]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

/** Extract polygon rings from GeoJSON geometry (handles Polygon & MultiPolygon) */
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
