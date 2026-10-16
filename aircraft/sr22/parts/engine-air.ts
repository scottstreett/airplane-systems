/**
 * Engine induction and exhaust, SR22 (IO-550-N). SR22 POH 13772-006 7-37: induction air enters through the two cowl
 * inlets, passes through a dry-foam filter, the throttle butterfly and the six-tube engine manifold to the cylinder intake
 * ports; a pilot-controlled alternate air door bypasses the filter (7-32). Exhaust: cylinders → exhaust manifold → a
 * muffler on either side of the engine → exhaust pipes out of the lower cowling; a muff heat exchanger around the right
 * muffler provides cabin heat (7-37, 7-60).
 *
 * The POH has no induction or exhaust figure and the SR22 AMM (13773-001) was not inspected. The geometry here is the
 * SR22T study model's (AMM 13773-002 Rev 7 Figs 71-60-2 and 78-10-2, undimensioned) with the turbochargers, intercoolers,
 * wastegate and controller removed: the air boxes, the schematic duct to the throttle body (../induction-layout.ts), the
 * top-mounted throttle body, intake manifold and intake pipes, the cylinder headers and collector rails, and the new
 * downpipes, mufflers and tailpipes (../exhaust-layout.ts). Every diameter, bend and corner is illustrative.
 *
 * May import anchors only from earlier sections:
 * catalogue.ts, airframe.ts, surfaces.ts, cowl.ts, gear.ts, engine.ts, engine-ignition.ts, engine-oil.ts.
 * Side-effect-free helpers may come from ../geometry, ../model and ../rig.
 * Shared constants belong in catalogue.ts; later sections must never be imported here.
 */
import * as THREE from "three";
import type { Vec3 } from "@/lib/math";
import { AIR_BOX_AFT, AIR_BOX_SIZE, INDUCTION_DUCT, INDUCTION_DUCT_BEND, INDUCTION_DUCT_R } from "../induction-layout";
import { INDUCTION_Y_INLET } from "../intercooler-layout";
import { bandGeo, bentCurve, bentPoints, bentTubeGeo, curveOf } from "@/lib/geometry";
import { box, cyl, tubeGeo } from "../geometry";
import { part, CONSOLE_QUADRANT } from "./catalogue";
import { NACA_INDUCTION } from "./cowl";
import { AIR_BOX, ALT_AIR, CYLS, cylExhaust, cylIntake, THROTTLE, THROTTLE_LEN } from "./engine";
import {
  bentRun,
  COLLECTOR_JUNCTION,
  DOWNPIPE,
  EXHAUST_BEND,
  EXHAUST_PORT_FLANGE_T,
  EXHAUST_PORT_FLANGE_W,
  EXHAUST_PORT_GASKET_T,
  EXHAUST_RADIUS,
  MUFFLER,
  MUFFLER_INLET,
  MUFFLER_LEN,
  MUFFLER_OUTLET,
  MUFFLER_R,
  REAR_SLIP,
  TAILPIPE,
  TAILPIPE_RADIUS,
} from "../exhaust-layout";

export const INDUCTION_Y: Vec3 = [3.48, 0.06, 0];
export const INTAKE_MANIFOLD: Vec3 = [3.24, 0.05, 0];
/** Drawn manifold tube centreline and radius; the fuel manifold valve sits on its top surface. */
export const INTAKE_MANIFOLD_PATH: Vec3[] = [[3.3, 0.05, 0], INTAKE_MANIFOLD, [2.86, 0.04, 0]];
export const INTAKE_MANIFOLD_R = 0.032;
/** Mixture valve at the left aft engine-driven pump, inboard of the filter (POH 7-32, 7-37). Position approximate. */
export const MIXTURE_ARM: Vec3 = [2.8, -0.3, -0.12];
const inductionRef =
  "SR22 POH 13772-006 7-37; geometry carried over from the SR22T study model (AMM 13773-002 Rev 7 Fig 71-60-2), approximate.";
const INDUCTION_COLOR = "#8A969E";
const EXHAUST_COLOR = "#8A5A3C";
const exhaustRef =
  "SR22 POH 13772-006 7-37; header routing carried over from the SR22T study model (AMM 13773-002 Rev 7 Fig 78-10-2), mufflers and tailpipes illustrative.";

