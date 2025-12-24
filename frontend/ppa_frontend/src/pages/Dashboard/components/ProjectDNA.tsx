import { Card, Row, Col, Statistic, Progress, Empty } from 'antd';
import { useRequest } from '@umijs/max';
import { getDNA } from '@/services/dashboard';
import { 
  DollarOutlined, 
  ThunderboltOutlined, 
  ClockCircleOutlined,
  ToolOutlined,
  RocketOutlined
} from '@ant-design/icons';

const ProjectDNA = () => {
  const { data: rawData, loading } = useRequest(getDNA);
  const data = rawData?.data || rawData;

  if (!data && !loading) {
    return (
      <Card title="项目特征指标" variant="borderless">
        <Empty description="暂无特征数据" />
      </Card>
    );
  }

  const metrics = [
    {
      title: '平均成本',
      value: data?.avg_total_cost_wan?.toFixed(1) || 0,
      suffix: '万元',
      icon: <DollarOutlined />,
      color: '#1890ff',
    },
    {
      title: '平均风险分',
      value: data?.avg_risk_score?.toFixed(0) || 0,
      suffix: '分',
      icon: <ThunderboltOutlined />,
      color: '#f5222d',
    },
    {
      title: '平均工作量',
      value: data?.avg_workload_days?.toFixed(0) || 0,
      suffix: '人天',
      icon: <ClockCircleOutlined />,
      color: '#52c41a',
    },
  ];

  const techFactor = data?.avg_tech_factor || 1;
  const deliveryFactor = data?.avg_delivery_factor || 1;

  return (
    <Card loading={loading} title="项目特征指标" variant="borderless" styles={{ body: { height: 260, overflow: 'hidden' } }}>
      <Row gutter={[16, 16]}>
        {metrics.map((m, idx) => (
          <Col span={8} key={idx}>
            <Card size="small" style={{ textAlign: 'center', background: '#fafafa' }}>
              <Statistic
                title={<span style={{ color: m.color }}>{m.icon} {m.title}</span>}
                value={m.value}
                suffix={m.suffix}
                valueStyle={{ color: m.color, fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 48 }}>
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>
            <ToolOutlined style={{ color: '#722ed1', marginRight: 8 }} />
            <span>技术复杂度系数</span>
            <span style={{ float: 'right', fontWeight: 600 }}>{techFactor.toFixed(2)}</span>
          </div>
          <Progress 
            percent={Math.min((techFactor / 1.5) * 100, 100)} 
            showInfo={false}
            strokeColor="#722ed1"
            size="small"
          />
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>
            <RocketOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            <span>交付难度系数</span>
            <span style={{ float: 'right', fontWeight: 600 }}>{deliveryFactor.toFixed(2)}</span>
          </div>
          <Progress 
            percent={Math.min((deliveryFactor / 1.5) * 100, 100)} 
            showInfo={false}
            strokeColor="#fa8c16"
            size="small"
          />
        </Col>
      </Row>
    </Card>
  );
};

export default ProjectDNA;
