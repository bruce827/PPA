import {PageContainer} from '@ant-design/pro-components';
import {PageContainer} from '@ant-design/pro-components';

import {
    Card,
    Steps,
    Statistic,
    Row,
    Col,
    Form,
    Spin,
    message
} from 'antd';
import {PageContainer} from '@ant-design/pro-components';

import {useState, useEffect, useMemo} from 'react';

import {useSearchParams} from '@umijs/max';
import {

    import {getConfigAll, getProjectDetail} from '@/services/assessment';
    Card,

    import RiskScoringForm from './components/RiskScoringForm';
    Steps,

    import WorkloadEstimation from './components/WorkloadEstimation';
    Statistic,

    import OtherCostsForm from './components/OtherCostsForm';
    Row,

    import Overview from './components/Overview';
    Col,

    Form,

    // 类型定义    Spin,

    interface ConfigData {
        message risk_items: API.RiskItem[];
    }
    from 'antd';

    roles: API.RoleConfig[];
    import {PageContainer} from '@ant-design/pro-components';

}

import {useState, useEffect, useMemo} from 'react';

interface RiskOption {
    import {PageContainer} from '@ant-design/pro-components';

    label: string;

    value: number;
    import {useSearchParams} from '@umijs/max';

}
import {PageContainer} from '@ant-design/pro-components';

// 解析风险选项import {getConfigAll, getProjectDetail} from '@/services/assessment';

