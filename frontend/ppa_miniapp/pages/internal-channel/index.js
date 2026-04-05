const { callFunction } = require('../../utils/request');
const echarts = require('../../components/ec-canvas/echarts');

function formatWan(value) {
  if (value === undefined || value === null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} 万元`;
}

function formatDays(value) {
  if (value === undefined || value === null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(1)} 人天`;
}

function formatPushTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parsePieChartData(costBreakdownJson) {
  if (!costBreakdownJson) return null;
  let breakdown;
  try {
    breakdown = typeof costBreakdownJson === 'string'
      ? JSON.parse(costBreakdownJson)
      : costBreakdownJson;
  } catch (e) {
    return null;
  }

  const pricingMode = breakdown.pricing_mode || 'custom_development';
  const amounts = breakdown.amounts || breakdown;

  if (pricingMode === 'enterprise_product') {
    return {
      title: '商务报价组成（企业级产品模式）',
      series: [
        { value: Number(breakdown.base_cost_wan || 0), name: '实施基线' },
        { value: Number(amounts.rd_cost_wan || 0), name: 'R&D 研发' },
        { value: Number(amounts.cac_cost_wan || 0), name: 'CAC 营销' },
        { value: Number(amounts.cogs_cost_wan || 0), name: 'COGS 基础设施' },
        { value: Number(amounts.csm_cost_wan || 0), name: 'CSM 运维' },
      ].filter(s => s.value > 0),
    };
  }

  // custom_development
  return {
    title: '商务报价组成（定制开发模式）',
    series: [
      { value: Number(breakdown.base_cost_wan || 0), name: '实施成本' },
      { value: Number(amounts.management_fee_wan || 0), name: '管理分摊' },
      { value: Number(amounts.sales_fee_wan || 0), name: '销售商务' },
      { value: Number(amounts.profit_fee_wan || 0), name: '利润' },
      { value: Number(amounts.tax_fee_wan || 0), name: '税费' },
    ].filter(s => s.value > 0),
  };
}

function mapInternalProject(item) {
  const ourQuote = Number(item.ourQuote || 0);
  const customerBudget = Number(item.customerBudget || 0);
  const diff = ourQuote - customerBudget;
  const riskScore = item.riskTotalScore != null ? Number(item.riskTotalScore) : 0;
  const pieData = parsePieChartData(item.costBreakdownJson);

  return {
    _id: item._id,
    projectName: item.projectName || '未命名项目',
    projectDescription: item.projectDescription || '—',
    ourQuoteText: formatWan(item.ourQuote),
    budgetText: formatWan(item.customerBudget),
    diffText: diff >= 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`,
    diffClass: diff >= 0 ? 'diff-positive' : 'diff-negative',
    riskTotalScore: riskScore > 0 ? riskScore.toFixed(1) : '—',
    riskLevel: item.riskLevel || '—',
    riskChipClass: item.riskLevel === '高风险' ? 'chip-high' : item.riskLevel === '中风险' ? 'chip-medium' : 'chip-low',
    totalWorkloadText: formatDays(item.totalWorkloadDays),
    newDevWorkloadText: formatDays(item.newDevWorkloadDays),
    travelCostText: formatWan(item.travelCostTotal),
    implementationCostText: formatWan(item.implementationCost),
    pushTimeText: formatPushTime(item.pushTime),
    top3RiskScores: item.top3RiskScores || [],
    attachments: item.attachmentFileIds || [],
    expanded: false,
    ecId: `chart-${item._id}`,
    pieChartTitle: pieData ? pieData.title : '',
    pieChartData: pieData ? pieData.series : [],
    pieChartLoaded: false,
  };
}

Page({
  data: {
    list: [],
    loading: true,
    finished: false,
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadList() {
    this.setData({ loading: true });

    try {
      const data = await callFunction('getInternalProjectList', {
        pageNo: 1,
        pageSize: 50,
      });

      const list = (data.list || []).map(mapInternalProject);
      this.setData({ list, loading: false });
    } catch (error) {
      console.error('加载推送列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  toggleDetail(event) {
    const { index } = event.currentTarget.dataset;
    const item = this.data.list[index];
    const isExpanded = item.expanded;
    this.setData({ [`list[${index}].expanded`]: !isExpanded });

    // 展开时初始化饼图（仅首次展开时渲染）
    if (!isExpanded && !item.pieChartLoaded && item.pieChartData.length > 0) {
      this.initPieChart(index);
    }
  },

  initPieChart(index) {
    const item = this.data.list[index];
    const chartComponent = this.selectComponent(`#${item.ecId}`);
    if (!chartComponent) return;

    const data = item.pieChartData;
    const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];

    chartComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });

      const total = data.reduce((sum, d) => sum + d.value, 0);

      chart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} 万元 ({d}%)',
        },
        legend: {
          bottom: '0%',
          left: 'center',
          itemWidth: 12,
          itemHeight: 8,
          textStyle: { fontSize: 11 },
        },
        series: [
          {
            name: '报价组成',
            type: 'pie',
            radius: ['35%', '60%'],
            center: ['50%', '42%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: '{d}%',
              fontSize: 10,
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 12,
                fontWeight: 'bold',
              },
            },
            data: data.map((d, i) => ({
              ...d,
              itemStyle: { color: colors[i % colors.length] },
            })),
          },
        ],
      });

      this.setData({ [`list[${index}].pieChartLoaded`]: true });
      return chart;
    });
  },

  noop() {},

  downloadAttachment(event) {
    const { fileid, name } = event.currentTarget.dataset;
    if (!fileid) return;

    wx.showLoading({ title: '下载中...' });
    wx.cloud.downloadFile({
      fileID: fileid,
      success: (res) => {
        wx.hideLoading();
        wx.openDocument({
          filePath: res.tempFilePath,
          fileName: name,
          showMenu: true,
          fail: () => {
            wx.showToast({ title: '打开文件失败', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  shareAttachment(event) {
    const { fileid } = event.currentTarget.dataset;
    if (!fileid) return;

    wx.showActionSheet({
      itemList: ['下载并打开', '取消'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.downloadAttachment(event);
        }
      },
    });
  },

  onShareAppMessage() {
    return {
      title: 'PPA 内部渠道',
      path: '/pages/internal-channel/index',
    };
  },
});
