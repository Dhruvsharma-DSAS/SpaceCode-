import math
import chronos_core as c

assert c.cell_index(28.1, 75.0, 0.1)[0] == 1181
assert c.cell_index(0, 180, 0.1) == c.cell_index(0, -180, 0.1) or c.cell_index(0, 180, 0.1)[1] == 3599
bad = 0
for k in range(1800):
    lat = round(-90 + k * 0.1, 1)
    if c.cell_index(lat, 0, 0.1)[0] != k:
        bad += 1
assert bad == 0
assert abs(c.cell_area_km2(30.9, 31.0, 0.1) - 106.0) < 0.1
total = sum(c.cell_area_from_index(r, 1.0) for r in range(180)) * 360
assert abs(total / (4 * math.pi * c.EARTH_RADIUS_KM ** 2) - 1) < 1e-4
assert c.clear_sky_rate(30, 600)["value"] == 0.05
assert c.clear_sky_rate(5, 0)["value"] is None
assert c.persistence(0, 0)["value"] is None
assert math.isfinite(c.log_rate(0, 20))
assert c.empirical_bayes_log_k([0.9], [0.01]) is None
lo, hi = c.garwood_ci(3)
assert abs(lo - 0.619) < 0.01 and abs(hi - 8.767) < 0.01
mk = c.mann_kendall_ties([5, 3, 6, 2, 5, 4, 5, 3])
assert abs(mk["var"] - 60.6667) < 1e-3
z = c.robust_z_loo([300, 280, 320, 310], 410, sigma_floor=1.0, min_samples=4)
assert abs(z["value"] - 7.08) < 0.01
assert c.robust_z_loo([1, 2], 3)["status"] == "insufficient_data"
k = c.kalman_local_level([None, None, 10.0, 12.0], 4.0, 1.0)
assert k[0] is None and k[2] == 10.0
u = c.diurnal_seen_union([(10, 11), (13, 14), (13.25, 14.25)], 13, 1.5)
n = c.diurnal_seen_naive_sum([(10, 11), (13, 14), (13.25, 14.25)], 13, 1.5)
assert u < n and u <= 1
assert c.blindspot_ratio(None, 10, [1, 2, 3])["status"] == "pending"
assert c.blindspot_ratio(5, 0, [1, 2, 3])["status"] == "unavailable"
assert c.calendar_cell(0, 0, "v", "s")["status"] == "not_observable"
assert c.calendar_cell(0, None, "v", "s")["value"] is None
lo, hi = c.block_bootstrap_ratio([25, 52, 9, 100, 61, 40, 33, 70], [10, 20, 3, 40, 22, 15, 12, 28], alpha=0.05)
assert lo < 2.6 < hi
print("chronos_core v2 tests passed")
