/**
 * SR22 G6 (normally aspirated IO-550-N) model: what differs from the SR22T it was built from, sourced from the SR22 POH
 * P/N 13772-006 Reissue A (s/n 5002): the engine and propeller (Section 7, 7-31 – 7-38), the powerplant limitations and
 * markings (2-6, 2-9, 2-10), the fuel pump (7-40), the RPM warning (2-9 note a, 3-24), the preflight lettering (4-8) and the
 * optional-equipment gates. Shared systems (electrical, lighting, environmental, pitot-static, CAPS) keep the SR22T tests'
 * coverage through the fleet-wide tests.
 */
import { describe, expect, it } from "vitest";
import { SR22 } from "@/aircraft/sr22";
import { eisGauges, pctPower } from "@/aircraft/sr22/displays";
import {
  ambientInHg,
  casMessages,
  initialSim,
  initialSimFor,
  inductionBlocked,
  mapFull,
  mapInHg,
  oxygenCas,
  pumpSpeed,
  rpmTarget,
  rpmWarning,
  solve,
  type Sim,
} from "@/aircraft/sr22/model";
import { WALK, oxygenFitted, SOURCE } from "@/aircraft/sr22/walkaround";
import { CAT } from "@/aircraft/sr22/parts";
import { FLOWS } from "@/aircraft/sr22/flows";
import { SYS } from "@/aircraft/sr22/systems";
import { FLEET_INDEX } from "@/lib/fleet-index";

const sim = (patch: (d: Sim) => void = () => {}): Sim => {
  const d = structuredClone(initialSim);
  patch(d);
  return d;
};
const names = (m: [string, string][]) => m.map(([, n]) => n);

describe("SR22 definition", () => {
  it("is the normally aspirated IO-550-N in the fleet picker, between the SR20 and the SR22T", () => {
    expect(SR22.id).toBe("sr22");
    expect(SR22.name).toBe("SR22 G6");
    expect(SR22.sub).toContain("IO-550-N");
    expect(FLEET_INDEX.map((f) => f.id).slice(0, 3)).toEqual(["sr20", "sr22", "sr22t"]);
    const entry = FLEET_INDEX.find((f) => f.id === "sr22")!;
    expect(entry).toMatchObject({ name: SR22.name, sub: SR22.sub, walk: true });
  });
  it("rail pages follow the SR22 POH table of contents (13772-006 7-1 – 7-3)", () => {
    const pg = Object.fromEntries(SYS.map((s) => [s.id, s.pg]));
    expect(pg).toMatchObject({
      engine: "7-31",
      propeller: "7-38",
      fuel: "7-39",
      electrical: "7-46",
      lighting: "7-56",
      environment: "7-60",
      pitot: "7-67",
      avionics: "7-71",
      caps: "7-94",
    });
  });
});

describe("SR22 engine (POH 7-31 – 7-38, 2-6, 2-9, 5-32)", () => {
  it("manifold pressure cannot exceed ambient: full throttle follows the POH 5-32 cruise table", () => {
    // 5-32, ISA full-throttle rows: 2,000 ft 27.4, 4,000 ft 25.4, 6,000 ft 23.5 in.Hg
    expect(mapFull(2000)).toBeCloseTo(27.4, 0);
    expect(mapFull(4000)).toBeCloseTo(25.4, 0);
    expect(mapFull(6000)).toBeCloseTo(23.5, 0);
    for (const paFt of [0, 4000, 10000, 17500]) {
      const s = sim((d) => {
        d.paFt = paFt;
        d.eng.lever = 1;
      });
      expect(mapInHg(s, 2700)).toBeLessThanOrEqual(ambientInHg(paFt));
      expect(mapInHg(s, 2700)).toBeLessThanOrEqual(29.5); // top of the green arc, 2-9
    }
    // stopped, the manifold reads ambient
    expect(
      mapInHg(
        sim((d) => (d.eng.running = false)),
        0,
      ),
    ).toBeCloseTo(ambientInHg(4000), 1);
  });
  it("the power lever sets the governor: about 2,500 RPM through cruise, 2,700 at full power (POH 7-32)", () => {
    expect(
      rpmTarget(
        sim((d) => (d.eng.lever = 0.5)),
        true,
      ),
    ).toBe(2500);
    expect(
      rpmTarget(
        sim((d) => (d.eng.lever = 1)),
        true,
      ),
    ).toBe(2700);
    expect(
      rpmTarget(
        sim((d) => (d.eng.lever = 0)),
        true,
      ),
    ).toBe(700);
    // a failed governor leaves the blades at fine pitch and RPM follows power (3-24)
    expect(
      rpmTarget(
        sim((d) => {
          d.eng.lever = 1;
          d.eng.govFail = true;
        }),
        true,
      ),
    ).toBe(3000);
  });
  it("RPM warning: 2,710–2,730 for more than 10 s, or above 2,730 for more than 5 s (POH 2-9 note a)", () => {
    expect(rpmWarning(9, 0)).toBe(false);
    expect(rpmWarning(11, 0)).toBe(true);
    expect(rpmWarning(4, 4)).toBe(false);
    expect(rpmWarning(6, 6)).toBe(true);
  });
  it("engine strip: RPM green to 2,700, MAP 10–35 in.Hg with a single green band 15–29.5 (POH 2-9)", () => {
    const s = sim(),
      E = solve(s);
    const g = Object.fromEntries(eisGauges(s, E).map((x) => [x.key, x]));
    expect(g.rpm.bands).toEqual([
      [500, 2700, "green"],
      [2700, 3000, "red"],
    ]);
    expect(g.map).toMatchObject({ min: 10, max: 35, bands: [[15, 29.5, "green"]] });
  });
  it("percent power fits the POH 5-32 ISA cruise rows at 4,000 ft within 2%", () => {
    const E = solve(sim());
    for (const [lever, rpm, pct] of [
      [1, 2700, 91],
      [1, 2500, 82],
    ] as const) {
      const s = sim((d) => (d.eng.lever = lever));
      expect(Math.abs(pctPower(s, E, rpm)! - pct)).toBeLessThanOrEqual(2);
    }
  });
  it("alternate air is pilot-controlled (POH 7-32, 7-37): a blocked filter starves the engine until ALT AIR is pulled, with no CAS", () => {
    const blocked = sim((d) => (d.eng.filterBlocked = true));
    expect(inductionBlocked(blocked)).toBe(true);
    expect(mapInHg(blocked, 2500)).toBeLessThanOrEqual(16);
    const pulled = sim((d) => {
      d.eng.filterBlocked = true;
      d.eng.altAir = true;
    });
    expect(inductionBlocked(pulled)).toBe(false);
    expect(mapInHg(pulled, 2500)).toBeGreaterThan(20);
    expect(names(casMessages(pulled, solve(pulled)))).not.toContain("ALT AIR OPEN");
  });
  it("has no turbocharger annunciations: never TIT or MAN PRESSURE (POH 2-9)", () => {
    const s = sim((d) => {
      d.eng.lever = 1;
      d.paFt = 0;
    });
    const m = names(casMessages(s, solve(s)));
    expect(m).not.toContain("TIT");
    expect(m).not.toContain("MAN PRESSURE");
  });
});

