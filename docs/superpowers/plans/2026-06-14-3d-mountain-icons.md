# 3D 写实山峰图标实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用带真实照片纹理的 3D LatheGeometry 山体替换当前 HTML 照片标记

**Architecture:** 重写 MountainMarker 组件，从 Html+img 改为 mesh+LatheGeometry+纹理；山峰通过 useTexture 加载照片，lathe 轮廓用指数曲线生成；视点淡化通过 material.opacity 实现，hover 通过 state 控制 scale

**Tech Stack:** React 19, React Three Fiber 9, @react-three/drei 10, Three.js 0.184

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/EarthScene.tsx` | 修改 | MountainMarker 重写为 3D 网格；Earth 注释更新 |
| `src/App.css` | 修改 | 删除 `.mountain-photo-marker`、`.marker-photo` 样式 |
| `src/utils/geo.ts` | 修改 | 删除未使用的 `createMountainGeometry` |

---

### Task 1: 重写 MountainMarker 为 3D 纹理山体

**Files:**
- Modify: `src/components/EarthScene.tsx:1-104`

- [ ] **Step 1: 替换 import 和常量，添加 LatheGeometry 工具函数**

替换 EarthScene.tsx 中第 1-21 行的 import、常量及旧工具函数：

```tsx
import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MOUNTAINS, type Mountain } from '../data/mountains';
import { latLngToPosition } from '../utils/geo';

const EARTH_RADIUS = 1.5;
const MIN_HEIGHT = 3724;
const MAX_HEIGHT = 8848;

/** 真实海拔 → 3D 高度 (0.06–0.12) */
function calcMountainHeight(height: number): number {
  return 0.05 + ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * 0.07;
}

/** 生成山体轮廓点（LatheGeometry 用） */
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
```

- [ ] **Step 2: 重写 MountainMarker 组件（替换第 23-103 行）**

```tsx
function MountainMarker({ mountain }: { mountain: Mountain }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [textureError, setTextureError] = useState(false);
  const { camera } = useThree();

  const texture = useTexture(textureError ? '' : mountain.photoUrl, undefined, () => {
    setTextureError(true);
  });

  const normal = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, 1).normalize(),
    [mountain.lat, mountain.lng]
  );

  const meshPos = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS),
    [mountain.lat, mountain.lng]
  );

  const labelPos = useMemo(
    () => latLngToPosition(mountain.lat, mountain.lng, EARTH_RADIUS + 0.15),
    [mountain.lat, mountain.lng]
  );

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  const mountainHeight = useMemo(() => calcMountainHeight(mountain.height), [mountain.height]);
  const baseRadius = mountainHeight * 0.4;

  const geometry = useMemo(
    () => new THREE.LatheGeometry(mountainProfile(baseRadius, mountainHeight), 16),
    [baseRadius, mountainHeight]
  );

  useFrame(() => {
    const cameraDir = camera.position.clone().normalize();
    const facing = normal.dot(cameraDir);
    const opacity = THREE.MathUtils.clamp((facing + 0.05) / 0.2, 0, 1);

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity;
      mat.transparent = true;
    }
  });

  const targetScale = hovered ? 1.5 : 1;

  return (
    <group position={meshPos} quaternion={quaternion}>
      {/* 3D Mountain Mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={[targetScale, targetScale, targetScale]}
      >
        <meshStandardMaterial
          map={textureError ? null : texture}
          color={textureError ? mountain.color : '#ffffff'}
          roughness={0.7}
          metalness={0.05}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Label — 保留 HTML 层 */}
      <Html position={[0, mountainHeight + 0.06, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="mountain-label"
          style={{
            borderColor: mountain.color,
            opacity: 1,
          }}
        >
          <div className="mountain-name">{mountain.nameZh}</div>
          <div className="mountain-height">{mountain.height.toLocaleString()}m</div>
        </div>
      </Html>
    </group>
  );
}
```

- [ ] **Step 3: 更新 Earth 组件中注释**

替换第 156 行注释：

```tsx
      {/* Mountain 3D markers */}
      {MOUNTAINS.map((mountain) => (
        <MountainMarker key={mountain.id} mountain={mountain} />
      ))}
```

- [ ] **Step 4: 验证 EarthScene.tsx 编译通过**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 无类型错误

---

### Task 2: 清理 CSS 中的旧照片标记样式

**Files:**
- Modify: `src/App.css:234-251`

- [ ] **Step 1: 删除 `.mountain-photo-marker` 和 `.marker-photo` 样式块**

删除 App.css 第 234-251 行：

```css
/* ===== Mountain Photo Marker (replaces 3D cone) ===== */
.mountain-photo-marker {
  cursor: pointer;
  transition: width 0.25s ease, height 0.25s ease, opacity 0.4s ease;
  border-radius: 1px;
  overflow: hidden;
  border: none;
  background: none;
  box-shadow: none;
  transform: rotateY(-3deg) rotateX(4deg);
}

.mountain-photo-marker .marker-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

替换为：

```css
/* ===== Mountain 3D Marker (replaces HTML photo markers, see EarthScene.tsx) ===== */
```

- [ ] **Step 2: 确认 CSS 没有破坏现有样式**

Run: `grep -n "mountain-photo-marker\|marker-photo" src/App.css`
Expected: 无匹配结果

---

### Task 3: 清理 geo.ts 中未使用的 createMountainGeometry

**Files:**
- Modify: `src/utils/geo.ts:25-35`

- [ ] **Step 1: 删除 createMountainGeometry 函数及相关注释**

删除 geo.ts 第 25-35 行：

```ts
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
```

- [ ] **Step 2: 确认 geo.ts 只剩 latLngToPosition**

Run: `cat src/utils/geo.ts`
Expected: 文件只包含 import、注释和 `latLngToPosition` 函数

---

### Task 4: 启动验证

**Files:**
- 无新建/修改

- [ ] **Step 1: 启动开发服务器**

Run: `npx vite --host 127.0.0.1`
Expected: 无构建错误，页面可访问

- [ ] **Step 2: 目视确认**

打开浏览器验证：
- [ ] 7 座山在球面上显示为 3D 形状
- [ ] 照片纹理可见（大致能辨认山峰）
- [ ] 山体大小有差异（珠峰最大，库克山最小）
- [ ] 鼠标悬停时山体放大
- [ ] 旋转地球时山体背对时淡出
- [ ] 图例点击和详情卡片正常
- [ ] 移动端响应式布局正常

- [ ] **Step 3: 如果照片纹理加载失败，显示纯色山体（color fallback）**

验证：在浏览器 DevTools 中屏蔽 `/mountains/*` 请求，确认山体显示为纯色

---

### Task 5: 提交

- [ ] **Step 1: 提交所有改动**

```bash
git add src/components/EarthScene.tsx src/App.css src/utils/geo.ts
git commit -m "feat: 3D 写实山峰图标 — LatheGeometry + 照片纹理替换 HTML 标记"
```
