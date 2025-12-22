/**
 * 前端缓存方案类型定义
 * 用于 IndexedDB 缓存评估数据
 */

// IndexedDB 主表记录
export interface AssessmentCacheRecord {
  id: string;                    // UUID主键
  sessionId: string;            // 会话ID（唯一标识一次评估）
  currentStep: number;          // 当前步骤（0-3）
  
  // 核心数据（只保存用户填写的值，不保存配置）
  data: AssessmentCacheData;
  
  metadata: CacheMetadata;
}

// 缓存的核心数据（与 API.AssessmentData 保持一致）
export interface AssessmentCacheData {
  // 风险评估
  risk_scores: Record<string, number>;
  ai_unmatched_risks: Array<{description: string; score: number}>;
  custom_risk_items: Array<{description: string; score: number}>;
  
  // 工作量
  development_workload: API.WorkloadRecord[];
  integration_workload: API.WorkloadRecord[];
  
  // 其他成本
  travel_months: number;
  travel_headcount: number;
  maintenance_months: number;
  maintenance_headcount: number;
  maintenance_daily_cost: number;
  risk_cost_items: Array<{description: string; cost: number}>;
  
  // 表单字段值（antd Form）
  formValues: Record<string, any>;
}

// 缓存元数据
export interface CacheMetadata {
  updatedAt: number;          // 最后更新时间（时间戳）
  isManualSave: boolean;      // true=手动保存, false=自动保存
  projectName?: string;       // 手动保存时的项目名称（可选）
}

// 数据对比差异
export interface DataDiff {
  hasDifferences: boolean;
  details: Array<{
    field: string;
    currentValue: any;
    cachedValue: any;
    type: 'added' | 'removed' | 'changed';
  }>;
}
