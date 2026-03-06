import { getMonitoringLogDetail } from '@/services/monitoring';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const escapeHtml = (raw: string) => {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const highlightJson = (raw: string) => {
  const escaped = escapeHtml(raw);
  const re =
    /(\x22(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\x22])*\x22\s*:)|(\x22(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\x22])*\x22)|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  return escaped.replace(re, (m) => {
    let color = '#096dd9';
    if (/^\s*\x22/.test(m)) {
      color = /:\s*$/.test(m) ? '#0050b3' : '#237804';
    } else if (/true|false/.test(m)) {
      color = '#722ed1';
    } else if (/null/.test(m)) {
      color = '#8c8c8c';
    } else {
      color = '#d46b08';
    }
    return `<span style='color:${color}'>${m}</span>`;
  });
};

const ExpandablePre = ({
  text,
  highlight,
}: {
  text: string;
  highlight?: 'json';
}) => {
  const [expanded, setExpanded] = useState(false);
  const tooLong = text.length > 1000;
  const shown = !tooLong || expanded ? text : `${text.slice(0, 1000)}...`;
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Typography.Paragraph copyable={{ text }} style={{ marginBottom: 0 }}>
        {highlight === 'json' ? (
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
            dangerouslySetInnerHTML={{ __html: highlightJson(shown) }}
          />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {shown}
          </pre>
        )}
      </Typography.Paragraph>
      {tooLong && (
        <Button type="link" style={{ padding: 0 }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '收起' : '展开'}
        </Button>
      )}
    </Space>
  );
};

const HighlightedText = ({ text, keyword }: { text: string; keyword: string }) => {
  const k = keyword.trim();
  if (!k) {
    return <>{text}</>;
  }
  const lower = text.toLowerCase();
  const lk = k.toLowerCase();
  const parts: Array<{ t: string; hit: boolean }> = [];
  let i = 0;
  while (true) {
    const idx = lower.indexOf(lk, i);
    if (idx < 0) {
      parts.push({ t: text.slice(i), hit: false });
      break;
    }
    parts.push({ t: text.slice(i, idx), hit: false });
    parts.push({ t: text.slice(idx, idx + k.length), hit: true });
    i = idx + k.length;
  }
  return (
    <>
      {parts
        .filter((p) => p.t)
        .map((p, idx) =>
          p.hit ? (
            <mark key={idx} style={{ background: '#ffe58f', padding: 0 }}>
              {p.t}
            </mark>
          ) : (
            <span key={idx}>{p.t}</span>
          ),
        )}
    </>
  );
};

