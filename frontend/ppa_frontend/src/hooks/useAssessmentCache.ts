/**
 * AssessmentCache React Hook
 * 封装缓存管理器的 React 集成，简化组件使用
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { assessmentCache } from '@/utils/assessmentCache';
import type {
  AssessmentCacheRecord,
  AssessmentCacheData,
  DataDiff,
} from '@/types/cache';

interface UseAssessmentCacheOptions {
  /** 是否启用自动保存 */
  enableAutoSave?: boolean;

  /** 数据变更回调 */
  onDataChange?: (data: AssessmentCacheData) => void;

  /** 错误回调 */
  onError?: (error: Error) => void;
}

interface UseAssessmentCacheReturn {
  /** 当前会话ID */
  sessionId: string;

  /** 是否正在保存 */
  isSaving: boolean;

  /** 最后保存时间 */
  lastSavedAt: number | null;

  /** 保存数据（立即） */
  saveImmediate: (data: AssessmentCacheData, step: number, isManualSave?: boolean) => Promise<void>;

  /** 保存数据（debounce） */
  saveDebounced: (data: AssessmentCacheData, step: number) => void;

  /** 加载指定session */
  loadSession: (sessionId: string) => Promise<AssessmentCacheRecord | null>;

  /** 获取最新缓存 */
  getLatest: () => Promise<AssessmentCacheRecord | null>;

  /** 获取历史列表 */
  getHistory: () => Promise<AssessmentCacheRecord[]>;

  /** 获取所有缓存记录 */
  getAll: () => Promise<AssessmentCacheRecord[]>;

  /** 删除session */
  deleteSession: (sessionId: string) => Promise<number>;

  /** 清理过期数据 */
  cleanup: () => Promise<number>;

  /** 生成新session */
  generateNewSession: () => string;

  /** 对比数据差异 */
  compareWithLatest: (currentData: AssessmentCacheData) => Promise<DataDiff>;
}

/**
 * AssessmentCache React Hook
 *
 * @example
 * ```tsx
 * const { saveDebounced, saveImmediate, getLatest } = useAssessmentCache({
 *   enableAutoSave: true,
 * });
 * ```
 */
