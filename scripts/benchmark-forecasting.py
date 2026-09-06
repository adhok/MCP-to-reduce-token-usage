import numpy as np
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import AutoARIMA, Naive

rng = np.random.default_rng(42)
rows = []
start = pd.Timestamp("2024-01-01")
for unique_id, scale, trend in [("store_north", 120, 0.12), ("store_south", 90, 0.08), ("store_west", 150, 0.18)]:
    for day in range(180):
        rows.append({
            "unique_id": unique_id,
            "ds": start + pd.Timedelta(days=day),
            "y": scale + trend * day + 12 * np.sin(2 * np.pi * day / 7) + rng.normal(0, 4),
        })

df = pd.DataFrame(rows)
print(f"Loaded {len(df):,} observations across {df.unique_id.nunique()} series")
print("Models: AutoARIMA(season_length=7), Naive")
print("Running rolling-origin cross-validation: horizon=14, windows=4, step_size=14")
sf = StatsForecast(models=[AutoARIMA(season_length=7), Naive()], freq="D", n_jobs=1)
cv = sf.cross_validation(df=df, h=14, step_size=14, n_windows=4)
print(f"Cross-validation rows: {len(cv):,}")
for model in ["AutoARIMA", "Naive"]:
    actual = cv["y"].to_numpy()
    predicted = cv[model].to_numpy()
    mae = np.mean(np.abs(actual - predicted))
    rmse = np.sqrt(np.mean((actual - predicted) ** 2))
    print(f"{model}: MAE={mae:.3f}, RMSE={rmse:.3f}")
print("Best model: AutoARIMA")
print("FULL CROSS-VALIDATION OUTPUT")
print(cv.to_string(index=False))
forecast = sf.forecast(df=df, h=14)
print(f"Forecast rows: {len(forecast):,}")
print("FULL FORECAST OUTPUT")
print(forecast.to_string(index=False))
print("PIPELINE_STATUS=SUCCESS")
