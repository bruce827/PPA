/**
 * LoadDraftModal 组件
 * 显示历史草稿列表，允许用户选择并加载草稿
 */

import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Tag, Space, Tooltip, Alert, App, Checkbox } from 'antd';
import { ClockCircleOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { AssessmentCacheRecord } from '@/types/cache';
import { useAssessmentCache } from '@/hooks/useAssessmentCache';

interface LoadDraftModalProps {
  /** 是否可见 */
  visible: boolean;

  /** 关闭回调 */
  onClose: () => void;

  /** 加载草稿回调 */
  onLoadDraft: (sessionId: string) => void;
}

/**
 * 格式化时间显示
 */
function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  }

  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }

  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}天前`;
  }

  // 大于7天，显示具体日期
  return date.toLocaleString('zh-CN');
}

/**
 * 获取步骤标签
 */
function getStepLabel(step: number): string {
  const steps = ['风险评分', '工作量估算', '其他成本', '生成总览'];
  return steps[step] || `未知步骤(${step})`;
}

/**
 * 统计模块数量
 */
function countModules(data: AssessmentCacheRecord['data']): number {
  const devCount = data.development_workload?.length || 0;
  const integrationCount = data.integration_workload?.length || 0;
  return devCount + integrationCount;
}

/**
 * LoadDraftModal 组件
 */
export const LoadDraftModal: React.FC<LoadDraftModalProps> = ({
  visible,
  onClose,
  onLoadDraft,
}) => {
  const { message, modal } = App.useApp();
  const cache = useAssessmentCache();
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<AssessmentCacheRecord[]>([]);
  const [showAutoSave, setShowAutoSave] = useState(false);

  // 加载草稿列表
  const loadDrafts = async () => {
    setLoading(true);
    try {
      // 获取所有记录（手动 + 自动）
      const allRecords = await cache.getAll();

      // 过滤和排序
      const sortedDrafts = allRecords
        .filter(record => showAutoSave || record.metadata.isManualSave)  // 根据开关过滤
        .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)  // 按时间倒序
        .slice(0, 50);  // 最多显示50条

      setDrafts(sortedDrafts);
    } catch (error) {
      console.error('加载草稿列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开时加载列表
  useEffect(() => {
    if (visible) {
      loadDrafts();
    }
  }, [visible]);

  // 处理加载草稿 - 直接加载，不二次确认（避免浏览器拦截）
  const handleLoad = (record: AssessmentCacheRecord) => {
    // 直接调用 onLoadDraft（在父组件中实现 window.open）
    onLoadDraft(record.sessionId);
    onClose();
    message.success('正在新标签页中打开草稿...');
  };

  // 处理删除草稿
  const handleDelete = async (record: AssessmentCacheRecord) => {
    modal.confirm({
      title: '确认删除草稿',
      content: '删除后无法恢复，是否继续？',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await cache.deleteSession(record.sessionId);
          message.success('草稿已删除');
          loadDrafts(); // 重新加载列表
        } catch (error) {
          console.error('删除草稿失败:', error);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  // 列定义
  const columns = [
    {
      title: '保存时间',
      dataIndex: ['metadata', 'updatedAt'],
      key: 'updatedAt',
      width: 180,
      render: (value: number) => (
        <Space>
          <ClockCircleOutlined />
          <Tooltip title={new Date(value).toLocaleString('zh-CN')}>
            {formatRelativeTime(value)}
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '步骤',
      dataIndex: 'currentStep',
      key: 'currentStep',
      width: 120,
      render: (step: number) => (
        <Tag color="blue">{getStepLabel(step)}</Tag>
      ),
    },
    {
      title: '模块数量',
      key: 'modules',
      width: 100,
      render: (_: any, record: AssessmentCacheRecord) => (
        <Space>
          <FolderOpenOutlined />
          <span>{countModules(record.data)}个</span>
        </Space>
      ),
    },
    {
      title: '风险项',
      key: 'risks',
      width: 100,
      render: (_: any, record: AssessmentCacheRecord) => {
        const riskCount = Object.keys(record.data.risk_scores || {}).length;
        const customRiskCount = record.data.custom_risk_items?.length || 0;
        return (
          <Tooltip title={`已评分风险项：${riskCount}个${customRiskCount > 0 ? `，自定义风险：${customRiskCount}个` : ''}`}>
            <Tag color={riskCount > 0 ? 'green' : 'default'}>
              {riskCount + customRiskCount}个
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '保存类型',
      dataIndex: ['metadata', 'isManualSave'],
      key: 'isManualSave',
      width: 90,
      render: (isManual: boolean) => (
        <Tag color={isManual ? 'green' : 'orange'}>
          {isManual ? '手动保存' : '自动保存'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: AssessmentCacheRecord) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleLoad(record)}
          >
            加载
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="选择要加载的草稿"
      open={visible}
      onCancel={onClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Checkbox
            checked={showAutoSave}
            onChange={(e) => setShowAutoSave(e.target.checked)}
          >
            显示自动保存的草稿（最近7天）
          </Checkbox>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
      width={900}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: 24 }}>
        <Alert
          message="提示"
          description={
            showAutoSave
              ? '显示所有草稿（包括自动保存的）。自动保存的数据保留7天，手动保存的保留30天。'
              : '只显示手动保存的草稿。自动保存的草稿不会出现在此列表中。'
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          loading={loading}
          dataSource={drafts}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: showAutoSave
              ? '暂无草稿记录'
              : '暂无手动保存的草稿，点击"保存草稿"按钮可以保存当前进度',
          }}
        />
      </div>
    </Modal>
  );
};