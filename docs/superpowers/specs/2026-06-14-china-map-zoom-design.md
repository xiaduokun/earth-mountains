# 点击中国放大 + 省份地图设计

**日期**: 2026-06-14
**目标**: 点击 3D 地球上的中国区域时，相机放大并显示带省份行政区划的 2D 中国地图

---

## 概述

在现有 3D 地球可视化上增加交互：用户点击中国区域 → 相机飞行动画放大中国 → 淡入 ECharts 中国省份地图。此设计为后续在各省标注名山（沿用现有山峰 Marker 逻辑）奠定基础。

## 交互流程

```
用户旋转地球 → 点击中国区域
       ↓
经纬度范围检测 (lat 18-54°N, lng 73-135°E)
       ↓ 命中
相机飞行 1.5 秒 → 地球放大到中国视角
       ↓
ECharts 地图面板淡入 (opacity 过渡 0.4s)
  - 显示 34 省份边界
  - hover 省份高亮
       ↓
点击「返回地球」按钮
       ↓
地图面板淡出 → 相机飞回默认视角
```

## 点击检测

- 给地球 `mesh` 添加 `onClick` 事件
- 通过 R3F 的 `useThree().raycaster` 获取点击的 3D 坐标
- 反算经纬度：`lat = 90 - phi * 180/PI`, `lng = theta * 180/PI - 180`
- 判断是否在范围内：`lat 18-54 && lng 73-135`

## ECharts 中国地图

- 依赖：`echarts` + `echarts-for-react`
- 数据：中国 GeoJSON（含省份，约 1-2MB），存放于 `src/data/china-geo.ts`
- 通过 `echarts.registerMap('china', geoJSON)` 注册
- 渲染为 `<MapChart>`（react-echarts），覆盖在 3D Canvas 上层

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/data/china-geo.ts` | 新建 | 中国省份 GeoJSON 数据 |
| `src/components/ChinaMap.tsx` | 新建 | ECharts 地图渲染 + 省份交互 |
| `src/components/EarthScene.tsx` | 修改 | 添加地球 onClick 检测 |
| `src/App.tsx` | 修改 | 统筹 viewMode 状态（globe / china） |
| `src/App.css` | 修改 | 地图面板样式、过渡动画 |

## 相机动画

- 使用 drei 的 `CameraControls`（已存在 `OrbitControls`）或使用 gsap 动画
- 最简单方案：用 `useFrame` + lerp 平滑过渡相机到中国上方
- 目标位置：`lat ~35, lng ~105, distance ~2.5`（中国中心上空）
- 动画时长 1.5 秒，缓出

## 状态管理

```typescript
// App.tsx
type ViewMode = 'globe' | 'china';
const [viewMode, setViewMode] = useState<ViewMode>('globe');
```

- `globe`：正常 3D 地球
- `china`：相机放大中国 + ECharts 面板显示

## 样式

- 地图面板：全屏居中，`position: fixed`，`z-index` 高于 Canvas
- 背景：半透明深色 `rgba(10, 10, 30, 0.95)`
- 返回按钮：左上角，圆角，半透明背景
- 过渡：`opacity` 0.4s ease

## 性能

- ECharts 地图仅在地图模式时渲染（条件渲染）
- GeoJSON 数据静态导入，按需注册
- 相机动画使用 lerp，不依赖外部库

## 验收标准

- [ ] 点击地球上中国区域，相机飞行放大到中国
- [ ] 中国地图面板淡入，显示省份边界
- [ ] Hover 省份时高亮
- [ ] 点击「返回」按钮，面板淡出，相机飞回默认视角
- [ ] 不影响现有的山峰标记交互
- [ ] 移动端响应式正常
