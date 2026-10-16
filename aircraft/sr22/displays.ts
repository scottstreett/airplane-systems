/**
 * Live Perspective+ displays for the SR22 G6: PFD, MFD (Engine Strip + map) and reversionary mode drawn with the shared
 * Garmin renderer (lib/avionics/g1000, Perspective+ style), plus the MD302 standby (lib/avionics/md302.ts).
 *
 * The SR22 has no flight model or autopilot sim: attitude follows the yokes and the air data is a fixed cruise picture
 * (approximately 155 KIAS / 165 KTAS, heading 360°; the POH 5-32 ISA cruise row at 4,000 ft, 2,500 RPM, 21.4 in.Hg, 65%).
 * Pressure altitude
 * follows s.paFt, initially 4,000 ft. Engine and electrical readings come from the sim (`live`, the electrical solution).
 */
import {
  drawMFD,
  drawPFD,
  type Comparator,
  type FlightData,
  type Gauge,
  type MfdData,
  type PfdData,
  type SpeedBands,
} from "@/lib/avionics/g1000";
import { drawMd302 } from "@/lib/avionics/md302";
import { clamp } from "@/lib/math";
import { casMessages, live, mapInHg, MAP_GAUGE, MAP_GREEN, type BusId, type Elec, type Sim } from "./model";

export { drawOff } from "@/lib/canvas";

type Ctx = CanvasRenderingContext2D;
type Band = [number, number, "green" | "yellow" | "red" | "white"];

/**
 * Airspeed markings up to 17,500 ft MSL (POH 13772-006 2-5): white 64–110, green 74–176, yellow 176–205, red line 205 KIAS
 * (VNE 205, VNO 176, POH 2-4). Cyan references: Vr 77 (short-field rotation, 4-18), Vx 88 and Vy 103 (best angle and best
 * rate of climb, sea level, 4-3), best glide 92 KIAS (all weights, 3-10). The MD302 standby always shows these; the PFD
 * lowers them above 17,500 ft (pfdSpeeds).
 */
export const SPEEDS: SpeedBands = {
  white: [64, 110],
  green: [74, 176],
  yellow: [176, 205],
  red: 205,
  vr: 77,
  vx: 88,
  vy: 103,
  vg: 92,
};

/** Altitudes (ft) between which VNO and VNE fall linearly, and their values at the top (POH 2-4, 2-5; 25,000 ft is the maximum operating altitude, 2-19). */
const LIMIT_ALT: [number, number] = [17500, 25000],
  VNO_TOP = 150,
  VNE_TOP = 175;

const pair = ([lo, hi]: [number, number]): [number, number] => [lo, hi];

/**
 * PFD airspeed markings at a pressure altitude (POH 2-4, 2-5, PDF pp. 30–31): "VNO and upper limit of green arc is reduced
 * linearly from 17,500 feet to 25,000 feet"; "VNE and red line is reduced linearly from 17,500 feet to 25,000 feet." Up to
 * 17,500 ft it returns a copy of SPEEDS; above 25,000 ft it holds the 25,000 ft values. White, green bottom and the cyan references
 * don't change. The POH gives feet MSL; the model feeds it pressure altitude.
 */
export function pfdSpeeds(altFt: number): SpeedBands {
  const [a0, a1] = LIMIT_ALT;
  // a fresh object and fresh band tuples every call, so a caller can't change SPEEDS (the standby's base markings)
  const base = { ...SPEEDS, white: pair(SPEEDS.white!) };
  if (altFt <= a0) return { ...base, green: pair(SPEEDS.green!), yellow: pair(SPEEDS.yellow!) };
  const t = Math.min(1, (altFt - a0) / (a1 - a0)),
    vno = SPEEDS.green![1] + (VNO_TOP - SPEEDS.green![1]) * t,
    vne = SPEEDS.red! + (VNE_TOP - SPEEDS.red!) * t;
  return { ...base, green: [SPEEDS.green![0], vno], yellow: [vno, vne], red: vne };
}