describe("SR22 fuel pump (POH 7-40, 2-18)", () => {
  it("BOOST runs low speed regardless of oil pressure; PRIME runs high speed only below 10 psi (engine not turning)", () => {
    const E = solve(initialSim);
    expect(
      pumpSpeed(
        sim((d) => (d.fuel.pump = "BOOST")),
        E,
        2500,
      ),
    ).toBe("low");
    expect(
      pumpSpeed(
        sim((d) => (d.fuel.pump = "BOOST")),
        E,
        0,
      ),
    ).toBe("low");
    expect(
      pumpSpeed(
        sim((d) => (d.fuel.pump = "PRIME")),
        E,
        0,
      ),
    ).toBe("high");
    expect(
      pumpSpeed(
        sim((d) => (d.fuel.pump = "PRIME")),
        E,
        2500,
      ),
    ).toBe("low");
    expect(
      pumpSpeed(
        sim((d) => (d.fuel.pump = "OFF")),
        E,
        0,
      ),
    ).toBe("off");
  });
  it("the pump needs its 5 A FUEL PUMP breaker on MAIN BUS 2", () => {
    const s = sim((d) => {
      d.fuel.pump = "BOOST";
      d.cb["FUEL PUMP"] = true;
    });
    expect(pumpSpeed(s, solve(s), 2500)).toBe("off");
  });
});

describe("SR22 optional equipment", () => {
  it("FIKI is fitted and the built-in oxygen system is not (s/n 5002); both can be switched", () => {
    expect(initialSim.equip).toEqual({ fiki: true, oxygen: false });
    expect(initialSimFor("?fiki=0").equip).toEqual({ fiki: false, oxygen: false });
    expect(oxygenFitted(sim((d) => (d.equip.oxygen = false)))).toBe(false);
  });
  it("without the oxygen system its parts and CAS are gone", () => {
    const low = sim((d) => {
      d.equip.oxygen = false;
      d.oxy.psi = 100;
    });
    expect(oxygenCas(low)).toEqual([]);
    expect(CAT.parts.filter((p) => p.sys.includes("oxygen")).every((p) => typeof p.fitted === "function")).toBe(true);
  });
});

describe("SR22 hardware", () => {
  it("has mufflers, a cabin-heat muff and no turbocharger hardware", () => {
    const partNames = CAT.parts.map((p) => p.name ?? "");
    expect(partNames).toContain("LH muffler");
    expect(partNames).toContain("RH muffler");
    expect(partNames).toContain("Cabin heat exchanger (muff)");
    expect(partNames).toContain("Alternate air control cable");
    expect(partNames).toContain("ALT AIR – PULL knob");
    expect(partNames).toContain("Continental IO-550-N");
    const gone = /turbo|intercooler|wastegate|TIT probe|overboost|pressurization|Upper-deck/i;
    expect(partNames.filter((n) => gone.test(n))).toEqual([]);
    const flowNames = FLOWS.map((f) => f.key);
    expect(flowNames).toContain("mufflerR");
    expect(flowNames.filter((k) => /compressor|crossover|gateOil|deckRef/.test(k))).toEqual([]);
  });
});

describe("SR22 preflight walk-around (POH 13772-006 4-4 – 4-9)", () => {
  it("cites the SR22 POH and letters the landing light as 10a, with the alternator at 9h (POH 4-8)", () => {
    expect(SOURCE).toContain("13772-006");
    const station = (n: number) => WALK.find((s) => s.n === n)!;
    const ids = (n: number) =>
      station(n)
        .items.filter((i) => !i.technique)
        .map((i) => i.id);
    expect(ids(9)).toEqual(["9a", "9b", "9c", "9d", "9e", "9f", "9g", "9h"]);
    expect(station(9).items.find((i) => i.id === "9h")!.text).toBe("Alternator");
    expect(ids(10)).toEqual(["10a", "10b", "10c", "10d", "10e", "10f", "10g", "10h"]);
    expect(station(10).items.find((i) => i.id === "10a")!.text).toBe("Landing Light");
    expect(station(10).items.find((i) => i.id === "10b")!.text).toBe("Engine Oil");
  });
});
