import { getMonitoringLogs, getMonitoringStats } from '@/services/monitoring';
import {
  ActionType,
  PageContainer,
  ProColumns,
  ProFormInstance,
  ProTable,
} from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { App, Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

const AiLogs = () => {
  const { message } = App.useApp();

  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const desiredStatsKeyRef = useRef<string>('');
  const lastSuccessStatsKeyRef = useRef<string>('');
  const currentQueryRef = useRef<Record<string, any>>({});
  const currentPageRef = useRef<number>(1);
  const lastSubscribedKeyRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRetryRef = useRef<number>(0);
  const wsStoppedRef = useRef<boolean>(false);
  const wsSeenHashesRef = useRef<string[]>([]);

  const [stats, setStats] = useState<API.MonitoringStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'disabled'>(
    'connecting',
  );
  const [wsInjectedRows, setWsInjectedRows] = useState<API.MonitoringLogItem[]>([]);
  const [highlightMap, setHighlightMap] = useState<Record<string, number>>({});

  const stepEnum = useMemo(
    () => ({
      risk: { text: 'risk' },
      'risk-normalize': { text: 'risk-normalize' },
      modules: { text: 'modules' },
      workload: { text: 'workload' },
      'model-test': { text: 'model-test' },
    }),
    [],
  );

  const statusEnum = useMemo(
    () => ({
      success: { text: 'success' },
      fail: { text: 'fail' },
      timeout: { text: 'timeout' },
    }),
    [],
  );

  const formatDuration = (value: any) => {
    const ms = Number(value);
    if (!Number.isFinite(ms)) return '-';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatHash = (hash?: string | null) => {
    const v = String(hash || '');
    if (!v) return '-';
    if (v.length <= 18) return v;
    return `${v.slice(0, 10)}...${v.slice(-6)}`;
  };

  const buildStableKey = (obj: Record<string, any>) => {
    const keys = Object.keys(obj || {}).sort();
    const picked: Record<string, any> = {};
    keys.forEach((k) => {
      picked[k] = obj[k];
    });
    return JSON.stringify(picked);
  };

  const highlightRow = (hash: string) => {
    if (!hash) return;
    const expiresAt = Date.now() + 3000;
    setHighlightMap((prev) => ({ ...prev, [hash]: expiresAt }));
    setTimeout(() => {
      setHighlightMap((prev) => {
        if (!prev[hash]) return prev;
        const next = { ...prev };
        delete next[hash];
        return next;
      });
    }, 3100);
  };

  const getSubscribeSteps = () => {
    const q = currentQueryRef.current || {};
    const steps = Array.isArray(q.steps) ? q.steps.map((s: any) => String(s)).filter(Boolean) : [];
    if (steps.length > 0) return steps;
    return Object.keys(stepEnum);
  };

  const sendSubscribe = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const steps = getSubscribeSteps();
    const key = JSON.stringify([...steps].sort());
    if (key === lastSubscribedKeyRef.current) return;
    lastSubscribedKeyRef.current = key;
    try {
      ws.send(JSON.stringify({ type: 'subscribe', steps }));
    } catch (e) {}
  };

  const markSeen = (hash: string) => {
    if (!hash) return false;
    const arr = wsSeenHashesRef.current;
    if (arr.includes(hash)) return true;
    arr.unshift(hash);
    if (arr.length > 500) arr.length = 500;
    return false;
  };

  const columns: ProColumns<API.MonitoringLogItem>[] = [
    {
      title: '时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '时间',
      dataIndex: 'created_at_range',
      valueType: 'dateRange',
      hideInTable: true,
      fieldProps: {
        format: 'YYYY-MM-DD',
      },
      search: {
        transform: (value) => {
          const [start, end] = Array.isArray(value) ? value : [];
          const next: Record<string, any> = {};
          if (typeof start !== 'undefined') next.startDate = start;
          if (typeof end !== 'undefined') next.endDate = end;
          return next;
        },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      hideInSearch: true,
      render: (_, record) => {
        const v = record.status;
        const color = v === 'success' ? 'green' : v === 'timeout' ? 'orange' : 'red';
        return <Tag color={color}>{String(v)}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'statuses',
      valueType: 'select',
      valueEnum: statusEnum,
      hideInTable: true,
      fieldProps: {
        mode: 'multiple',
        allowClear: true,
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration_ms',
      width: 110,
      align: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const ms = Number(record.duration_ms);
        const isHigh = Number.isFinite(ms) && ms >= 10000;
        return (
          <Typography.Text style={isHigh ? { color: '#cf1322' } : undefined}>
            {formatDuration(record.duration_ms)}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Step',
      dataIndex: 'step',
      width: 120,
      hideInSearch: true,
      render: (_, record) => (record.step ? String(record.step) : '-'),
    },
    {
      title: 'Step',
      dataIndex: 'steps',
      valueType: 'select',
      valueEnum: stepEnum,
      hideInTable: true,
      fieldProps: {
        mode: 'multiple',
        allowClear: true,
      },
    },
    {
      title: '模型',
      dataIndex: 'model_used',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      responsive: ['md'],
      render: (_, record) => (record.model_used ? String(record.model_used) : '-'),
    },
    {
      title: '模型',
      dataIndex: 'models',
      valueType: 'select',
      hideInTable: true,
      fieldProps: {
        mode: 'tags',
        tokenSeparators: [','],
        allowClear: true,
        placeholder: '输入模型名，回车确认，可多个',
      },
    },
    {
      title: 'PromptId',
      dataIndex: 'prompt_id',
      width: 100,
      hideInSearch: true,
      render: (_, record) => (record.prompt_id ? String(record.prompt_id) : '-'),
    },
    {
      title: 'PromptId',
      dataIndex: 'promptId',
      hideInTable: true,
    },
    {
      title: 'Route',
      dataIndex: 'route',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      responsive: ['lg'],
      render: (_, record) => (record.route ? String(record.route) : '-'),
    },
    {
      title: 'Hash',
      dataIndex: 'request_hash',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (
        <Typography.Text
          ellipsis
          copyable={{ text: String(record.request_hash || '') }}
          style={{ maxWidth: 150 }}
        >
          {formatHash(record.request_hash)}
        </Typography.Text>
      ),
    },
    {
      title: 'Hash',
      dataIndex: 'searchHash',
      hideInTable: true,
      fieldProps: {
        placeholder: '支持部分匹配',
      },
    },
    {
      title: '错误',
      dataIndex: 'error_message',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (record.error_message ? String(record.error_message) : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => [
        <Link key="detail" to={`/monitoring/ai-logs/${record.request_hash}`}>
          详情
        </Link>,
      ],
    },
  ];

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    wsStoppedRef.current = false;

    const connect = () => {
      if (wsStoppedRef.current) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      setWsStatus('connecting');
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${window.location.host}/api/monitoring/ws`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        setWsStatus('disabled');
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        wsRetryRef.current = 0;
        setWsStatus('connected');
        sendSubscribe();
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data || ''));
          if (msg?.type !== 'ai_log_created') return;
          const row = msg?.data as API.MonitoringLogItem;
          const hash = String(row?.request_hash || '');
          if (!hash) return;
          if (markSeen(hash)) return;

          setWsInjectedRows((prev) => {
            const next = [row, ...(prev || [])].filter((x) => x && x.request_hash);
            const seen = new Set<string>();
            const deduped: API.MonitoringLogItem[] = [];
            for (const r of next) {
              const h = String(r.request_hash);
              if (seen.has(h)) continue;
              seen.add(h);
              deduped.push(r);
              if (deduped.length >= 50) break;
            }
            return deduped;
          });
          highlightRow(hash);

          if (currentPageRef.current === 1) {
            actionRef.current?.reload?.();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (wsStoppedRef.current) return;
        setWsStatus('disconnected');

        const retry = wsRetryRef.current + 1;
        wsRetryRef.current = retry;

        if (retry >= 10) {
          setWsStatus('disabled');
          message.warning('WS 连接失败次数过多，已降级为手动刷新');
          return;
        }

        const delay = Math.min(30000, 500 * Math.pow(2, retry));
        if (wsReconnectTimerRef.current) {
          clearTimeout(wsReconnectTimerRef.current);
        }
        wsReconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (e) {}
      };
    };

    connect();
    return () => {
      wsStoppedRef.current = true;
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <PageContainer header={{ title: 'AI日志监控' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card loading={statsLoading}>
              <Statistic title="调用次数" value={stats?.totalCalls ?? 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="成功率"
                value={Number(stats?.successRate ?? 0)}
                precision={2}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="平均耗时"
                value={formatDuration(stats?.avgDuration ?? 0)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="错误（timeout/parse/network/other）"
                value={`${stats?.errorDistribution?.timeout ?? 0}/${stats?.errorDistribution?.parse ?? 0}/${stats?.errorDistribution?.network ?? 0}/${stats?.errorDistribution?.other ?? 0}`}
              />
            </Card>
          </Col>
        </Row>

        <ProTable<API.MonitoringLogItem>
          actionRef={actionRef}
          formRef={formRef}
          cardBordered
          rowKey="id"
          columns={columns}
          tableLayout="fixed"
          headerTitle="日志列表"
          dateFormatter="string"
          onRow={(record) => {
            const exp = highlightMap[String(record.request_hash || '')];
            if (exp && exp > Date.now()) {
              return { style: { background: '#fffbe6' } };
            }
            return {};
          }}
          search={{
            labelWidth: 'auto',
            optionRender: () => [],
          }}
          toolBarRender={() => [
            <Tag
              key="ws"
              color={
                wsStatus === 'connected'
                  ? 'green'
                  : wsStatus === 'connecting'
                    ? 'blue'
                    : wsStatus === 'disconnected'
                      ? 'orange'
                      : 'default'
              }
            >
              WS: {wsStatus}
            </Tag>,
            currentPageRef.current !== 1 && wsInjectedRows.length > 0 ? (
              <Button
                key="new"
                onClick={() => {
                  actionRef.current?.reloadAndRest?.();
                }}
              >
                查看新日志（{wsInjectedRows.length}）
              </Button>
            ) : null,
            <Button
              key="reset"
              onClick={() => {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = null;
                }
                desiredStatsKeyRef.current = '';
                lastSuccessStatsKeyRef.current = '';
                setStats(null);
                setWsInjectedRows([]);
                setHighlightMap({});
                formRef.current?.resetFields();
                actionRef.current?.reloadAndRest?.();
                sendSubscribe();
              }}
            >
              重置
            </Button>,
            <Button
              key="refresh"
              type="primary"
              onClick={() => {
                lastSuccessStatsKeyRef.current = '';
                actionRef.current?.reload();
                sendSubscribe();
              }}
            >
              刷新
            </Button>,
          ]}
          postData={(rows) => {
            if (!Array.isArray(rows)) return rows as any;
            if (currentPageRef.current !== 1) return rows;
            if (!wsInjectedRows || wsInjectedRows.length === 0) return rows;
            const merged = [...wsInjectedRows, ...rows];
            const seen = new Set<string>();
            const out: API.MonitoringLogItem[] = [];
            for (const r of merged) {
              const h = String(r?.request_hash || '');
              if (!h) continue;
              if (seen.has(h)) continue;
              seen.add(h);
              out.push(r);
              if (out.length >= rows.length) break;
            }
            return out;
          }}
          form={{
            onValuesChange: () => {
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                actionRef.current?.reloadAndRest?.();
              }, 500);
            },
          }}
          request={async (params) => {
            const page = Number(params.current || 1);
            const pageSize = Number(params.pageSize || 20);

            const queryParams = { ...params } as Record<string, any>;
            delete queryParams.current;
            delete queryParams.pageSize;

            currentQueryRef.current = queryParams;
            currentPageRef.current = page;
            sendSubscribe();

            const statsKey = buildStableKey(queryParams);
            desiredStatsKeyRef.current = statsKey;
            const shouldFetchStats =
              !stats ||
              statsKey !== lastSuccessStatsKeyRef.current ||
              lastSuccessStatsKeyRef.current === '';

            if (shouldFetchStats) {
              setStatsLoading(true);
            }

            try {
              const logsPromise = getMonitoringLogs({ page, pageSize, ...queryParams });
              const statsPromise = shouldFetchStats
                ? getMonitoringStats(queryParams)
                : Promise.resolve(null as any);

              const [logsRes, statsRes] = await Promise.all([logsPromise, statsPromise]);

              if (shouldFetchStats && statsRes) {
                if (desiredStatsKeyRef.current === statsKey) {
                  if (statsRes?.success) {
                    setStats(statsRes.data);
                    lastSuccessStatsKeyRef.current = statsKey;
                  } else {
                    setStats(null);
                    message.error(statsRes?.error || '加载统计失败');
                  }
                }
              }

              if (!logsRes?.success) {
                message.error(logsRes?.error || '加载日志列表失败');
                return {
                  data: [],
                  success: false,
                  total: 0,
                };
              }

              if (page === 1 && wsInjectedRows.length > 0) {
                const hashes = new Set<string>(
                  (logsRes.data.list || []).map((x) => String(x?.request_hash || '')).filter(Boolean),
                );
                setWsInjectedRows((prev) => (prev || []).filter((r) => !hashes.has(String(r.request_hash || ''))));
              }

              return {
                data: logsRes.data.list,
                success: true,
                total: logsRes.data.total,
              };
            } catch (_e) {
              message.error('加载日志列表失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            } finally {
              if (shouldFetchStats && desiredStatsKeyRef.current === statsKey) {
                setStatsLoading(false);
              }
            }
          }}
          locale={{
            emptyText: '暂无数据',
          }}
          pagination={{
            pageSize: 20,
          }}
        />
      </Space>
    </PageContainer>
  );
};

export default AiLogs;
