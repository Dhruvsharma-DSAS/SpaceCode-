import json
import numpy as np

YEARS = np.arange(2003, 2026)
MONTHS = np.arange(1, 13)
SEASON = np.array([0.15, 0.1, 0.12, 0.9, 1.1, 0.4, 0.1, 0.05, 0.3, 3.5, 6.0, 0.8])
P = {("M", "D"): 0.30, ("M", "N"): 0.12, ("V", "D"): 0.78, ("V", "N"): 0.55}
DAYS = 30


def simulate(rng, drift=0.025, theta=8.0):
    ny = len(YEARS)
    year_eff = np.exp(rng.normal(0, 0.25, ny))
    night_share = np.clip(0.15 + 0.012 * (YEARS - 2003) + rng.normal(0, 0.03, ny), 0.05, 0.6)
    A = np.zeros((ny, 12, 2))
    for yi in range(ny):
        base = 40 * SEASON * year_eff[yi]
        A[yi, :, 0] = base * (1 - night_share[yi])
        A[yi, :, 1] = base * night_share[yi]
    data = {}
    for s in ["M", "V"]:
        clear_p = np.clip(0.75 - 0.35 * (np.isin(MONTHS, [7, 8])) + rng.normal(0, 0.05, (ny, 12)), 0.1, 0.95)
        E = rng.binomial(DAYS, clear_p)
        Y = np.zeros((ny, 12, 2))
        for di, dn in enumerate(["D", "N"]):
            p = np.full(ny, P[(s, dn)])
            if s == "M":
                p = p * np.where(YEARS > 2016, 1 - drift * (YEARS - 2016), 1.0)
            mu = (E / DAYS) * p[:, None] * A[:, :, di]
            lam = rng.gamma(theta, mu / theta)
            Y[:, :, di] = rng.poisson(lam)
        data[s] = {"Y": Y, "E": E}
    data["A"] = A
    return data


def fit_k(data, years_mask, method):
    YM = data["M"]["Y"][years_mask]
    YV = data["V"]["Y"][years_mask]
    EM = data["M"]["E"][years_mask][:, :, None]
    EV = data["V"]["E"][years_mask][:, :, None]
    if method == "B1":
        m = YM.sum(axis=2)
        v = YV.sum(axis=2)
        ok = m > 0
        return {"k": np.median(v[ok] / m[ok])}
    if method == "B2":
        rm = (YM.sum(axis=2) / np.maximum(EM[:, :, 0], 1)).sum()
        rv = (YV.sum(axis=2) / np.maximum(EV[:, :, 0], 1)).sum()
        return {"k": rv / rm}
    if method in ["B3", "B4"]:
        out = {}
        for di in range(2):
            rm = (YM[:, :, di] / np.maximum(EM[:, :, 0], 1)).sum()
            rv = (YV[:, :, di] / np.maximum(EV[:, :, 0], 1)).sum()
            out[di] = rv / rm
        if method == "B4":
            yrs = YEARS[years_mask]
            lk = []
            for yi in range(len(yrs)):
                rm = (YM[yi] / np.maximum(EM[yi], 1)).sum()
                rv = (YV[yi] / np.maximum(EV[yi], 1)).sum()
                lk.append(np.log(rv / rm))
            lk = np.array(lk)
            x = np.maximum(yrs - 2016, 0)
            Xd = np.column_stack([np.ones(len(yrs)), x])
            beta = np.linalg.lstsq(Xd, lk, rcond=None)[0]
            out["drift"] = beta[1]
        return out
    return {"k": 1.0}


def predict(data, yi, fit, method):
    YM = data["M"]["Y"][yi]
    EM = data["M"]["E"][yi][:, None]
    EV = data["V"]["E"][yi][:, None]
    if method == "B0":
        return YM.sum(axis=1)
    if method == "B1":
        return fit["k"] * YM.sum(axis=1)
    if method == "B2":
        return fit["k"] * YM.sum(axis=1) / np.maximum(EM[:, 0], 1) * EV[:, 0]
    pred = np.zeros(12)
    for di in range(2):
        k = fit[di]
        if method == "B4":
            k = k * np.exp(fit["drift"] * (max(YEARS[yi] - 2016, 0) - np.mean(np.maximum(YEARS[YEARS >= 2012] - 2016, 0))))
        pred += k * YM[:, di] / np.maximum(EM[:, 0], 1) * EV[:, 0]
    return pred


