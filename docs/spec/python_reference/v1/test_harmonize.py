import math
import pandas as pd
from harmonize import (normalise_firms, cell_id, to_cell_days, monthly_counts, overlap_ratio,
                       shrink_ratio, harmonise_modis, seam_ratio, robust_z, mann_kendall,
                       sen_slope, persistence, l_context)

modis = pd.DataFrame({"latitude": [30.71, 30.72], "longitude": [75.81, 75.83], "acq_date": ["2015-11-01", "2015-11-01"],
                      "frp": [12.0, 30.0], "brightness": [320.1, 330.0], "bright_t31": [295.0, 296.0], "confidence": [80, 45]})
viirs = pd.DataFrame({"latitude": [30.71, 30.75, 31.2], "longitude": [75.81, 75.84, 75.1], "acq_date": ["2015-11-01"] * 3,
                      "frp": [3.0, 5.0, 2.0], "bright_ti4": [340.0, 350.0, 330.0], "bright_ti5": [292.0, 293.0, 291.0], "confidence": ["n", "h", "l"]})
m = normalise_firms(modis, "MODIS")
v = normalise_firms(viirs, "VIIRS")
assert abs(m["confidence"].iloc[0] - 0.8) < 1e-9
assert v["confidence"].tolist() == [0.6, 0.9, 0.25]
assert m["brightness_hi"].iloc[1] == 330.0
assert cell_id(30.71, 75.81, 0.1) == cell_id(30.72, 75.83, 0.1)
assert cell_id(30.71, 75.81, 0.1) != cell_id(31.2, 75.1, 0.1)
both = pd.concat([m, v])
cd = to_cell_days(both, 0.1)
assert len(cd[cd["sensor"] == "MODIS"]) == 1
assert len(cd[cd["sensor"] == "VIIRS"]) == 2
mc = monthly_counts(cd)
assert mc["cell_days"].sum() == 3
assert overlap_ratio([10, 20, 0, 40], [25, 52, 9, 100]) == 2.5
assert overlap_ratio([0, 0], [1, 2]) is None
assert abs(shrink_ratio(3.0, 4, 2.0, 4) - 2.5) < 1e-9
assert shrink_ratio(None, 0, 2.2, 4) == 2.2
assert harmonise_modis(100, 2.5) == 250
assert abs(seam_ratio(100, 260, 104.68) - 0.02925) < 1e-4
hist = [20, 22, 19, 21, 20, 23, 18, 20, 21, 22]
z = robust_z(hist, 50)
assert z is not None and z > 3
assert robust_z(hist[:5], 50) is None
s, zmk, p = mann_kendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert s == 45 and p < 0.001
s2, z2, p2 = mann_kendall([5, 3, 6, 2, 5, 4, 5, 3])
assert p2 > 0.05
assert sen_slope([1, 3, 5, 7]) == 2.0
assert persistence(300, 365) > 0.8
assert l_context(5, 3) > 0 and abs(l_context(5, 3) - math.log(1.5)) < 1e-12
print("z for 50 MW:", round(z, 2), "| MK z:", round(zmk, 3), "p:", p)
print("all tests passed")