/* ---------- induction ---------- */
/** Induction inlet duct, Ø44 mm (approximate): sized to the ≈5-cm NACA throat (parts/cowl.ts) inside the lower cowl. */
export const INLET_DUCT_R = 0.022;
/** Centreline bend radius of the inlet and alternate air ducts, approximate. */
const DUCT_BEND = 0.04;
/** The NACA duct's internal end, 0.028 m above its anchor on the skin: the inlet duct and the `inlet*` flows start here. */
export const INLET_PORT = (s: number): Vec3 => {
  const n = NACA_INDUCTION(s);
  return [n[0], n[1] + 0.028, n[2]];
};
/** Air box forward face, on the filter body's centre: the inlet duct clamps on here. */
export const AIR_BOX_FRONT = (s: number): Vec3 => [AIR_BOX(s)[0] + AIR_BOX_SIZE[0] / 2, AIR_BOX(s)[1], AIR_BOX(s)[2]];
/** Air box inboard face port for the alternate air tube; 0.03 m aft of the forward face, approximate. */
export const AIR_BOX_ALT = (s: number): Vec3 => [
  AIR_BOX_FRONT(s)[0] - 0.03,
  AIR_BOX(s)[1],
  AIR_BOX(s)[2] - (s * AIR_BOX_SIZE[2]) / 2,
];
/** Inlet duct corners: aft out of the NACA duct, an S-bend onto the air box axis, square into its forward face. */
export const INLET_DUCT = (s: number): Vec3[] => {
  const a = INLET_PORT(s),
    b = AIR_BOX_FRONT(s);
  return [a, [a[0] - 0.05, a[1], a[2]], [b[0] + 0.045, b[1], b[2]], [b[0] + 0.0005, b[1], b[2]]];
};
export const inletDuctCurve = (s: number) => bentCurve(INLET_DUCT(s), DUCT_BEND);
/** The inlet duct's centreline, sampled: the `inlet*` flows follow it. */
export const INLET_RUN = (s: number): Vec3[] => bentPoints(INLET_DUCT(s), DUCT_BEND);
/** Alternate air assembly box (engine.ts, 0.16 m wide, approximate) half width: the tubes leave its side faces. */
const ALT_AIR_HALF_W = 0.08;
/** Alternate air tube Ø48 mm (approximate). */
export const ALTERNATE_DUCT_R = 0.024;
/** Alternate air tube corners: out of the assembly's side face and down ahead of the oil sump, aft under it, square into
 * the air box's inboard face. Corner points approximate. */
