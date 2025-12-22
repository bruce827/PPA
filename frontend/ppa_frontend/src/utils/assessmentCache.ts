/**
 * 评估数据缓存管理器
 * 使用 IndexedDB 持久化存储评估数据，防止页面刷新丢失
 */

import Dexie, { Table } from 'dexie';
import type {
  AssessmentCacheRecord,
  AssessmentCacheData,
  CacheMetadata,
} from '@/types/cache';

class AssessmentCacheManager extends Dexie {
  // 声明表
  public cache!: Table<AssessmentCacheRecord, string>;

  // 当前会话ID
  private currentSessionId: string;

  // debounce 计时器
  private debounceTimer: NodeJS.Timeout | null = null;

  // debounce 延迟时间（毫秒）
  private readonly DEBOUNCE_DELAY = 3000;

  constructor() {
    // 初始化数据库
    super('AssessmentDB');

    // 定义表结构
    this.version(1).stores({
      cache: 'id, sessionId, metadata.updatedAt',
    });

    // 映射表
    this.cache = this.table('cache');

    // 生成初始会话ID
    this.currentSessionId = this.generateSessionId();

    // 定期清理过期数据（可选）
    this.setupPeriodicCleanup();
  }

  /**
   * 生成UUID（兼容旧浏览器）
   */
  private generateUUID(): string {
    // 如果 crypto.randomUUID 可用，使用它
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // 降级方案：使用 Math.random
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 生成新的会话ID
   * 格式：sess_时间戳_随机字符串
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * 设置定期清理（每小时检查一次）
   */
  private setupPeriodicCleanup(): void {
    // 只在浏览器环境执行
    if (typeof window !== 'undefined') {
      // 每小时清理一次
      setInterval(() => {
        this.cleanup().catch((err) => {
          console.warn('缓存清理失败:', err);
        });
      }, 60 * 60 * 1000);

      // 页面加载时也清理一次
      this.cleanup().catch((err) => {
        console.warn('初始缓存清理失败:', err);
      });
    }
  }

  /**
   * 获取当前会话ID
   */
  public getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * 生成新的会话ID（用于新评估）
   */
  public generateNewSession(): string {
    this.currentSessionId = this.generateSessionId();
    return this.currentSessionId;
  }

  /**
   * 立即保存数据（关键操作）
   * 用于：步骤切换、页面卸载、手动保存
   *
   * @param data - 评估数据
   * @param step - 当前步骤
   * @param isManualSave - 是否为手动保存
   */
  public async saveImmediate(
    data: AssessmentCacheData,
    step: number,
    isManualSave = false
  ): Promise<void> {
    try {
      // 清除debounce计时器（如果有）
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // 准备要保存的记录
      const record: AssessmentCacheRecord = {
        id: this.generateUUID(),
        sessionId: this.currentSessionId,
        currentStep: step,
        data,
        metadata: {
          updatedAt: Date.now(),
          isManualSave,
        },
      };

      // 保存到IndexedDB
      await this.cache.put(record);

      console.log(`[AssessmentCache] 数据已保存 (session: ${this.currentSessionId}, step: ${step}, manual: ${isManualSave})`);
    } catch (error) {
      console.error('[AssessmentCache] 保存失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * debounce保存（表单变更）
   * 用于：表单字段值变更，减少保存频率
   *
   * @param data - 评估数据
   * @param step - 当前步骤
   */
  public saveDebounced(data: AssessmentCacheData, step: number): void {
    // 清除之前的计时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 设置新的计时器
    this.debounceTimer = setTimeout(async () => {
      try {
        await this.saveImmediate(data, step, false);
      } finally {
        this.debounceTimer = null;
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 加载最新的缓存记录
   * 用于：最终保存时的数据一致性校验
   */
  public async getLatest(): Promise<AssessmentCacheRecord | null> {
    try {
      // 方案：先获取所有匹配记录，然后手动排序取最新
      const records = await this.cache
        .where('sessionId')
        .equals(this.currentSessionId)
        .toArray();

      // 按 updatedAt 降序排序，取第一个（最新）
      if (records.length === 0) {
        return null;
      }

      return records.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)[0];
    } catch (error) {
      console.error('[AssessmentCache] 获取最新缓存失败:', error);
      return null;
    }
  }

  /**
   * 加载指定session的缓存记录
   * 用于：加载历史草稿
   *
   * @param sessionId - 会话ID
   */
  public async loadSession(sessionId: string): Promise<AssessmentCacheRecord | null> {
    try {
      // 方案：先获取所有匹配记录，然后手动排序取最新
      const records = await this.cache
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      // 按 updatedAt 降序排序，取第一个（最新）
      if (records.length === 0) {
        return null;
      }

      return records.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)[0];
    } catch (error) {
      console.error('[AssessmentCache] 加载session失败:', error);
      return null;
    }
  }

  /**
   * 获取历史版本列表
   * 只返回手动保存的记录，按时间倒序
   */
  public async getHistory(): Promise<AssessmentCacheRecord[]> {
    try {
      // 方案：先获取所有记录，然后手动过滤和排序
      const allRecords = await this.cache.toArray();

      // 过滤出手动保存的记录
      const manualRecords = allRecords.filter(
        (record) => record.metadata.isManualSave
      );

      // 按 updatedAt 降序排序，取前20个
      return manualRecords
        .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)
        .slice(0, 20);
    } catch (error) {
      console.error('[AssessmentCache] 获取历史列表失败:', error);
      return [];
    }
  }

  /**
   * 删除指定session的所有缓存记录
   *
   * @param sessionId - 会话ID
   */
  public async deleteSession(sessionId: string): Promise<number> {
    try {
      return await this.cache.where('sessionId').equals(sessionId).delete();
    } catch (error) {
      console.error('[AssessmentCache] 删除session失败:', error);
      return 0;
    }
  }

  /**
   * 清理过期数据
   * - 自动保存保留7天
   * - 手动保存保留30天
   * - 每个session最多保留3个版本
   */
  public async cleanup(): Promise<number> {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // 1. 删除7天前的自动保存
      const autoSaveCount = await this.cache
        .where('metadata.updatedAt')
        .below(sevenDaysAgo)
        .and((record) => !record.metadata.isManualSave)
        .delete();

      // 2. 删除30天前的手动保存
      const manualSaveCount = await this.cache
        .where('metadata.updatedAt')
        .below(thirtyDaysAgo)
        .and((record) => record.metadata.isManualSave)
        .delete();

      // 3. 计算总删除数量
      const totalDeleted = autoSaveCount + manualSaveCount;

      if (totalDeleted > 0) {
        console.log(`[AssessmentCache] 清理完成，删除 ${totalDeleted} 条记录`);
      }

      return totalDeleted;
    } catch (error) {
      console.error('[AssessmentCache] 清理失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有缓存记录
   * 用于：加载草稿弹窗显示所有版本（手动+自动）
   */
  public async getAll(): Promise<AssessmentCacheRecord[]> {
    try {
      return await this.cache.toArray();
    } catch (error) {
      console.error('[AssessmentCache] 获取所有缓存失败:', error);
      return [];
    }
  }

  /**
   * 删除所有缓存（谨慎使用）
   */
  public async clearAll(): Promise<void> {
    try {
      await this.cache.clear();
      console.log('[AssessmentCache] 已清空所有缓存');
    } catch (error) {
      console.error('[AssessmentCache] 清空失败:', error);
    }
  }
}

// 导出单例
export const assessmentCache = new AssessmentCacheManager();

// 导出类型
export type { AssessmentCacheManager };
