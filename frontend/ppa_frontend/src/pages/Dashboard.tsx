import {
  getCostComposition,
  getCostTrend,
  getDashboardSummary,
  getRiskCostCorrelation,
  getRiskDistribution,
  getRoleCostDistribution,
} from '@/services/dashboard';
import { Column, Line, Pie, Scatter } from '@ant-design/charts';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Col, Empty, Row, Spin, Statistic } from 'antd';
import { useEffect, useState } from 'react';

const DashboardPage = () => {
  // 数据状态
  const [summary, setSummary] = useState<API.DashboardSummary | null>(null);
  const [riskDistribution, setRiskDistribution] = useState<
    API.RiskDistributionItem[]
  >([]);
  const [costComposition, setCostComposition] =
    useState<API.CostComposition | null>(null);
  const [roleCostDistribution, setRoleCostDistribution] =
    useState<API.RoleCostDistribution>({});
  const [costTrend, setCostTrend] = useState<API.CostTrendItem[]>([]);
  const [riskCostCorrelation, setRiskCostCorrelation] = useState<
    API.RiskCostCorrelationItem[]
  >([]);

  // 加载和错误状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载所有数据
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          summaryRes,
          riskDistRes,
          costCompRes,
          roleCostRes,
          costTrendRes,
          riskCostRes,
        ] = await Promise.all([
          getDashboardSummary(),
          getRiskDistribution(),
          getCostComposition(),
          getRoleCostDistribution(),
          getCostTrend(),
          getRiskCostCorrelation(),
        ]);

        setSummary(summaryRes);
        setRiskDistribution(riskDistRes);
        setCostComposition(costCompRes);
        setRoleCostDistribution(roleCostRes);
        setCostTrend(costTrendRes);
        setRiskCostCorrelation(riskCostRes);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err?.message || '数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 加载状态
  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large">
            <div style={{ padding: '50px' }}>加载数据中...</div>
          </Spin>
        </div>
      </PageContainer>
    );
  }

  // 错误状态
  if (error) {
    return (
      <PageContainer>
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
        />
      </PageContainer>
    );
  }

  // 准备图表数据
  const riskChartData = riskDistribution.map((item) => ({
    type:
      item.final_risk_score < 50
        ? '低风险'
        : item.final_risk_score < 100
        ? '中风险'
        : '高风险',
    value: item.count,
  }));

  const costCompositionData = costComposition
    ? [
        { type: '软件研发', value: costComposition.softwareDevelopment },
        { type: '系统对接', value: costComposition.systemIntegration },
        { type: '运维', value: costComposition.operations },
        { type: '差旅', value: costComposition.travel },
        { type: '风险', value: costComposition.risk },
      ]
    : [];

  const roleCostData = Object.entries(roleCostDistribution).map(
    ([role, cost]) => ({
      role,
      cost,
    }),
  );

  // 图表配置
  const riskPieConfig = {
    data: riskChartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: false, // 暂时禁用标签避免错误
    interactions: [{ type: 'element-active' }],
    legend: {
      position: 'bottom' as const,
    },
  };

  const costCompositionConfig = {
    data: costCompositionData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: false, // 暂时禁用标签避免错误
    statistic: {
      title: false,
      content: {
        style: {
          fontSize: '20px',
        },
        formatter: () => '成本构成',
      },
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      position: 'bottom' as const,
    },
  };

  const roleCostConfig = {
    data: roleCostData,
    xField: 'role',
    yField: 'cost',
    label: false, // 暂时禁用标签避免错误
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v || 0).toLocaleString()}`,
      },
    },
    meta: {
      role: { alias: '角色' },
      cost: { alias: '成本(元)' },
    },
  };

  const costTrendConfig = {
    data: costTrend,
    xField: 'month',
    yField: 'totalCost',
    smooth: true,
    point: {
      size: 5,
      shape: 'circle',
    },
    label: false, // 暂时禁用标签避免错误
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v || 0).toLocaleString()}`,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        const cost = datum?.totalCost ?? 0;
        return {
          name: '总成本',
          value: `¥${cost.toLocaleString()}`,
        };
      },
    },
  };

  const riskCostScatterConfig = {
    data: riskCostCorrelation,
    xField: 'final_risk_score',
    yField: 'final_total_cost',
    size: 5,
    pointStyle: {
      fill: '#1890ff',
      fillOpacity: 0.6,
    },
    xAxis: {
      nice: true,
      title: { text: '风险评分' },
    },
    yAxis: {
      nice: true,
      title: { text: '项目成本' },
    },
  };

  return (
    <PageContainer>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="评估项目总数"
              value={summary?.totalProjects || 0}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="项目平均成本"
              value={summary?.averageCost || 0}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 风险等级分布 */}
        <Col xs={24} md={12}>
          <Card title="项目风险等级分布">
            {riskChartData.length > 0 ? (
              <Pie {...riskPieConfig} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 成本构成分析 */}
        <Col xs={24} md={12}>
          <Card title="成本构成分析">
            {costCompositionData.length > 0 ? (
              <Pie {...costCompositionConfig} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 角色成本占比 */}
        <Col xs={24} md={12}>
          <Card title="角色成本占比">
            {roleCostData.length > 0 ? (
              <Column {...roleCostConfig} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 项目成本趋势 */}
        <Col xs={24} md={12}>
          <Card title="项目成本趋势">
            {costTrend.length > 0 ? (
              <Line {...costTrendConfig} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 风险因子与成本关联 */}
        <Col xs={24}>
          <Card title="风险因子与成本关联分析">
            {riskCostCorrelation.length > 0 ? (
              <Scatter {...riskCostScatterConfig} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DashboardPage;
