import pandas as pd


def calendar_matrix(monthly, sensor_value_column):
    table = monthly.pivot_table(index="year", columns="month", values=sensor_value_column, aggfunc="sum", fill_value=0)
    for m in range(1, 13):
        if m not in table.columns:
            table[m] = 0
    table = table[sorted(table.columns)]
    return table


def month_baseline(table):
    medians = {}
    spreads = {}
    for m in table.columns:
        values = sorted(table[m].tolist())
        n = len(values)
        if n % 2 == 1:
            med = values[n // 2]
        else:
            med = (values[n // 2 - 1] + values[n // 2]) / 2.0
        devs = sorted([abs(v - med) for v in values])
        if n % 2 == 1:
            mad = devs[n // 2]
        else:
            mad = (devs[n // 2 - 1] + devs[n // 2]) / 2.0
        spread = 1.4826 * mad
        if spread < 1.0:
            spread = 1.0
        medians[m] = med
        spreads[m] = spread
    return medians, spreads


def anomaly_table(table, medians, spreads):
    z = table.copy().astype(float)
    for m in table.columns:
        z[m] = (table[m] - medians[m]) / spreads[m]
    return z


def season_dates(weekly_values, start_share=0.10, end_share=0.90):
    total = sum(weekly_values)
    if total == 0:
        return None, None, None
    running = 0
    start = None
    end = None
    for i, v in enumerate(weekly_values):
        running = running + v
        if start is None and running >= start_share * total:
            start = i
        if end is None and running >= end_share * total:
            end = i
    peak = 0
    for i, v in enumerate(weekly_values):
        if v > weekly_values[peak]:
            peak = i
    return start, peak, end
