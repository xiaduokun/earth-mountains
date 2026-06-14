# China Map Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click China on the 3D globe → camera flys to zoom in → ECharts province map fades in

**Architecture:** `viewMode` state in App controls globe vs china views. Earth mesh `onClick` uses raycaster to get lat/lng, checks against China bounding box. ChinaMap renders ECharts with GeoJSON from DataV CDN. Camera animation via OrbitControls target lerp.

**Tech Stack:** React 19, R3F 9, @react-three/drei 10, Three.js 0.184, echarts 5, echarts-for-react 3

---

## File Structure

| File | Operation | Responsibility |
|------|-----------|----------------|
| `src/components/ChinaMap.tsx` | Create | ECharts China province map with hover/click |
| `src/components/EarthScene.tsx` | Modify | Add onClick lat/lng detection, accept `onChinaClick` prop |
| `src/App.tsx` | Modify | `viewMode` state, ChinaMap render, camera animation |
| `src/App.css` | Modify | Map panel overlay styles, return button |

---

### Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install echarts and echarts-for-react**

```bash
npm install echarts echarts-for-react
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('echarts'); require('echarts-for-react'); console.log('OK')"
```

Expected: `OK`

---

### Task 2: Create ChinaMap component

**Files:**
- Create: `src/components/ChinaMap.tsx`

- [ ] **Step 1: Create ChinaMap.tsx**

```tsx
import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

interface ChinaMapProps {
  visible: boolean;
  onBack: () => void;
}

const CHINA_GEO_URL =
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

export function ChinaMap({ visible, onBack }: ChinaMapProps) {
  const [geoJSON, setGeoJSON] = useState<any>(null);

  useEffect(() => {
    if (visible && !geoJSON) {
      fetch(CHINA_GEO_URL)
        .then((r) => r.json())
        .then((data) => setGeoJSON(data))
        .catch(() => console.warn('Failed to load China GeoJSON'));
    }
  }, [visible, geoJSON]);

  if (!visible) return null;

  const option = geoJSON
    ? {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: '{b}',
        },
        series: [
          {
            type: 'map',
            map: 'china',
            roam: true,
            zoom: 1.2,
            center: [104.0, 35.0],
            label: {
              show: true,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 10,
            },
            itemStyle: {
              areaColor: 'rgba(40, 60, 120, 0.7)',
              borderColor: 'rgba(100, 160, 255, 0.5)',
              borderWidth: 1,
            },
            emphasis: {
              label: {
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
              },
              itemStyle: {
                areaColor: 'rgba(80, 120, 200, 0.9)',
                borderColor: 'rgba(180, 210, 255, 0.9)',
                borderWidth: 2,
              },
            },
            data: [],
          },
        ],
      }
    : null;

  return (
    <div
      className="china-map-overlay"
      style={{
        opacity: geoJSON ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <button className="china-back-btn" onClick={onBack}>
        ← 返回地球
      </button>
      {option && (
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ChinaMap.tsx package.json package-lock.json
git commit -m "feat: add ChinaMap ECharts component"
```

---

### Task 3: Add Earth click detection

**Files:**
- Modify: `src/components/EarthScene.tsx`

- [ ] **Step 1: Read current EarthScene.tsx Earth component and Earth component**

Read `src/components/EarthScene.tsx` to locate the Earth mesh (around line 140-150).

- [ ] **Step 2: Add onClick to Earth mesh and export helper**

Add an `onChinaClick` prop to the `Earth` component. Add `onClick` to the sphere mesh that calculates lat/lng from the hit point.

Replace the Earth component's export signature and mesh:

```tsx
// Add prop to Earth component:
export function Earth({ onChinaClick }: { onChinaClick?: () => void }) {

  // ... existing earthTexture, atmosphereUniforms code stays same ...

  // Add click handler before the return:
  const handleEarthClick = useCallback(
    (event: any) => {
      if (!onChinaClick) return;
      const point = event.point as THREE.Vector3;
      const normal = point.clone().normalize();
      // Convert 3D position to lat/lng
      const phi = Math.acos(normal.y);
      const lat = 90 - (phi * 180) / Math.PI;
      const theta = Math.atan2(-normal.x, normal.z);
      const lng = (theta * 180) / Math.PI;
      // China bounding box
      if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
        onChinaClick();
      }
    },
    [onChinaClick]
  );

  // Change the earth mesh to include onClick:
  // Find: <mesh>
  // Replace with: <mesh onClick={handleEarthClick}>
```

- [ ] **Step 3: Add `useCallback` to imports**

In EarthScene.tsx, update the React import to include `useCallback`:

```tsx
import { useRef, useMemo, useState, useCallback } from 'react';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/EarthScene.tsx
git commit -m "feat: add Earth onClick China detection"
```

---

### Task 4: Integrate viewMode in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add viewMode state and imports**

In `src/App.tsx`, add the `viewMode` state, `ChinaMap` import, and wrap the Earth:

```tsx
import { ChinaMap } from './components/ChinaMap';

// Inside App function, add after existing useState:
const [viewMode, setViewMode] = useState<'globe' | 'china'>('globe');

// Replace <Earth /> with:
<Earth onChinaClick={() => setViewMode('china')} />

// Add ChinaMap after the closing </Canvas>:
<ChinaMap
  visible={viewMode === 'china'}
  onBack={() => setViewMode('globe')}
/>

// Hide top panel and legend when in china mode:
// Wrap info-panel in: {viewMode === 'globe' && (...)}
// Wrap legend in: {viewMode === 'globe' && (...)}
```

- [ ] **Step 2: Verify full file compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add viewMode switching between globe and china map"
```

---

### Task 5: Add CSS styles for China map overlay

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add map overlay and back button styles**

Append to `src/App.css`:

```css
/* ===== China Map Overlay ===== */
.china-map-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(8, 8, 30, 0.92);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.china-back-btn {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 30;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  backdrop-filter: blur(10px);
  font-family: inherit;
}

.china-back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "style: add China map overlay and back button styles"
```

---

### Task 6: Start and verify

- [ ] **Step 1: Start dev server**

```bash
npx vite --host 127.0.0.1
```

- [ ] **Step 2: Manual verification**

- [ ] Click Earth's China region → camera view should change, map overlay appears
- [ ] Province boundaries visible, hover highlights provinces
- [ ] Click "返回地球" → overlay fades out
- [ ] Click outside China → no zoom (stays on globe)
- [ ] Existing mountain interaction still works

---

### Task 7: Final commit

```bash
git add -A
git commit -m "feat: click China to zoom + province map"
```
