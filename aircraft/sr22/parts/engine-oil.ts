/**
 * Engine oil system.
 * May import anchors only from earlier sections:
 * catalogue.ts, airframe.ts, surfaces.ts, cowl.ts, gear.ts, engine.ts, engine-ignition.ts.
 * Side-effect-free helpers may come from ../geometry, ../model and ../rig.
 * Shared constants belong in catalogue.ts; later sections must never be imported here.
 */
import { box, cyl, mergeGeos, tubeGeo } from "@/lib/geometry";
import type { Vec3 } from "@/lib/math";
import { ACCESSORY_FACE_X, CRANK_Y, IN } from "../engine-datum";
import { part } from "./catalogue";
import { OIL_COOLER, OIL_COOLER_SIZE } from "./engine";

// Illustrative metres, not measured dimensions: SR22 POH 13772-006 7-31, 7-36 (wet sump, eight quarts, suction strainer,
// pump with relief valve, filter, engine-mounted cooler with a temperature control valve, governor supply);
// positions from the SR22T model (AMM 13773-002 Rev 7 Fig 71-00-2 sheets 3–4, PDF 2489–2490).
export const OIL_SCREEN: Vec3 = [3.02, -0.38, 0];
export const OIL_PUMP: Vec3 = [2.78, -0.24, -0.06];
/** On the cooler's lower outboard side; illustrative offset from the cooler centre. */
export const OIL_CONTROL: Vec3 = [OIL_COOLER[0], OIL_COOLER[1] - 0.04, OIL_COOLER[2] - 0.05];
/** The cooler's bottom face (an anchor for the cooler's oil lines). */
export const OIL_SOURCE: Vec3 = [OIL_COOLER[0], OIL_COOLER[1] - OIL_COOLER_SIZE[1] / 2, OIL_COOLER[2]];

part(
  () =>
    mergeGeos([
      cyl(0.035, 0.025),
      tubeGeo(
        [
          [0, 0, 0],
          [-0.08, 0.015, 0],
          [-0.24, 0.14, -0.06],
        ],
        0.012,
      ),
    ]),
  ["engine"],
  {
    pos: OIL_SCREEN,
    color: "#B49246",
    name: "Oil suction screen",
    pin: true,
    note: "Suction strainer in the eight-quart sump (SR22 POH 13772-006 7-36); pickup tube leads to the crankcase pump inlet (AMM 13773-002 Rev 7 79-00 PDF p. 2764). Shape and position approximate.",
    groups: ["oil"],
  },
);
part(() => box(0.07, 0.08, 0.07), ["engine"], {
  pos: OIL_PUMP,
  color: "#897348",
  name: "Oil pump",
  pin: true,
  note: "Gear-driven rear accessory, positive displacement (SR22 POH 13772-006 7-31, 7-36; AMM 13773-002 Rev 7 79-00 PDF p. 2764). Screen → pump → filter → cooler. Shape and position approximate.",
  groups: ["oil"],
});
part(() => cyl(0.014, 0.04, "z"), ["engine"], {
  pos: [2.78, -0.22, -0.105],
  color: "#D1AD59",
  name: "Oil pressure relief valve",
  pin: true,
  note: "At the pump output, bypasses excess pressure back to the pump inlet (SR22 POH 13772-006 7-36). AMM 13773-002 Rev 7 79-00 PDF p. 2764 says return to sump; POH governs. Shape and position approximate.",
  groups: ["oil"],
});
part(() => cyl(0.018, 0.045, "z"), ["engine"], {
  pos: OIL_CONTROL,
  color: "#D1AD59",
  name: "Oil temperature control valve",
  pin: true,
  note: "On the cooler, bypasses oil below approximately 180 °F (82 °C) (SR22 POH 13772-006 7-36). Modulates the cooler bypass as oil warms (AMM 13773-002 Rev 7 79-00 PDF p. 2764). Shape and position approximate.",
  groups: ["oil"],
});
/** Oil pressure port: Continental M-18 Fig 5-33 sheet 1 (p. 5-53) Detail J, the nipple under the cooler's
 * inboard corner on the line 4.56 in. below the crankshaft (dimensioned), at the accessory face. The rear view scales it
 * about 6 in. left of the CL. It sits 6.5 in. left (within the ±0.5 in. scaling) and 1 in. aft of the face
 * (approximate) to clear the engine-driven fuel pump, the crankcase and the oil filter; it hangs on a vertical axis. */
const OIL_PRESSURE_PORT: Vec3 = [ACCESSORY_FACE_X - 1 * IN, CRANK_Y - 4.56 * IN, -6.5 * IN];
/** Oil temperature port: Fig 5-33 sheet 1 0.625-18UNF-3B port, about 2.8 in. forward of the accessory face
 * and 4.2 in. below the crankshaft (scaled); its lateral is not shown, 8 in. left is approximate. */