/**
 * MD302 standby colour bars (POH 7-20): from the base SPEEDS at every altitude, since its markings "do not automatically
 * compensate for changes in VNE or VNO at altitudes above 17,500 feet".
 */
export const standbyBands = () => ({
  white: pair(SPEEDS.white!),
  green: pair(SPEEDS.green!),
  yellow: pair(SPEEDS.yellow!),
  red: SPEEDS.red!,
});

/**
 * Illustrative IAS from TAS and altitude in the ISA troposphere, assuming CAS≈IAS and EAS≈CAS.
 * Density ratio rho/rho0 = (1 - 0.0065 * altitudeMetres / 288.15)^4.25588; EAS = TAS * sqrt(rho/rho0).
 * No instrument/position or compressibility correction: this is not calibrated POH IAS.
 */
export function illustrativeIas(tas: number, altitudeFt: number): number {
  const densityRatio = (1 - (0.0065 * (altitudeFt * 0.3048)) / 288.15) ** 4.25588;
  return Math.round(tas * Math.sqrt(densityRatio));
}

/**
 * Fixed cruise point: SR22 POH 13772-006 5-32 Cruise Performance, 4,000 ft ISA, 2,500 RPM, 21.4 in.Hg: 65%, 165 KTAS, 15.5 GPH.
 * IAS stays at that point; the displayed altitude follows Sim.paFt, initially 4,000 ft.
 */
const TAS = 165,
  IAS = illustrativeIas(TAS, 4000),
  HDG = 360,
  BARO = 29.92;

/** A breaker-fed load has power: its bus is live and its breaker is in. */
const pw = (s: Sim, E: Elec, bus: BusId, cb: string) => E[bus] > 0 && !s.cb[cb];
const pad = (n: number) => String(n).padStart(2, "0");
/** The Perspective+ PFD clock shows UTC (PG Fig 2-1). */
const clock = () => {
  const d = new Date();
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};
/** Under the CAPS canopy the airspeed shows dashes. */
const ias = () => (live.capsT >= 0 ? 0 : IAS);

/** Which ADAHRS feeds the PFD: 1 or 2, or null with none valid. */
export type AdahrsSide = 1 | 2 | null;
/**
 * Dual ADAHRS reversion (installed per operator, 2026-10-08). Each ADAHRS contains an AHRS and an air data
 * computer and runs on its own breaker and bus (POH 7-74); MAG 1 feeds ADAHRS 1 and MAG 2 feeds ADAHRS 2 (POH Fig 7-17),
 * and heading needs the AHRS plus its magnetometer (POH 7-74; HSI, POH 7-21). When one unit is lost the avionics system
 * switches to the functioning AHRS (POH 3-43, AHRS Failure step 1), so the PFD keeps attitude, heading and air data from
 * the other side. Only with both lost do the red X's and yellow ATTITUDE FAIL / HDG flags appear (POH 3-43 notes). With a
 * single air data computer left, or none, the temperature-compensated altitudes cannot be compared: "VDI NO COMP" (POH 7-80).
 * ADAHRS 1 is the primary (POH 7-74: "the primary ADC"); the model prefers it while both are valid.
 */
export function adahrsSources(E: Elec): {
  att: AdahrsSide;
  air: AdahrsSide;
  hdg: AdahrsSide;
  oat: AdahrsSide;
  comp: string | null;
} {
  const att: AdahrsSide = E.adahrs1 ? 1 : E.adahrs2 ? 2 : null;
  const hdg: AdahrsSide = E.adahrs1 && E.mag1 ? 1 : E.adahrs2 && E.mag2 ? 2 : null;
  const comp = E.adahrs1 && E.adahrs2 ? null : "VDI NO COMP";
  // Selected-side ADC supplies OAT (POH 7-79/7-80); both probes read the shared ambient temperature.
  return { att, air: att, hdg, oat: att, comp };
}

