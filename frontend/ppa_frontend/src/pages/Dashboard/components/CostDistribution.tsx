import { Column } from '@ant-design/charts';
import { Card, Empty } from 'antd';
import { useRequest } from '@umijs/max';
import { getCostRange } from '@/services/dashboard';

const CARD_BODY_HEIGHT = 260;
const CHART_HEIGHT = CARD_BODY_HEIGHT - 20;
const COLORS = ['#52c41a', '#1890ff', '#faad14', '#f5222d'];

const CostDistribution = () => {
  const { data: rawData, loading } = useRequest(getCostRange);
  const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  const config = {
    data: data || [],
    xField: 'range',
    yField: 'count',
    colorField: 'range',
    style: {
      fill: (_: any, idx: number) => COLORS[idx % COLORS.length],
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    label: {
      text: (d: any) => d.count,
      position: 'inside',
      style: { fill: '#fff', fontWeight: 600, fontSize: 14 },
    },
    axis: {
      x: { 
        title: '成本区间 (万元)',
        labelFontWeight: 600,
      },
      y: { 
        title: '项目数量',
        labelFontWeight: 600,
      },
    },
    legend: false,
  };

  return (
    <Card loading={loading} title="项目成本区间分布" variant="borderless" styles={{ body: { height: CARD_BODY_HEIGHT, overflow: 'hidden' } }}>
      {data && data.length > 0 ? (
        <Column {...config} height={CHART_HEIGHT} />
      ) : (
        <Empty description="暂无分布数据" />
      )}
    </Card>
  );
};

export default CostDistribution;
