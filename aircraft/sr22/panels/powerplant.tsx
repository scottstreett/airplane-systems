"use client";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import {
  altAirOpen,
  ambientInHg,
  bladeAngle,
  fuelAvail,
  inductionBlocked,
  live,
  mapInHg,
  pumpSpeed,
  RPM_WARNING_STEPS,
} from "../model";
import { CAT } from "../parts";
import { ENGINE_GROUPS } from "../engine-groups";
import { useEngineGroups } from "../engine-group-store";
import { useSR22 } from "../store";
import {
  BtnRow,
  Caution,
  Check,
  Ctl,
  Facts,
  H3,
  Notes,
  PartsList,
  Readouts,
  Seg,
  Slider,
  Small,
} from "@/components/ui/controls";

const lever = (v: number) => (v < 0.03 ? "IDLE" : v > 0.97 ? "MAX" : Math.round(v * 100) + "%");
const rpm10 = (rpm: number) => String(Math.round(rpm / 10) * 10);

export function Engine() {
  const snapshot = useLiveSnapshot(live, 200);
  const s = useSR22((x) => x.s),
    up = useSR22((x) => x.update);
  const { shown, set } = useEngineGroups();
  const g = s.eng;
  return (
    <>
      <p className="lead">
        A Continental IO-550-N, six cylinders, normally aspirated and fuel injected, 310 hp at 2,700 RPM (POH 7-31). One
        power lever moves the throttle and, through a second cable, the propeller governor: about 2,500 RPM through the
        cruise settings and 2,700 at full power (7-32). Mixture is manual. Two magnetos fire two plugs per cylinder.
      </p>
      <Ctl>
        <H3>Show sub-systems</H3>
        {ENGINE_GROUPS.map((group) => (
          <Check
            key={group}
            id={"grp-" + group}
            label={group[0].toUpperCase() + group.slice(1)}
            checked={shown[group]}
            onChange={(on) => set(group, on)}
          />
        ))}
        <Small>
          Core parts (crankcase, cylinders, mount) always show; a part in several groups (the throttle body, the
          alternate air door) shows while any of its groups is on.
        </Small>
      </Ctl>
      <H3>Engine controls</H3>
      <Ctl>
        <Seg
          id="key"
          label="Ignition key"
          options={[
            ["OFF", "OFF"],
            ["R", "R"],
            ["L", "L"],
            ["BOTH", "BOTH"],
            ["START", "START"],
          ]}
          value={g.key}
          onChange={(v) => {
            if (v === "START") {
              live.startTimer = 1.8;
              live.crankT = 0;
            }
            up((d) => {
              d.eng.key = v;
            });
          }}
        />
        <Slider
          id="power"
          label="Power lever (IDLE → MAX)"
          min={0}
          max={1}
          step={0.01}
          value={g.lever}
          onChange={(v) =>
            up((d) => {
              d.eng.lever = v;
            })
          }
          fmt={lever}
        />
        <Slider
          id="mix"
          label="Mixture — red knob (CUTOFF → RICH)"
          min={0}
          max={1}
          step={0.01}
          value={g.mix}
          onChange={(v) =>
            up((d) => {
              d.eng.mix = v;
            })
          }
          fmt={(v) => (v <= 0.05 ? "CUTOFF" : v > 0.95 ? "FULL RICH" : "Leaned")}
        />
        <Check
          id="altAir"
          label="ALT AIR – PULL (alternate induction air)"
          checked={g.altAir}
          onChange={(v) =>
            up((d) => {
              d.eng.altAir = v;
            })
          }
        />
        <Check
          id="filterBlocked"
          label="Induction filter blocked (ice / debris)"
          checked={g.filterBlocked}
          onChange={(v) =>
            up((d) => {
              d.eng.filterBlocked = v;
            })
          }
        />
        <Readouts
          items={[
            ["Engine", g.running ? "RUNNING" : g.key === "START" ? ["CRANKING", "warnc"] : ["STOPPED", "bad"]],
            ["RPM", rpm10(snapshot.rpm)],
            ["MAP in", mapInHg(s, snapshot.rpm).toFixed(1)],
            [
              "Plugs firing",
              snapshot.rpm < 100 ? "—" : g.key === "R" ? "R mag · 6" : g.key === "L" ? "L mag · 6" : "Both · 12",
            ],
            ["Alt air door", altAirOpen(s) ? ["OPEN", "warnc"] : "closed"],
            [
              "Induction",
              inductionBlocked(s) ? ["FILTER BLOCKED", "bad"] : g.filterBlocked ? "alternate air" : "filtered",
            ],
          ]}
        />
      </Ctl>
      <Small>
        RPM follows the governor cable (POH 7-32); MAP and % power are illustrative, with full throttle limited to the
        ambient pressure less induction loss (ambient {ambientInHg(s.paFt).toFixed(1)} in.Hg at the Fuel panel&apos;s
        pressure altitude). Starting needs BAT 1, fuel at the selected tank and mixture out of cutoff. Block the
        induction filter and the engine starves until you pull ALT AIR: the door opens by hand only, bypassing the
        filter for warm unfiltered air (POH 7-32, 7-37); the Section 3 power-loss checklists call for it (3-13, 3-21).
      </Small>
      <H3>Ignition wiring</H3>
      <Facts
        rows={[
          ["Right magneto", "Lower-right + upper-left plugs"],
          ["Left magneto", "Lower-left + upper-right plugs"],
          ["START", "Starter + both mags; springs to BOTH"],
          ["Starter power", "2 A STARTER, NON ESS BUS"],
        ]}
      />
      <H3>Engine data</H3>
      <Facts
        rows={[
          ["Rating", "310 hp @ 2,700 RPM (POH 2-6, 7-31)"],
          ["TBO", "2,000 hr (7-31)"],
          ["Oil sump", "8 qt, wet sump · not less than 6 qt; 7 recommended for extended flights (7-36, 4-8)"],
          ["Cooler bypass", "below ~180 °F (82 °C) (7-36)"],
          ["Cooling", "Two cowl inlets, aluminum baffles, two aft cowl exits, no cowl flaps (7-38)"],
          ["Induction", "Two cowl inlets → dry-foam filter → throttle butterfly → six-tube manifold (7-37)"],
          ["Alternate air", "Pilot-pulled door on the induction manifold, bypasses the filter (7-32, 7-37)"],
          [
            "Exhaust",
            "Manifold → muffler each side → tailpipes out the lower cowl; cabin-heat muff on the right muffler (7-37)",
          ],
          // SR22 POH 13772-006 Reissue A 2-9, Engine Instrument Markings.
          ["Oil pressure", "30–60 psi green · 10–30 / 60–100 yellow · < 10 / > 100 red (2-9)"],
          ["Oil temp", "100–240 °F green · > 240 red · 75 °F min for takeoff (2-6, 2-9)"],
          ["CHT", "240–420 °F green · 420–460 yellow · > 460 red (2-9)"],
          ["EGT", "1000–1600 °F, six bars, no limit bands (2-9, 7-35)"],
          ["MAP", "10–35 in.Hg scale · green 15–29.5 · no caution or warning band (2-9, 7-36)"],
        ]}
      />
      <H3>Annunciations</H3>
      <Facts
        rows={[
          ["RPM", "Red: 2,710–2,730 RPM for more than 10 s, or above 2,730 for more than 5 s (2-9, 3-24)"],
          ["OIL PRESS", "Red < 10 or > 100 psi · amber 10–29 psi above 1,000 RPM (2-9, 3-23, 3A-8)"],
          ["OIL TEMP", "Red > 240 °F (2-9, 3-23)"],
          ["CHT", "Amber 420–460 °F · red > 460 °F (2-9, 3-25)"],
          ["FUEL FLOW", "Red: fuel flow greater than 30 GPH (3-26)"],
          [
            "No TIT, no MAN PRESSURE",
            "The normally aspirated engine has no turbine inlet probe and no manifold-pressure annunciation (2-9)",
          ],
        ]}
      />
      <H3>Mixture management (POH 7-45)</H3>
      <Notes
        items={[
          "After start and while taxiing, lean until maximum RPM is attained, to prevent plug fouling (7-45).",
          "Takeoff: full rich below 5,000 ft density altitude; above that, set the placarded MAX POWER fuel flow — 27 GPH at sea level, 24 at 4,000, 21 at 8,000, 18 at 12,000, 17 at 16,000 ft — to the top of the green arc. EGTs should be at least 1,200 °F at full power (7-45, 2-27).",
          "Climb: lean to the placarded schedule; full rich above 7,500 ft pressure altitude runs excessively rich and rough. Slightly richer than placard helps cooling if CHTs or oil temperature run high (7-45, 4-18).",
          "Cruise: 75% power or less for best power (75 °F rich of peak EGT); 65% or less for best economy (50 °F lean of peak EGT). Richen for smoothness if needed (7-45, 4-20).",
          "Descent: richen to keep EGTs about 1,200–1,400 °F in a cruise-power descent; richen in a reduced-power descent too, so adding power is not over-lean (7-45).",
          "Approach and landing: mixture set so that wide-open throttle would give the placarded full-throttle fuel flow (7-45).",
          "Power check early in the takeoff roll: smooth, about 2,700 RPM, no parameter in a caution or warning range (4-17).",
        ]}
      />
      <H3>Components</H3>
      <PartsList cat={CAT} sys="engine" />
    </>
  );
}