/**
 * PFD sensor annunciations for the dual ADAHRS. Comparator boxes, black on white, post when one or both sensed values are
 * unavailable (Perspective+ PG 190-02183-01 Rev. A Fig 2-47, Table 2-4, p. 105–106): ALT and IAS from the air data
 * computers, PIT and ROL from the AHRS, HDG from the AHRS with its magnetometer. The VDI one reads "VDI NO COMP", black text
 * on a white background in the PFD's sensor comparison annunciation area (POH 7-80). The model has no miscompares: both
 * units read the same picture. "USING AHRS2" / "USING ADC2" show while PFD 1 shows data from ADAHRS 2 (PG Fig 2-48,
 * Table 2-5, p. 106).
 */
export function adahrsAnnunciations(E: Elec): { comparators: Comparator[]; reversionary: string[] } {
  const src = adahrsSources(E),
    both = E.adahrs1 && E.adahrs2,
    comparators: Comparator[] = [];
  if (!both) comparators.push({ at: "IAS", text: "IAS" }, { at: "ALT", text: "ALT" });
  if (src.comp) comparators.push({ at: "VDI", text: src.comp });
  if (!both) comparators.push({ at: "PIT", text: "PIT" }, { at: "ROL", text: "ROL" });
  if (!(both && E.mag1 && E.mag2)) comparators.push({ at: "HDG", text: "HDG" });
  const reversionary = [
    ...(src.att === 2 || src.hdg === 2 ? ["USING AHRS2"] : []),
    ...(src.air === 2 ? ["USING ADC2"] : []),
  ];
  return { comparators, reversionary };
}

function flight(s: Sim, E: Elec): FlightData {
  const dash: [string, string] = ["----", "----"];
  const src = adahrsSources(E);
  const xpdr = pw(s, E, "avx", "XPONDER");
  return {
    pitch: s.ctrl.pitch * 10,
    roll: s.ctrl.roll * 25,
    slip: 0,
    ias: ias(),
    tas: TAS,
    gs: TAS,
    alt: s.paFt,
    vs: 0,
    hdg: HDG,
    trk: HDG,
    baro: BARO,
    oat: s.pitot.oat,
    hdgBug: HDG,
    crs: HDG,
    cdi: 0,
    navSrc: "GPS",
    selAlt: s.paFt,
    pos: [0, 0],
    xtk: 0,
    // GIA 1: COM 1 + GPS NAV GIA 1 on ESS BUS 1; GIA 2: COM 2 + GPS NAV GIA 2 on MAIN BUS 2
    com1: pw(s, E, "ess1", "COM 1") ? undefined : dash,
    com2: pw(s, E, "main2", "COM 2") ? undefined : dash,
    nav1: pw(s, E, "ess1", "GPS NAV GIA 1") ? undefined : dash,
    nav2: pw(s, E, "main2", "GPS NAV GIA 2") ? undefined : dash,
    xpdr: xpdr ? "1200" : "----",
    xpdrMode: xpdr ? "ALT" : "FAIL",
    time: clock(),
    fail: src.att && src.hdg ? undefined : { att: !src.att, air: !src.air, hdg: !src.hdg },
  };
}

/**
 * Percent power, illustrative: the display computes it from manifold pressure, IAS, OAT, pressure altitude, RPM and fuel flow
 * (POH 7-36). The model uses a linear fit to the POH 5-32 ISA cruise rows (4,000 ft: 2,700 RPM / 25.4 in.Hg = 91%,
 * 2,500 / 25.4 = 82%, 2,500 / 21.4 = 65%; it reproduces the 2,000 and 6,000 ft rows within 2%): 4.25% per in.Hg,
 * 0.045% per RPM. So full throttle at altitude reads less than 100% as a normally aspirated engine does. Null without
 * ENGINE INSTR power, like the rest of the engine data.
 */
