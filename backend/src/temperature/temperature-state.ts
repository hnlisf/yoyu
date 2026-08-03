/**
 * ============================================================================
 * 文件名：temperature/temperature-state.ts（温度状态中央仓库）
 * ============================================================================
 * 作用：解决 P3 §3.3 描述的"双温度写入竞争"问题
 *
 * 之前的问题：
 *   - WaterTemperatureService 物理 tick (1Hz) + flush 到 DB (每 30 秒)
 *   - TemperatureAdjustService 限速 tick (30 秒) + 直写 DB
 *   - 两者都写 FishTank.temp（PR 17 后 temperature 列已删）
 *   - 写竞争：last-writer-wins，物理模拟的精确结果被 adjust 覆盖
 *
 * 新架构：
 *
 *   [WaterTemperatureService] --tick 1Hz--> [TemperatureState]
 *                                                       │
 *                                                       │ read latest
 *                                                       ▼
 *                          [TemperatureAdjustService] --every 30s--> [FishTank.temp DB]
 *                                                       │
 *                                                       └─ 唯一 DB 写入者
 *
 * 收益：
 *   - 物理模拟只写内存（无 DB I/O，零延迟）
 *   - DB 写入唯一来源（TemperatureAdjustService）—— 易追踪 / 易测试
 *   - 实时读仍可走 TemperatureState.getCurrentTemp()（1Hz 精度）
 *
 * 设计取舍：
 *   - 用 Map 而非 BehaviorSubject —— 当前只有"读"无订阅
 *   - @Global() 模块 —— water / adjust 都能注入
 *   - 简化为同步 get/set —— 避免引入 RxJS 依赖
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 单个鱼缸的温度状态
 */
export interface TankTemperatureState {
  tankId: string;
  /** 当前水温（°C）—— 由物理模拟 1Hz 更新 */
  currentTemp: number;
  /** 加热器开关 */
  heaterOn: boolean;
  /** 城市/室外参考温度（°C） */
  outdoorTemp: number;
  /** 上次物理 tick 的 timestamp */
  lastTick: number;
}

/**
 * TemperatureState —— 全局唯一的鱼缸温度状态仓库
 *
 * 写入者：WaterTemperatureService（每 tick）
 * 读取者：TemperatureAdjustService（每 30s tick）
 *       + HTTP API（getCurrentTemp 实时返回）
 *
 * 注意：不持久化——进程重启时由 register() 重新初始化
 */
@Injectable()
export class TemperatureState {
  private readonly logger = new Logger(TemperatureState.name);
  private states = new Map<string, TankTemperatureState>();

  /**
   * 注册鱼缸——首次出现时调用
   * 重复注册会覆盖已有状态（用于 reload 场景）
   */
  register(tankId: string, initial: Omit<TankTemperatureState, 'tankId' | 'lastTick'>): void {
    this.states.set(tankId, {
      tankId,
      lastTick: Date.now(),
      ...initial,
    });
    this.logger.log(`[TemperatureState] registered tank=${tankId} temp=${initial.currentTemp}`);
  }

  /** 移除鱼缸——关闭/删除鱼缸时调用 */
  unregister(tankId: string): void {
    if (this.states.delete(tankId)) {
      this.logger.log(`[TemperatureState] unregistered tank=${tankId}`);
    }
  }

  /** 取实时温度（1Hz 精度） */
  getCurrentTemp(tankId: string): number | null {
    return this.states.get(tankId)?.currentTemp ?? null;
  }

  /** 取室外参考温度 */
  getOutdoorTemp(tankId: string): number | null {
    return this.states.get(tankId)?.outdoorTemp ?? null;
  }

  /** 取加热器状态 */
  isHeaterOn(tankId: string): boolean {
    return this.states.get(tankId)?.heaterOn ?? false;
  }

  /**
   * 物理 tick 调用 —— 写入最新水温（不持久化）
   * 这是 P3 §3.3 的"唯一物理写入者"接口
   */
  applyPhysicsTick(tankId: string, currentTemp: number): void {
    const state = this.states.get(tankId);
    if (!state) return;
    state.currentTemp = currentTemp;
    state.lastTick = Date.now();
  }

  /** 调整器用：读最新状态做收敛计算 */
  readForAdjust(tankId: string): TankTemperatureState | null {
    return this.states.get(tankId) ?? null;
  }

  /** 切换加热器 */
  setHeaterOn(tankId: string, on: boolean): void {
    const state = this.states.get(tankId);
    if (state) state.heaterOn = on;
  }

  /** 调整室外参考温度（城市切换 / 天气更新时） */
  updateOutdoorTemp(tankId: string, outdoorTemp: number): void {
    const state = this.states.get(tankId);
    if (state) state.outdoorTemp = outdoorTemp;
  }

  /** 重置温度（换水后等场景） */
  reset(tankId: string, newTemp: number): void {
    const state = this.states.get(tankId);
    if (!state) return;
    state.currentTemp = newTemp;
    state.heaterOn = false;
  }

  /** 列出所有受跟踪的 tankId（用于 HTTP 健康检查 / 调试） */
  listTracked(): string[] {
    return Array.from(this.states.keys());
  }
}