export function Propeller() {
  const snapshot = useLiveSnapshot(live, 200);
  const s = useSR22((x) => x.s),
    up = useSR22((x) => x.update);
  return (
    <>
      <p className="lead">
        A three-blade, constant-speed, 78-inch propeller and governor. There is no propeller lever: the power lever
        carries a cable to the governor, which sets about 2,500 RPM across the cruise settings and 2,700 RPM at full
        power (POH 7-32, 7-38). The governor senses engine speed with flyweights and boosts oil pressure to move the
        blades.
      </p>
      <H3>Power lever</H3>
      <Ctl>
        <Slider
          id="power2"
          label="Power lever (IDLE → MAX)"
          min={0}
          max={1}
          step={0.01}
          value={s.eng.lever}
          onChange={(v) =>
            up((d) => {
              d.eng.lever = v;
            })
          }
          fmt={lever}
        />
        <Check
          id="govFail"
          label="Governor failure"
          checked={s.eng.govFail}
          onChange={(v) =>
            up((d) => {
              d.eng.govFail = v;
            })
          }
        />
        <Readouts
          items={[
            [
              "Governor setting",
              s.eng.lever < 0.14 ? "below governing range" : s.eng.lever < 0.85 ? "≈ 2,500" : "2,500 → 2,700",
            ],
            ["RPM", snapshot.rpm > 2700 ? [rpm10(snapshot.rpm), "bad"] : rpm10(snapshot.rpm)],
            ["Blade angle", bladeAngle(s).toFixed(0) + "°"],
          ]}
        />
      </Ctl>
      <Small>
        Blade angle here is illustrative — it coarsens as power rises so the governor can hold RPM. The lever
        breakpoints (governing from 14%, 2,700 RPM above 85%) are illustrative too. With the governor failed the blades
        sit at fine pitch and RPM follows the power lever, reaching 3,000 at MAX (illustrative; POH 3-24 &quot;Propeller
        Overspeeds or Will Not Decrease&quot;).
      </Small>
      <H3>How the hub moves</H3>
      <Notes
        items={[
          "Power lever forward: the governor meters less high-pressure oil to the hub and centrifugal force lowers the blade pitch for higher RPM (POH 7-38).",
          "Power lever back: the governor meters more oil to the hub, forcing the blades to higher pitch and lower RPM (POH 7-38).",
          "Lose oil pressure and the blades go to low pitch — expect an overspeed; a failed governor or oil malfunction is the likely cause when RPM does not answer the lever (POH 7-38, 3-24).",
          "In stabilized flight the governor holds the RPM for the lever position; any change in airspeed or load becomes a pitch change (POH 7-38).",
        ]}
      />
      <H3>RPM warning</H3>
      <Notes
        items={[
          "RPM (red) after 2,710–2,730 RPM for more than ten seconds or more than 2,730 RPM for more than five seconds (POH 2-9 note a).",
          ...RPM_WARNING_STEPS,
          "Propeller RPM will not increase: check oil pressure, land as soon as practicable (POH 3-24).",
        ]}
      />
      <Facts
        rows={[
          ["Propeller", "Constant speed, 3-blade, 78.0 in. (76.0 min) (POH 2-8, 7-38)"],
          [
            "Approved models",
            "Hartzell PHC-J3YF-1RF/F7694(B) or /F7693DF(B) · McCauley D3A34C443/78CYA-0 · MT MTV-9-D/198-52 (2-8)",
          ],
          ["Governor", "Flyweight, cable-linked to the power lever (7-38)"],
          ["Max RPM", "2,700 (2-6)"],
          ["RPM marking", "Green 500–2,700 · red > 2,700 (2-9)"],
          ["Mag check", "At 1,700 RPM: drop ≤ 150 RPM each, ≤ 75 RPM between magnetos (4-15)"],
        ]}
      />
    </>
  );
}