export const pctPower = (s: Sim, E: Elec, rpm = live.rpm) => {
  if (!E.eisPwr) return null;
  if (rpm < 200) return 0;
  return clamp(4.25 * mapInHg(s, rpm) + 0.045 * rpm - 138.45, 0, 100);
};

// No AFCS status: the model has no autopilot sim, and with the flight director off the Perspective+ AFCS row is blank (PG Fig 2-1).
export const pfdData = (s: Sim, E: Elec): PfdData => ({
  f: flight(s, E),
  speeds: pfdSpeeds(s.paFt),
  alerts: casMessages(s, E),
  pctPower: pctPower(s, E),
  style: "perspective",
  ...adahrsAnnunciations(E),
});

const level = (v: number | null, bands: Band[]): Gauge["alert"] => {
  if (v == null) return null;
  for (const [a, b, c] of bands)
    if (v >= a && v <= b) return c === "red" ? "warning" : c === "yellow" ? "caution" : null;
  return null;
};
const f0 = (v: number) => String(Math.round(v)),
  f1 = (v: number) => v.toFixed(1),
  sgn = (v: number) => (v > 0 ? "+" : "") + Math.round(v);

/**
 * Engine Strip (PG 190-02183-03 Fig 3-2; markings SR22 POH 13772-006 2-9, electrical markings 2-11), top to bottom, for what the model has: % Pwr (estimated,
 * see pctPower), RPM and Man "Hg as digital rows, fuel quantity L/R with fuel flow beside it, Batt 1 A and Ess Bus V.
 * RPM, manifold pressure, fuel quantity and the electrical values come from the sim; fuel flow is illustrative (no
 * fuel-flow model). GAL Used, oil, CHT and EGT aren't simulated and are left off. Main-bus volts and alternator amps are on
 * the ENGINE page, not the strip (POH 7-52), so they aren't drawn here (the Electrical panel shows them). Everything comes
 * through the Engine Airframe Unit (POH 7-33, 7-41, 7-52), so every item shows a red X when it loses ENGINE INSTR power.
 */
