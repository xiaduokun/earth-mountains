/**
 * Famous mountains data with geographic coordinates and region info.
 * Each mountain represents a different region of the world.
 */

export interface Mountain {
  id: string;
  name: string;
  nameZh: string;
  region: string;
  regionZh: string;
  height: number; // meters
  lat: number;   // latitude in degrees
  lng: number;   // longitude in degrees
  color: string; // region color
  description: string;
  photoUrl: string; // real mountain peak photo
}

export const MOUNTAINS: Mountain[] = [
  {
    id: 'everest',
    name: 'Mount Everest',
    nameZh: '珠穆朗玛峰',
    region: 'Asia',
    regionZh: '亚洲',
    height: 8848,
    lat: 27.9881,
    lng: 86.925,
    color: '#FF6B6B',
    description: '世界最高峰，位于中国与尼泊尔边境',
    photoUrl: '/mountains/everest.jpg',
  },
  {
    id: 'mont-blanc',
    name: 'Mont Blanc',
    nameZh: '勃朗峰',
    region: 'Europe',
    regionZh: '欧洲',
    height: 4808,
    lat: 45.8326,
    lng: 6.8656,
    color: '#4ECDC4',
    description: '西欧最高峰，位于法国与意大利边境',
    photoUrl: '/mountains/mont-blanc.jpg',
  },
  {
    id: 'denali',
    name: 'Denali',
    nameZh: '德纳里山',
    region: 'North America',
    regionZh: '北美洲',
    height: 6190,
    lat: 63.0695,
    lng: -151.0074,
    color: '#45B7D1',
    description: '北美洲最高峰，位于美国阿拉斯加',
    photoUrl: '/mountains/denali.jpg',
  },
  {
    id: 'aconcagua',
    name: 'Aconcagua',
    nameZh: '阿空加瓜山',
    region: 'South America',
    regionZh: '南美洲',
    height: 6961,
    lat: -32.6532,
    lng: -70.0117,
    color: '#96CEB4',
    description: '南美洲最高峰，位于阿根廷',
    photoUrl: '/mountains/aconcagua.jpg',
  },
  {
    id: 'kilimanjaro',
    name: 'Kilimanjaro',
    nameZh: '乞力马扎罗山',
    region: 'Africa',
    regionZh: '非洲',
    height: 5895,
    lat: -3.0674,
    lng: 37.3556,
    color: '#FFEAA7',
    description: '非洲最高峰，位于坦桑尼亚',
    photoUrl: '/mountains/kilimanjaro.jpg',
  },
  {
    id: 'mount-cook',
    name: 'Mount Cook',
    nameZh: '库克山',
    region: 'Oceania',
    regionZh: '大洋洲',
    height: 3724,
    lat: -43.5953,
    lng: 170.1419,
    color: '#DDA0DD',
    description: '新西兰最高峰',
    photoUrl: '/mountains/mount-cook.jpg',
  },
  {
    id: 'vinson',
    name: 'Vinson Massif',
    nameZh: '文森峰',
    region: 'Antarctica',
    regionZh: '南极洲',
    height: 4892,
    lat: -78.5253,
    lng: -85.6171,
    color: '#98D8C8',
    description: '南极洲最高峰',
    photoUrl: '/mountains/vinson.jpg',
  },
];
