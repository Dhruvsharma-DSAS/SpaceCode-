import pandas as pd
from calendar_build import calendar_matrix, month_baseline, anomaly_table, season_dates

rows = []
for year, nov in [(2020, 300), (2021, 280), (2022, 320), (2023, 310), (2024, 410)]:
    rows.append({"year": year, "month": 11, "cell_days": nov})
    rows.append({"year": year, "month": 4, "cell_days": 100})
monthly = pd.DataFrame(rows)
table = calendar_matrix(monthly, "cell_days")
assert list(table.columns) == list(range(1, 13))
assert table.loc[2024, 11] == 410
med, spr = month_baseline(table)
assert med[11] == 310
assert abs(spr[11] - 1.4826 * 10) < 1e-9
z = anomaly_table(table, med, spr)
assert round(z.loc[2024, 11], 2) == 6.74
assert z.loc[2023, 11] == 0
s, p, e = season_dates([0, 1, 2, 10, 30, 40, 10, 5, 2, 0])
assert (s, p, e) == (3, 5, 6)
assert season_dates([0, 0]) == (None, None, None)
print("calendar tests passed; z 2024 Nov =", round(z.loc[2024, 11], 2))
