import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

interface WaterTempState {
  tankId: string;
  currentTemp: number;
  heaterOn: boolean;
  outdoorTemp: number;
  lastTick: number;
}

/**
 * v7.0 Water Temperature Physics Engine (BUG-5)
 *
 * Models realistic heat transfer between fish tank water and outdoor air:
 *
 *   heater ON:  T(t+1) = T(t) + 0.5 - (T(t) - T_outdoor) * 0.15
 *   heater OFF: T(t+1) = T(t) - (T(t) - T_outdoor) * 0.15
 *
 * Parameters:
 *   - WARM_RATE = 0.5 °C/s (heater active contribution)
 *   - DECAY_COEFF = 0.15 (fraction of delta to outdoor equilibrating each tick)
 *   - T_MIN = 5°C, T_MAX = 35°C (hard clamps)
 *   - Tick interval = 1 second via @Interval
 *
 * The state is held in memory and periodically flushed to the DB.
 */
@Injectable()
export class WaterTemperatureService {
  private readonly logger = new Logger(WaterTemperatureService.name);
  private states = new Map<string, WaterTempState>();

  private readonly WARM_RATE = 0.5;
  private readonly DECAY_COEFF = 0.15;
  private readonly T_MIN = 5;
  private readonly T_MAX = 35;

  private flushCallback: ((tankId: string, temp: number) => Promise<void>) | null = null;

  /** Register a callback that persists temperature to the database. */
  onFlush(cb: (tankId: string, temp: number) => Promise<void>) {
    this.flushCallback = cb;
  }

  /** Register a tank for temperature tracking. */
  register(tankId: string, initialTemp: number, outdoorTemp: number, heaterOn = false) {
    this.states.set(tankId, {
      tankId,
      currentTemp: initialTemp,
      heaterOn,
      outdoorTemp,
      lastTick: Date.now(),
    });
  }

  /** Remove a tank from tracking. */
  unregister(tankId: string) {
    this.states.delete(tankId);
  }

  /** Update outdoor temperature (called when city/weather changes). */
  updateOutdoorTemp(tankId: string, outdoorTemp: number) {
    const state = this.states.get(tankId);
    if (state) {
      state.outdoorTemp = outdoorTemp;
      // Immediately recalculate once so the UI reflects the change
      this.tickState(state);
    }
  }

  /** Toggle the heater for a tank. */
  setHeaterOn(tankId: string, on: boolean) {
    const state = this.states.get(tankId);
    if (state) {
      state.heaterOn = on;
    }
  }

  /** v9.0 REQ-7: Reset temperature (e.g. after water change). Sets temp + heater off. */
  reset(tankId: string, newTemp: number) {
    const state = this.states.get(tankId);
    if (state) {
      state.currentTemp = newTemp;
      state.heaterOn = false;
    }
  }

  /** Get current temperature of a tank (or null if not tracked). */
  getCurrentTemp(tankId: string): number | null {
    return this.states.get(tankId)?.currentTemp ?? null;
  }

  /** Get current outdoor temp reference for a tank. */
  getOutdoorTemp(tankId: string): number | null {
    return this.states.get(tankId)?.outdoorTemp ?? null;
  }

  /**
   * Tick all registered tanks every 1 second.
   * Persists to DB every 30 ticks (~30 seconds) via flushCallback.
   */
  @Interval(1000)
  private tickAll() {
    let flushCount = 0;
    for (const state of this.states.values()) {
      this.tickState(state);
      flushCount++;
    }

    // Flush to DB every 30 ticks
    if (flushCount > 0 && this.flushCallback && Math.floor(Date.now() / 1000) % 30 === 0) {
      for (const state of this.states.values()) {
        this.flushCallback(state.tankId, state.currentTemp).catch((err) =>
          this.logger.warn(`Flush failed for tank ${state.tankId}: ${err.message}`),
        );
      }
    }
  }

  private tickState(state: WaterTempState) {
    const delta = state.outdoorTemp - state.currentTemp;
    if (state.heaterOn) {
      // Active heating: warm + approach outdoor equilibrium
      state.currentTemp = Math.min(
        state.currentTemp + this.WARM_RATE + delta * this.DECAY_COEFF,
        this.T_MAX,
      );
    } else {
      // Passive cooling/warming: approach outdoor equilibrium
      state.currentTemp = Math.max(
        state.currentTemp + delta * this.DECAY_COEFF,
        this.T_MIN,
      );
    }
  }
}
