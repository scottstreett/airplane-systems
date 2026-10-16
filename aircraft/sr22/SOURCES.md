# SR22 G6 (normally aspirated) — sources and applicability

The SR22 model is the SR22T study model with the turbocharging hardware removed and the engine, propeller, fuel pump,
limitations, annunciations and preflight lettering taken from the SR22 POH. It was built for one airplane: a 2021 SR22
G6, serial number 5002, with FIKI ice protection (operator statement, 2026-10-16). Always use the POH/AFM and supplements
for your own serial number.

## Documents inspected

- **Cirrus SR22 Pilot's Operating Handbook and FAA Approved Airplane Flight Manual, P/N 13772-006, Reissue A** (the
  operator's copy for s/n 5002). Inspected: Section 1 (1-7 engine and propeller), Section 2 (2-4 – 2-5 airspeeds,
  2-6 – 2-10 powerplant limitations and instrument markings, 2-18 fuel limits, 2-19 altitude limits, 2-27 placards),
  Section 3 (3-13 Engine Failure In Flight, 3-21 – 3-23 Engine Partial Power Loss and engine system emergencies, 3-24
  RPM warning and propeller governor failure, 3-26 – 3-29 fuel system emergencies, 3-33 – 3-35 oxygen emergencies),
  Section 3A (3A-5 Inadvertent Icing Encounter, 3A-11 fuel cautions, 3A-23 – 3A-25 oxygen), Section 4 (4-4 – 4-9
  preflight inspection, 4-10 – 4-11 engine start, 4-15 before takeoff, 4-17 takeoff, 4-18 climb, 4-19 – 4-20 cruise and
  cruise leaning, 4-21 descent), Section 5 (5-32 cruise performance), Section 7 (the table of contents 7-1 – 7-3; 7-22
  flaps; 7-31 – 7-38 engine and propeller; 7-39 – 7-45 fuel system and mixture management; 7-46 electrical system
  introduction; 7-60 environmental system) and Section 9 (the log of supplements, which lists no supplements in this copy).
