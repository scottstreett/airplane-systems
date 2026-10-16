import type { AircraftId } from "./systems";

/**
 * The fleet's picker entries, in picker order, for pages that don't load the airplanes (the engine pages link back to
 * them). Each airplane's own definition is the source; tests/fleet.test.ts checks this list against it.
 */
export const FLEET_INDEX: { id: AircraftId; name: string; sub: string; walk: boolean }[] = [
  { id: "sr22", name: "SR22 G6", sub: "Perspective+ · GFC 700 · IO-550-N", walk: true },
];
