from app.firms import local_solar_hour, parse_rows, platform_of

SAMPLE = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n30.91,75.85,330.1,0.4,0.4,2026-10-26,0806,N20,VIIRS,n,2.0NRT,290.2,5.4,D\nbad,row,,,,,,,,,,,,\n"


def test_local_solar_hour():
    assert abs(local_solar_hour("0806", 75.85) - 13.157) < 0.01


def test_parse_rows_keeps_native_confidence():
    rows = parse_rows(SAMPLE, "VIIRS_NOAA20_NRT", 1)
    assert len(rows) == 1
    assert rows[0]["conf"] == "n"
    assert rows[0]["platform"] == "noaa20"
    assert rows[0]["cls"] == "UNKNOWN"


def test_platform_modis():
    assert platform_of("MODIS_NRT", "Aqua") == "aqua"
    assert platform_of("MODIS_NRT", "T") == "terra"
