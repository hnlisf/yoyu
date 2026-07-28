export class StatsWeeklyDatumDto {
  date: string; // 'YYYY-MM-DD'
  feed: number;
  water: number;
  remind: number;
}

export class StatsWeeklyDto extends Array<StatsWeeklyDatumDto> {}
