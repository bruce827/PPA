const { getCachedUser } = require('../../utils/auth');
const { formatDateTime } = require('../../utils/date');
const { buildMembershipEntryPath, getMembershipAccessCopy, hasFullAccess } = require('../../utils/membership');
const { callFunction } = require('../../utils/request');

function formatBudget(value) {
  if (value === undefined || value === null || value === '') {
    return '未填写';
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `¥${numberValue.toLocaleString('zh-CN')}`;
}

function buildWebServiceUrl(serviceUrl, detail) {
  const normalizedUrl = String(serviceUrl || '').trim();

  if (!normalizedUrl || !detail) {
    return '';
  }

  const queryPairs = [
    ['sourceItemId', detail.source_item_id],
    ['title', detail.title],
    ['accessState', detail.access_state],
    [
      'evaluationId',
      (detail.serviceEntry && detail.serviceEntry.evaluationId) ||
        (detail.evaluationSummary && detail.evaluationSummary.evaluation_id),
    ],
  ].filter(([, value]) => String(value || '').trim());

  if (!queryPairs.length) {
    return normalizedUrl;
  }

  const queryString = queryPairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${normalizedUrl}${normalizedUrl.includes('?') ? '&' : '?'}${queryString}`;
}

function mapTenderDetail(detail) {
  if (!detail) {
    return null;
  }

  const formattedExpiresAt = formatDateTime(detail.expires_at) || detail.expires_at || '';
  const accessCopy = getMembershipAccessCopy({
    membershipStatus: detail.membership_status,
    accessState: detail.access_state,
    expiresText: formattedExpiresAt,
  });
  const extra = detail.detail_payload || null;
  const evaluationSummary = detail.evaluation_summary || {
    has_evaluation: false,
    evaluation_status: 'not_available',
    evaluation_version: 0,
    title: '',
    summary: '',
    result_excerpt: '',
    artifact_count: 0,
    updated_at: '',
  };
  const evaluationResult = detail.evaluation_result || {
    decision_label: '',
    confidence_label: '',
    analysis_summary: '',
    strengths: [],
    risks: [],
    recommended_actions: [],
  };
  const evaluationArtifacts = Array.isArray(detail.evaluation_artifacts)
    ? detail.evaluation_artifacts.map((item) => ({
        artifactId: item.artifact_id || '',
        name: item.name || '未命名成果物',
        fileType: item.file_type || 'xlsx',
        downloadUrl: item.download_url || '',
        updatedText: formatDateTime(item.updated_at) || '',
      }))
    : [];
  const serviceEntry = detail.service_entry || {
    has_service_entry: false,
    service_mode: 'web_assessment',
    title: '',
    description: '',
    service_url: '',
    cta_text: '',
  };

  return {
    ...detail,
    extra,
    adoptLabel: detail.adopt_status === 'adopted' ? `已采纳：${detail.adopted_by_name || '已锁定'}` : '未采纳',
    adoptedText: formatDateTime(detail.adopted_at),
    publishedText: formatDateTime(detail.published_at) || detail.published_date || '',
    deadlineText: formatDateTime(detail.deadline_at) || detail.deadline_date || '',
    budgetText: formatBudget(detail.budget_amount),
    expiresText: formattedExpiresAt,
    membershipStatus: accessCopy.membershipStatus,
    accessState: accessCopy.accessState,
    accessTitle: accessCopy.title,
    accessDescription: accessCopy.description,
    accessActionText: accessCopy.actionText,
    evaluationSummary: {
      ...evaluationSummary,
      updatedText: formatDateTime(evaluationSummary.updated_at) || '',
    },
    evaluationResult: {
      ...evaluationResult,
      strengths: Array.isArray(evaluationResult.strengths) ? evaluationResult.strengths : [],
      risks: Array.isArray(evaluationResult.risks) ? evaluationResult.risks : [],
      recommendedActions: Array.isArray(evaluationResult.recommended_actions)
        ? evaluationResult.recommended_actions
        : [],
    },
    evaluationArtifacts,
    serviceEntry: {
      hasServiceEntry: Boolean(serviceEntry.has_service_entry),
      serviceMode: serviceEntry.service_mode || 'web_assessment',
      title: serviceEntry.title || '需要更深人工评估？',
      description:
        serviceEntry.description ||
        '如果当前会员内容还不足以完成决策，可继续转到 Web 端项目评估服务做深度分析。',
      serviceUrl: serviceEntry.service_url || '',
      ctaText: serviceEntry.cta_text || '了解 Web 端深度评估',
      evaluationId: serviceEntry.evaluation_id || '',
    },
  };
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300 && response.tempFilePath) {
          resolve(response.tempFilePath);
          return;
        }

        reject(new Error('下载成果物失败'));
      },
      fail(error) {
        reject(error || new Error('下载成果物失败'));
      },
    });
  });
}

function openDocument(filePath) {
  return new Promise((resolve, reject) => {
    wx.openDocument({
      filePath,
      showMenu: true,
      success() {
        resolve();
      },
      fail(error) {
        reject(error || new Error('打开成果物失败'));
      },
    });
  });
}

Page({
  data: {
    sourceItemId: '',
    detail: null,
    loading: true,
    submitting: false,
    artifactDownloadingId: '',
    canAdopt: false,
    canCancel: false,
    hasFullAccess: false,
  },

  onLoad(options) {
    this.setData({
      sourceItemId: options.sourceItemId || '',
    });
  },

  onShow() {
    const user = getCachedUser();

    if (!user) {
      wx.reLaunch({
        url: '/pages/login/index',
      });
      return;
    }

    this.loadDetail();
  },

  async loadDetail() {
    if (!this.data.sourceItemId) {
      wx.showToast({
        title: '缺少项目标识',
        icon: 'none',
      });
      return;
    }

    this.setData({
      loading: true,
    });

    try {
      const detail = await callFunction('getTenderDetail', {
        sourceItemId: this.data.sourceItemId,
      });
      const user = getCachedUser();
      const mappedDetail = mapTenderDetail(detail);
      const isAdopted = mappedDetail.adopt_status === 'adopted';
      const fullAccess = hasFullAccess(mappedDetail.accessState);
      const isSelfAdopted = fullAccess && user && isAdopted && mappedDetail.adopted_by_openid === user.openid;

      this.setData({
        detail: mappedDetail,
        hasFullAccess: fullAccess,
        canAdopt: fullAccess && !isAdopted,
        canCancel: isSelfAdopted,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '获取详情失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  handleMembershipAction() {
    const detail = this.data.detail;

    if (!detail) {
      return;
    }

    wx.navigateTo({
      url: buildMembershipEntryPath({
        accessState: detail.accessState,
        sourceItemId: this.data.sourceItemId,
      }),
    });
  },

  handleOpenWebService() {
    const detail = this.data.detail;

    if (!detail || !detail.serviceEntry || !detail.serviceEntry.hasServiceEntry) {
      return;
    }

    const webServiceUrl = buildWebServiceUrl(detail.serviceEntry.serviceUrl, detail);

    if (!webServiceUrl) {
      wx.showToast({
        title: '当前未配置 Web 服务入口',
        icon: 'none',
      });
      return;
    }

    wx.setClipboardData({
      data: webServiceUrl,
    });

    wx.showToast({
      title: '已复制 Web 服务链接',
      icon: 'none',
    });
  },

  async handleAdopt() {
    this.setData({
      submitting: true,
    });

    try {
      await callFunction('adoptTender', {
        sourceItemId: this.data.sourceItemId,
      });
      wx.showToast({
        title: '采纳成功',
        icon: 'success',
      });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '采纳失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },

  async handleCancelAdoption() {
    this.setData({
      submitting: true,
    });

    try {
      await callFunction('cancelTenderAdoption', {
        sourceItemId: this.data.sourceItemId,
      });
      wx.showToast({
        title: '已取消采纳',
        icon: 'success',
      });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '取消失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },

  handleCopyLink() {
    if (!this.data.detail || !this.data.detail.source_url) {
      return;
    }

    wx.setClipboardData({
      data: this.data.detail.source_url,
    });
  },

  async handleDownloadArtifact(event) {
    const artifact = event.currentTarget.dataset || {};
    const downloadUrl = String(artifact.url || '').trim();
    const artifactId = String(artifact.id || '').trim();

    if (!downloadUrl) {
      wx.showToast({
        title: '当前成果物暂无下载地址',
        icon: 'none',
      });
      return;
    }

    this.setData({
      artifactDownloadingId: artifactId,
    });

    try {
      const tempFilePath = await downloadFile(downloadUrl);
      await openDocument(tempFilePath);
    } catch (error) {
      wx.setClipboardData({
        data: downloadUrl,
      });
      wx.showToast({
        title: '下载失败，已复制链接',
        icon: 'none',
      });
    } finally {
      this.setData({
        artifactDownloadingId: '',
      });
    }
  },
});
