import { Column } from '@ant-design/charts';
import { Card, Empty } from 'antd';
import { useRequest } from '@umijs/max';
import { getTrend } from '@/services/dashboard';

const CARD_BODY_HEIGHT = 300;
const CHART_HEIGHT = CARD_BODY_HEIGHT - 20;

const TrendAnalysis = () => {
  const { data: rawData, loading } = useRequest(getTrend);
  const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  const config = {
    data: data || [],
    xField: 'month',
    yField: 'project_count',
    colorField: 'project_type',
    stack: true,
    legend: {
      color: {
        position: 'top',
      },
    },
    axis: {
      x: { 
        title: false,
        labelAutoRotate: false,
        labelFontWeight: 600,
      },
      y: { 
        title: '项目数',
        labelFontWeight: 600,
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    scale: {
      color: {
        range: ['#1890ff', '#722ed1'],
      },
      y: {
        domainMin: 0,
        nice: true,
      },
    },
    label: {
      text: (d: any) => (d.project_count > 0 ? d.project_count : ''),
      position: 'inside',
      style: { fill: '#fff', fontWeight: 500 },
    },
  };

  return (
    <Card loading={loading} variant="borderless" title="月度业务趋势" styles={{ body: { height: CARD_BODY_HEIGHT, overflow: 'hidden' } }}>
      {data && data.length > 0 ? (
        <Column {...config} height={CHART_HEIGHT} />
      ) : (
        <Empty description="暂无趋势数据" />
      )}
    </Card>
  );
};

export default TrendAnalysis;
