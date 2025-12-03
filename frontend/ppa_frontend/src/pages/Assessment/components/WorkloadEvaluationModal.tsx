import { RISK_LEVEL_COLORS } from '@/constants';
import { RobotOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Modal, Row, Space, Statistic, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';

interface WorkloadEvaluationModalProps {
  visible: boolean;
  record: API.WorkloadRecord | null;
  evaluationResult: any;
  roles: API.RoleConfig[];
  onApply: (workloads: Record<string, number>, factor: number) => void;
  onCancel: () => void;
}

interface RoleEvaluationData {
  role_name: string;
  suggested_workload: number;
  unit_price: number;
  estimated_cost: number;
}

const WorkloadEvaluationModal: React.FC<WorkloadEvaluationModalProps> = ({
  visible,
  record,
  evaluationResult,
  roles,
  onApply,
  onCancel,
}) => {
  // 处理应用评估结果
  const handleApplyResult = () => {
    if (!evaluationResult || !record) return;

    // 提取各角色工作量
    const workloads: Record<string, number> = {};
    roles.forEach(role => {
      workloads[role.role_name] = evaluationResult[role.role_name] || 0;
    });

    // 应用交付系数
    const factor = evaluationResult.delivery_factor || record.delivery_factor || 1.0;

    // 调用父组件的应用函数
    onApply(workloads, factor);
  };

  // 准备角色工作量表格数据
  const getRoleEvaluationData = (): RoleEvaluationData[] => {
    if (!evaluationResult) return [];

    return roles.map(role => {
      const suggestedWorkload = evaluationResult[role.role_name] || 0;
      const unitPrice = role.unit_price / 10000; // 转换为万元
      const estimatedCost = suggestedWorkload * unitPrice;

      return {
        role_name: role.role_name,
        suggested_workload: suggestedWorkload,
        unit_price: unitPrice,
        estimated_cost: estimatedCost,
      };
    });
  };

  // 计算总工作量
  const totalWorkload = getRoleEvaluationData().reduce((sum, item) => sum + item.suggested_workload, 0);

  // 计算预估总成本
  const totalCost = getRoleEvaluationData().reduce((sum, item) => sum + item.estimated_cost, 0);

  // 获取复杂度
  const complexity = evaluationResult?.complexity || (totalWorkload < 20 ? '简单' : totalWorkload < 50 ? '中等' : '复杂');

  // 表格列定义
  const columns: ColumnsType<RoleEvaluationData> = [
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role_name',
      width: 120,
    },
    {
      title: '建议工作量(天)',
      dataIndex: 'suggested_workload',
      key: 'suggested_workload',
      width: 140,
      align: 'center',
      render: (value) => (
        <span style={{ color: value > 0 ? '#1890ff' : '#999', fontWeight: value > 0 ? 500 : 400 }}>
          {value > 0 ? value.toFixed(1) : '-'}
        </span>
      ),
    },
    {
      title: '角色单价(万元/天)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 150,
      align: 'right',
      render: (value) => value.toFixed(2),
    },
    {
      title: '预估成本(万元)',
      dataIndex: 'estimated_cost',
      key: 'estimated_cost',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ color: record.suggested_workload > 0 ? '#52c41a' : '#999', fontWeight: 500 }}>
          {record.suggested_workload > 0 ? value.toFixed(2) : '-'}
        </span>
      ),
    },
  ];

  if (!visible || !record) return null;

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          AI工作量评估结果
        </Space>
      }
      open={visible}
      onOk={handleApplyResult}
      onCancel={onCancel}
      width={800}
      okText="应用评估结果"
      cancelText="取消"
      okButtonProps={{ type: 'primary' }}
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 模块信息卡片 */}
          <Card title="📦 模块信息" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item
                label="一级模块"
                span={1}
                labelStyle={{ width: 96, fontWeight: 600 }}
              >
                {record.module1}
              </Descriptions.Item>
              <Descriptions.Item
                label="二级模块"
                span={1}
                labelStyle={{ width: 96, fontWeight: 600 }}
              >
                {record.module2}
              </Descriptions.Item>
              <Descriptions.Item
                label="三级模块"
                span={1}
                labelStyle={{ width: 96, fontWeight: 600 }}
              >
                {record.module3}
              </Descriptions.Item>
              <Descriptions.Item
                label="功能描述"
                span={1}
                labelStyle={{ width: 96, fontWeight: 600 }}
              >
                {record.description}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 各角色工作量建议表格 */}
          <Card title="👥 各角色工作量建议" size="small">
            <Table
              columns={columns}
              dataSource={getRoleEvaluationData()}
              pagination={false}
              size="small"
              rowKey="role_name"
            />
          </Card>

          {/* 成本预估统计 */}
          <Card title="💰 成本预估" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总工作量"
                  value={totalWorkload}
                  suffix="人/天"
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="预估总成本"
                  value={totalCost}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="平均复杂度"
                  value={complexity}
                  valueStyle={{
                    color:
                      complexity === '复杂'
                        ? RISK_LEVEL_COLORS.HIGH
                        : complexity === '中等'
                          ? RISK_LEVEL_COLORS.MEDIUM
                          : RISK_LEVEL_COLORS.LOW,
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* AI评估说明 */}
          <Card title="🤖 AI评估说明" size="small">
            <div style={{ color: '#666', fontSize: '13px', lineHeight: '1.5' }}>
              <p>• <strong>评估置信度：</strong>{evaluationResult?.confidence ? `${(evaluationResult.confidence * 100).toFixed(1)}%` : '85%'}</p>
              <p>• <strong>建议依据：</strong>基于模块复杂度、技术难度和功能范围进行AI智能分析</p>
              <p>• <strong>注意事项：</strong>评估结果仅供参考，实际工作量可能因团队技能、项目经验等因素有所调整</p>
            </div>
          </Card>
        </Space>
      </div>
    </Modal>
  );
};

export default WorkloadEvaluationModal;
