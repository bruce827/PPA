import { NEUTRAL_TEXT_COLOR, RISK_LEVEL_COLORS } from '@/constants';
import { getConfigAll, getProjectDetail } from '@/services/assessment';
import { exportProjectToExcel } from '@/services/projects';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  message,
  Row,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

type ProjectDetail = API.ProjectInfo;
type AssessmentData = API.AssessmentData;

const AssessmentDetailPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(
    null,
  );
  const [configData, setConfigData] = useState<{
    roles: API.RoleConfig[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    const loadData = async () => {
      if (!params.id) return;

      try {
        setLoading(true);

        // 加载项目详情
        const projectRes = await getProjectDetail(params.id);
        setProject(projectRes.data);

        // 解析评估数据
        if (projectRes.data?.assessment_details_json) {
          try {
            const parsed = JSON.parse(projectRes.data.assessment_details_json);
            setAssessmentData(parsed);
          } catch (error) {
            messageApi.error('评估数据解析失败');
          }
        }

        // 加载配置数据（用于显示角色名称）
        const configRes = await getConfigAll();
        setConfigData({ roles: configRes.data.roles || [] });
      } catch (error: any) {
        messageApi.error('加载项目详情失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <PageContainer>
        {contextHolder}
        <div style={{ textAlign: 'center', width: '100%', marginTop: 100 }}>
          <Spin size="large" />
          <div style={{ marginTop: 8, color: '#666' }}>加载中...</div>
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        {contextHolder}
        <Empty description="项目不存在" />
      </PageContainer>
    );
  }

  // 风险等级颜色映射
  const getRiskLevelColor = (score: number, maxScore: number): string => {
    if (!maxScore) return NEUTRAL_TEXT_COLOR;
    const ratio = score / maxScore;
    if (ratio >= 0.7) return RISK_LEVEL_COLORS.HIGH; // 高风险
    if (ratio >= 0.4) return RISK_LEVEL_COLORS.MEDIUM; // 中风险
    return RISK_LEVEL_COLORS.LOW; // 低风险
  };

  const getRiskLevelText = (score: number, maxScore: number): string => {
    if (!maxScore) return '——';
    const ratio = score / maxScore;
    if (ratio >= 0.7) return '高风险';
    if (ratio >= 0.4) return '中风险';
    return '低风险';
  };

  // 渲染工作量表格
  const renderWorkloadTable = (
    workloadList: API.WorkloadRecord[],
    title: string,
  ) => {
    if (!workloadList || workloadList.length === 0) {
      return <Empty description={`暂无${title}数据`} />;
    }

    const roles = configData?.roles || [];

    const columns: any[] = [
      {
        title: '一级模块',
        dataIndex: 'module1',
        key: 'module1',
        width: 150,
      },
      {
        title: '二级模块',
        dataIndex: 'module2',
        key: 'module2',
        width: 150,
      },
      {
        title: '三级模块',
        dataIndex: 'module3',
        key: 'module3',
        width: 150,
      },
      {
        title: '功能说明',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      ...roles.map((role) => ({
        title: role.role_name,
        dataIndex: role.role_name,
        key: role.role_name,
        width: 100,
        align: 'right' as const,
        render: (val: any) => val || '—',
      })),
      {
        title: '交付系数',
        dataIndex: 'delivery_factor',
        key: 'delivery_factor',
        width: 100,
        align: 'right' as const,
        render: (val: any) => val || '1.0',
      },
      {
        title: '工作量小计',
        dataIndex: 'workload',
        key: 'workload',
        width: 120,
        align: 'right' as const,
        render: (val: any) => `${val || 0} 人天`,
      },
    ];

    return (
      <Table
        dataSource={workloadList}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
        size="small"
      />
    );
  };

  // 渲染风险项表格
  const renderRiskItemsTable = () => {
    const riskItems = assessmentData?.risk_cost_items || [];

    if (riskItems.length === 0) {
      return <Empty description="暂无风险项数据" />;
    }

    const columns = [
      {
        title: '风险内容',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '成本（万元）',
        dataIndex: 'cost',
        key: 'cost',
        width: 150,
        align: 'right' as const,
        render: (val: number) => val?.toFixed(2) || '0.00',
      },
    ];

    return (
      <Table
        dataSource={riskItems}
        columns={columns}
        rowKey={(record, index) => record.id || index}
        pagination={false}
        size="small"
      />
    );
  };

  const tabItems = [
    {
      key: '1',
      label: '基本信息',
      children: (
        <>
          <Card title="项目概览" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="报价总计"
                  value={project.final_total_cost}
                  suffix="万元"
                  precision={2}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="风险总分"
                  value={project.final_risk_score}
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="风险等级"
                  value={getRiskLevelText(project.final_risk_score, 100)}
                  valueStyle={{
                    color: getRiskLevelColor(project.final_risk_score, 100),
                    fontWeight: 'bold',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="总工作量"
                  value={project.final_workload_days}
                  suffix="人天"
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>

          <Card title="项目详情">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="项目名称" span={2}>
                {project.name}
              </Descriptions.Item>
              <Descriptions.Item label="项目描述" span={2}>
                {project.description || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="是否模板">
                {project.is_template ? (
                  <Tag color="blue">模板</Tag>
                ) : (
                  <Tag>项目</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {project.created_at
                  ? new Date(project.created_at).toLocaleString('zh-CN')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                {project.updated_at
                  ? new Date(project.updated_at).toLocaleString('zh-CN')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      ),
    },
    {
      key: '2',
      label: '风险评分',
      children: (
        <Card>
          {assessmentData?.risk_scores ? (
            <Descriptions bordered column={2}>
              {Object.entries(assessmentData.risk_scores).map(
                ([key, value]) => (
                  <Descriptions.Item label={key} key={key}>
                    {value ?? '—'}
                  </Descriptions.Item>
                ),
              )}
            </Descriptions>
          ) : (
            <Empty description="暂无风险评分数据" />
          )}
        </Card>
      ),
    },
    {
      key: '3',
      label: '新功能开发',
      children: (
        <Card>
          {renderWorkloadTable(
            assessmentData?.development_workload || [],
            '新功能开发',
          )}
        </Card>
      ),
    },
    {
      key: '4',
      label: '系统对接',
      children: (
        <Card>
          {renderWorkloadTable(
            assessmentData?.integration_workload || [],
            '系统对接',
          )}
        </Card>
      ),
    },
    {
      key: '5',
      label: '其他成本',
      children: (
        <>
          <Card title="差旅成本" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="差旅月数">
                {assessmentData?.travel_months || 0} 个月
              </Descriptions.Item>
              <Descriptions.Item label="差旅人数">
                {assessmentData?.travel_headcount || 0} 人
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="运维成本" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={3}>
              <Descriptions.Item label="运维月数">
                {assessmentData?.maintenance_months || 0} 个月
              </Descriptions.Item>
              <Descriptions.Item label="运维人数">
                {assessmentData?.maintenance_headcount || 0} 人
              </Descriptions.Item>
              <Descriptions.Item label="运维日成本">
                {assessmentData?.maintenance_daily_cost || 1600} 元
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="风险成本">{renderRiskItemsTable()}</Card>
        </>
      ),
    },
  ];

  const handleExport = (version: 'internal' | 'external') => {
    if (!project) return;
    const baseUrl = exportProjectToExcel(project.id);
    const url =
      version === 'external' ? `${baseUrl}?version=external` : baseUrl;
    window.open(url, '_blank');
  };

  return (
    <PageContainer
      header={{
        title: project.name,
        subTitle: project.is_template ? (
          <Tag color="blue">模板</Tag>
        ) : (
          <Tag>项目</Tag>
        ),
        extra: [
          <Button key="back" onClick={() => history.back()}>
            返回
          </Button>,
          <Button
            key="reassess"
            type="primary"
            onClick={() =>
              history.push(`/assessment/new?template_id=${project.id}`)
            }
          >
            重新评估
          </Button>,
          <Button
            key="export-internal"
            onClick={() => handleExport('internal')}
          >
            导出Excel（内部版）
          </Button>,
          <Button
            key="export-external"
            onClick={() => handleExport('external')}
          >
            导出Excel（对外版）
          </Button>,
        ],
      }}
    >
      {contextHolder}
      <Tabs items={tabItems} />
    </PageContainer>
  );
};

export default AssessmentDetailPage;
