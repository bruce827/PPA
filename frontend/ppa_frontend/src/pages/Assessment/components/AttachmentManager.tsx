import {
  checkAttachments,
  deleteAttachment,
  getAttachmentDownloadUrl,
  listAttachments,
  uploadAttachment,
} from '@/services/assessment/pushApi';
import {
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Button, Card, message, Modal, Space, Table, Tag, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useCallback, useEffect, useState } from 'react';

const { Dragger } = Upload;

interface AttachmentRecord {
  filename: string;
  originalname: string;
  size: number;
  uploadedAt: string;
}

interface AttachmentManagerProps {
  projectId: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function AttachmentManager({ projectId }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasAttachments, setHasAttachments] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [listRes, checkRes] = await Promise.all([
        listAttachments(projectId),
        checkAttachments(projectId),
      ]);
      if (listRes?.success && Array.isArray(listRes.data)) {
        setAttachments(listRes.data);
      }
      if (checkRes?.success) {
        setHasAttachments(checkRes.data.hasAttachments);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleDelete = (record: AttachmentRecord) => {
    const displayName = record.originalname || record.filename;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除附件「${displayName}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteAttachment(projectId, record.filename);
          if (res?.success) {
            message.success('附件已删除');
            loadAttachments();
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDownload = (record: AttachmentRecord) => {
    const url = getAttachmentDownloadUrl(projectId, record.filename);
    window.open(url, '_blank');
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      setUploading(true);
      try {
        const res = await uploadAttachment(projectId, file as File);
        if (res?.success) {
          message.success(`文件 ${res.data.originalname} 上传成功`);
          onSuccess?.(res);
          loadAttachments();
        }
      } catch (e: any) {
        const errMsg = e?.message || e?.response?.data?.error || '上传失败';
        message.error(errMsg);
        onError?.(e);
      } finally {
        setUploading(false);
      }
    },
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'originalname',
      key: 'filename',
      ellipsis: true,
      render: (_: string, record: AttachmentRecord) => (
        <Space>
          <FileOutlined />
          <span>{record.originalname || record.filename}</span>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (val: number) => formatFileSize(val),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 200,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: AttachmentRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>附件管理</span>
          {hasAttachments && <Tag color="green">已上传</Tag>}
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Dragger {...uploadProps} disabled={uploading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持多文件上传，单个文件不超过 20MB，项目附件总大小不超过 30MB
          </p>
        </Dragger>

        <Table
          dataSource={attachments}
          columns={columns}
          rowKey="filename"
          loading={loading}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无附件' }}
        />
      </Space>
    </Card>
  );
}
