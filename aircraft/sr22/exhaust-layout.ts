/**
 * SR22 (IO-550-N) exhaust connectivity: POH 13772-006 7-37, "Engine Exhaust": after leaving the cylinders, exhaust
 * gases pass through the exhaust manifold, through mufflers on either side of the engine, then overboard through exhaust
 * pipes exiting the lower cowling; a muff heat exchanger around the right muffler provides cabin heat (7-37, 7-60).
 * The SR22 POH has no exhaust figure and the SR22 AMM (13773-001) was not inspected: every coordinate, radius and bend
 * below is an illustrative fit to the study model, not an aircraft installation dimension. The cylinder headers and the
 * collector rail keep the SR22T model's illustrative routing (AMM 13773-002 Rev 7 Fig 78-10-2, undimensioned); the
 * turbocharger transitions, crossover and wastegate bypass are gone, replaced by a downpipe into each muffler and a
 * tailpipe from it. Side-effect-free anchors let the cowl, parts and flows share the same exits.
 */
import { Box3, Vector3 } from "three";
import { cutBoxes } from "@/lib/cowl";
import { ACCESSORY_FACE_X, REAR_CYL_X } from "./engine-datum";
import { bentPoints } from "@/lib/geometry";
import type { Vec3 } from "@/lib/math";

/** Illustrative tube radius (undimensioned); sized to leave 10-mm clearance at the existing plug bosses. */
export const EXHAUST_RADIUS = 0.016;
export const TAILPIPE_RADIUS = 0.028;
/** Header centreline bend radius: one tube diameter, approximate. */
export const EXHAUST_BEND = 2 * EXHAUST_RADIUS;
/** Cylinder exhaust port joint: square four-stud flange and gasket under each riser (SR22T AMM Fig 78-10-2, undimensioned;
 * the SR22 installation is the same Continental 550 port). All three sizes approximate. */
export const EXHAUST_PORT_FLANGE_W = 0.038;
export const EXHAUST_PORT_GASKET_T = 0.0005;
export const EXHAUST_PORT_FLANGE_T = 0.0015;
/**
 * A bent run through `corners` (ghta's `bentCurve`, lib/geometry.ts), sampled every 10 mm, with its two ends exact. Each
 * point of `joints` found among the corners splits the run there: a tee or flange the run must pass through exactly,
 * drawn as a fitting rather than a bend.
 */
export const bentRun = (corners: Vec3[], bend: number, joints: Vec3[] = []): Vec3[] => {
  const cut = corners
    .map((p, i) => (i > 0 && i < corners.length - 1 && joints.some((j) => j.every((v, k) => v === p[k])) ? i : -1))
    .filter((i) => i > 0);
  const runs = [0, ...cut].map((from, k) => corners.slice(from, (cut[k] ?? corners.length - 1) + 1));
  return runs.flatMap((run, k) => {
    const pts = bentPoints(run, bend);
    pts[0] = run[0];
    pts[pts.length - 1] = run.at(-1)!;
    return k === 0 ? pts : pts.slice(1);
  });
};
/** Collector rail below each bank: outboard of the cylinder heads, under the lower plugs (illustrative). */
const RAIL_Y = -0.32;
const RAIL_Z = 0.5;
export const REAR_SLIP = (s: number): Vec3 => [REAR_CYL_X(s), RAIL_Y, s * RAIL_Z];
/** Where the rail turns down into the muffler, just aft of the rear cylinder's riser. */
export const COLLECTOR_JUNCTION = (s: number): Vec3 => [REAR_CYL_X(s) - 0.03, RAIL_Y, s * RAIL_Z];
/**
 * Muffler on each side (POH 7-37): a canister under the collector rail, axis fore-and-aft, outboard of the air box and
 * inboard of the cowl. Size and station illustrative (no SR22 figure was inspected).
 */
export const MUFFLER_R = 0.05;
export const MUFFLER_LEN = 0.3;
export const MUFFLER = (s: number): Vec3 => [2.95, -0.44, s * 0.46];
/** Muffler inlet on its top, aft third, fed by the downpipe from the collector junction. */
export const MUFFLER_INLET = (s: number): Vec3 => [COLLECTOR_JUNCTION(s)[0], MUFFLER(s)[1] + MUFFLER_R, MUFFLER(s)[2]];
/** Downpipe corners: collector junction → down and inboard onto the muffler's top. */
export const DOWNPIPE = (s: number): Vec3[] => [
  COLLECTOR_JUNCTION(s),
  [COLLECTOR_JUNCTION(s)[0], RAIL_Y - 0.04, s * (RAIL_Z - 0.02)],
  MUFFLER_INLET(s),
];
/** Muffler outlet on its aft face. */
export const MUFFLER_OUTLET = (s: number): Vec3 => [MUFFLER(s)[0] - MUFFLER_LEN / 2, MUFFLER(s)[1], MUFFLER(s)[2]];
const TAILPIPE_BEND_X = ACCESSORY_FACE_X - 0.06;
const TAILPIPE_Z = 0.335;
/** Tailpipe corners: out of the muffler's aft face, down and inboard, through the lower-cowl exhaust exit (the cowl's
 * exit cut, `openExhaustExits`, follows the last three points). */
export const TAILPIPE = (s: number): Vec3[] => [
  MUFFLER_OUTLET(s),
  [TAILPIPE_BEND_X + 0.015, -0.5, s * 0.4],
  [TAILPIPE_BEND_X, -0.625, s * TAILPIPE_Z],
  [TAILPIPE_BEND_X - 0.015, -0.665, s * TAILPIPE_Z],
  [TAILPIPE_BEND_X - 0.04, -0.75, s * TAILPIPE_Z],
];
/** Cabin-heat muff around the right muffler (POH 7-37, 7-60): the shroud's centre is the RH muffler's. */
export const HEAT_X: Vec3 = MUFFLER(1);

export function openExhaustExits(g: import("three").BufferGeometry) {
  const indexed = !!g.index;
  const margin = TAILPIPE_RADIUS + 0.012;
  const clipped = cutBoxes(
    g,
    [-1, 1].map((side) => {
      const path = TAILPIPE(side),
        bend = path.at(-3)!;
      return new Box3(
        new Vector3(path.at(-1)![0] - margin, -10, bend[2] - margin),
        new Vector3(bend[0] + margin, bend[1], bend[2] + margin),
      );
    }),
  );
  g.copy(clipped);
  if (indexed) g.setIndex(Array.from({ length: g.getAttribute("position").count }, (_, i) => i));
  clipped.dispose();
  return g;
}
