import { WordCloud } from '@ant-design/charts';
import { Card, Empty } from 'antd';
import { useRequest } from '@umijs/max';
import { getKeywords } from '@/services/dashboard';

const CARD_BODY_HEIGHT = 300;
const CHART_HEIGHT = CARD_BODY_HEIGHT - 20;
const COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#f5222d', '#faad14', '#eb2f96'];

const KeywordAnalysis = () => {
  const { data: rawData, loading } = useRequest(getKeywords);
  const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  const config = {
    data: data || [],
    textField: 'word',
    sizeField: 'weight',
    colorField: 'word',
    style: {
      fill: (_: any, idx: number) => COLORS[idx % COLORS.length],
    },
    layout: {
      fontSize: [16, 48],
      rotate: () => (Math.random() > 0.5 ? 0 : 90),
      padding: 2,
    },
  };

  return (
    <Card loading={loading} title="业务热点词云" variant="borderless" styles={{ body: { height: CARD_BODY_HEIGHT, overflow: 'hidden' } }}>
      {data && data.length > 0 ? (
        <WordCloud {...config} height={CHART_HEIGHT} />
      ) : (
        <Empty description="暂无热点数据" />
      )}
    </Card>
  );
};

export default KeywordAnalysis;
