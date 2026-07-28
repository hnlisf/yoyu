export class AchievementDto {
  id: string;
  titleKey: string;
  unlockedAt: string | null;
}

export class StatsAchievementsDto extends Array<AchievementDto> {}
