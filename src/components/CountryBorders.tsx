import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { latLngToPosition } from '../utils/geo';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const R = 1.5 + 0.015;
const BORDER_COLOR = '#ffcc66';

export function CountryBorders() {
  const [lines, setLines] = useState<THREE.Line[]>([]);

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then((topo: Topology) => {
        // Convert TopoJSON → GeoJSON FeatureCollection
        const geojson = feature(topo, topo.objects.countries as any);
        const result: THREE.Line[] = [];

        (geojson as any).features.forEach((f: any) => {
          const rings = extractPolygonCoords(f.geometry);
          rings.forEach((ring: [number, number][]) => {
            if (ring.length < 3) return;
            const pts = ring.map(([lng, lat]) =>
              latLngToPosition(lat, lng, R)
            );
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({
              color: BORDER_COLOR,
              transparent: true,
              opacity: 1,
              depthTest: false,
            });
            const line = new THREE.Line(geo, mat);
            line.frustumCulled = false;
            result.push(line);
          });
        });

        setLines(result);
      })
      .catch((err) => console.warn('Failed to load world borders:', err));
  }, []);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
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