const parseRiskOptions = (optionsJson? : string): RiskOption[] => {

    if (!optionsJson) 
        return [];
    import RiskScoringForm from './components/RiskScoringForm';

    try {
        import {

            const parsed = JSON.parse(optionsJson);

            if (Array.isArray(parsed)) {
                import WorkloadEstimation from './components/WorkloadEstimation';

                return parsed.map((option) => {
                    Card,

                    const label = option
                        ?.label ?? option
                            ?.name ?? '';

                    const numericValue = Number(option
                        ?.score ?? option
                            ?.value ?? 0);
                    import OtherCostsForm from './components/OtherCostsForm';

                    return {
                        Steps,

                        label,

                        value: Number.isFinite(numericValue)
                            ? numericValue
                            : 0,
                        import Overview from './components/Overview';

                    };
                    Statistic
                });

            }
            Row,

            return [];

        } catch  {
            type ConfigData = {

                return [];
                Col
        }

    };
    risk_items: API.RiskItemConfig[];

    Form,

    // 空评估数据

    const EMPTY_ASSESSMENT: API.AssessmentData = {
        roles: API.RoleConfig[];

        risk_scores: {},
        Spin development_workload: []
    };

    integration_workload: [],
    message

    travel_months: 0,

    maintenance_months: 0
}
from 'antd';

maintenance_headcount: 0,

risk_items: [],
type RiskOption = {};

label: string;

/**    import {useState, useEffect, useMemo} from 'react';

 * 新建项目评估页面 - 主容器组件

 * 功能：四步向导式项目评估流程    value: number;

 */
import {};

const NewAssessmentPage: React.FC = () => {
        Card,

        const [form] = Form.useForm();

        const [searchParams] = useSearchParams();
        Steps,

        const editId = searchParams.get('edit_id');

        const parseRiskOptions = (optionsJson?
        : string): RiskOption[] => {

            const [current, setCurrent] = useState(0);
            Statistic,

            const [loading, setLoading] = useState(true);

            const [configData, setConfigData] = useState < ConfigData | null > (null);
            if (!optionsJson) {

                const [assessmentData, setAssessmentData] = useState < API.AssessmentData > ({
                    ...EMPTY_ASSESSMENT
                });
                Row,

                // 初始化数据加载            return [];

                useEffect(() => {
                    Col

                    const loadInitialData = async() => {}

                    try {
                        Form,

                        setLoading(true);

                        try {

                            // 加载配置数据            Spin,

                            const configResult = await getConfigAll();

                            const nextConfig: ConfigData = {
                                const parsed = JSON.parse(optionsJson);

                                risk_items: Array.isArray(configResult
                                    ?.data
                                        ?.risk_items)
                                    ? configResult.data.risk_items
                                    : [],
                                message roles: Array.isArray(configResult
                                    ?.data
                                        ?.roles)
                                    ? configResult.data.roles
                                    : []
                            };
                            if (Array.isArray(parsed)) {}

                            setConfigData(nextConfig);
                            from 'antd';

                            // 如果是编辑模式，加载项目数据            return parsed.map((option) => {

                            if (editId) {
                                import {useSearchParams} from '@umijs/max';

                                const projectResult = await getProjectDetail(editId);

                                if (projectResult
                                    ?.data
                                        ?.assessment_details_json) {
                                    const label = option

                                    try {
                                            ?.label ?? option

                                        const parsedData = JSON.parse(projectResult.data.assessment_details_json)as Partial < API.AssessmentData >;
                                        ?.name ?? '';

                                        const normalizedData: API.AssessmentData = {

                                            ...EMPTY_ASSESSMENT,
                                            const numericValue = Number(option ...parsedData,
                                                ?.score ?? option risk_scores
                                                : parsedData
                                                    ?.risk_scores ?? {},
                                                ?.value ?? 0);

                                            development_workload: Array.isArray(parsedData
                                                ?.development_workload)
                                                    ? parsedData.development_workload
                                                    : [],
                                            import {getConfigAll, getProjectDetail} from '@/services/assessment';

                                            integration_workload: Array.isArray(parsedData
                                                ?.integration_workload)
                                                    ? parsedData.integration_workload
                                                    : [],

                                            travel_months: Number(parsedData
                                                ?.travel_months ?? 0),
                                            return label maintenance_months: Number(parsedData
                                                ?.maintenance_months ?? 0),
                                                    ? {

                                                        maintenance_headcount: Number(parsedData
                                                            ?.maintenance_headcount ?? 0),
                                                        label,

                                                        risk_items: Array.isArray(parsedData
                                                            ?.risk_items)
                                                                ? parsedData.risk_items
                                                                : [],
                                                        value: Number.isFinite(numericValue)

                                                    };
                                            ?numericValue setAssessmentData(normalizedData);
                                            :0 form.setFieldsValue(normalizedData);
                                        }

                                    } catch (error) {
                                        : null;

                                        message.error('项目评估数据解析失败，已加载空表单');
                                        import {useState, useEffect, useMemo} from 'react';

                                        setAssessmentData({
                                            ...EMPTY_ASSESSMENT
                                        });

                                        form.resetFields();
                                    }) import {}.filter((item)}: item is RiskOption => Boolean(item));

                            } else {
                                Card

                                setAssessmentData({
                                    ...EMPTY_ASSESSMENT
                                });
                            }

                            form.resetFields();
                            Steps

                            form.setFieldsValue({
                                ...EMPTY_ASSESSMENT
                            });
                        } catch (error) {}
                        Statistic
                    } catch (error
                    : any) {

                        console.error(error);
                        return [];

                        setConfigData({risk_items: [], roles: []});
                        Row

                        message.error(error.message || '加载基础配置失败，请稍后重试');
                    }

                } finally {
                    Col,

                    setLoading(false);

                }
                return [];

            };
            Form

        };

        loadInitialData();
        Spin
    },
    [editId, form]);

    message const EMPTY_ASSESSMENT: API.AssessmentData = {}

    // 处理表单值变化    from 'antd';

    const handleValuesChange = (changedPart
    : Partial < API.AssessmentData >) => {

        setAssessmentData((prev) => ({
            ...prev,
            ...changedPart
        }));
        risk_scores
        : {}
    };
    import {

        // 计算风险评分摘要        development_workload: [],

        const riskScoreSummary = useMemo(
            () => {
            Card,

            const scores = assessmentData.risk_scores || {};

            const riskItems = configData
                ?.risk_items || [];
            integration_workload: [],

            const itemCount = riskItems.length;
            Steps,

            let total = 0;
            travel_months: 0,

            let maxScore = 0;
            Statistic,

            riskItems.forEach((item) => {
                maintenance_months
                : 0,

                const selectedValue = Number(scores[item.item_name] ?? NaN);
                Row,

                if (!Number.isNaN(selectedValue)) {

                    total += selectedValue;
                    maintenance_headcount
                    : 0
                }
                Col,

                const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {
                    risk_items
                    : [],

                    return option.value > acc
                        ? option.value
                        : acc;
                    Form

                }, 0);
            };

            maxScore += maxOptionScore;
            Spin
        });

        message const NewAssessmentPage = () => {}

        const allFilled = itemCount > 0 && riskItems.every((item) => {
            from 'antd';

            const value = scores[item.item_name];

            return value !== undefined && value !== null && value !== '';
            const [form] = Form.useForm();

        });

        const [searchParams] = useSearchParams();

        const factor = Number((total / 100).toFixed(2));
        import RiskScoringForm from './components/RiskScoringForm';

        const ratio = maxScore > 0
            ? total / maxScore
            : 0;

        const editId = searchParams.get('edit_id');

        let level: string = '——';

        if (allFilled && maxScore > 0) {
            import WorkloadEstimation from './components/WorkloadEstimation';

            if (ratio >= 0.7) {

                level = '高风险';
                const [current, setCurrent] = useState(0);

            } else if (ratio >= 0.4) {
                import {useSearchParams} from '@umijs/max';

                level = '中风险';

            } else {
                const [loading, setLoading] = useState(true);

                level = '低风险';

            }
            const [configData, setConfigData] = useState < ConfigData | null > (null);

        }
        import OtherCostsForm from './components/OtherCostsForm';

        return {
            const [assessmentData, setAssessmentData] = useState < API.AssessmentData > ({

                total,
                ...EMPTY_ASSESSMENT factor
            });

            itemCount,

            maxScore,
            import Overview from './components/Overview';

            level
        };
        useEffect(() => {}, [
            assessmentData.risk_scores, configData
                ?.risk_items
        ]);
        import {getConfigAll, getProjectDetail} from '@/services/assessment';

        // 计算已完成的风险评分项数量        const loadInitialData = async() => {

        const completedRiskCount = useMemo(() => {
            import {useState, useEffect, useMemo} from 'react';

            const scores = assessmentData.risk_scores || {};

            return Object
                .values(scores)
                .filter((value) => value !== undefined && value !== null && value !== '')
                .length;
            try {},
            [assessmentData.risk_scores]);
            import {useState, useEffect, useMemo} from 'react';

            // 定义步骤                setLoading(true);

            const steps = [

                                    {
                        type ConfigData = {

                            title: '风险评分',

                            content: ( // 加载配置数据    import RiskScoringForm from './components/RiskScoringForm'; < RiskScoringForm form = {
                                form
                            }
                            const configResult = await getConfigAll();

                            initialValues = {
                                assessmentData
                            }

                            configData = {
                                configData
                            }
                            const nextConfig
                                : ConfigData = {

                                    onValuesChange = {
                                        (_, values) => handleValuesChange(values)
                                    }
                                    risk_items: API.RiskItemConfig[];

                                    onNext = {
                                        () => setCurrent(1)
                                    } /> risk_items: Array.isArray(configResult),
                                        ?.data

                                },
                                    ?.risk_items) {
                                ? configResult.data.risk_items title
                                        : '工作量估算',: [],

                                    content: (

                                    < WorkloadEstimation roles
                                    : Array.isArray(configResult configData = {
                                        configData !
                                    }
                                        ?.data initialValues = {{                                ?.roles)

            dev: assessmentData.development_workload,                            ? configResult.data.roles

            integration: assessmentData.integration_workload,                            : [],

          }}roles
                                        : API.RoleConfig[];

                                    onWorkloadChange = {
                                        (dev, integration) => handleValuesChange({};

                                        development_workload
                                        : dev, import WorkloadEstimation from './components/WorkloadEstimation';

                                        integration_workload
                                        : integration
                                    }) setConfigData(nextConfig);

                                }
                                import {useSearchParams} from '@umijs/max';

                                onPrev = {
                                    () => setCurrent(0)
                                }

                                onNext = {
                                    () => setCurrent(2)
                                }
                                import {useSearchParams} from '@umijs/max';

                                />

      ),                    // 如果是编辑模式，加载项目数据

    },

    {                    if (editId) {};

      title: '其他成本',

      content: (                    const projectResult = await getProjectDetail(editId);

        <OtherCostsForm

          form={form}                    if (projectResult

          initialValues={assessmentData}                        ?.data

          onValuesChange={handleValuesChange}                            ?.assessment_details_json) {

          onPrev={() => setCurrent(1)}                        type RiskOption = {

          onNext={() => setCurrent(3)}

        / > try {)
                                },
                                const parsedData = JSON.parse(projectResult.data.assessment_details_json)as Partial < API.AssessmentData >;

                                {
                                    label

                                    title
                                    : '生成总览',
                                    : string;

                                    content
                                    : (< Overview const normalizedData
                                    : API.AssessmentData = {

                                        assessmentData = {
                                            assessmentData
                                        }
                                        import Overview from './components/Overview';

                                        configData = {
                                            configData !
                                        }

                                        onPrev = {
                                            () => setCurrent(2)
                                        }
                                        ...EMPTY_ASSESSMENT,

                                        />                                    import {getConfigAll, getProjectDetail} from '@/services / assessment ';
)},
                                    ...parsedData];
                                import {getConfigAll, getProjectDetail} from '@/services/assessment';

                                const items = steps.map((item) => ({key: item.title, title: item.title}));
                                risk_scores: parsedData

                                    ?.risk_scores ?? {},

                                // 加载中状态

                                if(loading || !configData) {
                                    development_workload
                                    : Array.isArray(parsedData return (?.development_workload)<PageContainer>
                                        ? parsedData.development_workload < Spin tip = "加载中..." >
                                        : [], < div style = {{ minHeight: '500px' }}/>                                    value: number;

        </Spin > </PageContainer> integration_workload: Array.isArray(parsedData);
                                    ?.integration_workload)

                                }
                                    ? parsedData.integration_workload

                                    : [],

                                // 渲染主页面

                                return(travel_months
                                : Number(parsedData<PageContainer>
                                    ?.travel_months ?? 0) {/* 统计卡片 */
                                }
                            };

                            <Card style = {{ marginBottom: 24 }} > <Row gutter = {
                                [16, 16]
                            } > maintenance_months: Number(parsedData < Col xs = {
                                12
                            }
                            sm = {
                                12
                            }
                            md = {
                                6
                            }
                            lg = {
                                6
                            }
                            xl = {
                                6
                            } >
                                ?.maintenance_months ?? 0), < Statistic title = "风险总分" value = {
                                riskScoreSummary.total
                            }
                            precision = {
                                2
                            } /> </Col> maintenance_headcount: Number(parsedData < Col xs = {
                                12
                            }
                            sm = {
                                12
                            }
                            md = {
                                6
                            }
                            lg = {
                                6
                            }
                            xl = {
                                6
                            } >
                                ?.maintenance_headcount ?? 0), < Statistic title = "评分因子" value = {
                                riskScoreSummary.factor
                            }
                            precision = {
                                2
                            } /> const parseRiskOptions = (optionsJson
                                ? </Col>
                                : string): RiskOption[] => { < Col xs = {
                                    12
                                }
                                sm = {
                                    12
                                }
                                md = {
                                    6
                                }
                                lg = {
                                    6
                                }
                                xl = {
                                    6
                                } > <Statistic title = "风险等级" value = {
                                    riskScoreSummary.level
                                } /> risk_items</Col>
                                : Array.isArray(parsedData < Col xs = {
                                    12
                                }
                                sm = {
                                    12
                                }
                                md = {
                                    6
                                }
                                lg = {
                                    6
                                }
                                xl = {
                                    6
                                } >
                                    ?.risk_items) < Statistic
                                        ? parsedData.risk_items

                                title = "已完成项" : [],

                                value = {
                                    completedRiskCount
                                }
                                type ConfigData = {};

                                suffix = {
                                    riskScoreSummary.itemCount
                                        ? `/ ${riskScoreSummary.itemCount}`
                                        : undefined
                                }
                                import RiskScoringForm from './components/RiskScoringForm';

                                />

          </Col > setAssessmentData(normalizedData);</Row> import RiskScoringForm from './components/RiskScoringForm';</Card>

                                form.setFieldsValue(normalizedData);

                                {/* 步骤向导 */
                                }<Card>
                            } catch (error) {

                                    < Steps current = {
                                    current
                                }
                                items = {
                                    items
                                } /> if (!optionsJson) { < div style = {{ marginTop: 24 }} > {
                                        steps[current].content
                                    }</div></Card> message.error('项目评估数据解析失败，已加载空表单');</PageContainer>);
                                    setAssessmentData({};
                                    ...EMPTY_ASSESSMENT

                                });

                                export default NewAssessmentPage;
                                return [];

                                form.resetFields();
                                risk_items: API.RiskItemConfig[];

                            }

                        }
                    }

                } else {

                    setAssessmentData({
                        ...EMPTY_ASSESSMENT
                    });
                    try {

                        form.resetFields();
                        roles
                        : API.RoleConfig[];

                        form.setFieldsValue({
                            ...EMPTY_ASSESSMENT
                        });
                        import WorkloadEstimation from './components/WorkloadEstimation';

                    }
                    import WorkloadEstimation from './components/WorkloadEstimation';

                } catch (error
                : any) {

                    console.error(error);
                    const parsed = JSON.parse(optionsJson);

                    setConfigData({risk_items: [], roles: []});

                    message.error(error.message || '加载基础配置失败，请稍后重试');
                    if (Array.isArray(parsed)) {};

                } finally {

                    setLoading(false);
                    return parsed.map((option) => {}
                    import OtherCostsForm from './components/OtherCostsForm';

                };
                import OtherCostsForm from './components/OtherCostsForm';

                loadInitialData();
                const label = option

            }, [editId, form]);
            ?.label ?? option

                ?.name ?? '';

            const handleValuesChange = (changedPart
            : Partial < API.AssessmentData >) => {

                setAssessmentData((prev) => ({
                    ...prev,
                    ...changedPart
                }));
                const numericValue = Number(option};
            ?.score ?? option

                ?.value ?? 0);

            const riskScoreSummary = useMemo(() => {
                type RiskOption = {

                    const scores = assessmentData.risk_scores || {};

                    const riskItems = configData
                        ?.risk_items || [];
                    return label const itemCount = riskItems.length;
                    ?{

                        label,

                        let total = 0;
                        value: Number.isFinite(numericValue)

                        let maxScore = 0;
                        ?numericValue: 0 riskItems.forEach((item) => {}

                        const selectedValue = Number(scores[item.item_name] ?? NaN);
                        :null;

                        if (!Number.isNaN(selectedValue)) {

                            total += selectedValue;
                        }) label: string;

                    }
                    import Overview from './components/Overview';

                    import Overview from './components/Overview';.filter((item)

                    const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {
                            : item is RiskOption => Boolean(item));

                            return option.value > acc
                                ? option.value
                                : acc;

                        }, 0);
                    }

                    maxScore += maxOptionScore;
                    value: number;

                });

            } catch (error) {

                const allFilled = itemCount > 0 && riskItems.every((item) => {

                    const value = scores[item.item_name];
                    return [];

                    return value !== undefined && value !== null && value !== '';
                };

            });

        }

        const factor = Number((total / 100).toFixed(2));

        const ratio = maxScore > 0
            ? total / maxScore
            : 0;
        return [];

        let level: string = '——';
    };

    if (allFilled && maxScore > 0) {

        if (ratio >= 0.7) {
            const parseRiskOptions = (optionsJson
                ? level = '高风险';
            :string) : RiskOption[] => {} else if (ratio >= 0.4) {
                type ConfigData = {

                    level = '中风险';
                    type ConfigData = {} else {

                        level = '低风险';
                        const EMPTY_ASSESSMENT: API.AssessmentData = {}

                    }
                    risk_scores: {},

                    if(!optionsJson) {

                        return {

                            total,
                            development_workload factor,
                            : [],

                            itemCount,

                            maxScore,
                            integration_workload: [],

                            level,
                            return [];

                        };
                        risk_items

                    },
                    [
                        assessmentData.risk_scores, configData
                            ?.risk_items
                    ]);
                    :API.RiskItemConfig[];

                    risk_items

                    const completedRiskCount = useMemo(() => {
                        : API.RiskItemConfig[];

                        const scores = assessmentData.risk_scores || {};

                        return Object
                            .values(scores)
                            .filter((value) => value !== undefined && value !== null && value !== '')
                            .length;
                        travel_months

                    }, [assessmentData.risk_scores]);
                    :0,

                    const steps = [
                        maintenance_months: 0 {}

                    title: '风险评分',

                    content: (maintenance_headcount
                    : 0, < RiskScoringForm form = {
                        form
                    }
                    risk_items
                    : [], initialValues = {
                        assessmentData
                    }
                    try {

                        configData = {
                            configData
                        }
                        roles

                        onValuesChange = {
                            (_, values) => handleValuesChange(values)
                        }
                        : API.RoleConfig[];

                        onNext = {
                            () => setCurrent(1)
                        }
                        roles

                        />                    : API.RoleConfig[];

      ),

    },                };

    {

      title: '工作量估算',                const parsed = JSON.parse(optionsJson);

      content: (

        <WorkloadEstimation                const NewAssessmentPage = () => {

          configData={configData!}

          initialValues={{                    const [form] = Form.useForm();

            dev: assessmentData.development_workload,                    if (Array.isArray(parsed)) {};

            integration: assessmentData.integration_workload,                };

          }}

          onWorkloadChange={(dev, integration) => handleValuesChange({                const [searchParams] = useSearchParams();

            development_workload: dev,

            integration_workload: integration,                const editId = searchParams.get('edit_id');

          })}                return parsed const [current, setCurrent] = useState(0);.map((option) => {

          onPrev={() => setCurrent(0)}

          onNext={() => setCurrent(2)}                    const [loading, setLoading] = useState(true);

        / >), const [configData, setConfigData] = useState < ConfigData | null > (null);

                    },
                    const label = option {
                        ?.label ?? option

                        title : '其他成本',
                            ?.name ?? '';

                        content: ( < OtherCostsForm const [assessmentData, setAssessmentData] = useState < API.AssessmentData > ({

                            form = {
                                form
                            }
                            ...EMPTY_ASSESSMENT initialValues = {
                                assessmentData
                            }
                        });

                        onValuesChange = {
                            handleValuesChange
                        }

                        onPrev = {
                            () => setCurrent(1)
                        }
                        const numericValue = Number(option onNext = {
                            () => setCurrent(3)
                        }
                            ?.score ?? option />
                                ?.value ?? 0);),
                        type RiskOption = {},
                        type RiskOption = {

                            {

                    title: '生成总览',
                                useEffect(() => {

                                        content
                                    : (

                                        < Overview const loadInitialData = async() => {

                                        assessmentData = {
                                            assessmentData
                                        }
                                        return label

                                        configData = {
                                            configData !
                                        }
                                            ? {

                                                onPrev = {
                                                    () => setCurrent(2)
                                                }
                                                label,

                                                />                                            value: Number.isFinite(numericValue)

      ),                                                ? numericValue

    },                                                : 0

  ];                                        }

                                        : null;

  const items = steps.map((item) => ({ key: item.title, title: item.title }));

                                    try {

  if (loading || !configData) {

    return (                                        setLoading(true);

      <PageContainer>                                    }) label

        <Spin tip="Loading...">                                    : string;

          <div style={{ minHeight: '500px' }} / > label</Spin>: string;</PageContainer>); // 加载配置数据        .filter((item): item is RiskOption => Boolean(item));

                                        }

                                        const configResult = await getConfigAll();

                                        return (<PageContainer> const nextConfig
                                        : ConfigData = {} < Card style = {{ marginBottom: 24 }} > value < Row gutter = {
                                            [16, 16]
                                        } >
                                        : number;

                                        <Col xs = {
                                            12
                                        }
                                        sm = {
                                            12
                                        }
                                        md = {
                                            6
                                        }
                                        lg = {
                                            6
                                        }
                                        xl = {
                                            6
                                        } > value < Statistic title = "风险总分" value = {
                                            riskScoreSummary.total
                                        }
                                        precision = {
                                            2
                                        } />
                                        : number;</Col> < Col xs = {
                                            12
                                        }
                                        sm = {
                                            12
                                        }
                                        md = {
                                            6
                                        }
                                        lg = {
                                            6
                                        }
                                        xl = {
                                            6
                                        } > risk_items < Statistic title = "评分因子" value = {
                                            riskScoreSummary.factor
                                        }
                                        precision = {
                                            2
                                        } />
                                        : Array.isArray(configResult</Col>
                                            ?.data < Col xs = {
                                                12
                                            }
                                            sm = {
                                                12
                                            }
                                            md = {
                                                6
                                            }
                                            lg = {
                                                6
                                            }
                                            xl = {
                                                6
                                            } >
                                                ?.risk_items) < Statistic title = "风险等级" value = {
                                            riskScoreSummary.level
                                        } />
                                            ?configResult.data.risk_items</Col>
                                            : [], < Col xs = {
                                            12
                                        }
                                        sm = {
                                            12
                                        }
                                        md = {
                                            6
                                        }
                                        lg = {
                                            6
                                        }
                                        xl = {
                                            6
                                        } > <Statistic roles: Array.isArray(configResult title = "已完成项"
                                            ?.data value = {
                                                completedRiskCount
                                            }
                                                ?.roles)suffix = {
                                            riskScoreSummary.itemCount
                                                ? `/ ${riskScoreSummary.itemCount}`
                                                : undefined
                                        }
                                            ? configResult.data.roles />
                                            : []</Col>
                                    } catch (error) {};</Row></Card> setConfigData(nextConfig);<Card> return [];

                                <Steps current = {
                                    current
                                }
                                items = {
                                    items
                                } />
                        };

                        <div style = {{ marginTop: 24 }} > {
                            steps[current].content
                        }</div>
                    };</Card></PageContainer> // 如果是编辑模式，加载项目数据  }

                    );

                };
                if (editId) {

                    export default NewAssessmentPage;
                    const projectResult = await getProjectDetail(editId);

                    return [];

                    if (projectResult
                        ?.data
                            ?.assessment_details_json) {

                        try {};

                        const parsedData = JSON.parse(projectResult.data.assessment_details_json)as Partial < API.AssessmentData >;

                        const normalizedData: API.AssessmentData = {
                            const parseRiskOptions = (optionsJson?
                            : string): RiskOption[] => {
                                const parseRiskOptions = (optionsJson?
                                : string): RiskOption[] => {

                                    ...EMPTY_ASSESSMENT,

                                    ...parsedData,
                                    const EMPTY_ASSESSMENT: API.AssessmentData = {

                                        risk_scores: parsedData
                                            ?.risk_scores ?? {},

                                        development_workload: Array.isArray(parsedData
                                            ?.development_workload)
                                                ? parsedData.development_workload
                                                : [],
                                        risk_scores: {},
                                        if(!optionsJson) {
                                            if (!optionsJson) {

                                                integration_workload
                                                : Array.isArray(parsedData
                                                    ?.integration_workload)
                                                        ? parsedData.integration_workload
                                                        : [],

                                                travel_months: Number(parsedData
                                                    ?.travel_months ?? 0),
                                                development_workload: [],

                                                maintenance_months: Number(parsedData
                                                    ?.maintenance_months ?? 0),

                                                maintenance_headcount: Number(parsedData
                                                    ?.maintenance_headcount ?? 0),
                                                integration_workload: [],
                                                return [];
                                                return [];

                                                risk_items: Array.isArray(parsedData
                                                    ?.risk_items)
                                                        ? parsedData.risk_items
                                                        : []
                                            };
                                            travel_months: 0,

                                            setAssessmentData(normalizedData);

                                            form.setFieldsValue(normalizedData);
                                            maintenance_months: 0
                                        }
                                    }

                                } catch (error) {

                                    message.error('项目评估数据解析失败，已加载空表单');
                                    maintenance_headcount
                                    : 0,

                                    setAssessmentData({
                                        ...EMPTY_ASSESSMENT
                                    });

                                    form.resetFields();
                                    risk_items
                                    : [],
                                    try {
                                        try {}

                                    }
                                };

                            } else {

                                setAssessmentData({
                                    ...EMPTY_ASSESSMENT
                                });
                                const parsed = JSON.parse(optionsJson);
                                const parsed = JSON.parse(optionsJson);

                                form.resetFields();

                                form.setFieldsValue({
                                    ...EMPTY_ASSESSMENT
                                }); // ====================================================================

                            }

                        } catch (error
                        : any) { // Main Page Component    if (Array.isArray(parsed)) {    if (Array.isArray(parsed)) {

                            console.error(error);

                            setConfigData({risk_items: [], roles: []}); // ====================================================================

                            message.error(error.message || '加载基础配置失败，请稍后重试');

                        } finally {
                            const NewAssessmentPage = () => {
                                return parsed return parsed

                                setLoading(false);

                            }
                            const [form] = Form.useForm();

                        };

                        const [searchParams] = useSearchParams();.map((option) => {.map((option) => {

                                loadInitialData();

                            }, [editId, form]);
                            const editId = searchParams.get('edit_id');

                            const handleValuesChange = (changedPart
                            : Partial < API.AssessmentData >) => {
                                const label = option
                                    ?.label ?? option
                                        ?.name ?? '';
                                const label = option
                                    ?.label ?? option
                                        ?.name ?? '';

                                setAssessmentData((prev) => ({
                                    ...prev,
                                    ...changedPart
                                }));

                            };
                            const [current, setCurrent] = useState(0);

                            const riskScoreSummary = useMemo(() => {
                                const [loading, setLoading] = useState(true);
                                const numericValue = Number(option
                                    ?.score ?? option
                                        ?.value ?? 0);
                                const numericValue = Number(option
                                    ?.score ?? option
                                        ?.value ?? 0);

                                const scores = assessmentData.risk_scores || {};

                                const riskItems = configData
                                    ?.risk_items || [];
                                const [configData, setConfigData] = useState < ConfigData | null > (null);

                                const itemCount = riskItems.length;

                                const [assessmentData, setAssessmentData] = useState < API.AssessmentData > ({
                                    ...EMPTY_ASSESSMENT
                                });
                                return label
                                    ? {
                                        label,
                                        value: Number.isFinite(numericValue)
                                            ? numericValue
                                            : 0
                                    }
                                    : null;
                                return label
                                    ? {
                                        label,
                                        value: Number.isFinite(numericValue)
                                            ? numericValue
                                            : 0
                                    }
                                    : null;

                                let total = 0;

                                let maxScore = 0;

                                riskItems.forEach((item) => {
                                    useEffect(() => {})
                                })

                                const selectedValue = Number(scores[item.item_name] ?? NaN);

                                if (!Number.isNaN(selectedValue)) {
                                    const loadInitialData = async() => {

                                        total += selectedValue;

                                    }
                                    try {
                                            .filter((item)
                                            : item is RiskOption => Boolean(item));
                                            .filter((item)
                                            : item is RiskOption => Boolean(item));

                                        const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {
                                            setLoading(true);

                                            return option.value > acc
                                                ? option.value
                                                : acc;

                                        }, 0);
                                    }
                                }

                                maxScore += maxOptionScore;

                            }); // 加载配置数据

                            const allFilled = itemCount > 0 && riskItems.every((item) => {
                                const configResult = await getConfigAll();
                            } catch (error) {} catch (error) {

                                const value = scores[item.item_name];

                                return value !== undefined && value !== null && value !== '';
                                const nextConfig: ConfigData = {});

                                risk_items
                                : Array.isArray(configResult
                                    ?.data
                                        ?.risk_items)
                                    ? configResult.data.risk_items
                                    : [],
                                return [];
                                return [];

                                const factor = Number((total / 100).toFixed(2));

                                const ratio = maxScore > 0
                                    ? total / maxScore
                                    : 0;
                                roles: Array.isArray(configResult
                                    ?.data
                                        ?.roles)
                                    ? configResult.data.roles
                                    : [],

                                let level: string = '——';
                            };
                        }}

                    if (allFilled && maxScore > 0) {

                        if (ratio >= 0.7) {
                            setConfigData(nextConfig);

                            level = '高风险';

                        } else if (ratio >= 0.4) {
                            return [];
                            return [];

                            level = '中风险';

                        } else { // 如果是编辑模式，加载项目数据

                            level = '低风险';

                        }
                        if (editId) {};
                    };

                }

                const projectResult = await getProjectDetail(editId);

                return {

                    total,
                    if(projectResult
                        ?.data
                            ?.assessment_details_json) {

                        factor,

                        itemCount,
                        try {

                            maxScore,

                            level,
                            const parsedData = JSON.parse(projectResult.data.assessment_details_json)as Partial < API.AssessmentData >;
                            const EMPTY_ASSESSMENT: API.AssessmentData = {
                                    const EMPTY_ASSESSMENT: API.AssessmentData = {};

                                },
                                [
                                    assessmentData.risk_scores, configData
                                        ?.risk_items
                                ]);
                            const normalizedData: API.AssessmentData = {

                                const completedRiskCount = useMemo(() => {
                                    ...EMPTY_ASSESSMENT,
                                    risk_scores: {},
                                    risk_scores: {},

                                    const scores = assessmentData.risk_scores || {};

                                    return Object
                                        .values(scores)
                                        .filter((value) => value !== undefined && value !== null && value !== '')
                                        .length;
                                    ...parsedData
                                }, [assessmentData.risk_scores]);

                                risk_scores: parsedData
                                    ?.risk_scores ?? {},
                                development_workload: [],
                                development_workload: [],

                                const steps = [

                            {
                                            development_workload: Array.isArray(parsedData
                                                ?.development_workload)
                                                    ? parsedData.development_workload
                                                    : [],

                                            title: '风险评分',

                                            content: (integration_workload
                                            : Array.isArray(parsedData
                                                ?.integration_workload)
                                                    ? parsedData.integration_workload
                                                    : [],
                                            integration_workload: [],
                                            integration_workload: [], < RiskScoringForm form = {
                                                form
                                            }
                                            travel_months: Number(parsedData
                                                ?.travel_months ?? 0),

                                            initialValues = {
                                                assessmentData
                                            }

                                            configData = {
                                                configData
                                            }
                                            maintenance_months: Number(parsedData
                                                ?.maintenance_months ?? 0),
                                            travel_months: 0,
                                            travel_months: 0,

                                            onValuesChange = {
                                                (_, values) => handleValuesChange(values)
                                            }

                                            onNext = {
                                                () => setCurrent(1)
                                            }
                                            maintenance_headcount: Number(parsedData
                                                ?.maintenance_headcount ?? 0),

                                            />

      ),                risk_items: Array.isArray(parsedData?.risk_items) ? parsedData.risk_items : [],  maintenance_months: 0,  maintenance_months: 0,

    },

    {              };

      title: '工作量估算',

      content: (              setAssessmentData(normalizedData);  maintenance_headcount: 0,  maintenance_headcount: 0,

        <WorkloadEstimation

          configData={configData!}              form.setFieldsValue(normalizedData);

          initialValues={{

            dev: assessmentData.development_workload,            } catch (error) {  risk_items: [],  risk_items: [],

            integration: assessmentData.integration_workload,

          }}              message.error('项目评估数据解析失败,已加载空表单');

          onWorkloadChange={(dev, integration) => handleValuesChange({

            development_workload: dev,              setAssessmentData({ ...EMPTY_ASSESSMENT });};};

            integration_workload: integration,

          })}              form.resetFields();

          onPrev={() => setCurrent(0)}

          onNext={() => setCurrent(2)}            }

        / >)
                                        }

                                    }, {} else {
                                        // ====================================================================// ====================================================================

                                        title
                                        : '其他成本',

                                        content: (setAssessmentData({
                                            ...EMPTY_ASSESSMENT
                                        });

                                        <OtherCostsForm form = {
                                            form
                                        }
                                        form.resetFields(); // Main Page Component// Main Page Component

                                                initialValues = {
                                            assessmentData
                                        }

                                        onValuesChange = {
                                            handleValuesChange
                                        }
                                        form.setFieldsValue({
                                            ...EMPTY_ASSESSMENT
                                        });

                                        onPrev = {
                                            () => setCurrent(1)
                                        }

                                        onNext = {
                                            () => setCurrent(3)
                                        }
                                    } // ====================================================================// ====================================================================

                                />

      ),      } catch (error: any) {

    },

    {        console.error(error);const NewAssessmentPage = () => {const NewAssessmentPage = () => {

      title: '生成总览',

      content: (        setConfigData({ risk_items: [], roles: [] });

        <Overview 

          assessmentData={assessmentData}         message.error(error.message || '加载基础配置失败,请稍后重试');  const [form] = Form.useForm();  const fillTestData = () => {

          configData={configData!} 

          onPrev={() => setCurrent(2)}       } finally {

        / >),
                                setLoading(false);
                                const [searchParams] = useSearchParams();
                                const testScores: Record<string, number> = {};

                            }
                        ];
                    }

                    const items = steps.map((item) => ({key: item.title, title: item.title}));
                };
                const editId = searchParams.get('edit_id');

                if (loading || !configData) {

                    return (

                            <PageContainer> loadInitialData();
                    (configData
                        ?.risk_items ?? []).forEach((item) => { < Spin tip = "Loading..." > <div style = {{ minHeight: '500px' }}/>  }, [editId, form]);

        </Spin > </PageContainer> const [current, setCurrent] = useState(0);
                            const options = parseRiskOptions(item.options_json););

                        }
                        const handleValuesChange = (changedPart
                        : Partial < API.AssessmentData >) => {

                            return (
                        setAssessmentData((prev) => ({
                                ...prev,
                                ...changedPart
                            }));
                            const [loading, setLoading] = useState(true);
                            if (options.length > 0) {<PageContainer> < Card style = {{ marginBottom: 24 }} >
                        };

                        <Row gutter = {
                            [16, 16]
                        } > <Col xs = {
                            12
                        }
                        sm = {
                            12
                        }
                        md = {
                            6
                        }
                        lg = {
                            6
                        }
                        xl = {
                            6
                        } > const [configData, setConfigData] = useState < ConfigData | null > (null);
                        const presetIndex = options.length > 2
                            ? 1
                            : 0;

                        <Statistic title = "风险总分" value = {
                            riskScoreSummary.total
                        }
                        precision = {
                            2
                        } /> </Col> const riskScoreSummary = useMemo(() => { < Col xs = {
                                12
                            }
                            sm = {
                                12
                            }
                            md = {
                                6
                            }
                            lg = {
                                6
                            }
                            xl = {
                                6
                            } > <Statistic title = "评分因子" value = {
                                riskScoreSummary.factor
                            }
                            precision = {
                                2
                            } /> const scores = assessmentData.risk_scores || {};
                            const [assessmentData, setAssessmentData] = useState < API.AssessmentData > ({
                                ...EMPTY_ASSESSMENT
                            });
                            testScores[item.item_name] = options[presetIndex].value;</Col> < Col xs = {
                                12
                            }
                            sm = {
                                12
                            }
                            md = {
                                6
                            }
                            lg = {
                                6
                            }
                            xl = {
                                6
                            } > const riskItems = configData
                                ?.risk_items || [];

                            <Statistic title = "风险等级" value = {
                                riskScoreSummary.level
                            } /> </Col> const itemCount = riskItems.length;
                        } < Col xs = {
                            12
                        }
                        sm = {
                            12
                        }
                        md = {
                            6
                        }
                        lg = {
                            6
                        }
                        xl = {
                            6
                        } > <Statistic title = "已完成项" value = {
                            completedRiskCount
                        }
                        let total = 0;
                        useEffect(() => {});

                        suffix = {
                            riskScoreSummary.itemCount
                                ? `/ ${riskScoreSummary.itemCount}`
                                : undefined
                        } /> let maxScore = 0;</Col></Row> const loadInitialData = async() => {</Card><Card> riskItems.forEach((item) => { < Steps current = {
                                    current
                                }
                                items = {
                                    items
                                } /> <div style = {{ marginTop: 24 }} > {
                                    steps[current].content
                                }</div> const selectedValue = Number(scores[item.item_name] ?? NaN);
                                try {
                                    form.setFieldsValue({risk_scores: testScores});</Card></PageContainer> if (!Number.isNaN(selectedValue)) {);

                                    };
                                    total += selectedValue;
                                    setLoading(true);
                                    onValuesChange({}, {risk_scores: testScores});

                                    export default NewAssessmentPage;
                                }};

                            const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {

                                return option.value > acc
                                    ? option.value
                                    : acc; // 加载配置数据

                            }, 0);

                            maxScore += maxOptionScore;
                            const configResult = await getConfigAll();
                            return (});

                        const nextConfig: ConfigData = { < ProForm const allFilled = itemCount > 0 && riskItems.every((item) => {

                                const value = scores[item.item_name];
                                risk_items
                                : Array.isArray(configResult
                                    ?.data
                                        ?.risk_items)
                                    ? configResult.data.risk_items
                                    : [],
                                form = {
                                    form
                                }

                                return value !== undefined && value !== null && value !== '';

                            });
                            roles: Array.isArray(configResult
                                ?.data
                                    ?.roles)
                                ? configResult.data.roles
                                : [],
                            layout = "vertical" const factor = Number((total / 100).toFixed(2));
                        };
                        grid const ratio = maxScore > 0
                            ? total / maxScore
                            : 0;

                        setConfigData(nextConfig);
                        rowProps = {{ gutter: 16 }}

                        let level: string = '——';

                        if (allFilled && maxScore > 0) {
                            onValuesChange = {
                                onValuesChange
                            }

                            if (ratio >= 0.7) {

                                level = '高风险'; // 如果是编辑模式，加载项目数据      initialValues={initialValues}

                            } else if (ratio >= 0.4) {

                                level = '中风险';
                                if (editId) {
                                    onFinish = {
                                        async() => {} else {

                                            level = '低风险';
                                            const projectResult = await getProjectDetail(editId);
                                            onNext();

                                        }

                                    }
                                    if (projectResult
                                        ?.data
                                            ?.assessment_details_json) {
                                        return true;

                                        return {try {}}

                                        total,

                                        factor,
                                        const parsedData = JSON.parse(projectResult.data.assessment_details_json)as Partial < API.AssessmentData >;
                                        submitter = {{

      itemCount,

      maxScore,              const normalizedData: API.AssessmentData = {        searchConfig: { submitText: '下一步' },

      level,

    };                ...EMPTY_ASSESSMENT,        render: (_, dom) => (

  }, [assessmentData.risk_scores, configData?.risk_items]);

                ...parsedData,          <div style={{ marginTop: 16, textAlign: 'right' }}>

  const completedRiskCount = useMemo(() => {

    const scores = assessmentData.risk_scores || {};                risk_scores: parsedData?.risk_scores ?? {},            <Space>

    return Object.values(scores).filter((value) => value !== undefined && value !== null && value !== '').length;

  }, [assessmentData.risk_scores]);                development_workload: Array.isArray(parsedData?.development_workload) ? parsedData.development_workload : [],              <Button onClick={fillTestData}>一键填充样例数据</Button>



  const steps = [                integration_workload: Array.isArray(parsedData?.integration_workload) ? parsedData.integration_workload : [],              {dom}

    {

      title: '风险评分',                travel_months: Number(parsedData?.travel_months ?? 0),            </Space>

      content: (

        <RiskScoringForm                maintenance_months: Number(parsedData?.maintenance_months ?? 0),          </div>

          form={form}

          initialValues={assessmentData}                maintenance_headcount: Number(parsedData?.maintenance_headcount ?? 0),        ),

          configData={configData}

          onValuesChange={(_, values) => handleValuesChange(values)}                risk_items: Array.isArray(parsedData?.risk_items) ? parsedData.risk_items : [],      }}

          onNext={() => setCurrent(1)}

        />              };    >

      ),

    },              setAssessmentData(normalizedData);      {(configData?.risk_items ?? []).map((item) => (

    {

      title: '工作量估算',              form.setFieldsValue(normalizedData);        <ProFormSelect

      content: (

        <WorkloadEstimation            } catch (error) {          key={item.id}

          configData={configData!}

          initialValues={{              message.error('项目评估数据解析失败，已加载空表单');          name={['risk_scores', item.item_name]}

            dev: assessmentData.development_workload,

            integration: assessmentData.integration_workload,              setAssessmentData({ ...EMPTY_ASSESSMENT });          label={`${item.category} - ${item.item_name}`}

          }}

          onWorkloadChange={(dev, integration) => handleValuesChange({              form.resetFields();          placeholder="请选择风险评分"

            development_workload: dev,

            integration_workload: integration,            }          colProps={{ span: 8 }}

          })}

          onPrev={() => setCurrent(0)}          }          options={parseRiskOptions(item.options_json)}

          onNext={() => setCurrent(2)}

        />        } else {          rules={[{ required: true, message: '此项为必选项' }]}

      ),

    },          setAssessmentData({ ...EMPTY_ASSESSMENT });        />

    {

      title: '其他成本',          form.resetFields();      ))}

      content: (

        <OtherCostsForm           form.setFieldsValue({ ...EMPTY_ASSESSMENT });    </ProForm>

          form={form} 

          initialValues={assessmentData}         }  );

          onValuesChange={handleValuesChange}

          onPrev={() => setCurrent(1)}      } catch (error: any) {};

          onNext={() => setCurrent(3)}

        />        console.error(error);

      ),

    },        setConfigData({ risk_items: [], roles: [] });// ====================================================================

    {

      title: '生成总览',        message.error(error.message || '加载基础配置失败，请稍后重试');// Sub-Component: Workload Estimation Tables

      content: (

        <Overview       } finally {// ====================================================================

          assessmentData={assessmentData} 

          configData={configData!}         setLoading(false);const WorkloadEstimation = ({

          onPrev={() => setCurrent(2)} 

        />      }  configData,

      ),

    },    };  initialValues,

  ];

  onWorkloadChange,

  const items = steps.map((item) => ({ key: item.title, title: item.title }));

    loadInitialData();  onPrev,

  if (loading || !configData) {

    return (  }, [editId, form]);  onNext,

      <PageContainer>

        <Spin tip="Loading...">}: {

          <div style={{ minHeight: '500px' }} />

        </Spin>  const handleValuesChange = (changedPart: Partial<API.AssessmentData>) => {  configData: ConfigData;

      </PageContainer>

    );    setAssessmentData((prev) => ({ ...prev, ...changedPart }));  initialValues: { dev: WorkloadRecord[]; integration: WorkloadRecord[] };

  }

  };  onWorkloadChange: (dev: WorkloadRecord[], integration: WorkloadRecord[]) => void;

  return (

    <PageContainer>  onPrev: () => void;

      <Card style={{ marginBottom: 24 }}>

        <Row gutter={[16, 16]}>  const riskScoreSummary = useMemo(() => {  onNext: () => void;

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>

            <Statistic title="风险总分" value={riskScoreSummary.total} precision={2} />    const scores = assessmentData.risk_scores || {};}) => {

          </Col>

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>    const riskItems = configData?.risk_items || [];  const roles = configData.roles ?? [];

            <Statistic title="评分因子" value={riskScoreSummary.factor} precision={2} />

          </Col>    const itemCount = riskItems.length;

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>

            <Statistic title="风险等级" value={riskScoreSummary.level} />  const createRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

          </Col>

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>    let total = 0;

            <Statistic

              title="已完成项"    let maxScore = 0;  const normalizeRow = (row: WorkloadRecord): WorkloadRecord => {

              value={completedRiskCount}

              suffix={riskScoreSummary.itemCount ? `/ ${riskScoreSummary.itemCount}` : undefined}    let totalRoleDays = 0;

            />

          </Col>    riskItems.forEach((item) => {    const nextRow: WorkloadRecord = { ...row };

        </Row>

      </Card>      const selectedValue = Number(scores[item.item_name] ?? NaN);    roles.forEach((role) => {

      <Card>

        <Steps current={current} items={items} />      if (!Number.isNaN(selectedValue)) {      const value = Number(nextRow[role.role_name] ?? 0);

        <div style={{ marginTop: 24 }}>{steps[current].content}</div>

      </Card>        total += selectedValue;      nextRow[role.role_name] = Number.isFinite(value) ? value : 0;

    </PageContainer>

  );      }      totalRoleDays += Number.isFinite(value) ? value : 0;

};

    });

export default NewAssessmentPage;

      const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {    const factor = Number(nextRow.delivery_factor ?? 1);

        return option.value > acc ? option.value : acc;    nextRow.delivery_factor = Number.isFinite(factor) ? Number(factor.toFixed(2)) : 1;

      }, 0);    const fallbackWorkload = totalRoleDays * (nextRow.delivery_factor ?? 1);

      maxScore += maxOptionScore;    const workloadInput = Number(nextRow.workload ?? fallbackWorkload);

    });    const normalizedWorkload = Number.isFinite(workloadInput) ? workloadInput : fallbackWorkload;

    nextRow.workload = Number(normalizedWorkload.toFixed(1));

    const allFilled = itemCount > 0 && riskItems.every((item) => {    return nextRow;

      const value = scores[item.item_name];  };

      return value !== undefined && value !== null && value !== '';

    });  const normalizeList = (list: WorkloadRecord[]) => list.map((row) => normalizeRow(row));



    const factor = Number((total / 100).toFixed(2));  const [devWorkload, setDevWorkload] = useState<WorkloadRecord[]>(normalizeList(initialValues.dev || []));

    const ratio = maxScore > 0 ? total / maxScore : 0;  const [integrationWorkload, setIntegrationWorkload] = useState<WorkloadRecord[]>(normalizeList(initialValues.integration || []));

  const [devEditableKeys, setDevEditableKeys] = useState<Key[]>([]);

    let level: string = '——';  const [integrationEditableKeys, setIntegrationEditableKeys] = useState<Key[]>([]);

    if (allFilled && maxScore > 0) {

      if (ratio >= 0.7) {  useEffect(() => {

        level = '高风险';    const normalizedDev = normalizeList(initialValues.dev || []);

      } else if (ratio >= 0.4) {    setDevWorkload(normalizedDev);

        level = '中风险';    setDevEditableKeys([]);

      } else {

        level = '低风险';    const normalizedIntegration = normalizeList(initialValues.integration || []);

      }    setIntegrationWorkload(normalizedIntegration);

    }    setIntegrationEditableKeys([]);

  }, [initialValues.dev, initialValues.integration, roles.length]);

    return {

      total,  const handleDevChange = (list: WorkloadRecord[]) => {

      factor,    const normalized = normalizeList(list);

      itemCount,    setDevWorkload(normalized);

      maxScore,    onWorkloadChange(normalized, integrationWorkload);

      level,  };

    };

  }, [assessmentData.risk_scores, configData?.risk_items]);  const handleIntegrationChange = (list: WorkloadRecord[]) => {

    const normalized = normalizeList(list);

  const completedRiskCount = useMemo(() => {    setIntegrationWorkload(normalized);

    const scores = assessmentData.risk_scores || {};    onWorkloadChange(devWorkload, normalized);

    return Object.values(scores).filter((value) => value !== undefined && value !== null && value !== '').length;  };

  }, [assessmentData.risk_scores]);

  const removeRow = (type: 'dev' | 'integration', id: string) => {

  const steps = [    if (type === 'dev') {

    {      handleDevChange(devWorkload.filter((row) => row.id !== id));

      title: '风险评分',      setDevEditableKeys((prev) => prev.filter((key) => key !== id));

      content: (    } else {

        <RiskScoringForm      handleIntegrationChange(integrationWorkload.filter((row) => row.id !== id));

          form={form}      setIntegrationEditableKeys((prev) => prev.filter((key) => key !== id));

          initialValues={assessmentData}    }

          configData={configData}  };

          onValuesChange={(_, values) => handleValuesChange(values)}

          onNext={() => setCurrent(1)}  const handleShowDetail = (record: WorkloadRecord) => {

        />    message.info('详情功能正在设计中');

      ),    console.log('详情预览', record);

    },  };

    {

      title: '工作量估算',  const fillSampleData = () => {

      content: (    const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

        <WorkloadEstimation    

          configData={configData!}    // 模拟新功能开发数据（参考CSV中的碳资产管理子系统）

          initialValues={{    const sampleDevData: WorkloadRecord[] = [

            dev: assessmentData.development_workload,      {

            integration: assessmentData.integration_workload,        id: createId(),

          }}        module1: '碳资产管理子系统',

          onWorkloadChange={(dev, integration) => handleValuesChange({        module2: '(1) 碳资产总览',

            development_workload: dev,        module3: '能碳量汇总展示',

            integration_workload: integration,        description: '系统支持全区能碳量汇总并展示，包括能耗及碳排放数据',

          })}        delivery_factor: 0.7,

          onPrev={() => setCurrent(0)}        workload: 7.9,

          onNext={() => setCurrent(2)}        ...(roles.reduce((acc, role) => {

        />          const roleData: { [key: string]: number } = {

      ),            '项目经理': 1.5, '技术经理': 1.2, 'UI': 0.8, 'DBA': 0.5,

    },            '产品经理': 1, '后端': 2.5, '前端': 1.8, '测试': 1.2, '实施': 0.8

    {          };

      title: '其他成本',          acc[role.role_name] = roleData[role.role_name] || 0;

      content: (          return acc;

        <OtherCostsForm         }, {} as Record<string, number>))

          form={form}       },

          initialValues={assessmentData}       {

          onValuesChange={handleValuesChange}        id: createId(),

          onPrev={() => setCurrent(1)}        module1: '碳资产管理子系统',

          onNext={() => setCurrent(3)}        module2: '(1) 碳资产总览',

        />        module3: '碳排放数据展示',

      ),        description: '系统支持汇总并全面展示园区的碳排放数据功能',

    },        delivery_factor: 0.7,

    {        workload: 6.0,

      title: '生成总览',        ...(roles.reduce((acc, role) => {

      content: (          const roleData: { [key: string]: number } = {

        <Overview             '项目经理': 1, '技术经理': 0.8, 'UI': 0.6, 'DBA': 0.3,

          assessmentData={assessmentData}             '产品经理': 0.8, '后端': 2, '前端': 1.5, '测试': 1, '实施': 0.6

          configData={configData!}           };

          onPrev={() => setCurrent(2)}           acc[role.role_name] = roleData[role.role_name] || 0;

        />          return acc;

      ),        }, {} as Record<string, number>))

    },      },

  ];      {

        id: createId(),

  const items = steps.map((item) => ({ key: item.title, title: item.title }));        module1: '碳资产管理子系统',

        module2: '(2) 碳资产管理',

  if (loading || !configData) {        module3: '排放源配置',

    return (        description: '系统支持园区根据自身行业类型及排放源种类配置排放源品种功能',

      <PageContainer>        delivery_factor: 0.7,

        <Spin tip="Loading...">        workload: 3.9,

          <div style={{ minHeight: '500px' }} />        ...(roles.reduce((acc, role) => {

        </Spin>          const roleData: { [key: string]: number } = {

      </PageContainer>            '项目经理': 0.6, '技术经理': 0.8, 'UI': 0.4, 'DBA': 0.2,

    );            '产品经理': 0.6, '后端': 1.2, '前端': 0.8, '测试': 0.6, '实施': 0.3

  }          };

          acc[role.role_name] = roleData[role.role_name] || 0;

  return (          return acc;

    <PageContainer>        }, {} as Record<string, number>))

      <Card style={{ marginBottom: 24 }}>      }

        <Row gutter={[16, 16]}>    ];

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>

            <Statistic title="风险总分" value={riskScoreSummary.total} precision={2} />    // 模拟系统对接数据（参考CSV中的系统对接必须项）

          </Col>    const sampleIntegrationData: WorkloadRecord[] = [

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>      {

            <Statistic title="评分因子" value={riskScoreSummary.factor} precision={2} />        id: createId(),

          </Col>        module1: '系统对接（必须）',

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>        module2: '能源数据采集',

            <Statistic title="风险等级" value={riskScoreSummary.level} />        module3: '电表数据采集系统',

          </Col>        description: '实时获取电表计量数据',

          <Col xs={12} sm={12} md={6} lg={6} xl={6}>        delivery_factor: 1,

            <Statistic        workload: 10.5,

              title="已完成项"        ...(roles.reduce((acc, role) => {

              value={completedRiskCount}          const roleData: { [key: string]: number } = {

              suffix={riskScoreSummary.itemCount ? `/ ${riskScoreSummary.itemCount}` : undefined}            '项目经理': 1.5, '技术经理': 2, 'UI': 0, 'DBA': 0.5,

            />            '产品经理': 1, '后端': 3, '前端': 1, '测试': 1.5, '实施': 0

          </Col>          };

        </Row>          acc[role.role_name] = roleData[role.role_name] || 0;

      </Card>          return acc;

      <Card>        }, {} as Record<string, number>))

        <Steps current={current} items={items} />      },

        <div style={{ marginTop: 24 }}>{steps[current].content}</div>      {

      </Card>        id: createId(),

    </PageContainer>        module1: '系统对接（必须）',

  );        module2: '能源数据采集',

};        module3: '用水采集装置',

        description: '实时获取用水数据',

export default NewAssessmentPage;        delivery_factor: 1,

        workload: 8.1,
        ...(roles.reduce((acc, role) => {
          const roleData: { [key: string]: number } = {
            '项目经理': 1.2, '技术经理': 1.8, 'UI': 0, 'DBA': 0.4,
            '产品经理': 1, '后端': 2.5, '前端': 0, '测试': 1.2, '实施': 0
          };
          acc[role.role_name] = roleData[role.role_name] || 0;
          return acc;
        }, {} as Record<string, number>))
      },
      {
        id: createId(),
        module1: '系统集成',
        module2: '用户组织机构集成',
        module3: '组织机构',
        description: '用户组织机构集成',
        delivery_factor: 1,
        workload: 7.9,
        ...(roles.reduce((acc, role) => {
          const roleData: { [key: string]: number } = {
            '项目经理': 2, '技术经理': 0.3, 'UI': 0, 'DBA': 1.5,
            '产品经理': 1, '后端': 0.6, '前端': 1.5, '测试': 1, '实施': 0
          };
          acc[role.role_name] = roleData[role.role_name] || 0;
          return acc;
        }, {} as Record<string, number>))
      }
    ];

    const normalizedDev = normalizeList(sampleDevData);
    const normalizedIntegration = normalizeList(sampleIntegrationData);
    
    setDevWorkload(normalizedDev);
    setIntegrationWorkload(normalizedIntegration);
    onWorkloadChange(normalizedDev, normalizedIntegration);
    
    message.success('已填充样例数据');
  };

  const baseColumns: ProColumns<WorkloadRecord>[] = [
    {
      title: '一级模块',
      dataIndex: 'module1',
      width: 140,
      formItemProps: {
        rules: [{ required: true, message: '请输入一级模块' }],
      },
    },
    {
      title: '二级模块',
      dataIndex: 'module2',
      width: 140,
      formItemProps: {
        rules: [{ required: true, message: '请输入二级模块' }],
      },
    },
    {
      title: '三级模块',
      dataIndex: 'module3',
      width: 140,
      formItemProps: {
        rules: [{ required: true, message: '请输入三级模块' }],
      },
    },
    {
      title: '功能说明',
      dataIndex: 'description',
      width: 240,
      formItemProps: {
        rules: [{ required: true, message: '请输入功能说明' }],
      },
    },
  ];

  const roleColumns: ProColumns<WorkloadRecord>[] = roles.map((role) => ({
    title: role.role_name,
    dataIndex: role.role_name,
    valueType: 'digit',
    width: 120,
    fieldProps: {
      min: 0,
      precision: 2,
    },
  }));

  const otherColumns: ProColumns<WorkloadRecord>[] = [
    {
      title: '交付系数',
      dataIndex: 'delivery_factor',
      valueType: 'digit',
      width: 120,
      fieldProps: {
        min: 0,
        precision: 2,
      },
      formItemProps: {
        rules: [{ required: true, message: '请输入交付系数' }],
      },
    },
    {
      title: '工时 (人/天)',
      dataIndex: 'workload',
      width: 140,
      valueType: 'digit',
      fieldProps: {
        min: 0,
        precision: 1,
      },
    },
  ];

  const buildOperationRender = (type: 'dev' | 'integration') => (
    _: unknown,
    record: WorkloadRecord,
    __: number,
    action?: ActionType,
  ) => {
    const currentEditableKeys = type === 'dev' ? devEditableKeys : integrationEditableKeys;
    const isEditing = currentEditableKeys.includes(record.id);
    if (isEditing) {
      return [
        <a key="detail" onClick={() => handleShowDetail(record)}>
          详情
        </a>,
        <a key="save" onClick={() => action?.save?.(record.id)}>
          保存
        </a>,
        <a key="cancel" onClick={() => action?.cancelEditable?.(record.id)}>
          取消
        </a>,
        <a key="delete" onClick={() => removeRow(type, record.id)}>
          删除
        </a>,
      ];
    }
    return [
      <a key="detail" onClick={() => handleShowDetail(record)}>
        详情
      </a>,
      <a key="edit" onClick={() => action?.startEditable?.(record.id)}>
        编辑
      </a>,
      <a key="delete" onClick={() => removeRow(type, record.id)}>
        删除
      </a>,
    ];
  };

  const devColumns: ProColumns<WorkloadRecord>[] = [
    ...baseColumns,
    ...roleColumns,
    ...otherColumns,
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: buildOperationRender('dev'),
    },
  ];

  const integrationColumns: ProColumns<WorkloadRecord>[] = [
    ...baseColumns,
    ...roleColumns,
    ...otherColumns,
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: buildOperationRender('integration'),
    },
  ];

  return (
    <>
      <Tabs
        defaultActiveKey="development"
        items={[
          {
            key: 'development',
            label: '新功能开发',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button onClick={fillSampleData}>一键填充样例数据</Button>
                </div>
                <EditableProTable<WorkloadRecord>
                  rowKey="id"
                  columns={devColumns}
                  value={devWorkload}
                  onChange={handleDevChange}
                  recordCreatorProps={{
                    position: 'bottom',
                    record: () => ({
                      id: createRowId(),
                      delivery_factor: 1,
                      workload: 0,
                    }),
                    creatorButtonText: '新增功能项',
                  }}
                  editable={{
                    type: 'multiple',
                    editableKeys: devEditableKeys,
                    onChange: setDevEditableKeys,
                  }}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </>
            ),
          },
          {
            key: 'integration',
            label: '系统对接工作量',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button onClick={fillSampleData}>一键填充样例数据</Button>
                </div>
                <EditableProTable<WorkloadRecord>
                  rowKey="id"
                  columns={integrationColumns}
                  value={integrationWorkload}
                  onChange={handleIntegrationChange}
                  recordCreatorProps={{
                    position: 'bottom',
                    record: () => ({
                      id: createRowId(),
                      delivery_factor: 1,
                      workload: 0,
                    }),
                    creatorButtonText: '新增对接项',
                  }}
                  editable={{
                    type: 'multiple',
                    editableKeys: integrationEditableKeys,
                    onChange: setIntegrationEditableKeys,
                  }}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </>
            ),
          },
        ]}
      />
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={onPrev}>上一步</Button>
          <Button type="primary" onClick={onNext}>下一步</Button>
        </Space>
      </div>
    </>
  );
};

