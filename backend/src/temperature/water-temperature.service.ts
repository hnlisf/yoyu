/**
 * ============================================================================
 * 文件名：temperature/water-temperature.service.ts（水温物理引擎 v3 重构版）
 * ============================================================================
 * 作用：每秒计算真实物理温度，写入 TemperatureState（不再写 DB）
 *
 * P3 §3.3 重构后：
 *   - 此服务**只**写 TemperatureState（内存）
 *   - TemperatureAdjustService 才是唯一 DB 写者
 *   - 消除之前 water+temperature-adjust 双写 race condition
 *
 * 物理模型（不变）：
 *   - heater ON:  T(t+1) = T(t) + 0.5 - (T(t) - T_outdoor) * 0.15
 *   - heater OFF: T(t+1) = T(t) - (T(t) - T_outdoor) * 0.15
 *
 * 设计取舍：
 *   - 此服务依赖 TemperatureState（@Global），无 DB 依赖
 *   - 不注入 PrismaService —— 物理模拟完全在内存中
 *   - 持久化由 TemperatureAdjustService 在 30s 节奏统一做（业务上够用）
 *
 * @see ./temperature-state.ts  中央温度状态仓库
 * @see ../temperature-adjust/temperature-adjust.service.ts  唯一 DB 写者
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TemperatureState, TankTemperatureState } from './temperature-state';

@Injectable()
export class WaterTemperatureService {
  private readonly logger = new Logger(WaterTemperatureService.name);

  private readonly WARM_RATE = 0.5;
  private readonly DECAY_COEFF = 0.15;
  private readonly T_MIN = 5;
  private readonly T_MAX = 35;

  constructor(private readonly state: TemperatureState) {}

  /** 注册鱼缸——首次出现时调用 */
  register(tankId: string, initialTemp: number, outdoorTemp: number, heaterOn = false) {
    this.state.register(tankId, { currentTemp: initialTemp, outdoorTemp, heaterOn });
  }

  /** 移除鱼缸 */
  unregister(tankId: string) {
    this.state.unregister(tankId);
  }

  /** 城市/天气切换时调用 */
  updateOutdoorTemp(tankId: string, outdoorTemp: number) {
    this.state.updateOutdoorTemp(tankId, outdoorTemp);
    // 立即重算一次（让 UI 立刻看到）
    const s = this.state.readForAdjust(tankId);
    if (s) this.tickState(s);
  }

  /** 切换加热器 */
  setHeaterOn(tankId: string, on: boolean) {
    this.state.setHeaterOn(tankId, on);
  }

  /** 换水后重置：设温度 + 关加热器 */
  reset(tankId: string, newTemp: number) {
    this.state.reset(tankId, newTemp);
  }

  /** 读当前温度（HTTP API 用） */
  getCurrentTemp(tankId: string): number | null {
    return this.state.getCurrentTemp(tankId);
  }

  /** 读室外参考温度 */
  getOutdoorTemp(tankId: string): number | null {
    return this.state.getOutdoorTemp(tankId);
  }

  /**
   * 每秒 tick —— 对所有已注册鱼缸跑一次物理
   * 写：TemperatureState.applyPhysicsTick()（内存）
   * 不写：DB（由 TemperatureAdjustService 统一负责）
   */
  @Interval(1000)
  private tickAll() {
    const tracked = this.state.listTracked();
    for (const tankId of tracked) {
      const state = this.state.readForAdjust(tankId);
      if (!state) continue;
      this.tickState(state);
      // 写回 state（applyPhysicsTick 内部处理 lastTick 时间戳）
      this.state.applyPhysicsTick(tankId, state.currentTemp);
    }
  }

  private tickState(state: TankTemperatureState) {
    const delta = state.outdoorTemp - state.currentTemp;
    if (state.heaterOn) {
      state.currentTemp = Math.min(
        state.currentTemp + this.WARM_RATE + delta * this.DECAY_COEFF,
        this.T_MAX,
      );
    } else {
      state.currentTemp = Math.max(
        state.currentTemp + delta * this.DECAY_COEFF,
        this.T_MIN,
      );
    }
  }
}