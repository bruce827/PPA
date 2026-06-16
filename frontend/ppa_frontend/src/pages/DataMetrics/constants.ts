/**
 * 数据指标设计模块 - 枚举配置
 */

// 展示方式
export const DISPLAY_TYPE_OPTIONS = [
  { label: '统计数据', value: '统计数据' },
  { label: '柱状图', value: '柱状图' },
  { label: '条形图', value: '条形图' },
  { label: '折线图', value: '折线图' },
  { label: '饼图', value: '饼图' },
  { label: '表格', value: '表格' },
  { label: '地图', value: '地图' },
  { label: '视频', value: '视频' },
];

// 默认展示方式
export const DEFAULT_DISPLAY_TYPE = '统计数据';

// 采集周期
export const COLLECTION_CYCLE_OPTIONS = [
  { label: '日', value: '日' },
  { label: '月', value: '月' },
  { label: '实时', value: '实时' },
];

// 导入模式
export const IMPORT_MODE_OPTIONS = [
  { label: '追加模式（保留现有数据）', value: 'append' },
  { label: '覆盖模式（清空后导入）', value: 'overwrite' },
];

// 获取展示方式的标签
export const getDisplayTypeLabel = (value: string): string => {
  const option = DISPLAY_TYPE_OPTIONS.find(item => item.value === value);
  return option?.label || value;
};

// 展示方式的颜色映射
export const DISPLAY_TYPE_COLORS: Record<string, string> = {
  '统计数据': 'blue',
  '柱状图': 'green',
  '条形图': 'cyan',
  '折线图': 'purple',
  '饼图': 'orange',
  '表格': 'default',
  '地图': 'geekblue',
  '视频': 'magenta',
};