export function Fuel() {
  const snapshot = useLiveSnapshot(live, 500);
  const s = useSR22((x) => x.s),
    E = useSR22((x) => x.E),
    up = useSR22((x) => x.update);
  const f = s.fuel;
  const speed = pumpSpeed(s, E, snapshot.rpm);
  return (
    <>
      <p className="lead">
        Each wing is a sealed tank that gravity-feeds a collector sump. The engine-driven pump pulls from whichever
        collector the selector points at; the electric fuel pump is for priming and vapor suppression. Excess fuel
        returns to the selected tank (POH 13772-006 7-39).
      </p>
      <H3>Try it</H3>
      <Ctl>
        <Seg
          id="fsel"
          label="Fuel selector"
          options={[
            ["L", "LEFT"],
            ["R", "RIGHT"],
            ["OFF", "OFF"],
          ]}
          value={f.sel}
          onChange={(v) =>
            up((d) => {
              d.fuel.sel = v;
            })
          }
        />
        <Seg
          id="fpump"
          label="Fuel pump"
          options={[
            ["OFF", "OFF"],
            ["BOOST", "BOOST"],
            ["PRIME", "PRIME (momentary)"],
          ]}
          value={f.pump}
          onChange={(v) =>
            up((d) => {
              d.fuel.pump = v;
            })
          }
        />
        <Slider
          id="qL"
          label="Left tank"
          min={0}
          max={46}
          step={0.1}
          value={f.qL}
          onChange={(v) =>
            up((d) => {
              d.fuel.qL = v;
            })
          }
          fmt={(v) => v.toFixed(1) + " gal"}
        />
        <Slider
          id="qR"
          label="Right tank"
          min={0}
          max={46}
          step={0.1}
          value={f.qR}
          onChange={(v) =>
            up((d) => {
              d.fuel.qR = v;
            })
          }
          fmt={(v) => v.toFixed(1) + " gal"}
        />
        <BtnRow>
          {(
            [
              ["Full · 92", 46, 46],
              ["Tabs · 60", 30, 30],
              ["Low · 6 / 5", 6, 5],
              ["Imbalance", 20, 6],
            ] as const
          ).map(([t, l, r]) => (
            <button
              key={t}
              type="button"
              className="btn"
              onClick={() =>
                up((d) => {
                  d.fuel.qL = l;
                  d.fuel.qR = r;
                })
              }
            >
              {t}
            </button>
          ))}
        </BtnRow>
        <Slider
          id="paFt"
          label="Pressure altitude"
          min={0}
          max={17500}
          step={500}
          value={s.paFt}
          onChange={(v) =>
            up((d) => {
              d.paFt = v;
            })
          }
          fmt={(v) => v.toLocaleString("en-US") + " ft"}
        />
        <Readouts
          items={[
            ["Total usable", (f.qL + f.qR).toFixed(1)],
            [
              "Feeding",
              f.sel === "OFF"
                ? ["OFF", "bad"]
                : fuelAvail(s)
                  ? f.sel === "L"
                    ? "LEFT"
                    : "RIGHT"
                  : ["DRY TANK", "bad"],
            ],
            [
              "Pump",
              f.pump === "OFF"
                ? "OFF"
                : !E.boostPwr
                  ? ["NO PWR", "bad"]
                  : speed === "high"
                    ? "PRIME · high speed"
                    : f.pump === "PRIME"
                      ? "BOOST · prime locked out"
                      : "BOOST · 4–6 psi",
            ],
            ["Pressure altitude", s.paFt.toLocaleString("en-US") + " ft"],
            ["Engine", s.eng.running ? "RUNNING" : ["STOPPED", "bad"]],
          ]}
        />
      </Ctl>
      <Small>
        Selecting OFF or a dry tank with the engine running stops it after a few seconds — restart from the Engine
        panel. PRIME is a momentary position: the pump runs at high speed only while engine oil pressure is below 10 psi
        (the model takes that as below 500 RPM); once oil pressure is up, PRIME runs the pump in BOOST mode instead (POH
        7-40). BOOST is required for takeoff, climb, landing and switching tanks (2-18). The altitude slider ends at the
        maximum operating altitude, 17,500 ft (POH 2-19).
      </Small>
      <H3>Annunciations</H3>
      <Facts
        rows={[
          ["FUEL LOW LEFT / RIGHT", "Red: low fuel quantity in that tank (POH 3-27; the model uses < 1 gal)"],
          ["FUEL LOW TOTAL", "Amber ≤ 14 gal · red < 9 gal (sensed or totalizer; POH 3-27, 3A-11)"],
          ["FUEL QTY", "White advisory: either tank below 14 gal (POH 7-43)"],
          ["FUEL FLOW", "Red: fuel flow greater than 30 GPH (not simulated; POH 3-26)"],
          ["FUEL IMBALANCE", "L/R difference: white > 8 · amber > 10 · red > 12 gal (POH 7-43, 3-29, 3A-11)"],
        ]}
      />
      <Caution title="Caution">
        At ¼ tank or less, prolonged slips or skids can unport the tank outlet. With a tank that low (or one dry), stay
        coordinated — no more than 30 seconds uncoordinated (POH 7-42).
      </Caution>
      <H3>Details</H3>
      <Facts
        rows={[
          ["Capacity", "47.25 gal per tank · 46 usable (POH 2-18, 7-39)"],
          ["Total usable", "92 gal · 94.5 gal capacity (POH 2-18, 7-39)"],
          ["Filled to tabs", "30 gal/side · 60 total (POH 7-39)"],
          [
            "Fuel pump",
            "BOOST 4–6 psi · PRIME high speed below 10 psi oil pressure · 5 A FUEL PUMP, MAIN BUS 2 (POH 7-40)",
          ],
          ["Max imbalance", "10 gal (POH 2-18)"],
          ["Drains", "5: 2 tank, 2 collector, gascolator (POH 7-39, Fig 7-8)"],
          ["Vents", "NACA vent under each wing near tip (POH 7-39)"],
          ["Gauge", "0–46 gal · yellow 0–14 · green 14–46 (POH 2-10, 7-42)"],
          [
            "Fuel flow",
            "0–30 GPH; green arc to the altitude-dependent max-power flow, with a gap drawn at ≤ 75% power to aid leaning (POH 2-10, 7-42, Fig 4-2); band illustrative",
          ],
          [
            "Totalizer",
            "Independent of float sensors; red < 9 · yellow 9–14 · green > 14 gal (POH 2-10, 7-43); not simulated",
          ],
          [
            "Pump backup",
            "BOOST may clear vapor or a partial engine-driven pump failure; the electric pump cannot supply the engine if the engine-driven pump fails completely (POH 3-23)",
          ],
        ]}
      />
      <H3>Components</H3>
      <PartsList cat={CAT} sys="fuel" />
    </>
  );
}
