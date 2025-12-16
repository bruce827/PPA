import { getProjectList } from '@/services/projects';
import { getWeb3dProjects } from '@/services/web3d';
import {
  ProForm,
  ProFormDigit,
  ProFormList,
  ProFormText,
} from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import { App, Button, Modal, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';

type OtherCostsFormProps = {
  form: FormInstance;
  initialValues: API.AssessmentData;
  onValuesChange: (values: Partial<API.AssessmentData>) => void;
  onPrev: () => void;
  onNext: () => void;
};

type ProjectPickerRow = {
  key: string;
  id: number;
  name: string;
  project_type: string;
  final_total_cost: number;
  updated_at?: string;
};

const OtherCostsForm: React.FC<OtherCostsFormProps> = ({
  form,
  initialValues,
  onValuesChange,
  onPrev,
  onNext,
}) => {
  const { message } = App.useApp();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectPickerRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const loadProjects = async () => {
    setProjectLoading(true);
    try {
      const [stdRes, web3dRes] = await Promise.all([
        getProjectList(),
        getWeb3dProjects(),
      ]);
      const rows: ProjectPickerRow[] = [];
      (stdRes?.data || []).forEach((p) => {
        const stdType = (p as any).project_type || 'standard';
        rows.push({
          key: `std-${p.id}`,
          id: p.id,
          name: p.name,
          project_type: stdType,
          final_total_cost: Number(p.final_total_cost) || 0,
          updated_at: p.updated_at || p.created_at,
        });
      });
      (web3dRes?.data || []).forEach((p) => {
        rows.push({
          key: `w3d-${p.id}`,
          id: p.id,
          name: p.name,
          project_type: p.project_type || 'web3d',
          final_total_cost: Number(p.final_total_cost) || 0,
          updated_at: p.updated_at || p.created_at,
        });
      });
      setProjects(rows);
    } catch (err: any) {
      message.error(err?.message || '加载历史项目失败');
    } finally {
      setProjectLoading(false);
    }
  };

  const openPicker = (index: number) => {
    setActiveIndex(index);
    setSelectedKey(undefined);
    setProjectModalOpen(true);
    if (!projects.length) {
      loadProjects();
    }
  };

  const applySelectedProject = () => {
    if (activeIndex == null) {
      setProjectModalOpen(false);
      return;
    }
    const record = projects.find((p) => p.key === selectedKey);
    if (!record) {
      message.error('请选择历史项目');
      return;
    }
    const list = form.getFieldValue('risk_cost_items');
    const next = Array.isArray(list) ? [...list] : [];
    while (next.length <= activeIndex) {
      next.push({});
    }
    next[activeIndex] = {
      ...(next[activeIndex] || {}),
      description: record.name,
      cost: Number(record.final_total_cost) || 0,
    };
    form.setFieldsValue({ risk_cost_items: next });
    setProjectModalOpen(false);
  };

  const columns: ColumnsType<ProjectPickerRow> = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: '分类',
        dataIndex: 'project_type',
        render: (v) => (
          <Tag color={v === 'web3d' ? 'blue' : 'default'}>
            {v === 'web3d' ? 'Web3D项目' : '一般项目'}
          </Tag>
        ),
        width: 120,
      },
      { title: '项目名称', dataIndex: 'name' },
      {
        title: '项目成本(万元)',
        dataIndex: 'final_total_cost',
        width: 150,
        render: (v) =>
          Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '-',
      },
      { title: '更新时间', dataIndex: 'updated_at', width: 180 },
    ],
    [],
  );

  return (
    <>
      <ProForm
        form={form}
        layout="vertical"
        onValuesChange={(_, values) =>
          onValuesChange(values as Partial<API.AssessmentData>)
        }
        submitter={false}
        initialValues={{
          ...initialValues,
          risk_cost_items:
            Array.isArray(initialValues?.risk_cost_items) &&
            initialValues.risk_cost_items.length > 0
              ? initialValues.risk_cost_items
              : [{ description: '', cost: 0 }],
        }}
      >
        <ProForm.Group title="差旅与运维成本" grid rowProps={{ gutter: 16 }}>
          <ProFormDigit
            name="travel_months"
            label="差旅月数"
            colProps={{ xs: 24, sm: 12, md: 8 }}
            tooltip="预计需要出差的月份数"
          />
          <ProFormDigit
            name="travel_headcount"
            label="差旅每月人数"
            colProps={{ xs: 24, sm: 12, md: 8 }}
            tooltip="平均每月出差的人数"
          />
          <ProFormDigit
            name="maintenance_months"
            label="运维月数"
            colProps={{ xs: 24, sm: 12, md: 8 }}
          />
          <ProFormDigit
            name="maintenance_headcount"
            label="平均运维每月人数"
            colProps={{ xs: 24, sm: 12, md: 8 }}
          />
          <ProFormDigit
            name="maintenance_daily_cost"
            label="运维人员日成本 (元/天)"
            tooltip="默认1600，可根据人员成本调整"
            fieldProps={{ min: 0, step: 100 }}
            colProps={{ xs: 24, sm: 12, md: 8 }}
          />
        </ProForm.Group>
        <ProFormList
          name="risk_cost_items"
          label="风险成本"
          creatorButtonProps={{ creatorButtonText: '新增风险项' }}
          creatorRecord={{
            description: '',
            cost: 0,
          }}
          itemRender={({ listDom, action }, { index }) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 320 }}>{listDom}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => openPicker(index)}>引用项目</Button>
                {action}
              </div>
            </div>
          )}
        >
          {(meta) => (
            <ProForm.Group
              key={meta.key}
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                width: '100%',
                marginBottom: 0,
              }}
            >
              <ProFormText
                name="description"
                label="风险内容"
                rules={[{ required: true }]}
                formItemProps={{
                  style: { flex: 1, minWidth: 800, marginBottom: 0 },
                }}
              />
              <ProFormDigit
                name="cost"
                label="预估费用 (万元)"
                rules={[{ required: true, message: '请输入费用' }]}
                fieldProps={{ min: 0, style: { width: 120 } }}
                formItemProps={{ style: { marginBottom: 0 } }}
              />
            </ProForm.Group>
          )}
        </ProFormList>
      </ProForm>
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev}>上一步</Button>
          <Button type="primary" onClick={onNext}>
            下一步
          </Button>
        </Space>
      </div>

      <Modal
        title="引用历史项目"
        open={projectModalOpen}
        onOk={applySelectedProject}
        onCancel={() => setProjectModalOpen(false)}
        width={800}
        destroyOnHidden
      >
        <Table<ProjectPickerRow>
          rowKey="key"
          loading={projectLoading}
          dataSource={projects}
          columns={columns}
          pagination={{ pageSize: 5 }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedKey ? [selectedKey] : [],
            onChange: (keys) => setSelectedKey(keys[0] as string),
          }}
          size="small"
          onRow={(record) => ({
            onClick: () => setSelectedKey(record.key),
          })}
        />
      </Modal>
    </>
  );
};

export default OtherCostsForm;