export function eisGauges(s: Sim, E: Elec): Gauge[] {
  const ok = E.eisPwr,
    v = (x: number) => (ok ? x : null);
  const g = (
    key: string,
    label: string,
    style: Gauge["style"],
    min: number,
    max: number,
    bands: Band[],
    value: number | null,
    fmt: (n: number) => string,
  ): Gauge => ({ key, label, style, min, max, bands, value, fmt, alert: level(value, bands) });
  const rpm = Math.round(live.rpm / 10) * 10;
  // Float sensors: FUEL QTY on MAIN BUS 1; red 0, yellow 0–14, green 14–46 gal
  // (SR22 POH 13772-006 2-10, 7-42). Each pointer takes its band's colour; fuel flow beside it.
  const fq = ok && pw(s, E, "main1", "FUEL QTY");
  // Illustrative, not a fuel-flow model: full rich at full throttle follows the MAX POWER FUEL FLOWS placard (POH 2-27:
  // 27 GPH at sea level, 24 at 4,000, 21 at 8,000, 18 at 12,000, 17 at 16,000 ft), interpolated by altitude and scaled by the
  // lever from an illustrative 3 GPH at idle.
  const placard = [27, 24, 21, 18, 17],
    k = clamp(s.paFt / 4000, 0, 4),
    i = Math.min(3, Math.floor(k)),
    fullRichMax = placard[i] + (placard[i + 1] - placard[i]) * (k - i);
  const fullRich = 3 + s.eng.lever * (fullRichMax - 3);
  const ff = s.eng.running ? fullRich * s.eng.mix : 0;
  // POH 2-10: the top of the green arc changes with altitude, and a gap in the band is displayed at power settings of 75%
  // or less to aid leaning. The model draws the full-rich placard flow as the top of the arc; the gap is not drawn.
  const ffBands: Band[] = [[0, fullRichMax, "green"]];
  const fuel: Gauge = {
    key: "fuel",
    label: "GAL",
    style: "tanks",
    min: 0,
    max: 46,
    bands: [
      [0, 0.5, "red"],
      [0.5, 14, "yellow"],
      [14, 46, "green"],
    ],
    value: fq ? s.fuel.qL : null,
    value2: fq ? s.fuel.qR : null,
    side: g("ff", "FFlow GPH", "bar", 0, 45, ffBands, v(ff), f1),
  };
  const pct = pctPower(s, E);
  return [
    g("pwr", "% Pwr", "dial", 0, 100, [[0, 100, "green"]], pct == null ? null : Math.round(pct), f0),
    // RPM: 0–3000, green 500–2700, red above 2700 (POH 2-9); the readout turns red with the RPM warning (POH 3-24;
    // 2,710–2,730 RPM for 10 s or > 2,730 for 5 s, POH 2-9 note a), so it agrees with the CAS window
    {
      ...g(
        "rpm",
        "RPM",
        "text",
        0,
        3000,
        [
          [500, 2700, "green"],
          [2700, 3000, "red"],
        ],
        v(rpm),
        f0,
      ),
      alert: ok && s.eng.rpmWarn ? "warning" : null,
    },
    // manifold pressure: 10–35 in.Hg, green 15–29.5, no caution or warning band (POH 2-9; sensor in the induction manifold
    // near the throttle body, 7-36)
    g(
      "map",
      'Man "Hg',
      "text",
      MAP_GAUGE[0],
      MAP_GAUGE[1],
      [[MAP_GREEN[0], MAP_GREEN[1], "green"]],
      v(mapInHg(s, live.rpm)),
      f1,
    ),
    fuel,
    g(
      "b1",
      "Batt 1 A",
      "text",
      -59,
      59,
      [
        [-59, -5, "yellow"],
        [-4, 59, "green"],
      ],
      v(E.b1),
      sgn,
    ),
    g(
      "ess",
      "Ess Bus V",
      "text",
      0,
      36,
      [
        [0, 24.4, "red"],
        [24.5, 32, "green"],
        [32, 36, "red"],
      ],
      v(E.ess1),
      f1,
    ),
  ];
}

const mfdData = (s: Sim, E: Elec, reversion: boolean): MfdData => ({
  ...pfdData(s, E),
  eis: eisGauges(s, E),
  reversion,
  page: "Map - Navigation Map",
});

/**
 * Reversionary mode: losing one display puts PFD symbology plus the Engine Strip on the other automatically (POH 7-73), and
 * DISPLAY BACKUP puts both displays in reversionary mode (PG p. 12, Fig 1-6). `E.pfd` is false when the PFD has failed.
 */
export const pfdReversion = (s: Sim, E: Elec) => E.pfd && (s.avx.backup || !E.mfd);
export const mfdReversion = (s: Sim, E: Elec) => E.mfd && (s.avx.backup || !E.pfd);

export function drawPfdScreen(ctx: Ctx, W: number, H: number, s: Sim, E: Elec) {
  if (pfdReversion(s, E)) drawMFD(ctx, W, H, mfdData(s, E, true));
  else drawPFD(ctx, W, H, pfdData(s, E));
}

export function drawMfdScreen(ctx: Ctx, W: number, H: number, s: Sim, E: Elec) {
  drawMFD(ctx, W, H, mfdData(s, E, mfdReversion(s, E)));
}

/**
 * MD302 standby (lib/avionics/md302.ts): attitude follows the yokes, airspeed the fixed cruise IAS, altitude s.paFt and
 * the BARO box the Garmin baro (POH 7-21). The colour bars are the base markings at every altitude (POH 7-20).
 */
export function drawStandby(ctx: Ctx, W: number, H: number, s: Sim) {
  drawMd302(ctx, W, H, {
    roll: s.ctrl.roll * 25,
    pitch: s.ctrl.pitch * 10,
    ias: ias(),
    alt: s.paFt,
    baro: BARO,
    bands: standbyBands(),
  });
}