const AiLogDetail = () => {
  const { message } = App.useApp();
  const params = useParams<{ requestHash: string }>();
  const requestHash = String(params.requestHash || '').trim();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<API.MonitoringLogDetailData | null>(null);
  const [rawSearch, setRawSearch] = useState('');

  const formatDuration = (value: any) => {
    const ms = Number(value);
    if (!Number.isFinite(ms)) return '-';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const statusTag = (status?: string | null) => {
    const v = String(status || '');
    if (!v) return <Tag>-</Tag>;
    const color = v === 'success' ? 'green' : v === 'timeout' ? 'orange' : 'red';
    return <Tag color={color}>{v}</Tag>;
  };

  const buildErrorAdvice = (meta: API.MonitoringLogDetailMeta | null) => {
    const status = String(meta?.status || '').toLowerCase();
    const err = String(meta?.errorMessage || '').toLowerCase();

    if (!status || status === 'success') return null;

    if (status === 'timeout') {
      return {
        title: '调用超时',
        tips: ['检查模型服务是否可用/响应慢', '适当增大 timeout', '减少输入文本长度或拆分请求'],
      };
    }

    if (err.includes('json') || err.includes('parse') || err.includes('解析')) {
      return {
        title: '响应解析失败',
        tips: ['检查提示词是否要求严格 JSON 输出', '尝试在提示词中增加 JSON schema/示例', '查看“原始响应”确认模型实际输出'],
      };
    }

    if (err.includes('econn') || err.includes('enotfound') || err.includes('etimedout') || err.includes('network') || err.includes('连接')) {
      return {
        title: '网络/连接异常',
        tips: ['检查 API Host/网络连通性', '确认代理或防火墙设置', '重试或切换模型提供商'],
      };
    }

    return {
      title: '调用失败',
      tips: ['查看错误信息与“原始响应”', '确认提示词与输入参数是否合理', '必要时重试'],
    };
  };

  useEffect(() => {
    if (!requestHash) return;
    setLoading(true);
    getMonitoringLogDetail(requestHash)
      .then((res) => {
        if (!res?.success) {
          message.error(res?.error || '加载详情失败');
          setData(null);
          return;
        }
        setData(res.data);
      })
      .catch(() => {
        message.error('加载详情失败');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [message, requestHash]);

  const meta = data?.meta || null;
  const indexAny: any = data?.index || null;

  const statusDisplay = (meta?.status || indexAny?.status) ?? null;
  const durationMsDisplay =
    (typeof meta?.durationMs === 'number' ? meta.durationMs : undefined) ??
    (Number.isFinite(Number(indexAny?.duration_ms)) ? Number(indexAny?.duration_ms) : null);
  const stepDisplay = (meta?.step || indexAny?.step) ?? null;
  const routeDisplay = (meta?.route || indexAny?.route) ?? null;
  const createdAtDisplay = (meta?.createdAt || indexAny?.timestamp) ?? null;

  const modelDisplay = (() => {
    if (meta?.modelUsed) return String(meta.modelUsed);
    const provider = indexAny?.model_provider ? String(indexAny.model_provider) : '';
    const name = indexAny?.model_name ? String(indexAny.model_name) : '';
    const joined = [provider, name].filter(Boolean).join('/');
    return joined || null;
  })();

  const promptIdDisplay = (() => {
    if (meta?.promptId) return String(meta.promptId);
    if (indexAny?.prompt_template_id) return String(indexAny.prompt_template_id);
    if (indexAny?.prompt_id) return String(indexAny.prompt_id);
    return null;
  })();

  const timeoutMsDisplay = (() => {
    const candidates = [
      indexAny?.service_timeout_ms,
      indexAny?.provider_timeout_ms,
      indexAny?.timeout_ms,
    ];
    const v = candidates.map((x) => Number(x)).find((x) => Number.isFinite(x));
    return typeof v === 'number' ? String(Math.round(v)) : null;
  })();

  const errorMessageDisplay = useMemo(() => {
    if (meta?.errorMessage) return String(meta.errorMessage);
    if (typeof data?.notes !== 'string') return null;
    const firstLine = data.notes.split('\n').find((s) => String(s || '').trim());
    return firstLine ? String(firstLine) : null;
  }, [data?.notes, meta?.errorMessage]);

  const errorAdvice = useMemo(() => {
    const merged: any = {
      ...(meta || {}),
      status: statusDisplay,
      errorMessage: meta?.errorMessage || errorMessageDisplay,
    };
    return buildErrorAdvice(merged);
  }, [errorMessageDisplay, meta, meta?.errorMessage, statusDisplay]);

  const stringifyPretty = (value: any) => {
    if (value === null || typeof value === 'undefined') return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch (_e) {
      return String(value);
    }
  };

  return (
    <PageContainer
      header={{ title: '日志详情', subTitle: params.requestHash || '' }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {!requestHash && (
          <Alert type="error" showIcon message="requestHash 为空" />
        )}

        <Card>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="时间">
                {createdAtDisplay ? String(createdAtDisplay) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {statusTag(statusDisplay)}
              </Descriptions.Item>
              <Descriptions.Item label="耗时">
                {formatDuration(durationMsDisplay)}
              </Descriptions.Item>
              <Descriptions.Item label="Timeout(ms)">
                {timeoutMsDisplay ? String(timeoutMsDisplay) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Step">
                {stepDisplay ? String(stepDisplay) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Route">
                {routeDisplay ? String(routeDisplay) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="模型">
                {modelDisplay ? String(modelDisplay) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Prompt">
                {promptIdDisplay ? (
                  <Link to={`/model-config/prompts/${promptIdDisplay}/edit`}>
                    {String(promptIdDisplay)}
                  </Link>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Hash">
                <Typography.Text
                  code
                  copyable={{ text: requestHash }}
                >
                  {requestHash}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="日志路径" span={2}>
                {meta?.logDir ? (
                  <Typography.Text copyable={{ text: String(meta.logDir) }}>
                    {String(meta.logDir)}
                  </Typography.Text>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        {errorAdvice && (
          <Alert
            type="warning"
            showIcon
            message={errorAdvice.title}
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {errorMessageDisplay && (
                  <Typography.Text>
                    {String(errorMessageDisplay)}
                  </Typography.Text>
                )}
                <div>
                  {errorAdvice.tips.map((t) => (
                    <div key={t}>{t}</div>
                  ))}
                </div>
              </Space>
            }
          />
        )}

        <Card>
          <Tabs
            items={[
              {
                key: 'index',
                label: 'Index',
                children: data?.index ? (
                  <ExpandablePre text={stringifyPretty(data.index) || ''} highlight="json" />
                ) : (
                  <Empty description="暂无内容" />
                ),
              },
              {
                key: 'request',
                label: 'Request',
                children: data?.request ? (
                  <ExpandablePre text={stringifyPretty(data.request) || ''} highlight="json" />
                ) : (
                  <Empty description="暂无内容" />
                ),
              },
              {
                key: 'parsed',
                label: 'Response Parsed',
                children: data?.responseParsed ? (
                  <ExpandablePre
                    text={stringifyPretty(data.responseParsed) || ''}
                    highlight="json"
                  />
                ) : (
                  <Empty description="暂无内容" />
                ),
              },
              {
                key: 'raw',
                label: 'Response Raw',
                children: (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Input
                      value={rawSearch}
                      onChange={(e) => setRawSearch(e.target.value)}
                      placeholder="搜索原始响应"
                      allowClear
                    />
                    {data?.responseRaw ? (
                      <Typography.Paragraph
                        copyable={{ text: String(data.responseRaw) }}
                        style={{ marginBottom: 0 }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            padding: 12,
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <HighlightedText
                            text={String(data.responseRaw)}
                            keyword={rawSearch}
                          />
                        </pre>
                      </Typography.Paragraph>
                    ) : (
                      <Empty description="暂无内容" />
                    )}
                  </Space>
                ),
              },
              {
                key: 'notes',
                label: 'Notes',
                children: data?.notes ? (
                  <ExpandablePre text={String(data.notes)} />
                ) : (
                  <Empty description="暂无内容" />
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default AiLogDetail;