def run(n_rep=60, seed=7):
    rng = np.random.default_rng(seed)
    methods = ["B0", "B1", "B2", "B3", "B4"]
    mae = {m: [] for m in methods}
    dev = {m: [] for m in methods}
    season_err = {m: [] for m in methods}
    cover = []
    overlap = np.where(YEARS >= 2012)[0]
    example = None
    for rep in range(n_rep):
        d = simulate(rng)
        for yi in overlap:
            mask = (YEARS >= 2012) & (YEARS != YEARS[yi])
            truth = d["V"]["Y"][yi].sum(axis=1)
            for m in methods:
                f = fit_k(d, mask, m) if m != "B0" else {}
                pr = predict(d, yi, f, m)
                mae[m].append(np.mean(np.abs(pr - truth)))
                mu = np.maximum(pr, 1e-6)
                term = np.where(truth > 0, truth * np.log(np.where(truth > 0, truth, 1) / mu), 0) - (truth - mu)
                dev[m].append(2 * term.sum())
                season_err[m].append(abs(pr[9:11].sum() - truth[9:11].sum()) / max(truth[9:11].sum(), 1))
            yrs_idx = np.where(mask)[0]
            boots = []
            for b in range(200):
                pick = rng.choice(yrs_idx, len(yrs_idx), replace=True)
                bm = np.zeros(len(YEARS), dtype=bool)
                f = {}
                YMb = d["M"]["Y"][pick]
                YVb = d["V"]["Y"][pick]
                EMb = d["M"]["E"][pick]
                EVb = d["V"]["E"][pick]
                for di in range(2):
                    f[di] = (YVb[:, :, di] / np.maximum(EVb, 1)).sum() / (YMb[:, :, di] / np.maximum(EMb, 1)).sum()
                pr = predict(d, yi, f, "B3")[9:11].sum()
                boots.append(rng.poisson(rng.gamma(8.0, pr / 8.0)))
            lo, hi = np.quantile(boots, [0.025, 0.975])
            tv = d["V"]["Y"][yi][9:11].sum()
            cover.append(lo <= tv <= hi)
        if rep == 0:
            example = d
    summary = {}
    for m in methods:
        summary[m] = {"mae_monthly": float(np.mean(mae[m])), "deviance": float(np.mean(dev[m])), "season_rel_err_median": float(np.median(season_err[m]))}
    summary["coverage_95_B3_season"] = float(np.mean(cover))
    summary["n_rep"] = n_rep
    seam = {}
    full_fit = {m: fit_k(example, YEARS >= 2012, m) for m in ["B1", "B2", "B3", "B4"]}
    series = {}
    for m in ["B0", "B1", "B2", "B3", "B4"]:
        vals = []
        for yi, y in enumerate(YEARS):
            if y < 2012:
                vals.append(float(predict(example, yi, full_fit.get(m, {}), m)[9:11].sum()))
            else:
                vals.append(float(example["V"]["Y"][yi][9:11].sum()))
        series[m] = vals
    truth_eq = []
    for yi, y in enumerate(YEARS):
        EV = example["V"]["E"][yi]
        t = 0
        for di, dn in enumerate(["D", "N"]):
            t += ((EV / DAYS) * P[("V", dn)] * example["A"][yi, :, di])[9:11].sum()
        truth_eq.append(float(t))
    summary["example_series"] = series
    summary["example_truth_viirs_eq_expected"] = truth_eq
    summary["example_modis_raw"] = [float(example["M"]["Y"][yi][9:11].sum()) for yi in range(len(YEARS))]
    summary["years"] = YEARS.tolist()
    summary["example_calendar_V"] = example["V"]["Y"].sum(axis=2).tolist()
    summary["example_calendar_M"] = example["M"]["Y"].sum(axis=2).tolist()
    summary["example_E_M"] = example["M"]["E"].tolist()
    summary["example_E_V"] = example["V"]["E"].tolist()
    return summary


if __name__ == "__main__":
    s = run()
    json.dump(s, open("/home/claude/atlas/out/sim_ladder.json", "w"))
    for m in ["B0", "B1", "B2", "B3", "B4"]:
        print(m, {k: round(v, 3) for k, v in s[m].items()})
    print("coverage", s["coverage_95_B3_season"])
