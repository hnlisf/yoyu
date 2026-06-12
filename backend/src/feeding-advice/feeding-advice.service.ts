import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

export interface FeedingAdvice {
  speciesId: string;
  speciesName: string;
  tempSuitability: 'ideal' | 'ok' | 'poor';
  recommendation: string;
  actionItems: string[];
}

@Injectable()
export class FeedingAdviceService {
  constructor(
    private prisma: PrismaService,
    private weather: WeatherService,
  ) {}

  async getAdviceForUser(userId: string, lang = 'zh'): Promise<FeedingAdvice[]> {
    const fish = await this.prisma.fish.findMany({
      where: { tank: { userId } },
      include: { species: true, tank: true },
    });
    if (!fish.length) return [];

    // MVP: use Beijing default; later replace with stored user location
    const lat = 39.9042;
    const lon = 116.4074;
    const w = await this.weather.getWeather(lat, lon);

    return fish.map((f) => this.advise(f.species, w.temp, lang));
  }

  private advise(species: any, currentTemp: number, lang: string): FeedingAdvice {
    let name = species.nameI18n;
    try { name = JSON.parse(species.nameI18n)[lang] ?? JSON.parse(species.nameI18n).zh; } catch {}
    const { tempMin, tempMax } = species;
    const mid = (tempMin + tempMax) / 2;
    const tolerance = (tempMax - tempMin) / 2;

    let suitability: 'ideal' | 'ok' | 'poor' = 'ok';
    let rec = '';
    const actions: string[] = [];

    if (currentTemp < tempMin - 3 || currentTemp > tempMax + 3) {
      suitability = 'poor';
      rec = `Current temperature ${currentTemp}C is far outside the suitable range ${tempMin}-${tempMax}C. Please enable heating/cooling.`;
      actions.push('Check tank heater');
      actions.push('Reduce feeding (lower metabolism)');
    } else if (currentTemp >= tempMin && currentTemp <= tempMax) {
      suitability = 'ideal';
      if (Math.abs(currentTemp - mid) <= tolerance * 0.3) {
        rec = `Current ${currentTemp}C is in the optimal zone, normal feeding recommended.`;
      } else {
        rec = `Current ${currentTemp}C is within the suitable range, normal feeding is fine.`;
      }
      actions.push('Feed at species frequency');
      actions.push('Keep water clean');
    } else {
      if (currentTemp < tempMin) {
        rec = `Current ${currentTemp}C is slightly below the suitable temperature; consider reducing feeding.`;
        actions.push('Halve feeding amount');
        actions.push('Watch the heater');
      } else {
        rec = `Current ${currentTemp}C is slightly above the suitable temperature; add oxygen.`;
        actions.push('Turn on aerator');
        actions.push('Reduce feeding amount');
      }
    }

    return {
      speciesId: species.id,
      speciesName: name,
      tempSuitability: suitability,
      recommendation: rec,
      actionItems: actions,
    };
  }
}