// ====================================================================
// Sub-Component: Other Costs Form
// ====================================================================
const OtherCostsForm = ({ 
  form, 
  initialValues, 
  onValuesChange,
  onPrev,
  onNext,
}: { 
  form: FormInstance; 
  initialValues: AssessmentData; 
  onValuesChange: (values: Partial<AssessmentData>) => void;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <>
    <ProForm
      form={form}
      layout="vertical"
      onValuesChange={(_, values) => onValuesChange(values as Partial<AssessmentData>)}
      submitter={false}
      initialValues={initialValues}
    >
      <ProForm.Group title="差旅成本">
        <ProFormDigit name="travel_months" label="差旅月数" />
      </ProForm.Group>
      <ProForm.Group title="运维成本">
        <ProFormDigit name="maintenance_months" label="运维月数" />
        <ProFormDigit name="maintenance_headcount" label="平均每月投入人数" />
      </ProForm.Group>
      <ProFormList
        name="risk_items"
        label="风险成本"
        creatorButtonProps={{ creatorButtonText: '新增风险项' }}
        recordCreatorProps={{
          newRecordType: 'dataSource',
          record: () => ({ id: Date.now(), content: '', cost: 0 }),
        }}
      >
        <ProForm.Group>
          <ProFormText name="content" label="风险内容" rules={[{ required: true }]} />
          <ProFormDigit name="cost" label="预估费用 (万元)" rules={[{ required: true }]} />
        </ProForm.Group>
      </ProFormList>
    </ProForm>
    <div style={{ marginTop: 24, textAlign: 'right' }}>
      <Space>
        <Button onClick={onPrev}>上一步</Button>
        <Button type="primary" onClick={onNext}>下一步</Button>
      </Space>
    </div>
  </>
);

// ====================================================================
// Sub-Component: Overview and Save
// ====================================================================
const Overview = ({ 
  assessmentData, 
  configData,
  onPrev,
}: { 
  assessmentData: AssessmentData; 
  configData: ConfigData;
  onPrev: () => void;
}) => {
  const [calculationResult, setCalculationResult] = useState<API.CalculationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCalculate = async () => {
    try {
      const payload: API.CalculateParams = {
        ...assessmentData,
        roles: configData.roles,
      };
      
      const result = await calculateProjectCost(payload);
      setCalculationResult(result.data);
      message.success('报价计算成功');
    } catch (error) {
      console.error('计算报价失败:', error);
      message.error('计算报价失败，请检查输入数据');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={onPrev}>上一步</Button>
      </div>
      <Button type="primary" onClick={handleCalculate} style={{ marginBottom: 24 }}>
        计算最新报价
      </Button>
      {calculationResult && (
        <>
          <Descriptions bordered>
            <Descriptions.Item label="软件研发成本" span={3}><Statistic value={calculationResult.software_dev_cost} suffix="万元" /></Descriptions.Item>
            <Descriptions.Item label="系统对接成本" span={3}><Statistic value={calculationResult.system_integration_cost} suffix="万元" /></Descriptions.Item>
            <Descriptions.Item label="差旅成本" span={3}><Statistic value={calculationResult.travel_cost} suffix="万元" /></Descriptions.Item>
            <Descriptions.Item label="运维成本" span={3}><Statistic value={calculationResult.maintenance_cost} suffix="万元" /></Descriptions.Item>
            <Descriptions.Item label="风险成本" span={3}><Statistic value={calculationResult.risk_cost} suffix="万元" /></Descriptions.Item>
            <Descriptions.Item label="报价总计" span={3}><Statistic value={calculationResult.total_cost} suffix="万元" valueStyle={{ color: '#cf1322' }} /></Descriptions.Item>
          </Descriptions>
          <ProForm
            onFinish={async (values) => {
              try {
                setSubmitting(true);
                const payload: API.CreateProjectParams = {
                  name: values.projectName,
                  description: values.projectDescription,
                  is_template: values.is_template || false,
                  assessmentData: {
                    ...assessmentData,
                    roles: configData.roles,
                  },
                };
                
                const result = await createProject(payload);
                console.log('项目保存成功，ID:', result.id);
                message.success('项目保存成功');
                
                // 延迟跳转，确保用户看到成功提示
                setTimeout(() => {
                  history.push('/assessment/history');
                }, 500);
                
                return true;
              } catch (error: any) {
                console.error('保存项目失败:', error);
                message.error(error.message || '保存项目失败，请稍后重试');
                return false;
              } finally {
                setSubmitting(false);
              }
            }}
            submitter={{
              searchConfig: { submitText: '保存项目' },
              submitButtonProps: {
                loading: submitting,
              },
            }}
            style={{ marginTop: 24 }}
          >
            <ProFormText name="projectName" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]} />
            <ProFormText name="projectDescription" label="项目描述" />
            <ProFormCheckbox name="is_template">另存为模板</ProFormCheckbox>
          </ProForm>
        </>
      )}
    </div>
  );
};

