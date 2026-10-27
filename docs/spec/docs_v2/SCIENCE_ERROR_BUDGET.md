# SCIENCE_ERROR_BUDGET (PROPOSED — sizes to be measured in M3)

| source | mechanism | handled by | expected size | measured? |
|---|---|---|---|---|
| counting noise | NB variation of cell-days | F15, F25 | large at small counts | simulated |
| calibration | uncertainty of k in overlap | F24, F18 | ±10–20% of k | pending |
| non-stationarity | orbit drift, processing changes | R1, R5, R8 | unknown | pending |
| exposure mismatch | 1 km daily composite vs 375 m points | R2 | unknown | pending |
| filter choice | confidence rule pair | F07 grid | ±15% of k (sim) | simulated |
| static sources | kilns/flares in calibration | F08 mask | region-dependent | pending |
| timing | burning outside overpasses | Layer 3 flag only | can dominate (Punjab) | not correctable from hotspots |
| attribution | source class errors | abstain, F39 | unknown without labels | pending |

Timing and attribution are NOT inside calendar intervals; they are separate flags.
