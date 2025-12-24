import { ProCard, StatisticCard } from '@ant-design/pro-components';
import { useRequest } from '@umijs/max';
import { getOverview } from '@/services/dashboard';
import RcResizeObserver from 'rc-resize-observer';
import { useState } from 'react';
import { 
  CalendarOutlined, 
  AppstoreOutlined, 
  CodeOutlined, 
  DatabaseOutlined,
  RobotOutlined 
} from '@ant-design/icons';

const IntroduceRow = () => {
  const { data: rawData, loading } = useRequest(getOverview);
  const data = rawData?.data || rawData;
  const [responsive, setResponsive] = useState(false);

  const totalAssets = (data?.knowledge_assets?.risk_count || 0) + 
    (data?.knowledge_assets?.role_count || 0) + 
    (data?.knowledge_assets?.web3d_risk_count || 0) +
    (data?.knowledge_assets?.web3d_workload_template_count || 0);

  return (
    <RcResizeObserver
      key="resize-observer"
      onResize={(offset) => {
        setResponsive(offset.width < 768);
      }}
    >
      <ProCard
        split={responsive ? 'horizontal' : 'vertical'}
        bordered={false}
        loading={loading}
        gutter={[16, 16]}
        style={{ marginBottom: 0 }}
      >
        <StatisticCard
          statistic={{
            title: '近30天评估',
            value: data?.recent_30d || 0,
            suffix: '个',
            icon: <CalendarOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
          }}
          style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}
        />
        <StatisticCard
          statistic={{
            title: 'SaaS/平台项目',
            value: data?.saas_count || 0,
            suffix: '个',
            icon: <AppstoreOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
          }}
          style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}
        />
        <StatisticCard
          statistic={{
            title: 'Web3D项目',
            value: data?.web3d_count || 0,
            suffix: '个',
            icon: <CodeOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
          }}
          style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)' }}
        />
        <StatisticCard
          statistic={{
            title: '知识资产',
            value: totalAssets,
            suffix: '项',
            icon: <DatabaseOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
          }}
          style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}
        />
        <StatisticCard
          statistic={{
            title: 'AI模型',
            value: data?.ai_models?.total || 0,
            suffix: '个',
            icon: <RobotOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
          }}
          style={{ background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)' }}
        />
      </ProCard>
    </RcResizeObserver>
  );
};

export default IntroduceRow;