const OIL_TEMP_PORT: Vec3 = [ACCESSORY_FACE_X + 2.8 * IN, CRANK_Y - 4.2 * IN, -8 * IN];
part(() => cyl(0.014, 0.04, "y"), ["engine"], {
  pos: OIL_PRESSURE_PORT,
  color: "#79A5BD",
  name: "Oil pressure sensor",
  pin: true,
  note: "Aft end below the oil cooler (SR22 POH 13772-006 7-36; AMM 13773-002 Rev 7 79-30 PDF p. 2778, Fig 71-00-2 sheet 3 item 28 PDF p. 2489), on the nipple at the cooler bottom 4.56 in. below the crankshaft (Continental M-18 Fig 5-33 sheet 1 p. 5-53 Detail J, dimensioned; lateral scaled). Shape and fore-aft station approximate.",
  groups: ["sensors"],
});
part(() => cyl(0.012, 0.04, "z"), ["engine"], {
  pos: OIL_TEMP_PORT,
  color: "#79A5BD",
  name: "Oil temperature sensor",
  pin: true,
  note: "Lower left below the oil cooler (SR22 POH 13772-006 7-36; AMM 13773-002 Rev 7 79-30 PDF p. 2778, Fig 79-30-2 sheet 3 PDF p. 2787), at the 0.625-18UNF-3B port about 2.8 in. forward of the accessory face and 4.2 in. below the crankshaft (Continental M-18 Fig 5-33 sheet 1 p. 5-53, scaled). Shape and lateral approximate.",
  groups: ["sensors"],
});
part(() => mergeGeos([cyl(0.023, 0.014), cyl(0.004, 0.27).translate(0, -0.14, 0)]), ["engine"], {
  pos: [2.82, 0.125, -0.26],
  color: "#D1AD59",
  name: "Oil filler cap / dipstick",
  pin: true,
  note: "Left rear, under the top-left cowling access door (SR22 POH 13772-006 7-36; AMM 13773-002 Rev 7 79-30 PDF p. 2778, Fig 71-00-2 sheet 2 item 21 PDF p. 2488). Shape and position approximate.",
  groups: ["oil"],
});
/** Crankcase breather hose to the separator: from the left rear at the oil filler neck, outboard of
 * the A/C compressor and its hoses, aft over the MCU heat shield onto the separator's top. Schematic routing, port and
 * Ø24 mm approximate. */
const BREATHER: Vec3[] = [
  [2.82, 0.0, -0.26],
  [2.8, 0.04, -0.28],
  [2.76, 0.055, -0.3],
  [2.74, 0.06, -0.32],
  [2.7, 0.085, -0.34],
  [2.655, 0.108, -0.34],
  [2.64, 0.11, -0.34],
];
part(() => tubeGeo(BREATHER, 0.012).translate(-BREATHER[3][0], -BREATHER[3][1], -BREATHER[3][2]), ["engine"], {
  color: "#6E7F88",
  name: "Oil breather line",
  pin: true,
  pos: BREATHER[3],
  note: "Crankcase hose through the aft baffle to the separator (AMM 13773-002 Rev 7 Fig 71-00-2 sheet 3 item 29 PDF p. 2489; Fig 79-20-3 PDF p. 2776). Static schematic routing and diameter approximate.",
  groups: ["oil"],
});
part(() => cyl(0.033, 0.085), ["engine"], {
  pos: [2.64, 0.065, -0.34],
  color: "#B6B8A9",
  name: "Oil separator",
  pin: true,
  note: "Oil separator on the aft engine baffle, as on the SR22T model (the SR22 POH 13772-006 does not describe one); crankcase hose, breather hose and oil return line (AMM 13773-002 Rev 7 79-20 PDF p. 2768, Fig 79-20-3 PDF p. 2776). Shape and position approximate: the undimensioned baffle bracket is seated below the cowl; attached hoses follow.",
  groups: ["oil"],
});
part(
  () =>
    tubeGeo(
      [
        [2.64, 0.065, -0.34],
        [2.66, -0.07, -0.34],
        // down the aft left of the engine (route carried over from the SR22T model)
        [2.65, -0.3, -0.46],
        [2.65, -0.52, -0.46],
      ],
      0.012,
    ),
  ["engine"],
  {
    color: "#6E7F88",
    name: "Oil separator breather hose",
    note: "Breather hose from separator (AMM 13773-002 Rev 7 Fig 79-20-3 PDF p. 2776). Static schematic routing and diameter approximate.",
    groups: ["oil"],
  },
);
part(
  () =>
    tubeGeo(
      [
        [2.64, 0.023, -0.34],
        [2.68, -0.14, -0.29],
        [2.82, -0.38, -0.1],
      ],
      0.007,
    ),
  ["engine"],
  {
    color: "#B49246",
    name: "Oil separator return line",
    note: "Oil return connection below the separator (AMM 13773-002 Rev 7 Fig 79-20-3 PDF p. 2776). Static schematic routing and diameter approximate.",
    groups: ["oil"],
  },
);
part(() => cyl(0.016, 0.025), ["engine"], {
  pos: [3.12, -0.45, 0],
  color: "#D1AD59",
  name: "Crankcase oil drain",
  pin: true,
  note: "At the sump low point (AMM 13773-002 Rev 7 Fig 71-00-2 sheet 4 item 42 PDF p. 2490). Shape and position approximate.",
  groups: ["oil"],
});
