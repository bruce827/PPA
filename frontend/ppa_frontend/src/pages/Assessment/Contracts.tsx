import { listContractFiles, readContractFile } from '@/services/contracts';
import { PageContainer } from '@ant-design/pro-components';
import { App, Card, Empty, Input, Space, Spin, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_ROWS_DEFAULT = 5000;

const ContractsPage = () => {
  const { message } = App.useApp();

  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<{ name: string }[]>([]);
  const [activeFile, setActiveFile] = useState<string | undefined>(undefined);

  const lastSearchRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [meta, setMeta] = useState<any>(null);

  const loadFiles = async () => {
    try {
      setFilesLoading(true);
      const res = await listContractFiles();
      if (!res?.success) {
        throw new Error(res?.error || '加载文件列表失败');
      }
      const nextFiles = Array.isArray(res?.data?.files) ? res.data.files : [];
      setFiles(nextFiles);
      if (!activeFile && nextFiles.length > 0) {
        setActiveFile(nextFiles[0].name);
      }
    } catch (e: any) {
      setFiles([]);
      message.error(e?.message || '加载文件列表失败');
    } finally {
      setFilesLoading(false);
    }
  };

  const loadFileData = async (fileName?: string, keyword?: string) => {
    if (!fileName) return;
    try {
      setLoading(true);
      const res = await readContractFile({
        name: fileName,
        search: keyword ? keyword.trim() : undefined,
        maxRows: MAX_ROWS_DEFAULT,
      });
      if (!res?.success) {
        throw new Error(res?.error || '读取文件失败');
      }
      setColumns(Array.isArray(res.data?.columns) ? res.data.columns : []);
      setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
      setMeta(res.data?.meta || null);
    } catch (e: any) {
      setColumns([]);
      setRows([]);
      setMeta(null);
      message.error(e?.message || '读取文件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (activeFile) {
      loadFileData(activeFile, lastSearchRef.current);
    }
  }, [activeFile]);

  const tableColumns: ColumnsType<Record<string, string>> = useMemo(() => {
    return (columns || []).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      width: 180,
      ellipsis: { showTitle: true },
      render: (val: any) => {
        if (val === null || val === undefined) return '—';
        const s = String(val);
        return s ? s : '—';
      },
    }));
  }, [columns]);

  const tabItems = files.map((f) => ({
    key: f.name,
    label: f.name,
  }));

  return (
    <PageContainer>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Input.Search
                placeholder="搜索（对当前文件所有字段生效）"
                allowClear
                onSearch={(v) => {
                  const keyword = String(v || '').trim();
                  lastSearchRef.current = keyword;
                  loadFileData(activeFile, keyword);
                }}
                style={{ width: 360 }}
              />
              <Tag color="blue">上限 {MAX_ROWS_DEFAULT} 行</Tag>
              {meta?.truncated ? <Tag color="orange">超过上限，仅展示前 {MAX_ROWS_DEFAULT} 行</Tag> : null}
            </Space>
            <Space>
              <Tag color="default">文件数 {files.length}</Tag>
              <Tag color="default">当前展示 {meta?.returned_rows ?? rows.length} 行</Tag>
            </Space>
          </Space>

          {filesLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : files.length === 0 ? (
            <Empty description="未发现 contracts CSV 文件" />
          ) : (
            <Tabs
              activeKey={activeFile}
              items={tabItems}
              onChange={(key) => {
                setActiveFile(key);
              }}
            />
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : rows.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <Table
              size="small"
              virtual
              tableLayout="fixed"
              rowKey={(_, idx) => String(idx)}
              dataSource={rows}
              columns={tableColumns}
              pagination={false}
              scroll={{ x: Math.max(1200, (columns?.length || 0) * 180), y: 560 }}
            />
          )}
        </Space>
      </Card>
    </PageContainer>
  );
};

export default ContractsPage;
