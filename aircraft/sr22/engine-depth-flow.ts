/**
 * Induction, exhaust and the engine oil circuit for flows.ts.
 * Sources are cited on each flow; registration order is the order of FLOWS in flows.ts.
 */
import type { FlowSpec } from "@/lib/catalogue";
import { altAirOpen, inductionBlocked, type Sim } from "./model";
import {
  CYLS,
  GOV,
  EXHAUST_RUN,
  OIL_SCREEN,
  OIL_PUMP,
  OIL_CONTROL,
  OIL_COOLER,
  INDUCTION_Y,
  INTAKE_MANIFOLD,
  AIR_BOX,
  INLET_RUN,
  INTAKE_RUN,
  cylIntake,
  INDUCTION_RUN,
  ALTERNATE_DUCT,
  THROTTLE,
  MUFFLER_RUN,
  TAILPIPE_RUN,
} from "./parts";
import { OIL_FILTER, OIL_FILTER_ADAPTER, OIL_SUMP } from "./parts/engine";
import { flowList, off } from "./flow-builder";

const { F, flow } = flowList();

// induction & exhaust: cowl inlet → air box (dry-foam filter) → induction duct → "Y" junction → throttle butterfly →
// six-tube intake manifold → intake pipes; cylinders → exhaust manifold → muffler each side → tailpipe (SR22 POH
// 13772-006 7-37). Routes are the SR22T study model's, schematic (parts/engine-air.ts).
const AIR_IN: Partial<FlowSpec> = { tube: false, pcolor: "#8FD3E8", size: 0.07, groups: ["induction"] };
/** Exhaust pipe style. */
export const EXH = { r: 0.016, color: "#8A5A3C", pcolor: "#FF8A4A" } as const;
const PLENUM = INTAKE_MANIFOLD;
// three segments per side: the NACA inlet stops when the filter is blocked, while the air box onward keeps flowing
// on alternate air (POH 7-37); the inlet runs along the drawn inlet duct, through the air box's forward face into the
// filter housing
[1, -1].forEach((s) =>
  flow(s > 0 ? "inletR" : "inletL", [...INLET_RUN(s), AIR_BOX(s)], ["engine"], { ...AIR_IN, tension: 0 }),
);
[1, -1].forEach((s) => {
  const side = s > 0 ? "R" : "L";
  flow("intake" + side, [AIR_BOX(s), off(AIR_BOX(s), [-0.03, -0.03, 0])], ["engine"], {
    ...AIR_IN,
    name: "Air box → induction duct",
    note: "Filtered air leaves the air box's aft face (SR22 POH 13772-006 7-37). Routing schematic.",
  });
  flow("duct" + side, [...INDUCTION_RUN(s), INDUCTION_Y, THROTTLE], ["engine"], {
    ...AIR_IN,
    name: "Induction duct → Y junction → throttle",
    note: "Filter → throttle butterfly (SR22 POH 13772-006 7-37). Along the drawn duct, which follows the SR22T model's charge-air route; schematic.",
  });
});
// the alternate air assembly feeds both air boxes when its door is open (POH 7-37)
[1, -1].forEach((s) =>
  flow(s > 0 ? "altAirR" : "altAirL", ALTERNATE_DUCT(s), ["engine"], {
    r: 0.02,
    tension: 0,
    color: "#8A969E",
    pcolor: "#D9C27A",
    count: 4,
    name: "Alternate air tube",
    note: "Alternate air assembly → air box; unfiltered cowl air when the door is open (POH 7-37).",
    groups: ["induction"],
  }),
);
// ends at the manifold's aft end (parts/engine-air.ts)
flow("manifold", [THROTTLE, PLENUM, off(PLENUM, [-0.34, -0.01, 0])], ["engine"], {
  r: 0.022,
  color: "#8A969E",
  pcolor: "#8FD3E8",
  count: 5,
  name: "Intake manifold",
  note: "From the throttle body, divided by the intake pipes to each cylinder (POH 7-37).",
  groups: ["induction"],
});
CYLS.forEach((c) =>
  flow("man" + c.n, [...INTAKE_RUN(c).slice(0, -1), cylIntake(c)], ["engine"], {
    r: 0.01,
    tension: 0,
    color: "#8A969E",
    pcolor: "#8FD3E8",
    count: 4,
    name: "Intake pipe",
    note: "Intake manifold → cylinder (POH 7-37).",
    groups: ["induction"],
  }),
);
CYLS.forEach((c) =>
  flow("exh" + c.n, EXHAUST_RUN(c), ["engine"], {
    ...EXH,
    count: 4,
    tension: 0,
    name: "Exhaust manifold → muffler",
    note: "Slip-jointed elbow riser / tee / downpipe into the muffler (SR22 POH 13772-006 7-37; header routing from the SR22T model, AMM 13773-002 Rev 7 Fig 78-10-2). Routing approximate.",
    groups: ["exhaust"],
  }),
);
[1, -1].forEach((s) => {
  flow(s > 0 ? "mufflerR" : "mufflerL", MUFFLER_RUN(s), s > 0 ? ["engine", "environment"] : ["engine"], {
    ...EXH,
    r: 0.04,
    tension: 0,
    name: "Muffler",
    note:
      (s > 0 ? "Right" : "Left") +
      " muffler; the cabin-heat muff is around the right one (SR22 POH 13772-006 7-37, 7-60). Illustrative.",
    groups: ["exhaust"],
  });
  flow(s > 0 ? "tailpipeR" : "tailpipeL", TAILPIPE_RUN(s), ["engine"], {
    ...EXH,
    r: 0.024,
    tension: 0,
    name: "Exhaust tailpipe",
    note: "Muffler → overboard through the lower cowling (SR22 POH 13772-006 7-37).",
    ext: true,
    groups: ["exhaust"],
  });
});
flow(
  "oil",
  [
    OIL_SUMP,
    OIL_SCREEN,
    OIL_PUMP,
    // up through the adapter on the pump housing into the vertical spin-on filter, then out to the cooler's control
    // valve below the cooler (Continental M-18 Fig 13-10 PDF p. 374)
    OIL_FILTER_ADAPTER,
    OIL_FILTER,
    [2.712, -0.12, -0.19],
    OIL_CONTROL,
    OIL_COOLER,
    // into the case outboard of and below the left magneto, which sits forward of the accessory face
    // Approximate gallery approach below the magneto before rising inside the case; POH 7-36;
    // AMM 13773-002 Rev 7 79-00 PDF p. 2764 gives the circuit, not waypoint dimensions.
    [2.75, -0.08, -0.13],
    [2.89, -0.08, 0],
    [2.95, -0.02, 0],
    [3.35, -0.02, 0],
    GOV,
  ],
  ["engine", "propeller"],
  {
    r: 0.01,
    color: "#B85A2A",
    name: "Oil circuit",
    note: "Sump → suction strainer → pump (relief valve at its outlet) → full-flow filter → engine-mounted oil cooler (bypassed below about 180 °F) → galleries, and to the propeller governor (SR22 POH 13772-006 7-36). Routing schematic and particle rates illustrative.",
    groups: ["oil"],
  },
);

export const ENGINE_DEPTH_FLOWS = F;

/** Particle speed multiplier per induction, exhaust and oil-circuit flow (0 = stopped). */
export function engineDepthRates(s: Sim): Record<string, number> {
  const R: Record<string, number> = {};
  const run = s.eng.running;
  CYLS.forEach((c) => {
    R["man" + c.n] = run ? 1 : 0;
    R["exh" + c.n] = run ? 1.2 : 0;
  });
  // a blocked filter stops the cowl-inlet flow; with the alternate air door open the air box onward runs on cowl air
  const starved = inductionBlocked(s);
  R.inletL = R.inletR = run && !s.eng.filterBlocked ? 1 : 0;
  R.intakeL = R.intakeR = R.ductL = R.ductR = R.manifold = run ? (starved ? 0.3 : 1) : 0;
  R.altAirL = R.altAirR = run && altAirOpen(s) ? 1 : 0;
  R.tailpipeL = R.tailpipeR = R.mufflerL = R.mufflerR = run ? 1.2 : 0;
  R.oil = run ? 0.7 : 0;
  return R;
}
