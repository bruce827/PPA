import { Bar } from '@ant-design/charts';
import { Card, Empty } from 'antd';
import { useRequest } from '@umijs/max';

interface RankingListProps {
  title: string;
  request: (options?: any) => Promise<any>;
  valueField: string;
  categoryField: string;
  aliasValue: string;
  aliasCategory: string;
  limit?: number;
  colorScheme?: 'multi' | 'gradient';
  baseColor?: string;
}

const CARD_BODY_HEIGHT = 280;
const CHART_HEIGHT = CARD_BODY_HEIGHT - 20;
const MULTI_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'];

const getGradientColor = (baseColor: string, index: number, total: number) => {
  const opacity = 1 - (index / total) * 0.6;
  return `rgba(${parseInt(baseColor.slice(1, 3), 16)}, ${parseInt(baseColor.slice(3, 5), 16)}, ${parseInt(baseColor.slice(5, 7), 16)}, ${opacity})`;
};

const RankingList = ({ 
  title, 
  request, 
  valueField, 
  categoryField, 
  aliasValue, 
  aliasCategory, 
  limit = 5,
  colorScheme = 'multi',
  baseColor = '#f5222d',
}: RankingListProps) => {
  const { data: rawData, loading } = useRequest(request);
  const rawList = Array.isArray(rawData) ? rawData : (rawData?.data || []);
  const data = rawList.slice(0, limit);

  const config = {
    data: data || [],
    xField: categoryField,
    yField: valueField,
    colorField: categoryField,
    legend: false,
    axis: {
      x: { 
        title: false, 
        labelAutoRotate: false, 
        labelFontWeight: 600,
        labelFontSize: 12,
      },
      y: { 
        title: aliasValue, 
        labelFontWeight: 600,
      },
    },
    style: { 
      radiusTopLeft: 4, 
      radiusTopRight: 4,
      fill: (_: any, idx: number) => 
        colorScheme === 'gradient' 
          ? getGradientColor(baseColor, idx, data.length)
          : MULTI_COLORS[idx % MULTI_COLORS.length],
    },
    label: {
      text: (d: any) => d[valueField],
      position: 'inside',
      style: { fill: '#fff', fontWeight: 500 },
    },
  };

  return (
    <Card 
      loading={loading} 
      title={title} 
      variant="borderless"
      styles={{ body: { height: CARD_BODY_HEIGHT, overflow: 'hidden' } }}
    >
      {data && data.length > 0 ? (
        <Bar {...config} height={CHART_HEIGHT} />
      ) : (
        <Empty description="暂无排名数据" />
      )}
    </Card>
  );
};

export default RankingList;
