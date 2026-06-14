import { useEffect, useState } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';

interface ChinaMapProps {
  visible: boolean;
  onBack: () => void;
}

const CHINA_GEO_URL =
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

export function ChinaMap({ visible, onBack }: ChinaMapProps) {
  const [geoLoaded, setGeoLoaded] = useState(false);

  useEffect(() => {
    if (visible && !geoLoaded) {
      fetch(CHINA_GEO_URL)
        .then((r) => r.json())
        .then((data) => {
          echarts.registerMap('china', data);
          setGeoLoaded(true);
        })
        .catch(() => console.warn('Failed to load China GeoJSON'));
    }
  }, [visible, geoLoaded]);

  if (!visible) return null;

  const option = geoLoaded
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
    : {};

  return (
    <div
      className="china-map-overlay"
      style={{
        opacity: geoLoaded ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <button className="china-back-btn" onClick={onBack}>
        ← 返回地球
      </button>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
