import { NEUTRAL_TEXT_COLOR, RISK_LEVEL_COLORS } from '@/constants';
import { getAllProjects, getConfigAll, getProjectDetail } from '@/services/assessment';
import { deduceRiskLevel, summarizeRisk, parseRiskOptions } from '@/utils/rating';
import { ImportOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  App,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import OtherCostsForm from './components/OtherCostsForm';
import Overview from './components/Overview';
import RiskScoringForm from './components/RiskScoringForm';
import WorkloadEstimation from './components/WorkloadEstimation';

// ====================================================================
// 类型定义
// ====================================================================
type ConfigData = {
  risk_items: API.RiskItemConfig[];
  roles: API.RoleConfig[];
};

type AssessmentData = API.AssessmentData;

// ====================================================================
// 常量定义
// ====================================================================
const EMPTY_ASSESSMENT: API.AssessmentData = {
  risk_scores: {},
  development_workload: [],
  integration_workload: [],
  travel_months: 0,
  travel_headcount: 0,
  maintenance_months: 0,
  maintenance_headcount: 0,
  maintenance_daily_cost: 1600,
  risk_cost_items: [],
};

// ====================================================================
// 工具函数
// ====================================================================
// ====================================================================
// Main Page Component
// ====================================================================
const NewAssessmentPage = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id'); // 用于重新评估（从详情页跳转）

  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    ...EMPTY_ASSESSMENT,
  });
  const [factorDrawerOpen, setFactorDrawerOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateList, setTemplateList] = useState<API.ProjectInfo[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // 加载配置数据
        const configResult = await getConfigAll();
        const nextConfig: ConfigData = {
          risk_items: Array.isArray(configResult?.data?.risk_items)
            ? configResult.data.risk_items
            : [],
          roles: Array.isArray(configResult?.data?.roles)
            ? configResult.data.roles
            : [],
        };
        setConfigData(nextConfig);

        // 如果通过 template_id 参数进入（重新评估），加载模板数据
        if (templateId) {
          const projectResult = await getProjectDetail(templateId);
          if (projectResult?.data?.assessment_details_json) {
            try {
              const parsedData = JSON.parse(
                projectResult.data.assessment_details_json,
              ) as Partial<AssessmentData>;
              const normalizedData: AssessmentData = {
                ...EMPTY_ASSESSMENT,
                ...parsedData,
                risk_scores: parsedData?.risk_scores ?? {},
                development_workload: Array.isArray(
                  parsedData?.development_workload,
                )
                  ? parsedData.development_workload
                  : [],
                integration_workload: Array.isArray(
                  parsedData?.integration_workload,
                )
                  ? parsedData.integration_workload
                  : [],
                travel_months: Number(parsedData?.travel_months ?? 0),
                travel_headcount: Number(parsedData?.travel_headcount ?? 0),
                maintenance_months: Number(parsedData?.maintenance_months ?? 0),
                maintenance_headcount: Number(
                  parsedData?.maintenance_headcount ?? 0,
                ),
                maintenance_daily_cost: Number(
                  parsedData?.maintenance_daily_cost ?? 1600,
                ),
                risk_cost_items: Array.isArray(parsedData?.risk_cost_items)
                  ? parsedData.risk_cost_items
                  : [],
              };
              setAssessmentData(normalizedData);
              form.setFieldsValue(normalizedData);
              message.success(
                `已导入项目"${projectResult.data.name}"的数据作为模板`,
              );
            } catch (error) {
              message.error('模板数据解析失败，已加载空表单');
              setAssessmentData({ ...EMPTY_ASSESSMENT });
              form.resetFields();
            }
          }
        } else {
          setAssessmentData({ ...EMPTY_ASSESSMENT });
          form.resetFields();
          form.setFieldsValue({ ...EMPTY_ASSESSMENT });
        }
      } catch (error: any) {
        console.error(error);
        setConfigData({ risk_items: [], roles: [] });
        message.error(error.message || '加载基础配置失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [templateId, form]);

  const handleValuesChange = (changedPart: Partial<AssessmentData>) => {
    setAssessmentData((prev) => ({ ...prev, ...changedPart }));
  };

  // 处理AI评估结果应用
  const handleAIAssessmentComplete = (assessmentResult: any) => {
    try {
      // 将AI评估结果转换为与配置项一致的键名与可选值
      const newRiskScores: Record<string, number> = {};

      // 建立配置项名称映射（原样与小写映射，便于宽松匹配）
      const riskItemMap = new Map<string, API.RiskItemConfig>();
      const riskItemLowerMap = new Map<string, API.RiskItemConfig>();
      (configData?.risk_items ?? []).forEach((cfg) => {
        riskItemMap.set(cfg.item_name, cfg);
        riskItemLowerMap.set(cfg.item_name.toLowerCase(), cfg);
      });

      // 宽松匹配：归一化名称、去掉括号内容、按分词求重合度
      const stripParens = (s: string) => s.replace(/[()（）【】\[\]<>《》]/g, ' ').replace(/\s+/g, ' ').trim();
      const removeParensContent = (s: string) => s.replace(/\(.*?\)|（.*?）|【.*?】|\[.*?\]|<.*?>|《.*?》/g, '').trim();
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[_\-—·•.,;:，。；：/\\|'"“”‘’!@#$%^&*+=?~]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const tokens = (s: string) => normalize(stripParens(s)).split(' ').filter(Boolean);

      const allConfigs = (configData?.risk_items ?? []).map((cfg) => {
        const name = cfg.item_name;
        const norm = normalize(name);
        const noPar = normalize(removeParensContent(name));
        const toks = new Set(tokens(name));
        return { cfg, name, norm, noPar, toks };
      });

      const matchRiskItem = (rawName: string): API.RiskItemConfig | undefined => {
        const inName = String(rawName || '').trim();
        if (!inName) return undefined;

        // 1) 先尝试严格匹配（原样、小写）
        let hit = riskItemMap.get(inName) || riskItemLowerMap.get(inName.toLowerCase());
        if (hit) return hit;

        // 2) 归一化与包含关系
        const inNorm = normalize(inName);
        const inNoPar = normalize(removeParensContent(inName));
        let best: { cfg: API.RiskItemConfig; score: number } | null = null;

        const scoreCandidate = (cand: typeof allConfigs[number]) => {
          // 完全相等优先
          if (cand.norm === inNorm || cand.noPar === inNoPar) return 1;
          // 包含关系
          if (
            cand.norm.includes(inNorm) ||
            inNorm.includes(cand.norm) ||
            cand.noPar.includes(inNoPar) ||
            inNoPar.includes(cand.noPar)
          )
            return 0.85;
          // tokens 重合度
          const inToks = new Set(tokens(inName));
          if (inToks.size === 0 || cand.toks.size === 0) return 0;
          let inter = 0;
          inToks.forEach((t) => {
            if (cand.toks.has(t)) inter += 1;
          });
          const union = new Set<string>([...Array.from(inToks), ...Array.from(cand.toks)]).size;
          return inter / union; // 0~1
        };

        for (const cand of allConfigs) {
          const sc = scoreCandidate(cand);
          if (!best || sc > best.score) best = { cfg: cand.cfg, score: sc };
        }

        // 阈值：0.5 以上认为可用
        if (best && best.score >= 0.5) return best.cfg;
        return undefined;
      };

      const alignToOptions = (cfg: API.RiskItemConfig, raw: number) => {
        const options = parseRiskOptions(cfg.options_json);
        if (!options || options.length === 0) return raw;
        let nearest = options[0].value;
        let minDiff = Math.abs(raw - nearest);
        for (const opt of options) {
          const diff = Math.abs(raw - opt.value);
          if (diff < minDiff) {
            minDiff = diff;
            nearest = opt.value;
          }
        }
        return nearest;
      };

      let applied = 0;
      let skipped = 0;
      (assessmentResult?.risk_scores ?? []).forEach((score: any) => {
        const nameRaw = String(score?.item_name ?? '').trim();
        const suggested = Number(score?.suggested_score);
        if (!nameRaw || !Number.isFinite(suggested)) {
          skipped += 1;
          return;
        }

        const cfg = matchRiskItem(nameRaw);
        if (!cfg) {
          skipped += 1;
          return;
        }

        const aligned = alignToOptions(cfg, suggested);
        newRiskScores[cfg.item_name] = aligned;
        applied += 1;
      });

      // 更新评估数据
      const updatedAssessmentData = {
        ...assessmentData,
        risk_scores: {
          ...assessmentData.risk_scores,
          ...newRiskScores,
        },
      };

      setAssessmentData(updatedAssessmentData);

      // 更新表单字段值
      form.setFieldsValue({
        risk_scores: {
          ...form.getFieldValue('risk_scores'),
          ...newRiskScores,
        },
      });

      if (applied === 0) {
        message.warning('未找到可应用的风险项，请检查提示词是否使用了配置中的“风险项名称”。');
      } else if (skipped > 0) {
        message.success(`已应用 ${applied} 项，跳过 ${skipped} 项（名称不匹配或分值无效）`);
      } else {
        message.success(`已应用 ${applied} 项评估结果`);
      }
    } catch (error) {
      console.error('应用AI评估结果失败:', error);
      message.error('应用AI评估结果失败，请重试');
    }
  };

  // 打开模板选择弹窗
  const handleOpenTemplateModal = async () => {
    setTemplateModalOpen(true);
    setLoadingTemplates(true);
    try {
      const result = await getAllProjects();
      if (result?.data) {
        setTemplateList(result.data);
      }
    } catch (error: any) {
      message.error('加载项目列表失败');
      console.error(error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 从模板导入数据
  const handleImportFromTemplate = async (projectId: number) => {
    try {
      const result = await getProjectDetail(projectId.toString());
      if (result?.data?.assessment_details_json) {
        const parsedData = JSON.parse(
          result.data.assessment_details_json,
        ) as Partial<AssessmentData>;
        const normalizedData: AssessmentData = {
          ...EMPTY_ASSESSMENT,
          ...parsedData,
          risk_scores: parsedData?.risk_scores ?? {},
          development_workload: Array.isArray(parsedData?.development_workload)
            ? parsedData.development_workload
            : [],
          integration_workload: Array.isArray(parsedData?.integration_workload)
            ? parsedData.integration_workload
            : [],
          travel_months: Number(parsedData?.travel_months ?? 0),
          travel_headcount: Number(parsedData?.travel_headcount ?? 0),
          maintenance_months: Number(parsedData?.maintenance_months ?? 0),
          maintenance_headcount: Number(parsedData?.maintenance_headcount ?? 0),
          maintenance_daily_cost: Number(
            parsedData?.maintenance_daily_cost ?? 1600,
          ),
                risk_cost_items: Array.isArray(parsedData?.risk_cost_items)
                  ? parsedData.risk_cost_items
                  : [],
        };

        setAssessmentData(normalizedData);
        form.setFieldsValue(normalizedData);
        setTemplateModalOpen(false);
        message.success(`已从项目"${result.data.name}"导入数据`);
      }
    } catch (error: any) {
      message.error('导入模板数据失败');
      console.error(error);
    }
  };

  const riskScoreSummary = useMemo(() => {
    const scores = assessmentData.risk_scores || {};
    const riskItems = configData?.risk_items || [];
    const itemCount = riskItems.length;

    const { totalScore, normalizedFactor, scoreRatio, maxScore } =
      summarizeRisk({
        riskScores: scores,
        riskItems,
      });

    const allFilled =
      itemCount > 0 &&
      riskItems.every((item) => {
        const value = scores[item.item_name];
        return value !== undefined && value !== null && value !== '';
      });

    const level =
      allFilled && maxScore > 0 ? deduceRiskLevel(scoreRatio) : '——';

    return {
      total: totalScore,
      factor: normalizedFactor,
      ratio: scoreRatio,
      itemCount,
      maxScore,
      level,
    };
  }, [assessmentData.risk_scores, configData?.risk_items]);

  // 根据风险等级获取对应的颜色
  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case '低风险':
        return RISK_LEVEL_COLORS.LOW; // 绿色
      case '中风险':
        return RISK_LEVEL_COLORS.MEDIUM; // 橙色
      case '高风险':
        return RISK_LEVEL_COLORS.HIGH; // 红色
      default:
        return NEUTRAL_TEXT_COLOR; // 灰色（未完成状态）
    }
  };

  const completedRiskCount = useMemo(() => {
    const scores = assessmentData.risk_scores || {};
    return Object.values(scores).filter(
      (value) => value !== undefined && value !== null && value !== '',
    ).length;
  }, [assessmentData.risk_scores]);

  // 计算功能模块数量
  const moduleCount = useMemo(() => {
    const devCount = Array.isArray(assessmentData.development_workload)
      ? assessmentData.development_workload.length
      : 0;
    const integrationCount = Array.isArray(assessmentData.integration_workload)
      ? assessmentData.integration_workload.length
      : 0;
    return devCount + integrationCount;
  }, [
    assessmentData.development_workload,
    assessmentData.integration_workload,
  ]);

  // 计算其他成本总数（差旅 + 运维 + 风险成本的简易估算）
  const otherCostsEstimate = useMemo(() => {
    const roles = configData?.roles || [];
    const ratingFactor = riskScoreSummary.factor || 1.0;

    // 1. 差旅成本估算
    const travelMonths = Number(assessmentData.travel_months) || 0;
    const travelHeadcount = Number(assessmentData.travel_headcount) || 0;
    const travelCost = travelMonths * travelHeadcount * 8000 * ratingFactor;

    // 2. 运维成本估算
    const maintenanceMonths = Number(assessmentData.maintenance_months) || 0;
    const maintenanceHeadcount =
      Number(assessmentData.maintenance_headcount) || 0;
    const maintenanceDailyCost =
      Number(assessmentData.maintenance_daily_cost) || 1600;
    const maintenanceCost =
      maintenanceMonths *
      20 *
      maintenanceHeadcount *
      maintenanceDailyCost *
      ratingFactor;

    // 3. 风险成本估算
    const riskCostItems = Array.isArray(assessmentData.risk_cost_items)
      ? assessmentData.risk_cost_items
      : [];
    const riskCost =
      riskCostItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) *
      10000;

    // 总计（单位：元，转换为万元）
    return (travelCost + maintenanceCost + riskCost) / 10000;
  }, [assessmentData, configData, riskScoreSummary.factor]);

  const { Paragraph, Text } = Typography;
  const riskRatioText = Number.isFinite(riskScoreSummary.ratio)
    ? `${(riskScoreSummary.ratio * 100).toFixed(1)}%`
    : '—';
  const factorTitleNode = (
    <span>
      评分因子
      <Tooltip title="查看评分因子如何参与计算">
        <InfoCircleOutlined
          style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
          onClick={(event) => {
            event.stopPropagation();
            setFactorDrawerOpen(true);
          }}
        />
      </Tooltip>
    </span>
  );

  const steps = [
    {
      title: '风险评分',
      content: (
        <RiskScoringForm
          form={form}
          initialValues={assessmentData}
          configData={configData}
          onValuesChange={(_, values) => handleValuesChange(values)}
          onNext={() => setCurrent(1)}
          onAIAssessmentComplete={handleAIAssessmentComplete}
        />
      ),
    },
    {
      title: '工作量估算',
      content: (
        <WorkloadEstimation
          configData={configData!}
          initialValues={{
            dev: assessmentData.development_workload,
            integration: assessmentData.integration_workload,
          }}
          onWorkloadChange={(dev, integration) =>
            handleValuesChange({
              development_workload: dev,
              integration_workload: integration,
            })
          }
          onPrev={() => setCurrent(0)}
          onNext={() => setCurrent(2)}
        />
      ),
    },
    {
      title: '其他成本',
      content: (
        <OtherCostsForm
          form={form}
          initialValues={assessmentData}
          onValuesChange={handleValuesChange}
          onPrev={() => setCurrent(1)}
          onNext={() => setCurrent(3)}
        />
      ),
    },
    {
      title: '生成总览',
      content: (
        <Overview
          assessmentData={assessmentData}
          configData={configData!}
          onPrev={() => setCurrent(2)}
        />
      ),
    },
  ];

  const items = steps.map((item) => ({ key: item.title, title: item.title }));

  if (loading || !configData) {
    return (
      <PageContainer>
        <Spin tip="Loading...">
          <div style={{ minHeight: '500px' }} />
        </Spin>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 提供一个无 DOM 的表单上下文，避免在子表单未挂载时调用 form.setFieldsValue 触发警告 */}
      <Form form={form} component={false}>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={20} lg={20} xl={20}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={4}>
                <Statistic
                  title="风险总分"
                  value={riskScoreSummary.total}
                  precision={2}
                />
              </Col>
              <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={4}>
                <Statistic
                  title={factorTitleNode}
                  value={riskScoreSummary.factor}
                  precision={2}
                />
              </Col>
              <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={4}>
                <Statistic
                  title="风险等级"
                  value={riskScoreSummary.level}
                  valueStyle={{
                    color: getRiskLevelColor(riskScoreSummary.level),
                    fontWeight: 'bold',
                  }}
                />
              </Col>
              <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={4}>
                <Statistic
                  title={
                    <span>
                      功能模块
                      <Tooltip title="新功能开发和系统对接的模块总数">
                        <InfoCircleOutlined
                          style={{ marginLeft: 4, color: '#1890ff' }}
                        />
                      </Tooltip>
                    </span>
                  }
                  value={moduleCount}
                  suffix="个"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={4}>
                <Statistic
                  title={
                    <span>
                      其他成本
                      <Tooltip title="差旅、运维、风险成本估算总和（未含开发和对接成本）">
                        <InfoCircleOutlined
                          style={{ marginLeft: 4, color: '#1890ff' }}
                        />
                      </Tooltip>
                    </span>
                  }
                  value={otherCostsEstimate}
                  suffix="万"
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                  prefix="≈"
                />
              </Col>
            </Row>
          </Col>
          <Col
            xs={24}
            sm={24}
            md={4}
            lg={4}
            xl={4}
            style={{ textAlign: 'right' }}
          >
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={handleOpenTemplateModal}
              size="large"
              block
            >
              从模板导入
            </Button>
          </Col>
        </Row>
      </Card>
      <Card>
        <Steps current={current} items={items} />
        <div style={{ marginTop: 24 }}>{steps[current].content}</div>
      </Card>
      <Drawer
        title="评分因子参与计算说明"
        open={factorDrawerOpen}
        onClose={() => setFactorDrawerOpen(false)}
        width={480}
        destroyOnHidden
      >
        <Paragraph>
          当前风险总分为 <Text strong>{riskScoreSummary.total.toFixed(2)}</Text>
          {riskScoreSummary.maxScore ? (
            <span>
              ，配置允许的最高得分为{' '}
              <Text strong>{riskScoreSummary.maxScore}</Text>
              ，风险占比约 <Text strong>{riskRatioText}</Text>
            </span>
          ) : null}
          。
        </Paragraph>
        <Paragraph>
          基于动态阈值映射，当前评分因子为{' '}
          <Text strong>{riskScoreSummary.factor.toFixed(2)}</Text>。
          报价计算时，每一项成本都会乘以该因子：
        </Paragraph>
        <Paragraph>
          <Text code>最终报价 = 基准成本 × 评分因子</Text>
        </Paragraph>
        <Divider />
        <Paragraph strong>分段规则</Paragraph>
        <ul style={{ paddingLeft: 20 }}>
          <li>风险占比 ≤ 80% → 系数 1.00（基准价）</li>
          <li>80% &lt; 风险占比 ≤ 100% → 系数在 1.00~1.20 之间线性上浮</li>
          <li>100% &lt; 风险占比 ≤ 120% → 系数在 1.20~1.50 之间线性上浮</li>
          <li>风险占比 &gt; 120% → 系数封顶 1.50</li>
        </ul>
        <Divider />
        <Paragraph strong>对报价的影响</Paragraph>
        <Paragraph>
          软件研发、系统对接、差旅、运维及风险成本都会同步乘以当前评分因子，确保风险高的项目获得更高的报价补偿。
          可在“生成总览”步骤中点击“计算最新报价”查看具体数值变化。
        </Paragraph>
        <Paragraph type="secondary">
          若配置中调整了风险项的分值或新增条目，最大得分会自动更新，评分因子和提示内容也会同步刷新。
        </Paragraph>
      </Drawer>

      {/* 从模板导入弹窗 */}
      <Modal
        title="选择历史项目作为模板"
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        <Table<API.ProjectInfo>
          loading={loadingTemplates}
          dataSource={templateList}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个项目`,
          }}
          columns={[
            {
              title: '项目名称',
              dataIndex: 'name',
              key: 'name',
              width: 200,
              ellipsis: true,
            },
            {
              title: '描述',
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
            },
            {
              title: '是否模板',
              dataIndex: 'is_template',
              key: 'is_template',
              width: 100,
              align: 'center',
              render: (val: number) =>
                val === 1 ? <Tag color="blue">模板</Tag> : <Tag>项目</Tag>,
            },
            {
              title: '风险得分',
              dataIndex: 'final_risk_score',
              key: 'final_risk_score',
              width: 100,
              align: 'right',
              render: (val: number) => val?.toFixed(2) || '—',
            },
            {
              title: '总成本(万元)',
              dataIndex: 'final_total_cost',
              key: 'final_total_cost',
              width: 120,
              align: 'right',
              render: (val: number) => (val ? (val / 10000).toFixed(2) : '—'),
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 180,
              render: (val: string) =>
                val ? new Date(val).toLocaleString('zh-CN') : '—',
            },
            {
              title: '操作',
              key: 'action',
              width: 100,
              align: 'center',
              fixed: 'right',
              render: (_, record) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleImportFromTemplate(record.id)}
                  >
                    导入
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Modal>
      </Form>
    </PageContainer>
  );
};

export default NewAssessmentPage;
