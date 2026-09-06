import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeOutput } from "../dist/tools/runAndSummarize.js";

test("forecasting output preserves pipeline facts and model metrics", () => {
  const rows = Array.from({ length: 210 }, (_, index) => `store_${index % 3} 2024-06-${String((index % 28) + 1).padStart(2, "0")} 120.00 118.00 121.00`);
  const raw = [
    "Loaded 540 observations across 3 series",
    "Models: AutoARIMA(season_length=7), Naive",
    "Running rolling-origin cross-validation: horizon=14, windows=4, step_size=14",
    "Cross-validation rows: 168",
    "AutoARIMA: MAE=3.417, RMSE=4.390",
    "Naive: MAE=10.390, RMSE=12.668",
    "Best model: AutoARIMA",
    "FULL FORECAST OUTPUT",
    ...rows,
    "Forecast rows: 42",
    "PIPELINE_STATUS=SUCCESS",
  ].join("\n");
  const result = summarizeOutput("python forecasting_pipeline.py", raw);

  assert.equal(result.wasSummarized, true);
  assert.match(result.text, /540 observations/);
  assert.match(result.text, /horizon=14/);
  assert.match(result.text, /AutoARIMA: MAE=3\.417, RMSE=4\.390/);
  assert.match(result.text, /Naive: MAE=10\.390, RMSE=12\.668/);
  assert.match(result.text, /Best model: AutoARIMA/);
  assert.match(result.text, /Forecast rows: 42/);
  assert.match(result.text, /PIPELINE_STATUS=SUCCESS/);
  assert.ok(result.text.length < raw.length / 3);
});
