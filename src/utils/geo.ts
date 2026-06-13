import * as THREE from 'three';

/**
 * Convert geographic coordinates (latitude, longitude) to 3D position on a sphere.
 * @param lat - Latitude in degrees
 * @param lng - Longitude in degrees
 * @param radius - Sphere radius (default 1)
 * @returns THREE.Vector3 position on the sphere surface
 */
export function latLngToPosition(
  lat: number,
  lng: number,
  radius: number = 1
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle (from north pole)
  const theta = (lng + 180) * (Math.PI / 180); // azimuthal angle

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Create a small mountain peak geometry (cone/pyramid shape).
 */
export function createMountainGeometry(
  height: number,
  baseRadius: number = 0.015
): THREE.ConeGeometry {
  // Scale the mountain height relative to actual height for visual appeal
  const visualHeight = Math.max(0.03, Math.min(0.1, height / 80000));
  return new THREE.ConeGeometry(baseRadius, visualHeight, 6);
}
