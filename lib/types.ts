export interface BreadthRow {
  date: string;
  weekday: string | null;
  nifty50: number | null;
  smlcap100: number | null;
  universe: number | null;
  adv4pct: number | null;
  dec4pct: number | null;
  net_breadth: number | null;
  range3pct: number | null;
  range5pct: number | null;
  vol_ratio: number | null;
  uhlh_ratio: number | null;
  breakouts: number | null;
  up_close_pct: number | null;
  bo_sf_ratio: number | null;
  breakdowns: number | null;
  down_close_pct: number | null;
  bd_sf_ratio: number | null;
  surge15_5d: number | null;
  drop10_5d: number | null;
  above10_10dema: number | null;
  below10_10dema: number | null;
  new52wh: number | null;
  new52wl: number | null;
  net_nhnl: number | null;
  near52wh15: number | null;
  near52wl15: number | null;
  net15hl: number | null;
  day_range5: number | null;
  above10ma: number | null;
  above20ma: number | null;
  above50ma: number | null;
  above200ma: number | null;
  five_day_ratio: number | null;
  ten_day_ratio: number | null;
  [key: string]: number | string | null;
}

export interface SectoralRow {
  date: string;
  sector: string;
  close: number | null;
  chg_pct: number | null;
}
