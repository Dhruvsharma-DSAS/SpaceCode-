# 08 · Changelog — how the project got here

## History of the documents (atlas Ch. 3)
| date | artifact | added | later found wrong (fixed in V2) |
|---|---|---|---|
| 14–15 Oct 2026 | Strategy + Books 1–4 | challenge pick, sensors, code, beginner maths | fixed overpass times; 5–95 bootstrap called 95%; ln(1+x) z |
| 15 Oct | Accuracy Upgrade (Book 5) | clear-sky rate, day/night k, GLM, empirical Bayes | rate treated as defined at K = 0 only in tests |
| 20 Oct | 164-page A4 Atlas | full design + 46 formula pages | mixed status tags; figures from synthetic data |
| 21 Oct | 62-page Build Spec | stack, API, DB, milestones | 60 fps claim; "0.6 confidence" copy |
| 26 Oct | 4 Layers + visual guide | layers, changed formulas | ln(rate) at zero; "B = many missed" |
| 27 Oct | Final Spec + prompt pack | locked Home/Explorer/Studio, fixtures | palette decision left open |
| 27 Oct | **V2 Research Atlas (188 pages)** | verified facts, runnable audit, registry, 5 provenance labels | real-data run still pending |
Precedence: scientific facts → official guides and validated runs beat any project document; Home identity → Concept A v2 + Crossing Orbits logo; nothing is deleted, rejected ideas are archived with a reason.

## V1 → V2 science changes
| topic | V1 | V2 |
|---|---|---|
| unit of comparison | fire cell-days, MODIS count as denominator | exposure rate F/E + VIIRS-eq cell-days with 95% band |
| missing data | filled with 0 | null + status (not_observable, unavailable, pending) |
| k | one median ratio, 2.6 in examples | per stratum, NB offset model, pooled log k, with interval |
| confidence | VIIRS l/n/h → 0.25/0.6/0.9 | sensor-native classes + sensitivity grid |
| anomaly | 3 inconsistent versions | log((F+.5)/(E+1)), target year left out, n ≥ 8 |
| trend | Mann–Kendall without ties | tie-corrected MK + Hamed–Rao + Sen + BH |
| intervals | "95%" computed as 90% | explicit α; level and type in every legend |
| blind spot | B = "real burning ~2×" | B = disagreement flag; scenario clock |
| validation | in-sample, MAPE | leave-one-year-out + region hold-out, placebo seams, predeclared gates |
| grid | plain floor; India assumptions | rounded floor, antimeridian, real geodesic areas, global |
| palette | two inverted sensor palettes | one validated palette: MODIS amber, VIIRS cyan |
| truth labels | E / T / P tags | five provenance labels on every number |
| RAG | LLM + docs | documents for words, SQL for numbers, citation guard |
| fire data in DB | synthetic seed corpus | real static CSVs now; fire rows only from the FIRMS fetch |
Audit totals: 46 formulas re-audited (17 FIX, 19 REVISE, 10 OK), 36 audit checks executed, 15 conflicts logged (12 resolved, 3 open: C-02 colours → now decided amber/cyan, C-09 confidence copy → now a rule picker, C-13 performance claim → measure first).

## Website build — Spacecode 3 (27–28 Oct 2026)
1. **Organised the project folder:** byte-identical duplicates (code/ ≡ docs/spec, supabase/ ≡ data/supabase, second atlas PDF, second concept image) moved to an archive; empty folders removed.
2. **Shared design system:** new tokens and stylesheet in the prototype's language (Sora / Inter / JetBrains Mono, surface #0A0E14, framed panels), one amber/cyan sensor palette.
3. **Home rebuilt from the approved prototype (Concept A v2):** hero, How it works (4 clips + 6 answers), End-to-end, Satellites dossiers, Calendar teaser, Control tiles, side progress nav, scroll reveals.
4. **Explorer rebuilt to the locked globe design:** layers with switches, search with bounding box and country highlight, navy "atlas" globe, cell inspector, sensors over this cell, time strip MODIS era → VIIRS era.
5. **Globe fixes:** clicks on merged point meshes and on country shapes now select the nearest detection; Explorer layout height fixed.
6. **3D Home background:** the Spacecode realistic Earth (day/night shader, city lights, clouds, atmosphere) as one fixed background that changes continuously with scroll — no "next page" feeling; Earth stays on the right.
7. **Real satellites:** the procedural satellite replaced by **official NASA 3D models** — Aqua (MODIS) and Suomi NPP (VIIRS) — each on its own orbit (amber dashed / cyan solid); Draco decoder from three.js.
8. **Satellite docking flow:** the Satellites section is pinned; Aqua rises from the Earth and docks → MODIS details pop in → Suomi NPP docks → VIIRS details; snap points at each docked state so fast scrolling cannot skip it; details compacted to fit one screen; text on the left, Earth and satellite on the right.
9. **De-"AI" status design:** glowing pills replaced — hero record strip (27 year ticks, amber → cyan), squared Source switch (Demo / Archive / Live), "Jump to… ⌘K" search field, squared status tags everywhere.
10. **New How-it-works videos** recorded from the current site with headless Chrome + ffmpeg (`tools/record_clips.mjs`), replacing the old prototype clips.
11. **Navigation reorganised** into two tiers with groups Explore · Trust · Your data · Learn and a sub-nav per group.
12. **Explorer analysis upgrade:** page header, 5 key figures, spaced workspace, H3 density on by default, **click-anywhere location card pinned to the globe**, location inspector (cell, 50 km, hex, pending values), camera no longer jumps, Esc clears, and an analysis section (hour-of-day with overpass lines and blind window, day/night, source mix, daily by sensor, FRP bands, countries).
13. **Pushed to GitHub** (`Dhruvsharma-DSAS/SpaceCode-`, branch main) with only relevant files (186 files, ~28 MB); later changes (items 11–12 and this pack) are local until pushed.
