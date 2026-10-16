/**
 * SR22 induction anchors: the air boxes and the schematic induction duct from each air box to the throttle body.
 * SR22 POH 13772-006 7-37: induction air enters through the two inlets in the forward cowling, passes through a dry-foam
 * filter, the throttle butterfly and the six-tube engine manifold to the cylinders; a pilot-controlled alternate air door
 * bypasses the filter. The POH has no induction figure and the SR22 AMM (13773-001) was not inspected, so the air boxes
 * and the duct route are carried over from the SR22T study model (its air boxes behind the lower-cowl NACA ducts, and its
 * charge-air route from compressor to throttle body with the turbocharger and intercooler replaced by plain duct). Every
 * value is illustrative: a fit to the study model, not an installation dimension.
 */
import type { Vec3 } from "@/lib/math";
import { ACCESSORY_FACE_X, CRANK_Y, IN } from "./engine-datum";
import { DUCT7, INTERCOOLER_IN, INTERCOOLER_OUT } from "./intercooler-layout";

/** Air box axis per side (the SR22T model's compressor inlet axis): low in the aft engine, outboard of the sump. */
const BOX_Y = (s: number) => CRANK_Y - (s < 0 ? 14.82 : 14.81) * IN;
const BOX_Z = (s: number) => (s < 0 ? 12.94 : 13.45) * IN;
/** Aft face of the air box, where the induction duct leaves it (the SR22T model's Ø3.00-in. compressor inlet face). */
export const AIR_BOX_AFT_R = 1.5 * IN;
export const AIR_BOX_AFT = (s: number): Vec3 => [ACCESSORY_FACE_X + 11.8 * IN, BOX_Y(s), s * BOX_Z(s)];
/** Air box (filter body, base): size illustrative; the filter body rises 0.03 m above the duct axis so its forward end
 * stays inside the coarse POH Fig 1-1 lower-cowl loft. */
export const AIR_BOX_SIZE: Vec3 = [0.08, 0.075, 0.09];
export const AIR_BOX_RISE = 0.03;
export const AIR_BOX = (s: number): Vec3 => [
  AIR_BOX_AFT(s)[0] + AIR_BOX_SIZE[0] / 2,
  AIR_BOX_AFT(s)[1] + AIR_BOX_RISE,
  AIR_BOX_AFT(s)[2],
];
/** Round air-box base on the duct axis: its aft face is the duct joint. Its 4-mm wall and 0.03-m length are illustrative. */
export const AIR_BOX_BASE_R = AIR_BOX_AFT_R + 0.004;
export const AIR_BOX_BASE_LEN = 0.03;
/** Induction duct Ø2.1 in., approximate (the SR22T model's compressor duct bore, which the fitted route clears). */
export const INDUCTION_DUCT_R = 1.05 * IN;
/** Centreline bend radius, approximate. */
export const INDUCTION_DUCT_BEND = 0.03;
/** Index in `INDUCTION_DUCT` of the corner where the duct reaches the side deck (the former intercooler inlet), and of
 * the corner where it leaves it for the throttle body (the former intercooler outlet). */
export const DUCT_DECK_IN = (s: number) => INDUCTION_DUCT(s).findIndex((p) => p === INTERCOOLER_IN(s));
/**
 * Induction duct corners per side: out of the air box's aft face, up and around the aft engine on the SR22T model's
 * charge-air route (corners approximate), through the side deck window, forward along the deck (where the SR22T's
 * intercooler sat) and inboard across the front of the cylinders to the throttle body's "Y" inlet.
 */
export const INDUCTION_DUCT = (s: number): Vec3[] => {
  const aft = AIR_BOX_AFT(s);
  const start: Vec3 = [aft[0] - 0.0005, aft[1], aft[2]];
  const rise: Vec3 = [aft[0] - 0.06, aft[1], aft[2]];
  const up: Vec3 = [aft[0] - 0.06, -0.4, aft[2]];
  const route: Vec3[] =
    s < 0
      ? [
          [3.07, -0.4, -0.32],
          [3.08, -0.43, -0.24],
          [2.97, -0.55, -0.24],
          [2.79, -0.52, -0.17],
          [2.65, -0.48, -0.17],
          [2.65, -0.39, -0.23],
          [2.65, -0.36, -0.31],
          [2.65, -0.37, -0.39],
          [2.69, -0.37, -0.43],
          [2.73, -0.35, -0.45],
          [2.77, -0.31, -0.46],
          [2.83, -0.31, -0.46],
          [2.81, -0.28, -0.49],
          [2.79, -0.19, -0.485],
          [INTERCOOLER_IN(s)[0], -0.15, INTERCOOLER_IN(s)[2]],
        ]
      : [
          [2.92, -0.37, 0.54],
          [2.83, -0.37, 0.55],
          [2.83, -0.3, 0.55],
          [INTERCOOLER_IN(s)[0], -0.16, INTERCOOLER_IN(s)[2]],
        ];
  return [start, rise, up, ...route, INTERCOOLER_IN(s), INTERCOOLER_OUT(s), ...DUCT7(s).slice(1)];
};
