import { NEUTRAL_TEXT_COLOR, RISK_LEVEL_COLORS } from '@/constants';
import {
  ENTERPRISE_PRODUCT_RATE_TOTAL,
  getBusinessPricingModeLabel,
} from '@/constants/businessPricing';
import {
  generateProjectTagsWithAI,
  getConfigAll,
  getProjectDetail,
  getProjectTagPrompts,
  type AiPrompt,
} from '@/services/assessment';
import BusinessQuoteModal from '@/components/BusinessQuoteModal';
import { recommendContracts } from '@/services/contracts';
import { exportProjectToExcel, updateProject } from '@/services/projects';
import AttachmentManager from './components/AttachmentManager';
import { PageContainer } from '@ant-design/pro-components';
import { getWikiTree, getWikiRelations, saveWikiRelations } from '@/services/wiki';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

type ProjectDetail = API.ProjectInfo & { tags_json?: string };

const getRecommendKey = (item: any, idx: number) => {
  const file = item?.file || 'file';
  const rowIndex = item?.row_index;
  return `${file}-${rowIndex == null ? idx : rowIndex}`;
};

const extractRowValueByKeyPatterns = (
  row: Record<string, any>,
  patterns: RegExp[],
) => {
  const entries = Object.entries(row || {});
  for (const pattern of patterns) {
    for (const [k, v] of entries) {
      if (!pattern.test(String(k))) continue;
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  for (const [_k, v] of entries) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
};

const guessRecommendProjectName = (row: Record<string, any>) => {
  return (
    extractRowValueByKeyPatterns(row, [
      /项目\s*名称/i,
      /工程\s*名称/i,
      /合同\s*名称/i,
      /标段\s*名称/i,
      /项目\s*名/i,
      /^名称$/i,
      /名称/i,
    ]) || '—'
  );
};

const guessRecommendAmount = (row: Record<string, any>) => {
  return (
    extractRowValueByKeyPatterns(row, [
      /项目\s*金额/i,
      /合同\s*金额/i,
      /中标\s*金额/i,
      /价税合计/i,
      /总\s*金额/i,
      /总\s*价/i,
      /金额/i,
    ]) || '—'
  );
};
type AssessmentData = API.AssessmentData;

type TagPrompt = AiPrompt;

const normalizeTags = (raw: any) => {
  const arr = Array.isArray(raw) ? raw : [];
  const normalized = arr
    .map((t) => String(t == null ? '' : t).trim())
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.slice(0, 30).map((t) => (t.length > 30 ? t.slice(0, 30) : t));
};

const safeParseTagsJson = (raw?: string) => {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
};

const safeParseAssessmentDetails = (raw?: string) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
};

const safeParseBusinessQuote = (raw?: string) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const pricingMode =
        parsed.pricing_mode === 'enterprise_product'
          ? 'enterprise_product'
          : 'custom_development';
      return {
        ...parsed,
        pricing_mode: pricingMode,
        pricing_mode_label:
          parsed.pricing_mode_label ||
          getBusinessPricingModeLabel(pricingMode),
        amounts:
          pricingMode === 'enterprise_product'
            ? (() => {
                const baseCostWan = Number(parsed.base_cost_wan || 0);
                const rates = parsed.rates || {};
                const variableShareRate =
                  Number(rates.cogs_rate || 0) + Number(rates.csm_rate || 0);
                const quoteTotal =
                  variableShareRate > 0
                    ? baseCostWan / (variableShareRate / 100)
                    : 0;
                return {
                  rd_cost_wan: Number(
                    (quoteTotal * (Number(rates.rd_rate || 0) / 100)).toFixed(2),
                  ),
                  cac_cost_wan: Number(
                    (quoteTotal * (Number(rates.cac_rate || 0) / 100)).toFixed(2),
                  ),
                  cogs_cost_wan: Number(
                    (quoteTotal * (Number(rates.cogs_rate || 0) / 100)).toFixed(2),
                  ),
                  csm_cost_wan: Number(
                    (quoteTotal * (Number(rates.csm_rate || 0) / 100)).toFixed(2),
                  ),
                  variable_cost_share_rate: Number(
                    variableShareRate.toFixed(2),
                  ),
                  non_variable_cost_wan: Number(
                    (
                      quoteTotal * (Number(rates.rd_rate || 0) / 100) +
                      quoteTotal * (Number(rates.cac_rate || 0) / 100)
                    ).toFixed(2),
                  ),
                  quote_total_wan: Number(quoteTotal.toFixed(2)),
                };
              })()
            : parsed.amounts,
      };
    }
    return null;
  } catch (_e) {
    return null;
  }
};