- **Cirrus SR-Series Workbook, Edition 3 (October 2018)**: read for orientation only; nothing in the model is sourced from it.
- The SR22T documents behind the carried-over systems: SR22T POH P/N 13772-007 Reissue A and SR22T AMM P/N 13773-002 Rev 7
  (see [the SR22T's references](../sr22t/SOURCES.md) and the SR22T parts' own notes). **The SR22 AMM (P/N 13773-001) was
  not inspected.**
- Not inspected: the FIKI supplement (the SR22 POH leaves ice protection to its Section 9 supplement; the TKS model and
  its notes are the SR22T's, whose basic POH describes FIKI at 7-13), the Precise Flight built-in oxygen AFMS (the SR22
  POH lists the system "if available" at 4-5 and gives its CAS procedures at 3-33 and 3A-23; the oxygen model and notes
  are the SR22T's), and the GFC 700 autopilot supplement.

## What is sourced from the SR22 POH

| Item                                                                                                                                                                               | Source                                      | Where in the model                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Engine: IO-550-N, 310 hp at 2,700 RPM, normally aspirated, 2,000 h TBO, six-point mount                                                                                            | 7-31, 2-6, 1-7                              | `parts/engine.ts`, `panels/powerplant.tsx`, `panels/general.tsx`                     |
| Power lever cabled to the throttle body and, separately, to the governor: ≈2,500 RPM through cruise, 2,700 at full power                                                           | 7-32                                        | `model.ts` `rpmTarget`, `panels/powerplant.tsx`                                      |
| ALT AIR – PULL knob (left console, lock button), pilot-controlled door on the induction manifold, no automatic door                                                                | 7-32, 7-37; checklists 3-13, 3-21, 3A-5     | `model.ts` `altAirOpen`, `parts/engine-air.ts` (knob, cable), `parts/engine.ts` note |
| Induction: two cowl inlets → dry-foam filter → throttle butterfly → six-tube manifold                                                                                              | 7-37                                        | notes in `parts/engine-air.ts`; geometry schematic (below)                           |
| Exhaust: manifold → muffler each side → tailpipes out the lower cowl; cabin-heat muff on the right muffler                                                                         | 7-37, 7-60, Fig 7-13                        | `exhaust-layout.ts`, `parts/engine-air.ts`, `environment-depth-flow.ts`              |
| Lubrication: wet sump, 8 qt, strainer, pump with relief valve, filter, cooler bypass ≈180 °F, governor supply                                                                      | 7-36; 4-8 (6 qt minimum, 7 recommended)     | `parts/engine-oil.ts`, `engine-depth-flow.ts`                                        |
| Ignition: two magnetos, R fires lower-right / upper-left, OFF-R-L-BOTH-START, 2 A STARTER on NON ESS                                                                               | 7-36                                        | unchanged from the SR22T model                                                       |
| Engine markings: RPM green 500–2,700 / red > 2,700; MAP 10–35 in.Hg, green 15–29.5, no bands; EGT 1000–1600; CHT, oil                                                              | 2-9                                         | `displays.ts` `eisGauges`, `panels/powerplant.tsx`                                   |
| RPM warning: 2,710–2,730 RPM > 10 s or > 2,730 > 5 s; procedure                                                                                                                    | 2-9 note a, 3-24                            | `model.ts` `rpmWarning`, `RPM_WARNING_STEPS`, `tick.ts`                              |
| No TIT, no MAN PRESSURE and no ALT AIR OPEN annunciation                                                                                                                           | 2-9 (no MAP bands); 7-32                    | `model.ts` `casMessages`                                                             |
| Full-throttle manifold pressure ≈ ambient − 0.5 in.Hg; percent power as a linear fit of the ISA cruise rows                                                                        | 5-32 (2,000 / 4,000 / 6,000 ft rows)        | `model.ts` `mapFull`, `displays.ts` `pctPower`                                       |
| Cruise picture: 4,000 ft ISA, 2,500 RPM, 21.4 in.Hg, 65%, 165 KTAS, 15.5 GPH                                                                                                       | 5-32                                        | `displays.ts`                                                                        |
| Fuel pump: BOOST selectable at low speed; PRIME momentary, high speed only below 10 psi oil pressure; 5 A FUEL PUMP, MAIN BUS 2; BOOST for takeoff, climb, landing, tank switching | 7-40, 2-18                                  | `model.ts` `pumpSpeed`, `panels/powerplant.tsx`                                      |
| Fuel system: 92 gal usable, 46 per tank, tabs 30, selector, drains, vents; gauge and totalizer bands; FUEL QTY / FUEL IMBALANCE / FUEL FLOW annunciations                          | 7-39 – 7-44, 2-10, 2-18, 3-26 – 3-29, 3A-11 | `panels/powerplant.tsx`                                                              |
| MAX POWER FUEL FLOWS placard (27 / 24 / 21 / 18 / 17 GPH at SL / 4 / 8 / 12 / 16 thousand ft) and mixture management                                                               | 2-27, 7-45, 4-17 – 4-20                     | `displays.ts` fuel-flow arc, `panels/powerplant.tsx`                                 |
| Propeller: constant speed, three blades, 78 in. (76 min); Hartzell, McCauley or MT models                                                                                          | 2-8, 7-38                                   | `panels/powerplant.tsx`, `parts/engine.ts`                                           |
| Mag check at 1,700 RPM, ≤ 150 RPM drop, ≤ 75 RPM between                                                                                                                           | 4-15                                        | `panels/powerplant.tsx`                                                              |
| Max operating altitude 17,500 ft, max takeoff altitude 10,000 ft                                                                                                                   | 2-19                                        | `panels/general.tsx`, pressure-altitude slider                                       |
| Flap detents 0 / 50% (16°) / 100% (35.5°)                                                                                                                                          | 7-22                                        | `model.ts` (unchanged values)                                                        |
| Preflight walk-around items, stations 1–13, with the landing light as 10a and the alternator as 9h                                                                                 | 4-4 – 4-9                                   | `walkaround.ts`                                                                      |
| Section 7 rail pages                                                                                                                                                               | 7-1 – 7-3                                   | `systems.ts`                                                                         |

## What is carried over from the SR22T model

The airframe, flight controls, flaps, gear and brakes, cabin and doors, electrical system, lighting, environmental
system, pitot-static and stall warning, avionics, TKS ice protection, built-in oxygen and CAPS are the SR22T model's
geometry, logic and notes. For these systems the SR22 POH's Section 7 is the same text as the SR22T's on pages shifted
by one from the fuel system onward (SR22 7-39 … 7-96 = SR22T 7-40 … 7-97; checked against the SR22 table of contents and
these anchors: Fuel System 7-39, Fuel Pump Operation 7-40, Fuel Indicating 7-42, Power Generation 7-46, Figure 7-10 7-47,
Electrical System Control 7-52, Exterior Lighting 7-56, Environmental System 7-60, Figure 7-13 7-61, Distribution 7-63,
Stall Warning System 7-67, Pitot Heat Annunciation 7-68, Avionics 7-71, Figure 7-17 7-72, Magnetometer 7-74, Avionics
Support Equipment 7-88, ELT 7-90, Fire Extinguisher 7-92, CAPS 7-94, Deployment Characteristics 7-96). The carried-over
notes' POH page citations were remapped by that offset and relabelled "SR22 POH 13772-006"; they were **not re-read line
by line**, so a carried-over note's wording is the SR22T POH's. Where a note cites the AMM 13773-002, that is the SR22T
AMM: the SR22 AMM 13773-001 was not inspected, and installation details (harness routes, bracket stations, part numbers)
may differ between the two airplanes. Figure numbers are the same in both POHs.

## Known limits of this SR22 model

- **Engine geometry is schematic.** The air boxes behind lower-cowl NACA ducts, the top-mounted throttle body, the intake
  manifold and intake pipes to the top of each head, the cylinder exhaust headers and collector rails are the SR22T
  model's; the "induction duct" from each air box to the throttle body follows the SR22T's charge-air route with the
  turbocharger and intercooler replaced by plain duct, and the mufflers, downpipes and tailpipes are invented canisters
  and bends. The IO-550-N's actual induction (the POH's dry-foam filter and six-tube manifold) and exhaust arrangement
  need the SR22 AMM figures (chapters 71, 73, 78) to model properly.
- The side baffle decks are built around the SR22T's intercooler seats (`intercooler-layout.ts` is kept for them); the
  SR22's own baffle shapes were not checked.
- The engine-mounted oil separator, the MCU heat shield and the throttle-position / MAT sensors are SR22T installations
  carried over without checking the SR22.
- No performance model: the fixed cruise picture and the percent-power fit are display illustrations.
- The built-in oxygen system is not installed on s/n 5002 (operator statement, 2026-10-16); the Overview panel can switch
  it on to study the SR22T-derived model of the option.