// ====================================================================
// Main Page Component
// ====================================================================
const NewAssessmentPage = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id');

  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({ ...EMPTY_ASSESSMENT });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // 加载配置数据
        const configResult = await getConfigAll();
        const nextConfig: ConfigData = {
          risk_items: Array.isArray(configResult?.data?.risk_items) ? configResult.data.risk_items : [],
          roles: Array.isArray(configResult?.data?.roles) ? configResult.data.roles : [],
        };
        setConfigData(nextConfig);

        // 如果是编辑模式，加载项目数据
        if (editId) {
          const projectResult = await getProjectDetail(editId);
          if (projectResult?.data?.assessment_details_json) {
            try {
              const parsedData = JSON.parse(projectResult.data.assessment_details_json) as Partial<AssessmentData>;
              const normalizedData: AssessmentData = {
                ...EMPTY_ASSESSMENT,
                ...parsedData,
                risk_scores: parsedData?.risk_scores ?? {},
                development_workload: Array.isArray(parsedData?.development_workload) ? parsedData.development_workload : [],
                integration_workload: Array.isArray(parsedData?.integration_workload) ? parsedData.integration_workload : [],
                travel_months: Number(parsedData?.travel_months ?? 0),
                maintenance_months: Number(parsedData?.maintenance_months ?? 0),
                maintenance_headcount: Number(parsedData?.maintenance_headcount ?? 0),
                risk_items: Array.isArray(parsedData?.risk_items) ? parsedData.risk_items : [],
              };
              setAssessmentData(normalizedData);
              form.setFieldsValue(normalizedData);
            } catch (error) {
              message.error('项目评估数据解析失败，已加载空表单');
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
  }, [editId, form]);

  const handleValuesChange = (changedPart: Partial<AssessmentData>) => {
    setAssessmentData((prev) => ({ ...prev, ...changedPart }));
  };

  const riskScoreSummary = useMemo(() => {
    const scores = assessmentData.risk_scores || {};
    const riskItems = configData?.risk_items || [];
    const itemCount = riskItems.length;

    let total = 0;
    let maxScore = 0;

    riskItems.forEach((item) => {
      const selectedValue = Number(scores[item.item_name] ?? NaN);
      if (!Number.isNaN(selectedValue)) {
        total += selectedValue;
      }

      const maxOptionScore = parseRiskOptions(item.options_json).reduce((acc, option) => {
        return option.value > acc ? option.value : acc;
      }, 0);
      maxScore += maxOptionScore;
    });

    const allFilled = itemCount > 0 && riskItems.every((item) => {
      const value = scores[item.item_name];
      return value !== undefined && value !== null && value !== '';
    });

    const factor = Number((total / 100).toFixed(2));
    const ratio = maxScore > 0 ? total / maxScore : 0;

    let level: string = '——';
    if (allFilled && maxScore > 0) {
      if (ratio >= 0.7) {
        level = '高风险';
      } else if (ratio >= 0.4) {
        level = '中风险';
      } else {
        level = '低风险';
      }
    }

    return {
      total,
      factor,
      itemCount,
      maxScore,
      level,
    };
  }, [assessmentData.risk_scores, configData?.risk_items]);

  const completedRiskCount = useMemo(() => {
    const scores = assessmentData.risk_scores || {};
    return Object.values(scores).filter((value) => value !== undefined && value !== null && value !== '').length;
  }, [assessmentData.risk_scores]);

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
          onWorkloadChange={(dev, integration) => handleValuesChange({
            development_workload: dev,
            integration_workload: integration,
          })}
          onPrev={() => setCurrent(0)}
          onNext={() => setCurrent(2)}
        />
      ),
    },
    {
      title: '其他成本',
      content: <OtherCostsForm 
        form={form} 
        initialValues={assessmentData} 
        onValuesChange={handleValuesChange}
        onPrev={() => setCurrent(1)}
        onNext={() => setCurrent(3)}
      />,
    },
    {
      title: '生成总览',
      content: <Overview assessmentData={assessmentData} configData={configData!} onPrev={() => setCurrent(2)} />,
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
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Statistic title="风险总分" value={riskScoreSummary.total} precision={2} />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Statistic title="评分因子" value={riskScoreSummary.factor} precision={2} />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Statistic title="风险等级" value={riskScoreSummary.level} />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Statistic
              title="已完成项"
              value={completedRiskCount}
              suffix={riskScoreSummary.itemCount ? `/ ${riskScoreSummary.itemCount}` : undefined}
            />
          </Col>
        </Row>
      </Card>
      <Card>
        <Steps current={current} items={items} />
        <div style={{ marginTop: 24 }}>{steps[current].content}</div>
      </Card>
    </PageContainer>
  );
};

export default NewAssessmentPage;