const renderBusinessQuoteSummaryStats = (
  businessQuote: API.BusinessQuoteSnapshot,
  implementationCost: number,
) => {
  const amounts = businessQuote?.amounts || {};
  const isEnterpriseProduct = businessQuote.pricing_mode === 'enterprise_product';

  if (isEnterpriseProduct) {
    return (
      <Row gutter={[24, 16]}>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="单客户实施基线"
            value={implementationCost}
            suffix="万元"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="R&D"
            value={amounts.rd_cost_wan || 0}
            suffix="万元"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="CAC"
            value={amounts.cac_cost_wan || 0}
            suffix="万元"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="COGS"
            value={amounts.cogs_cost_wan || 0}
            suffix="万元"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="CSM"
            value={amounts.csm_cost_wan || 0}
            suffix="万元"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Statistic
            title="总商业成本池"
            value={amounts.quote_total_wan || 0}
            suffix="万元"
            precision={2}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[24, 16]}>
      <Col xs={12} sm={12} md={6}>
        <Statistic
          title="实施成本"
          value={implementationCost}
          suffix="万元"
          precision={2}
        />
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Statistic
          title="税费"
          value={amounts.tax_fee_wan || 0}
          suffix="万元"
          precision={2}
        />
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Statistic
          title="毛利额"
          value={amounts.gross_profit_wan || 0}
          suffix="万元"
          precision={2}
          valueStyle={{ color: '#52c41a' }}
        />
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Statistic
          title="商务报价总计"
          value={amounts.quote_total_wan || 0}
          suffix="万元"
          precision={2}
          valueStyle={{ color: '#cf1322' }}
        />
      </Col>
    </Row>
  );
};