const ALTERNATE_CORNERS = (s: number): Vec3[] => {
  const p = AIR_BOX_ALT(s);
  return [
    [ALT_AIR[0], ALT_AIR[1], s * ALT_AIR_HALF_W],
    [ALT_AIR[0], -0.47, s * 0.16],
    [ALT_AIR[0] - 0.08, -0.472, s * 0.235],
    [p[0], p[1], s * 0.235],
    p,
  ];
};
export const alternateDuctCurve = (s: number) => bentCurve(ALTERNATE_CORNERS(s), DUCT_BEND);
/** The alternate air tube's centreline, sampled: the part draws it and the `altAir*` flows follow it. */
export const ALTERNATE_DUCT = (s: number): Vec3[] => bentPoints(ALTERNATE_CORNERS(s), DUCT_BEND);
/** The induction duct's centreline, sampled: the `duct*` flows follow it. */
export const inductionDuctCurve = (s: number) => bentCurve(INDUCTION_DUCT(s), INDUCTION_DUCT_BEND);
export const INDUCTION_RUN = (s: number): Vec3[] => bentPoints(INDUCTION_DUCT(s), INDUCTION_DUCT_BEND);
/** The "Y" junction's drawn outlet arm: LH inlet spigot → junction → into the throttle body's bore. Approximate. */
export const INDUCTION_Y_R = 0.028;
const yCurve = curveOf([INDUCTION_Y_INLET(-1), INDUCTION_Y, THROTTLE], 0.15);
/** Arc-length fraction along `curve` where its x falls to `x`; the curve runs aft monotonically from `from`. */
const fractionAtX = (curve: THREE.Curve<THREE.Vector3>, x: number, from = 0) => {
  let lo = from,
    hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (curve.getPointAt(mid).x > x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
/** Throttle body ports: the "Y" outlet crosses the forward face on its drawn centreline and sleeves into the bore; the
 * manifold leaves the aft face on its own drawn centreline. */
export const THROTTLE_FRONT = yCurve
  .getPointAt(fractionAtX(yCurve, THROTTLE[0] + THROTTLE_LEN / 2, 0.3))
  .toArray() as Vec3;
export const THROTTLE_AFT: Vec3 = [
  THROTTLE[0] - THROTTLE_LEN / 2,
  INTAKE_MANIFOLD_PATH[0][1],
  INTAKE_MANIFOLD_PATH[0][2],
];
const manifoldCurve = curveOf(INTAKE_MANIFOLD_PATH, 0.15);
/** Manifold centreline point at station `x`; the drawn tube runs aft monotonically. */
const manifoldAt = (x: number) => {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (manifoldCurve.getPoint(mid).x > x) lo = mid;
    else hi = mid;
  }
  return manifoldCurve.getPoint((lo + hi) / 2);
};
/** Intake pipe Ø28 mm, approximate. */
export const INTAKE_PIPE_R = 0.014;
/** Intake pipe centreline bend radius, approximate. */
const PIPE_BEND = 0.03;
/** Forward-most manifold outlet: cylinder 6 sits forward of the drawn manifold, so its pipe leaves 0.04 m aft of the
 * throttle body's aft face and runs forward to the head. Approximate. */
const OUTLET_MAX_X = THROTTLE_AFT[0] - 0.04;
/** Manifold outlet for cylinder `c`, on the manifold's side toward its bank at the cylinder's station (POH 7-37: "the
 * six-tube engine manifold"). Positions approximate. */
export const MANIFOLD_OUTLET = (c: { x: number; s: number }): Vec3 => {
  const p = manifoldAt(Math.min(c.x, OUTLET_MAX_X));
  return [p.x, p.y, c.s * INTAKE_MANIFOLD_R];
};
/**
 * Intake pipe corners for cylinder `c`: from inside the manifold out of its side, then straight down and outboard to a
 * point above the intake port (`cylIntake`, engine.ts), passing under the upper ignition lanes and under the cylinder's
 * injector line, then straight down onto the port, where a flange seats it. Top induction as drawn on the SR22T model;
 * the IO-550-N's own port arrangement was not checked against an SR22 figure (schematic).
 */
export const INTAKE_PIPE = (c: { x: number; s: number }): Vec3[] => {
  const o = MANIFOLD_OUTLET(c),
    port = cylIntake(c);
  const above: Vec3 = [port[0], port[1] + 0.02, port[2]];
  return [
    [o[0], o[1], c.s * 0.024],
    [o[0], o[1], c.s * 0.044],
    ...(c.x > OUTLET_MAX_X
      ? ([
          [port[0], 0, c.s * 0.105],
          [port[0], 0, c.s * 0.165],
        ] as Vec3[])
      : []),
    above,
    port,
  ];
};
/** Intake port flange on the head, round the pipe's end: Ø44 mm × 4 mm, approximate. */
export const PORT_FLANGE_R = 0.022;
export const PORT_FLANGE_T = 0.004;
export const intakePipeCurve = (c: { x: number; s: number }) => bentCurve(INTAKE_PIPE(c), PIPE_BEND, true);
/** The intake pipe's centreline, sampled every 0.01 m: the `man*` flows follow it. */
export const INTAKE_RUN = (c: { x: number; s: number }): Vec3[] =>
  bentPoints(INTAKE_PIPE(c), PIPE_BEND, undefined, true);
/** Aft end cap of the manifold, 4 mm thick inside the drawn tube's end. Approximate. */
export const MANIFOLD_CAP_T = 0.004;
const MANIFOLD_END = INTAKE_MANIFOLD_PATH[INTAKE_MANIFOLD_PATH.length - 1];
/** Side-deck window cut-out around each induction duct: the duct's radius plus 6 mm (engine-baffles.ts notches the window
 * and seal to it). Approximate. */
export const INLET_CUTOUT_R = INDUCTION_DUCT_R + 0.006;
/**
 * The induction path as connected runs, side `s`, in flow order: each run's part name and its centreline end points.
 * One chain from the NACA inlet through the air box and the induction duct to the intake manifold, then one manifold →
 * intake pipe branch per cylinder. Tests and flows read these points.
 */
export const INDUCTION_PATH = (s: number): { part: string; pts: Vec3[]; wall?: boolean }[][] => [
  [
    { part: "Induction inlet duct", pts: INLET_DUCT(s) },
    { part: "Air box / induction filter", pts: [AIR_BOX_FRONT(s), AIR_BOX_AFT(s)] },
    { part: "Induction duct", pts: INDUCTION_DUCT(s) },
    { part: "Induction Y junction", pts: [INDUCTION_Y_INLET(s), INDUCTION_Y, THROTTLE_FRONT] },
    { part: "Throttle body / fuel-metering valve", pts: [THROTTLE_FRONT, THROTTLE_AFT] },
    { part: "Intake manifold", pts: INTAKE_MANIFOLD_PATH },
  ],
  ...CYLS.filter((c) => c.s === s).map((c) => {
    const o = MANIFOLD_OUTLET(c);
    return [
      { part: "Intake manifold", pts: [[o[0], o[1], 0] as Vec3, o], wall: true },
      { part: `Intake pipe — cyl ${c.n}`, pts: [o, INTAKE_PIPE(c).at(-1)!] },
      { part: "Intake port flange", pts: [cylIntake(c)] },
    ];
  }),
];

/* ---------- exhaust ---------- */
/** Vertical neck below each exhaust port before it turns outboard; illustrative, it keeps the EGT probe station and
 * the lower harness clearance when the head moves. */
export const NECK_DROP = 0.057;
/** Each bank's header: three risers onto a collector rail below the bank, a slip joint between pieces, then the
 * downpipe from the rail's aft junction into the muffler (POH 7-37: "exhaust manifold"). Routing illustrative. */
export const HEADER = (s: number) => {
  const bank = CYLS.filter((c) => c.s === s);
  const port = (i: number): Vec3 => cylExhaust(bank[i]);
  const junction = COLLECTOR_JUNCTION(s);
  const rail = (x: number): Vec3 => [x, junction[1], junction[2]];
  const neck = (i: number): Vec3[] => [port(i), [bank[i].x, port(i)[1] - NECK_DROP, port(i)[2]], rail(bank[i].x)];
  const frontSlip = rail((bank[0].x + bank[1].x) / 2);
  const rearSlip = REAR_SLIP(s);
  return {
    elbow: [...neck(0), frontSlip],
    tee: [frontSlip, rail(bank[1].x), junction],
    riser: neck(1),
    /** The aft riser lands on its own slip joint; the transition runs from that slip through the junction and down into
     * the muffler. */
    transition: [rearSlip, ...DOWNPIPE(s)],
    aftRiser: neck(2),
  };
};
/** Corner points of each cylinder's complete run after its riser, monotonically toward the muffler. */
const exhaustCorners = (c: (typeof CYLS)[number]): Vec3[] => {
  const h = HEADER(c.s);
  const junction = COLLECTOR_JUNCTION(c.s);
  const junctionIndex = h.transition.findIndex((p) => p.every((v, i) => v === junction[i]));
  const entry = h.transition.slice(junctionIndex + 1);
  const bank = CYLS.filter((b) => b.s === c.s);
  if (c.n === bank[0].n) return [...h.elbow, ...h.tee.slice(1), ...entry];
  if (c.n === bank[2].n) return [...h.aftRiser, ...h.transition.slice(1)];
  const collector = c.x > junction[0] ? h.tee : h.transition.slice(0, junctionIndex + 1);
  return [...h.riser, ...collector.filter((p) => (c.x > junction[0] ? p[0] < c.x : p[0] > c.x)), ...entry];
};
/** Each cylinder's exhaust centreline from its port to the muffler inlet, following the bent header tubes (sampled
 * every 10 mm). The joints between pieces are fittings, not bends. */
export const EXHAUST_RUN = (c: (typeof CYLS)[number]): Vec3[] => {
  const i = CYLS.filter((b) => b.s === c.s).findIndex((b) => b.n === c.n);
  const fittings = [COLLECTOR_JUNCTION(c.s)];
  if (i > 0) fittings.push(HEADER(c.s)[i === 1 ? "riser" : "aftRiser"].at(-1)!);
  return bentRun(exhaustCorners(c), EXHAUST_BEND, fittings);
};
/** Corner indices of a header piece kept as sharp fittings: the collector junction. */
const headerSharp = (path: Vec3[], s: number) =>
  [COLLECTOR_JUNCTION(s)]
    .map((j) => path.findIndex((p) => p.every((v, i) => v === j[i])))
    .filter((i) => i > 0 && i < path.length - 1);
/** A header piece's bent tube. */
const headerTubeGeo = (path: Vec3[], s: number) =>
  bentTubeGeo(path, EXHAUST_RADIUS, EXHAUST_BEND, 12, false, headerSharp(path, s));
/** The exhaust run through the muffler, muffler inlet → outlet, for the `exhaust*` flows. */
export const MUFFLER_RUN = (s: number): Vec3[] => [MUFFLER_INLET(s), MUFFLER(s), MUFFLER_OUTLET(s)];
/** The tailpipe's centreline, sampled. */
export const TAILPIPE_RUN = (s: number): Vec3[] => bentRun(TAILPIPE(s), 2 * TAILPIPE_RADIUS);

/* ---------- control cables ---------- */
export const THROTTLE_CABLE: Vec3[] = [
  CONSOLE_QUADRANT,
  [2.1, -0.48, -0.07],
  [2.63, -0.35, -0.12],
  [3.12, 0.1, -0.1],
  THROTTLE,
];
export const MIXTURE_CABLE: Vec3[] = [CONSOLE_QUADRANT, [2.1, -0.5, 0.07], [2.63, -0.38, 0.15], MIXTURE_ARM];
/** ALT AIR – PULL knob on the left console near the pilot's right knee (POH 7-32) to the alternate air door: a push-pull
 * cable along the lower left of the firewall bay, forward under the engine. Knob station and routing schematic. */
export const ALT_AIR_KNOB: Vec3 = [CONSOLE_QUADRANT[0] + 0.1, CONSOLE_QUADRANT[1] - 0.12, -0.2];
export const ALT_AIR_CABLE: Vec3[] = [
  ALT_AIR_KNOB,
  [2.1, -0.58, -0.2],
  [2.63, -0.6, -0.14],
  [3.2, -0.58, -0.02],
  [ALT_AIR[0] - 0.03, ALT_AIR[1] - 0.04, -0.08],
];

/* ---------- parts ---------- */
part(
  () =>
    tubeGeo([INDUCTION_Y_INLET(-1), INDUCTION_Y, THROTTLE], INDUCTION_Y_R).translate(
      -INDUCTION_Y[0],
      -INDUCTION_Y[1],
      -INDUCTION_Y[2],
    ),
  ["engine"],
  {
    name: "Induction Y junction",
    pos: INDUCTION_Y,
    color: INDUCTION_COLOR,
    note: "Both air-box ducts join before the throttle body. " + inductionRef,
    groups: ["induction"],
  },
);
part(
  () =>
    tubeGeo(INTAKE_MANIFOLD_PATH, INTAKE_MANIFOLD_R).translate(
      -INTAKE_MANIFOLD[0],
      -INTAKE_MANIFOLD[1],
      -INTAKE_MANIFOLD[2],
    ),
  ["engine"],
  {
    name: "Intake manifold",
    pos: INTAKE_MANIFOLD,
    color: INDUCTION_COLOR,
    note:
      "Throttle body → six-tube engine manifold → the cylinder intake ports (POH 7-37). The MAP sensor is in this manifold near the throttle body (7-36). " +
      inductionRef,
    groups: ["induction"],
  },
);
part(() => tubeGeo([INDUCTION_Y_INLET(1), INDUCTION_Y], INDUCTION_Y_R), ["engine"], {
  color: INDUCTION_COLOR,
  groups: ["induction"],
});
for (const s of [-1, 1]) {
  const side = s < 0 ? "LH" : "RH";
  part(() => bentTubeGeo(INDUCTION_DUCT(s), INDUCTION_DUCT_R, INDUCTION_DUCT_BEND, 16), ["engine"], {
    name: "Induction duct",
    color: INDUCTION_COLOR,
    note:
      side +
      " induction duct from the air box's aft face up and around the aft engine, through the side baffle deck, forward along the deck and inboard across the front of the cylinders to the throttle body's \"Y\" inlet. Schematic: the SR22 POH (13772-006 7-37) names the filter, throttle butterfly and six-tube manifold but draws no duct, and this route is the SR22T model's charge-air route with its turbocharger and intercooler replaced by plain duct. Ø2.1 in. and every corner approximate.",
    groups: ["induction"],
  });
  part(() => bentTubeGeo(ALTERNATE_CORNERS(s), ALTERNATE_DUCT_R, DUCT_BEND), ["engine"], {
    name: "Alternate air duct",
    color: INDUCTION_COLOR,
    note:
      side +
      " tube from the alternate air assembly's side, down and aft under the oil sump into the air box's inboard face. Ø48 mm, bends and routing approximate (schematic; " +
      inductionRef +
      ")",
    groups: ["induction"],
  });
  const h = HEADER(s);
  for (const [name, path] of [
    ["Elbow riser", h.elbow],
    ["Exhaust tee", h.tee],
    ["Muffler downpipe", h.transition],
  ] as const) {
    const anchor = path[0];
    part(() => headerTubeGeo(path, s).translate(-anchor[0], -anchor[1], -anchor[2]), ["engine"], {
      name,
      pos: anchor,
      color: EXHAUST_COLOR,
      note:
        side +
        (name === "Muffler downpipe"
          ? " collector rail aft end, down into the muffler's inlet. "
          : " exhaust manifold; the pieces are connected by slip joints to accommodate expansion. ") +
        exhaustRef,
      groups: ["exhaust"],
    });
  }
  part(() => bentTubeGeo(h.riser, EXHAUST_RADIUS, EXHAUST_BEND), ["engine"], {
    name: "Cylinder exhaust riser",
    pin: false,
    color: EXHAUST_COLOR,
    note: side + " middle cylinder → tee. " + exhaustRef,
    groups: ["exhaust"],
  });
  part(() => bentTubeGeo(h.aftRiser, EXHAUST_RADIUS, EXHAUST_BEND), ["engine"], {
    name: "Cylinder exhaust riser",
    pin: false,
    color: EXHAUST_COLOR,
    note: side + " aft cylinder → collector rail, ahead of the downpipe. " + exhaustRef,
    groups: ["exhaust"],
  });
  for (const joint of [h.tee[0], h.transition[0]]) {
    part(() => new THREE.CylinderGeometry(0.02, 0.02, 0.045, 16).rotateZ(Math.PI / 2), ["engine"], {
      pos: joint,
      color: "#B4B8BC",
      name: "Exhaust slip joint",
      note: side + " telescoping header joint. " + exhaustRef,
      groups: ["exhaust"],
    });
  }
  part(() => cyl(MUFFLER_R, MUFFLER_LEN, "x", 24), ["engine"], {
    pos: MUFFLER(s),
    color: "#7A6A5A",
    name: side + " muffler",
    pin: true,
    note:
      side +
      " muffler below the exhaust manifold: exhaust gases pass through a muffler on either side of the engine, then overboard through the exhaust pipes" +
      (s > 0 ? "; the cabin-heat muff is around this one (POH 7-37, 7-60)" : " (POH 7-37)") +
      ". Canister size and station illustrative: no SR22 figure was inspected.",
    groups: ["exhaust"],
  });
}
// Each riser's flange and its gasket under the cylinder's exhaust port, the gasket's top face on the port plane.
for (const c of CYLS) {
  const port = cylExhaust(c);
  for (const [name, t, y, color] of [
    ["Exhaust port gasket", EXHAUST_PORT_GASKET_T, port[1] - EXHAUST_PORT_GASKET_T / 2, "#9A9A92"],
    [
      "Exhaust port flange",
      EXHAUST_PORT_FLANGE_T,
      port[1] - EXHAUST_PORT_GASKET_T - EXHAUST_PORT_FLANGE_T / 2,
      EXHAUST_COLOR,
    ],
  ] as const)
    part(() => box(EXHAUST_PORT_FLANGE_W, t, EXHAUST_PORT_FLANGE_W), ["engine"], {
      name: `${name} — cyl ${c.n}`,
      pos: [port[0], y, port[2]],
      color,
      note:
        name === "Exhaust port gasket"
          ? `Cylinder ${c.n}: exhaust flange gasket on the port studs. Size approximate (${exhaustRef})`
          : `Cylinder ${c.n}: the header riser's four-stud flange, nutted to the cylinder port studs over the gasket. Size approximate (${exhaustRef})`,
      groups: ["exhaust"],
    });
}
for (const [name, path, group, to] of [
  [
    "Throttle control cable",
    THROTTLE_CABLE,
    "induction",
    "throttle body / fuel-metering valve (and, through the lever, the propeller governor)",
  ],
  ["Mixture control cable", MIXTURE_CABLE, "fuel", "mixture control valve in the engine-driven fuel pump"],
  ["Alternate air control cable", ALT_AIR_CABLE, "induction", "alternate induction air door"],
] as const) {
  part(() => tubeGeo(path, 0.006), ["engine"], {
    name,
    groups: [group],
    color: "#B4B8BC",
    note:
      (name.startsWith("Alternate") ? "ALT AIR – PULL knob on the left console" : "Console lever") +
      " → firewall → " +
      to +
      ". Static cable; travel and routing schematic (SR22 POH 13772-006 7-32).",
  });
}
part(() => cyl(0.012, 0.025, "x"), ["engine"], {
  pos: ALT_AIR_KNOB,
  color: "#2B2B2B",
  name: "ALT AIR – PULL knob",
  pin: true,
  note: "Alternate Induction Air Control knob, labeled ALT AIR – PULL, on the left console near the pilot's right knee: depress the centre lock button, pull the knob to open the alternate air door, release the button (SR22 POH 13772-006 7-32). Position schematic.",
  groups: ["induction"],
});

/* ---------- Inlet ducts, intake pipes, joint clamps ---------- */
const CLAMP_COLOR = "#B4B8BC";
const clamp = (geo: () => THREE.BufferGeometry, where: string) =>
  part(geo, ["engine"], {
    name: "Induction clamp",
    color: CLAMP_COLOR,
    note: where + ": band clamp at the duct joint. Size approximate (schematic).",
    groups: ["induction"],
  });
for (const s of [-1, 1]) {
  const side = s < 0 ? "LH" : "RH";
  part(() => bentTubeGeo(INLET_DUCT(s), INLET_DUCT_R, DUCT_BEND), ["engine"], {
    name: "Induction inlet duct",
    color: INDUCTION_COLOR,
    note:
      side +
      " duct from the NACA inlet in the lower cowl aft into the air box's forward face. Schematic: the SR22 POH (13772-006 7-37) has induction air entering through the two forward cowl inlets; the lower-cowl NACA ducts and the duct are the SR22T model's. Ø44 mm, bends and routing approximate.",
    groups: ["induction"],
  });
  clamp(() => bandGeo(inletDuctCurve(s), INLET_DUCT_R, -0.005), side + " inlet duct at the air box");
  clamp(() => bandGeo(inductionDuctCurve(s), INDUCTION_DUCT_R, 0.006), side + " induction duct at the air box");
  clamp(() => bandGeo(alternateDuctCurve(s), ALTERNATE_DUCT_R, 0.005), side + " alternate air tube at the assembly");
  clamp(() => bandGeo(alternateDuctCurve(s), ALTERNATE_DUCT_R, -0.005), side + " alternate air tube at the air box");
}
clamp(
  () => bandGeo(yCurve, INDUCTION_Y_R, fractionAtX(yCurve, THROTTLE_FRONT[0] + 0.006, 0.3) * yCurve.getLength()),
  '"Y" outlet at the throttle body',
);
clamp(() => bandGeo(manifoldCurve, INTAKE_MANIFOLD_R, 0.006), "intake manifold at the throttle body");
for (const c of CYLS) {
  part(() => bentTubeGeo(INTAKE_PIPE(c), INTAKE_PIPE_R, PIPE_BEND, 12, true), ["engine"], {
    name: `Intake pipe — cyl ${c.n}`,
    color: INDUCTION_COLOR,
    note: `Intake manifold → cylinder ${c.n} intake port: one of the six tubes of the engine manifold (SR22 POH 13772-006 7-37). Drawn to the top of the head as on the SR22T model (schematic). Ø28 mm, routing approximate.`,
    groups: ["induction"],
  });
  clamp(() => bandGeo(intakePipeCurve(c), INTAKE_PIPE_R, 0.022), `cylinder ${c.n} intake pipe at the manifold`);
  const port = cylIntake(c);
  part(() => cyl(PORT_FLANGE_R, PORT_FLANGE_T, "y"), ["engine"], {
    name: "Intake port flange",
    pos: [port[0], port[1] + PORT_FLANGE_T / 2, port[2]],
    color: CLAMP_COLOR,
    note: `Cylinder ${c.n}: the intake pipe's flange on the intake port (SR22 POH 13772-006 7-37). Size approximate.`,
    groups: ["induction"],
  });
}
// The manifold's aft end cap, under the manifold's name.
part(() => cyl(INTAKE_MANIFOLD_R, MANIFOLD_CAP_T, "x"), ["engine"], {
  pos: [MANIFOLD_END[0] - MANIFOLD_CAP_T / 2, MANIFOLD_END[1], MANIFOLD_END[2]],
  color: INDUCTION_COLOR,
  groups: ["induction"],
});
