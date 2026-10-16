/** The fleet, in picker order. Importing this module registers it with lib/fleet. This deployment serves the SR22
 * only (lib/systems.ts AIRCRAFT_IDS); the other airplanes' folders are kept but not imported, so they are not built. */
import { registerFleet } from "@/lib/fleet";
import { SR22 } from "./sr22";

export const FLEET = [SR22];
registerFleet(FLEET);

export * from "@/lib/fleet";
