import { getWeb3dProjectDetail } from '@/services/web3d';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { App, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

const DetailWeb3D: React.FC = () => {
  const { id } = useParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<API_WEB3D.Project | null>(null);
  const [assessment, setAssessment] = useState<API_WEB3D.Assessment | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getWeb3dProjectDetail(id);
      setProject(res?.data || null);
      if (res?.data?.assessment_details_json) {
        try {
          const parsed = JSON.parse(res.data.assessment_details_json);
          setAssessment(parsed);
        } catch (_e) {
          setAssessment(null);
        }
      }
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <PageContainer
      loading={loading}
      title="Web3D 项目详情"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          {id && (
            <Button
              icon={<ExportOutlined />}
              onClick={() => window.open(`/api/web3d/projects/${id}/export`, '_blank')}
            >
              导出
            </Button>
          )}
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="项目信息">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="名称">{project?.name}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color="blue">{project?.project_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总成本(万元)">
                {project?.final_total_cost}
              </Descriptions.Item>
              <Descriptions.Item label="风险总分">
                {project?.final_risk_score}
              </Descriptions.Item>
              <Descriptions.Item label="工作量(人天)">
                {project?.final_workload_days}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {project?.created_at}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph style={{ marginTop: 12 }}>
              {project?.description || '无描述'}
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DetailWeb3D;