const renderBusinessQuoteDescriptions = (
  businessQuote: API.BusinessQuoteSnapshot,
) => {
  const amounts = businessQuote?.amounts || {};
  const rates = businessQuote?.rates || {};
  const isEnterpriseProduct = businessQuote.pricing_mode === 'enterprise_product';

  if (isEnterpriseProduct) {
    return (
      <Descriptions bordered column={2}>
        <Descriptions.Item label="报价模式">
          {businessQuote.pricing_mode_label || getBusinessPricingModeLabel('enterprise_product')}
        </Descriptions.Item>
        <Descriptions.Item label="单客户实施基线口径">
          按 COGS + CSM 占比反推
        </Descriptions.Item>
        <Descriptions.Item label="研发成本（R&D）占比">
          {Number((rates as API.EnterpriseProductPricingConfig).rd_rate || 0).toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="研发成本金额">
          {Number(amounts.rd_cost_wan || 0).toFixed(2)} 万元
        </Descriptions.Item>
        <Descriptions.Item label="营销与获客成本（CAC）占比">
          {Number((rates as API.EnterpriseProductPricingConfig).cac_rate || 0).toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="营销与获客成本金额">
          {Number(amounts.cac_cost_wan || 0).toFixed(2)} 万元
        </Descriptions.Item>
        <Descriptions.Item label="基础设施成本（COGS）占比">
          {Number((rates as API.EnterpriseProductPricingConfig).cogs_rate || 0).toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="基础设施成本金额">
          {Number(amounts.cogs_cost_wan || 0).toFixed(2)} 万元
        </Descriptions.Item>
        <Descriptions.Item label="客户成功与运维（CSM）占比">
          {Number((rates as API.EnterpriseProductPricingConfig).csm_rate || 0).toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="客户成功与运维金额">
          {Number(amounts.csm_cost_wan || 0).toFixed(2)} 万元
        </Descriptions.Item>
        <Descriptions.Item label="可变成本占比（COGS+CSM）">
          {Number(amounts.variable_cost_share_rate || 0).toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="非可变成本合计">
          {Number(amounts.non_variable_cost_wan || 0).toFixed(2)} 万元
        </Descriptions.Item>
        <Descriptions.Item label="四项结构合计">
          {ENTERPRISE_PRODUCT_RATE_TOTAL.toFixed(2)}%
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {businessQuote?.remark || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="报价时间" span={2}>
          {businessQuote?.updated_at
            ? new Date(businessQuote.updated_at).toLocaleString('zh-CN')
            : '—'}
        </Descriptions.Item>
      </Descriptions>
    );
  }

  return (
      <Descriptions bordered column={2}>
      <Descriptions.Item label="报价模式">
        {businessQuote.pricing_mode_label || getBusinessPricingModeLabel('custom_development')}
      </Descriptions.Item>
      <Descriptions.Item label="管理分摊率">
        {Number((rates as API.BusinessPricingConfig).management_rate || 0).toFixed(2)}%
      </Descriptions.Item>
      <Descriptions.Item label="管理分摊金额">
        {Number(amounts.management_fee_wan || 0).toFixed(2)} 万元
      </Descriptions.Item>
      <Descriptions.Item label="销售商务率">
        {Number((rates as API.BusinessPricingConfig).sales_rate || 0).toFixed(2)}%
      </Descriptions.Item>
      <Descriptions.Item label="销售商务金额">
        {Number(amounts.sales_fee_wan || 0).toFixed(2)} 万元
      </Descriptions.Item>
      <Descriptions.Item label="利润率">
        {Number((rates as API.BusinessPricingConfig).profit_rate || 0).toFixed(2)}%
      </Descriptions.Item>
      <Descriptions.Item label="利润金额">
        {Number(amounts.profit_fee_wan || 0).toFixed(2)} 万元
      </Descriptions.Item>
      <Descriptions.Item label="税率">
        {Number((rates as API.BusinessPricingConfig).tax_rate || 0).toFixed(2)}%
      </Descriptions.Item>
      <Descriptions.Item label="毛利率">
        {Number(amounts.gross_margin_rate || 0).toFixed(2)}%
      </Descriptions.Item>
      <Descriptions.Item label="备注" span={2}>
        {businessQuote?.remark || '—'}
      </Descriptions.Item>
      <Descriptions.Item label="报价时间" span={2}>
        {businessQuote?.updated_at
          ? new Date(businessQuote.updated_at).toLocaleString('zh-CN')
          : '—'}
      </Descriptions.Item>
    </Descriptions>
  );
};

const normalizeSnapshotText = (value: any) => {
  const s = String(value == null ? '' : value);
  return s.replace(/\s+/g, ' ').trim();
};

const truncateSnapshotText = (value: any, maxLen: number) => {
  const s = normalizeSnapshotText(value);
  if (!maxLen || maxLen <= 0) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const pickTopRiskScores = (riskScores: any, topN: number) => {
  if (!riskScores || typeof riskScores !== 'object') return {};
  const entries = Object.entries(riskScores)
    .map(([k, v]) => {
      const num = typeof v === 'number' ? v : Number(v);
      return [k, Number.isFinite(num) ? num : 0] as const;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, topN));
  return entries.reduce((acc: any, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {});
};

const extractModulesFromAssessment = (assessment: any) => {
  const dev = Array.isArray(assessment?.development_workload)
    ? assessment.development_workload
    : [];
  const integ = Array.isArray(assessment?.integration_workload)
    ? assessment.integration_workload
    : [];
  const all = [...dev, ...integ];
  const seen = new Set<string>();
  const out: Array<{ module1: string; module2: string; module3: string }> = [];
  for (const r of all) {
    const module1 = truncateSnapshotText(r?.module1, 60);
    const module2 = truncateSnapshotText(r?.module2, 80);
    const module3 = truncateSnapshotText(r?.module3, 80);
    if (!module1 && !module2 && !module3) continue;
    const key = `${module1}||${module2}||${module3}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ module1, module2, module3 });
  }
  return out;
};

const buildProjectTaggingSnapshot = (
  project: any,
  assessment: any,
  tags: string[],
) => {
  const modules = extractModulesFromAssessment(assessment);

  const snapshot: any = {
    project: {
      id: project?.id,
      name: truncateSnapshotText(project?.name, 120),
      description: truncateSnapshotText(project?.description, 2000),
      final_total_cost: project?.final_total_cost,
      final_risk_score: project?.final_risk_score,
      final_workload_days: project?.final_workload_days,
    },
    risk_scores: assessment?.risk_scores || {},
    modules,
    tags,
  };

  const ensureWithinLimit = () => {
    const text = JSON.stringify(snapshot);
    return text.length <= 8000;
  };

  if (ensureWithinLimit()) return snapshot;

  snapshot.project.description = truncateSnapshotText(project?.description, 500);
  if (ensureWithinLimit()) return snapshot;

  snapshot.project.description = truncateSnapshotText(project?.description, 200);
  if (ensureWithinLimit()) return snapshot;

  delete snapshot.project.description;
  if (ensureWithinLimit()) return snapshot;

  snapshot.modules = Array.isArray(snapshot.modules) ? snapshot.modules.slice(0, 100) : [];
  if (ensureWithinLimit()) return snapshot;

  snapshot.risk_scores = pickTopRiskScores(snapshot.risk_scores, 25);
  if (ensureWithinLimit()) return snapshot;

  snapshot.modules = Array.isArray(snapshot.modules) ? snapshot.modules.slice(0, 60) : [];
  if (ensureWithinLimit()) return snapshot;

  snapshot.risk_scores = pickTopRiskScores(snapshot.risk_scores, 15);
  if (ensureWithinLimit()) return snapshot;

  return snapshot;
};

const AssessmentDetailPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(
    null,
  );
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagPrompts, setTagPrompts] = useState<TagPrompt[]>([]);
  const [tagPromptsLoading, setTagPromptsLoading] = useState(false);
  const [tagGenerating, setTagGenerating] = useState(false);
  const [tagForm] = Form.useForm();

  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendItems, setRecommendItems] = useState<any[]>([]);
  const [collapsedRecommend, setCollapsedRecommend] = useState<Record<string, boolean>>({});
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const [configData, setConfigData] = useState<{
    roles: API.RoleConfig[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  const [wikiOptions, setWikiOptions] = useState<{ label: string; value: string }[]>([]);
  const [editingWikis, setEditingWikis] = useState<string[]>([]);
  const [loadingWikiList, setLoadingWikiList] = useState(false);
  const [savingWikis, setSavingWikis] = useState(false);

  // 加载 Wiki 列表及项目关联
  const loadWikiData = useCallback(async () => {
    if (!params.id) return;
    setLoadingWikiList(true);
    try {
      const treeRes = await getWikiTree();
      if (treeRes.success) {
        setWikiOptions(
          (treeRes.data || []).map((item) => ({
            label: `${item.title} (${item.wiki_key})`,
            value: item.wiki_key,
          }))
        );
      }
      const relationsRes = await getWikiRelations({ project_id: Number(params.id) });
      if (relationsRes.success) {
        setEditingWikis((relationsRes.data as string[]) || []);
      }
    } catch (e) {
      console.error('获取 Wiki 绑定失败', e);
    } finally {
      setLoadingWikiList(false);
    }
  }, [params.id]);

  const handleSaveWikis = async () => {
    if (!params.id) return;
    setSavingWikis(true);
    try {
      const res = await saveWikiRelations({
        project_id: Number(params.id),
        wiki_keys: editingWikis,
      });
      if (res.success) {
        messageApi.success('关联 Wiki 文档保存成功');
      } else {
        messageApi.error('保存关联失败');
      }
    } catch (e: any) {
      messageApi.error(e?.message || '保存关联异常');
    } finally {
      setSavingWikis(false);
    }
  };

  const loadRecommendations = useCallback(async (tags: string[]) => {
    const nextTags = normalizeTags(tags);
    if (!nextTags.length) {
      setRecommendItems([]);
      return;
    }
    try {
      setRecommendLoading(true);
      const res = await recommendContracts({ tags: nextTags, topN: 10, maxRowsPerFile: 5000 });
      const data = res?.data;
      const items = Array.isArray(data?.items) ? data.items : [];
      setRecommendItems(items);
    } catch (e: any) {
      setRecommendItems([]);
      messageApi.error(e?.message || '获取相关业绩推荐失败');
    } finally {
      setRecommendLoading(false);
    }
  }, [messageApi]);

  const loadTagPrompts = useCallback(async () => {
    setTagPromptsLoading(true);
    try {
      const res = await getProjectTagPrompts();
      if (!res?.success) {
        throw new Error(res?.error || '加载提示词失败');
      }
      setTagPrompts(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setTagPrompts([]);
      messageApi.error(e?.message || '加载提示词失败');
    } finally {
      setTagPromptsLoading(false);
    }
  }, [messageApi]);

  const loadData = useCallback(async () => {
    if (!params.id) return;

    try {
      setLoading(true);

      const projectRes = await getProjectDetail(params.id);
      const projectData: any = projectRes.data;
      setProject(projectData);

      const parsedDetails = safeParseAssessmentDetails(projectData?.assessment_details_json);
      const tagsFromAssessment = Array.isArray(parsedDetails?.tags) ? parsedDetails.tags : [];
      const tagsFromColumn = safeParseTagsJson(projectData?.tags_json);
      const initialTags = normalizeTags(tagsFromColumn.length ? tagsFromColumn : tagsFromAssessment);
      setSavedTags(initialTags);
      setEditingTags(initialTags);

      if (projectRes.data?.assessment_details_json) {
        try {
          const parsed = JSON.parse(projectRes.data.assessment_details_json);
          const normalized = {
            ...parsed,
            ai_unmatched_risks: Array.isArray(parsed?.ai_unmatched_risks)
              ? parsed.ai_unmatched_risks
              : [],
            custom_risk_items: Array.isArray(parsed?.custom_risk_items)
              ? parsed.custom_risk_items
              : [],
          };
          setAssessmentData(normalized);
        } catch (error) {
          messageApi.error('评估数据解析失败');
        }
      }

      const configRes = await getConfigAll();
      setConfigData({ roles: configRes.data.roles || [] });

      await loadRecommendations(initialTags);
      await loadWikiData();
    } catch (error: any) {
      messageApi.error('加载项目详情失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [params.id, messageApi, loadRecommendations, loadWikiData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tagModalOpen) {
      loadTagPrompts();
      tagForm.setFieldsValue({ promptId: undefined, variables: {} });
    }
  }, [tagModalOpen, loadTagPrompts, tagForm]);

  const confirmOverwriteTags = () => {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认覆盖当前标签？',
        content: '将使用 AI 生成结果覆盖当前编辑中的标签（你仍可以在保存前继续编辑）。',
        okText: '继续生成',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

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
          {project?.business_quote_json ? (
            <Card title="商务报价概览" style={{ marginBottom: 16 }}>
              {(() => {
                const businessQuote = safeParseBusinessQuote(
                  project.business_quote_json,
                );
                if (!businessQuote) return null;

                return (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      {renderBusinessQuoteSummaryStats(
                        businessQuote,
                        businessQuote?.base_cost_wan || 0,
                      )}
                    </div>
                    {renderBusinessQuoteDescriptions(businessQuote)}
                  </>
                );
              })()}
            </Card>
          ) : null}

          <Card title="项目概览" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="实施成本"
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

          <Card title="项目标签" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                mode="tags"
                value={editingTags}
                onChange={(vals) => setEditingTags(normalizeTags(vals))}
                style={{ width: '100%' }}
                placeholder="请输入标签（回车确认）"
                tokenSeparators={[',', '，', ';', '；']}
              />
              <Space>
                <Button
                  onClick={() => setTagModalOpen(true)}
                  disabled={!project?.id}
                >
                  AI 生成标签
                </Button>
                <Button
                  type="primary"
                  loading={savingTags}
                  disabled={!project?.id}
                  onClick={async () => {
                    if (!project?.id) return;
                    try {
                      setSavingTags(true);
                      const next = normalizeTags(editingTags);
                      await updateProject(project.id, { tags: next });
                      setSavedTags(next);
                      setEditingTags(next);
                      messageApi.success('标签已保存');
                      await loadRecommendations(next);
                    } catch (e: any) {
                      messageApi.error(e?.message || '保存标签失败');
                    } finally {
                      setSavingTags(false);
                    }
                  }}
                >
                  保存标签并刷新推荐
                </Button>
                <Button
                  onClick={() => {
                    setEditingTags(savedTags);
                  }}
                  disabled={savingTags}
                >
                  放弃修改
                </Button>
              </Space>
            </Space>
          </Card>

          <Card title="关联 Wiki 文档" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                mode="multiple"
                placeholder="请选择要绑定的 Wiki 文档..."
                value={editingWikis}
                onChange={(vals) => setEditingWikis(vals)}
                style={{ width: '100%' }}
                options={wikiOptions}
                loading={loadingWikiList}
              />
              <Space>
                <Button
                  type="primary"
                  loading={savingWikis}
                  disabled={!project?.id}
                  onClick={handleSaveWikis}
                >
                  保存关联关系
                </Button>
                <Button
                  onClick={loadWikiData}
                  disabled={loadingWikiList || savingWikis}
                >
                  放弃修改
                </Button>
              </Space>
            </Space>
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
    {
      key: '6',
      label: '相关业绩推荐',
      children: (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Button
                loading={recommendLoading}
                onClick={() => loadRecommendations(savedTags)}
              >
                刷新推荐
              </Button>
              <Typography.Text type="secondary">
                推荐基于已保存的标签（score=命中标签数）
              </Typography.Text>
            </Space>

            {recommendLoading ? (
              <div style={{ textAlign: 'center', width: '100%', padding: 24 }}>
                <Spin />
              </div>
            ) : recommendItems.length === 0 ? (
              <Empty description="暂无推荐结果" />
            ) : (
              recommendItems.map((item, idx) => {
                const row = item?.row || {};
                const recKey = getRecommendKey(item, idx);
                const collapsed = collapsedRecommend[recKey] !== false;
                const entries = collapsed ? [] : Object.entries(row);
                const projectName = guessRecommendProjectName(row);
                const amount = guessRecommendAmount(row);
                return (
                  <Card
                    key={recKey}
                    size="small"
                    style={{ width: '100%' }}
                    title={
                      collapsed ? (
                        <Typography.Text strong>{projectName || '—'}</Typography.Text>
                      ) : (
                        <Space>
                          <Typography.Text strong>
                            {item?.file || 'CSV'}
                          </Typography.Text>
                          <Tag color="blue">score {item?.score || 0}</Tag>
                        </Space>
                      )
                    }
                    extra={
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setCollapsedRecommend((prev) => ({
                            ...prev,
                            [recKey]: !collapsed,
                          }));
                        }}
                      >
                        {collapsed ? '展开' : '收起'}
                      </Button>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {collapsed ? (
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="数据来源">
                            {item?.file || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="项目金额">
                            {amount || '—'}
                          </Descriptions.Item>
                        </Descriptions>
                      ) : (
                        <>
                          <div>
                            {(Array.isArray(item?.matched_tags)
                              ? item.matched_tags
                              : []).map((t: string) => (
                              <Tag key={t} color="geekblue">
                                {t}
                              </Tag>
                            ))}
                          </div>

                          <Descriptions bordered size="small" column={2}>
                            {entries.map(([k, v]) => (
                              <Descriptions.Item key={k} label={k}>
                                <Typography.Text
                                  ellipsis={{ tooltip: true }}
                                  style={{
                                    maxWidth: 360,
                                    display: 'inline-block',
                                  }}
                                >
                                  {String(v ?? '') || '—'}
                                </Typography.Text>
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                        </>
                      )}
                    </Space>
                  </Card>
                );
              })
            )}
          </Space>
        </Card>
      ),
    },
    {
      key: '7',
      label: '附件管理',
      children: project?.id ? <AttachmentManager projectId={project.id} /> : null,
    },
  ];

  const handleExport = (version: 'internal' | 'external' | 'business') => {
    if (!project) return;
    const baseUrl = exportProjectToExcel(project.id);
    const url =
      version === 'internal' ? baseUrl : `${baseUrl}?version=${version}`;
    window.open(url, '_blank');
  };

  const businessQuote = safeParseBusinessQuote(project?.business_quote_json);
  const headerImplementationCost =
    businessQuote?.base_cost_wan ?? project?.final_total_cost ?? 0;

  return (
    <PageContainer
      content={
        businessQuote ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap size={[12, 8]}>
              <Tag color="green">已生成商务报价</Tag>
              <Tag color="blue">
                {businessQuote.pricing_mode_label ||
                  getBusinessPricingModeLabel(businessQuote.pricing_mode)}
              </Tag>
              <Typography.Text type="secondary">
                报价时间：
                {businessQuote.updated_at
                  ? new Date(businessQuote.updated_at).toLocaleString('zh-CN')
                  : '—'}
              </Typography.Text>
              {businessQuote.remark ? (
                <Typography.Text type="secondary">
                  备注：{businessQuote.remark}
                </Typography.Text>
              ) : null}
            </Space>
            {renderBusinessQuoteSummaryStats(
              businessQuote,
              headerImplementationCost,
            )}
          </Space>
        ) : (
          <Space wrap size={[12, 8]}>
            <Tag>未生成商务报价</Tag>
            <Typography.Text type="secondary">
              商务报价会基于当前实施成本后置生成，可直接点击右侧“商务报价”。
            </Typography.Text>
          </Space>
        )
      }
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
            key="business-quote"
            onClick={() => setQuoteModalOpen(true)}
          >
            商务报价
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
          <Button
            key="export-business"
            disabled={!project?.business_quote_json}
            onClick={() => handleExport('business')}
          >
            导出Excel（商务版）
          </Button>,
        ],
      }}
    >
      {contextHolder}
      <Tabs items={tabItems} />
      <BusinessQuoteModal
        open={quoteModalOpen}
        projectId={project?.id}
        projectName={project?.name}
        onCancel={() => setQuoteModalOpen(false)}
        onSuccess={async () => {
          setQuoteModalOpen(false);
          await loadData();
        }}
      />

      <Modal
        title="AI 生成项目标签"
        open={tagModalOpen}
        onCancel={() => {
          if (tagGenerating) return;
          setTagModalOpen(false);
        }}
        destroyOnHidden
        footer={null}
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item
            label="选择提示词模板"
            name="promptId"
            rules={[{ required: true, message: '请选择提示词模板' }]}
          >
            <Select
              placeholder={tagPromptsLoading ? '正在加载提示词...' : '请选择提示词模板'}
              loading={tagPromptsLoading}
              options={tagPrompts.map((p) => ({ value: p.id, label: p.name }))}
              allowClear
              onChange={(pid) => {
                if (!pid) {
                  tagForm.setFieldsValue({ promptId: undefined, variables: {} });
                  return;
                }
                const selected = tagPrompts.find((p) => p.id === pid);
                const vars = Array.isArray(selected?.variables) ? selected?.variables : [];
                const defaults = vars.reduce((acc: any, v: any) => {
                  acc[v.name] = v.default_value || '';
                  return acc;
                }, {});
                tagForm.setFieldsValue({ promptId: pid, variables: defaults });
              }}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev?.promptId !== cur?.promptId}>
            {({ getFieldValue }) => {
              const promptId = getFieldValue('promptId');
              const selected = tagPrompts.find((p) => p.id === promptId);
              const vars = Array.isArray(selected?.variables) ? selected?.variables : [];
              if (!vars.length) return null;
              return (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {vars.map((v) => (
                      <Form.Item
                        key={v.name}
                        label={v.display_name || v.name}
                        name={['variables', v.name]}
                      >
                        <Input placeholder={v.default_value || '请输入变量值'} />
                      </Form.Item>
                    ))}
                  </Space>
                </Card>
              );
            }}
          </Form.Item>

          <Space>
            <Button
              type="primary"
              loading={tagGenerating}
              onClick={async () => {
                if (!project?.id) return;
                try {
                  await tagForm.validateFields();
                  const promptId = tagForm.getFieldValue('promptId');
                  const variables = tagForm.getFieldValue('variables') || {};

                  if (editingTags.length > 0) {
                    const ok = await confirmOverwriteTags();
                    if (!ok) return;
                  }

                  setTagGenerating(true);

                  const snapshot = buildProjectTaggingSnapshot(
                    project,
                    assessmentData,
                    editingTags,
                  );

                  if (JSON.stringify(snapshot).length > 8000) {
                    throw new Error('projectSnapshot 字数超出限制 (最大 8000)');
                  }

                  const res = await generateProjectTagsWithAI({
                    promptId,
                    projectId: project.id,
                    projectSnapshot: snapshot,
                    variables,
                  });
                  if (!res?.success) {
                    throw new Error(res?.error || 'AI 生成失败');
                  }
                  const nextTags = normalizeTags(res?.data?.tags || []);
                  setEditingTags(nextTags);
                  messageApi.success('AI 标签已生成，可继续编辑后保存');
                  setTagModalOpen(false);
                } catch (e: any) {
                  messageApi.error(e?.message || 'AI 生成失败');
                } finally {
                  setTagGenerating(false);
                }
              }}
            >
              生成并应用到标签
            </Button>
            <Button
              onClick={() => {
                if (tagGenerating) return;
                setTagModalOpen(false);
              }}
            >
              取消
            </Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AssessmentDetailPage;
