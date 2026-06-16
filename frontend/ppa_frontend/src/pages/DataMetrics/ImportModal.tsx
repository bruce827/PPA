import React, { useState } from 'react';
import { Modal, Button, message, Space, Radio, Table, Alert, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

import { previewImport, confirmImport } from '@/services/dataMetrics';
import { IMPORT_MODE_OPTIONS } from './constants';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportModalProps {
  visible: boolean;
  dmProjectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ visible, dmProjectId, onClose, onSuccess }) => {
  const [file, setFile] = useState<RcFile | null>(null);
  const [mode, setMode] = useState<'append' | 'overwrite'>('append');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 预览导入
  const handlePreview = async () => {
    if (!file) {
      message.warning('请先选择文件');
      return;
    }

    setLoading(true);
    try {
      const response = await previewImport(file);
      if (response.success) {
        setPreviewData(response.data);
      } else {
        message.error('预览失败');
      }
    } catch (error: any) {
      message.error(error.message || '预览失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  };

  // 确认导入
  const handleImport = async () => {
    if (!previewData?.items) {
      message.warning('请先预览数据');
      return;
    }

    setImporting(true);
    try {
      const response = await confirmImport(dmProjectId, mode, previewData.items);
      if (response.success) {
        message.success(`成功导入 ${response.data.imported} 条数据${response.data.skipped > 0 ? `，跳过 ${response.data.skipped} 条` : ''}`);
        handleReset();
        onSuccess();
      } else {
        message.error('导入失败');
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
  };

  // 关闭弹窗
  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 文件上传前校验
  const beforeUpload = (file: RcFile) => {
    const isXlsx = file.name.endsWith('.xlsx');
    if (!isXlsx) {
      message.error('仅支持 .xlsx 格式的文件');
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB');
      return false;
    }
    setFile(file);
    return false; // 阻止自动上传
  };

  return (
    <Modal
      title="Excel导入"
      open={visible}
      onCancel={handleClose}
      width={750}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        previewData ? (
          <Button
            key="reset"
            onClick={handleReset}
          >
            重新选择
          </Button>
        ) : null,
        previewData ? (
          <Button
            key="import"
            type="primary"
            loading={importing}
            onClick={handleImport}
            disabled={previewData.validCount === 0}
          >
            确认导入 ({previewData.validCount} 条)
          </Button>
        ) : (
          <Button
            key="preview"
            type="primary"
            loading={loading}
            onClick={handlePreview}
            disabled={!file}
          >
            预览数据
          </Button>
        ),
      ].filter(Boolean)}
    >
      {/* 步骤1: 文件上传 */}
      {!previewData && (
        <>
          <Dragger
            accept=".xlsx"
            maxCount={1}
            beforeUpload={beforeUpload}
            onRemove={() => setFile(null)}
            fileList={file ? [{ uid: '-1', name: file.name, status: 'done' } as UploadFile] : []}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域</p>
            <p className="ant-upload-hint">
              支持 .xlsx 格式，最大 10MB。请使用"数据指标明细统计"模板格式。
            </p>
          </Dragger>

          <div style={{ marginTop: 16 }}>
            <Text strong>导入模式：</Text>
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ marginLeft: 16 }}
            >
              {IMPORT_MODE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </div>

          <Alert
            type="info"
            showIcon
            message="提示"
            description="Excel文件必须包含以下列：功能模块、一级场景、二级场景、指标/数据项、展示方式"
            style={{ marginTop: 16 }}
          />
        </>
      )}

      {/* 步骤2: 预览数据 */}
      {previewData && (
        <>
          <Alert
            type={previewData.errorCount > 0 ? 'warning' : 'success'}
            showIcon
            message="导入预览"
            description={
              <Space size="large">
                <span>工作表：<Text strong>{previewData.sheetName}</Text></span>
                <span>待导入：<Text strong>{previewData.totalRows}</Text> 条</span>
                <span>有效：<Text type="success">{previewData.validCount}</Text> 条</span>
                {previewData.errorCount > 0 && (
                  <span>错误：<Text type="danger">{previewData.errorCount}</Text> 条</span>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          />

          {/* 错误详情 */}
          {previewData.errorCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong type="danger">错误详情（前10条）：</Text>
              <Table
                size="small"
                pagination={false}
                dataSource={previewData.errors.slice(0, 10)}
                rowKey={(record, index) => `${record.row}-${index}`}
                columns={[
                  { title: '行号', dataIndex: 'row', width: 60, align: 'center' },
                  { title: '字段', dataIndex: 'field', width: 120 },
                  { title: '错误信息', dataIndex: 'message', ellipsis: true },
                ]}
                style={{ marginTop: 8 }}
              />
            </div>
          )}

          {/* 预览数据 */}
          {previewData.validCount > 0 && (
            <div>
              <Text strong>数据预览（前10条）：</Text>
              <Table
                size="small"
                pagination={false}
                dataSource={previewData.items.slice(0, 10)}
                rowKey={(record, index) => index?.toString() || '0'}
                columns={[
                  { title: '功能模块', dataIndex: 'module_name', width: 100, ellipsis: true },
                  { title: '一级场景', dataIndex: 'scene_l1', width: 100, ellipsis: true },
                  { title: '二级场景', dataIndex: 'scene_l2', width: 100, ellipsis: true },
                  { title: '指标名称', dataIndex: 'metric_name', width: 120, ellipsis: true },
                  { title: '展示方式', dataIndex: 'display_type', width: 80 },
                ]}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ImportModal;