export function useAssessmentCache(
  options: UseAssessmentCacheOptions = {}
): UseAssessmentCacheReturn {
  const {
    enableAutoSave = true,
    onDataChange,
    onError,
  } = options;

  // 状态
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // 使用 ref 跟踪缓存管理器（避免重复初始化）
  const cacheRef = useRef(assessmentCache);

  // 确保 IndexedDB 已初始化
  useEffect(() => {
    // Dexie 会在首次访问时自动初始化
    if (!cacheRef.current) {
      const error = new Error('AssessmentCache 未初始化');
      onError?.(error);
      console.error(error);
    }
  }, [onError]);

  /**
   * 立即保存数据
   */
  const handleSaveImmediate = useCallback(
    async (data: AssessmentCacheData, step: number, isManualSave = false) => {
      if (!enableAutoSave && !isManualSave) {
        return; // 如果禁用自动保存且不是手动保存，则跳过
      }

      try {
        setIsSaving(true);

        // 调用缓存管理器保存
        await cacheRef.current.saveImmediate(data, step, isManualSave);

        // 更新最后保存时间
        const now = Date.now();
        setLastSavedAt(now);

        // 触发回调
        onDataChange?.(data);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('保存失败');
        onError?.(err);
        console.error('保存缓存失败:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [enableAutoSave, onDataChange, onError]
  );

  /**
   * debounce 保存数据
   */
  const handleSaveDebounced = useCallback(
    (data: AssessmentCacheData, step: number) => {
      if (!enableAutoSave) {
        return; // 如果禁用自动保存，则跳过
      }

      // 调用缓存管理器的 debounce 保存
      cacheRef.current.saveDebounced(data, step);
    },
    [enableAutoSave]
  );

  /**
   * 加载指定 session
   */
  const handleLoadSession = useCallback(
    async (sessionId: string): Promise<AssessmentCacheRecord | null> => {
      try {
        return await cacheRef.current.loadSession(sessionId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('加载失败');
        onError?.(err);
        console.error('加载缓存失败:', err);
        return null;
      }
    },
    [onError]
  );

  /**
   * 获取最新缓存
   */
  const handleGetLatest = useCallback(async (): Promise<AssessmentCacheRecord | null> => {
    try {
      return await cacheRef.current.getLatest();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('获取失败');
      onError?.(err);
      console.error('获取最新缓存失败:', err);
      return null;
    }
  }, [onError]);

  /**
   * 获取历史版本列表
   */
  const handleGetHistory = useCallback(async (): Promise<AssessmentCacheRecord[]> => {
    try {
      return await cacheRef.current.getHistory();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('获取历史失败');
      onError?.(err);
      console.error('获取历史失败:', err);
      return [];
    }
  }, [onError]);

  /**
   * 获取所有缓存记录
   */
  const handleGetAll = useCallback(async (): Promise<AssessmentCacheRecord[]> => {
    try {
      return await cacheRef.current.getAll();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('获取所有缓存失败');
      onError?.(err);
      console.error('获取所有缓存失败:', err);
      return [];
    }
  }, [onError]);

  /**
   * 删除 session
   */
  const handleDeleteSession = useCallback(
    async (sessionId: string): Promise<number> => {
      try {
        return await cacheRef.current.deleteSession(sessionId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('删除失败');
        onError?.(err);
        console.error('删除缓存失败:', err);
        return 0;
      }
    },
    [onError]
  );

  /**
   * 清理过期数据
   */
  const handleCleanup = useCallback(async (): Promise<number> => {
    try {
      return await cacheRef.current.cleanup();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('清理失败');
      onError?.(err);
      console.error('清理缓存失败:', err);
      return 0;
    }
  }, [onError]);

  /**
   * 生成新 session
   */
  const handleGenerateNewSession = useCallback((): string => {
    return cacheRef.current.generateNewSession();
  }, []);

  /**
   * 与最新缓存对比数据差异
   * 用于最终保存前的数据一致性校验
   */
  const handleCompareWithLatest = useCallback(
    async (currentData: AssessmentCacheData): Promise<DataDiff> => {
      const latestRecord = await handleGetLatest();

      // 如果没有缓存，返回空差异
      if (!latestRecord) {
        return {
          hasDifferences: false,
          details: [],
        };
      }

      // 对比数据
      return compareData(currentData, latestRecord.data);
    },
    [handleGetLatest]
  );

  // 返回接口
  return {
    sessionId: cacheRef.current.getCurrentSessionId(),
    isSaving,
    lastSavedAt,
    saveImmediate: handleSaveImmediate,
    saveDebounced: handleSaveDebounced,
    loadSession: handleLoadSession,
    getLatest: handleGetLatest,
    getHistory: handleGetHistory,
    getAll: handleGetAll,
    deleteSession: handleDeleteSession,
    cleanup: handleCleanup,
    generateNewSession: handleGenerateNewSession,
    compareWithLatest: handleCompareWithLatest,
  };
}

/**
 * 深度对比两个数据对象
 * 用于最终保存前的数据一致性校验
 *
 * @param current - 当前JS内存中的数据
 * @param cached - IndexedDB中的缓存数据
 */
export function compareData(current: any, cached: any): DataDiff {
  const diff: DataDiff = {
    hasDifferences: false,
    details: [],
  };

  // 如果没有缓存，返回空差异
  if (!cached) {
    return diff;
  }

  // 快速比较：JSON序列化后对比
  try {
    const currentJson = JSON.stringify(current);
    const cachedJson = JSON.stringify(cached);

    if (currentJson === cachedJson) {
      return diff; // 完全一致
    }
  } catch (error) {
    console.error('JSON序列化失败:', error);
    // 如果序列化失败，继续详细对比
  }

  // 详细对比关键字段
  const fieldsToCheck = [
    'risk_scores',
    'development_workload',
    'integration_workload',
    'travel_months',
    'travel_headcount',
    'maintenance_months',
    'maintenance_headcount',
    'maintenance_daily_cost',
    'risk_cost_items',
    'ai_unmatched_risks',
    'custom_risk_items',
  ];

  fieldsToCheck.forEach((field) => {
    const currentValue = current[field];
    const cachedValue = cached[field];

    // 比较序列化后的值
    const currentStr = JSON.stringify(currentValue);
    const cachedStr = JSON.stringify(cachedValue);

    if (currentStr !== cachedStr) {
      diff.details.push({
        field,
        currentValue,
        cachedValue,
        type: cachedValue === undefined ? 'added' : 'changed',
      });
    }
  });

  // 只有当存在具体字段差异时，才标记为有差异
  // 这样可以忽略一些不重要的字段（如 formValues）导致的全量对比失败
  if (diff.details.length > 0) {
    diff.hasDifferences = true;
  }

  return diff;
}

/**
 * 格式化差异字段显示名称
 */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    risk_scores: '风险评分',
    development_workload: '开发工作量',
    integration_workload: '对接工作量',
    travel_months: '差旅月数',
    travel_headcount: '差旅人数',
    maintenance_months: '运维月数',
    maintenance_headcount: '运维人数',
    maintenance_daily_cost: '运维日成本',
    risk_cost_items: '风险成本项',
    ai_unmatched_risks: 'AI未匹配风险',
    custom_risk_items: '自定义风险项',
  };

  return labels[field] || field;
}

/**
 * 格式化值显示
 */
export function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '空';
  }

  if (Array.isArray(value)) {
    return `数组(${value.length}项)`;
  }

  if (typeof value === 'object') {
    return `对象(${Object.keys(value).length}个字段)`;
  }

  return String(value);
}
