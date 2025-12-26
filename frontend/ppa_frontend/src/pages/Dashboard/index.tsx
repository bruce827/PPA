import { PageContainer, GridContent } from '@ant-design/pro-components';
import { Row, Col } from 'antd';
import { Suspense } from 'react';
import IntroduceRow from './components/IntroduceRow';
import TrendAnalysis from './components/TrendAnalysis';
import ProjectDNA from './components/ProjectDNA';
import CostDistribution from './components/CostDistribution';
import KeywordAnalysis from './components/KeywordAnalysis';
import RankingList from './components/RankingList';
import { getTopRoles, getTopRisks } from '@/services/dashboard';

const ROW_GUTTER = 16;
const ROW_STYLE = { marginTop: ROW_GUTTER };

const Dashboard = () => {
  return (
    <PageContainer
      header={{ title: '数据看板', subTitle: '项目评估数据分析与可视化' }}
    >
      <GridContent>
        <>
          {/* 业务概览 */}
          <Suspense fallback={null}>
            <IntroduceRow />
          </Suspense>

          {/* 月度趋势 + 热点词云 */}
          <Row gutter={ROW_GUTTER} style={ROW_STYLE}>
            <Col xl={14} lg={14} md={24} sm={24} xs={24}>
              <TrendAnalysis />
            </Col>
            <Col xl={10} lg={10} md={24} sm={24} xs={24}>
              <KeywordAnalysis />
            </Col>
          </Row>

          {/* 成本分布 + 项目特征指标 */}
          <Row gutter={ROW_GUTTER} style={ROW_STYLE}>
            <Col xl={12} lg={12} md={24} sm={24} xs={24}>
              <CostDistribution />
            </Col>
            <Col xl={12} lg={12} md={24} sm={24} xs={24}>
              <ProjectDNA />
            </Col>
          </Row>

          {/* 核心角色 + 高频风险 */}
          <Row gutter={ROW_GUTTER} style={ROW_STYLE}>
            <Col xl={12} lg={12} md={24} sm={24} xs={24}>
              <RankingList 
                title="核心投入角色 (Top 5)"
                request={getTopRoles}
                valueField="workload_days"
                categoryField="role_name"
                aliasValue="人天"
                aliasCategory="角色"
              />
            </Col>
            <Col xl={12} lg={12} md={24} sm={24} xs={24}>
              <RankingList 
                title="高频风险项 (Top 10)"
                request={getTopRisks}
                valueField="count"
                categoryField="risk_name"
                aliasValue="频次"
                aliasCategory="风险"
                limit={10}
                colorScheme="gradient"
                baseColor="#f5222d"
              />
            </Col>
          </Row>
        </>
      </GridContent>
    </PageContainer>
  );
};

export default Dashboard;
