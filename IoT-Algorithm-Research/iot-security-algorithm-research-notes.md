# IoT Security Algorithm Research Notes

Date: 2026-05-18

## Goal

Find Python-based open source projects that can provide an algorithm research foundation for IoT, security, anomaly detection, and early-warning scenarios.

## Installed Skills

Installed globally:

- `gh-search-repos`
  - Purpose: search GitHub repositories with filters such as language, stars, topics, license, forks, and archived status.
  - Source: https://skills.sh/aaddrick/gh-cli-search/gh-search-repos

- `github-deep-research`
  - Purpose: perform deeper structured analysis of GitHub repositories after candidates are found.
  - Source: https://skills.sh/bytedance/deer-flow/github-deep-research

Note: Restart Codex to pick up newly installed skills automatically.

## Main Conclusion

If the focus is algorithm research rather than engineering deployment, Python is the right primary language.

Typical workflow:

```text
Python + Jupyter/scripts
-> data cleaning and feature engineering: pandas / numpy / scikit-learn
-> anomaly detection: PyOD
-> time-series forecasting and warning: Darts
-> online learning and streaming detection: River
-> deep time-series / paper reproduction: PyTorch + Time-Series-Library / PyPOTS
```

## Recommended Project Stack

### Dependency Strategy Update

After checking the current GitHub/PyPI status of the main candidate libraries, the recommended dependency strategy is:

- **MVP required dependency**: PyOD only.
- **Project Python baseline**: Python 3.11+.
- **Optional staged extensions**:
  - `stream`: River, for online learning, streaming detection, and concept drift.
  - `timeseries`: Darts, for forecasting, residual-based warning, and time-series anomaly scoring.
  - `missing`: PyPOTS, for partially observed, missing-value-heavy, irregular multivariate time series.

Do not make River, Darts, and PyPOTS mandatory in the first version. They should be introduced only when the experiment problem requires them. This keeps the MVP environment small while preserving a clean path toward streaming, forecasting, and real IoT data readiness.

### 1. Main algorithm research base: PyOD

Repository: https://github.com/yzhao062/pyod

Current check:

- Latest checked version: `3.5.1`
- Python requirement: `>=3.9`
- License: BSD-2-Clause

Why:

- Comprehensive anomaly detection library.
- Supports 60+ detectors across tabular, time series, graph, text, and image data.
- Simple `fit` / `predict` style API.
- Good for quickly comparing algorithms.
- Active project with strong community and benchmark ecosystem.
- Useful for IoT security anomaly detection and early-warning prototypes.

### 2. Streaming / online warning: River

Repository: https://github.com/online-ml/river

Current check:

- Latest checked version: `0.24.2`
- Python requirement: `>=3.11`
- License: BSD-3-Clause

Why:

- Online machine learning in Python.
- Suitable for streaming IoT data.
- Supports anomaly detection, drift detection, online metrics, and progressive validation.
- Good fit for real-time warning research.

MVP decision:

- Keep River out of the required MVP dependencies.
- Introduce it after the batch baseline proves useful and the project has streaming data or concept drift requirements.

### 3. Time-series forecasting and early warning: Darts

Repository: https://github.com/unit8co/darts

Current check:

- Latest checked version: `0.44.1`
- Python requirement: `>=3.10`
- License: Apache-2.0
- Install package name: `darts`
- Avoid deprecated compatibility package: `u8darts`

Why:

- User-friendly time-series forecasting and anomaly detection.
- Supports classic and deep learning models.
- Can build warning systems based on forecast residuals.
- Can wrap PyOD models for time-series anomaly scoring.

MVP decision:

- Keep Darts as a Phase 2 extension for forecasting residual warning and time-indexed alert experiments.

### 4. Missing-value and industrial time-series research: PyPOTS

Repository: https://github.com/WenjieDu/PyPOTS

Current check:

- Latest checked version: `1.5`
- Python requirement: `>=3.8`
- License: BSD-3-Clause

Why:

- Designed for partially observed time series.
- Useful because IoT sensors often have missing values, packet loss, or irregular sampling.
- Supports imputation, forecasting, classification, clustering, and anomaly detection.
- Contains many recent deep time-series models.

MVP decision:

- Keep PyPOTS as a later-stage real-data-readiness dependency.
- Prioritize it when the project receives missing-value-heavy, irregular, multivariate IoT sensor data.

### 5. Paper reproduction / deep time-series experiment platform: Time-Series-Library

Repository: https://github.com/thuml/Time-Series-Library

Why:

- Research-oriented deep time-series model library.
- Covers forecasting, imputation, anomaly detection, and classification.
- Includes TimesNet, iTransformer, PatchTST, TimeMixer, DLinear, Autoformer, Informer, and others.
- Good for paper-style algorithm experiments.

Note:

- Maintainers state that they may not actively add many new features due to bandwidth.
- Still useful as an experiment/reproduction codebase.

### 6. Network intrusion detection reference: Kitsune-py

Repository: https://github.com/ymirsky/Kitsune-py

Why:

- Online network intrusion detection system.
- Based on incremental statistics and an ensemble of autoencoders.
- Useful as a security-specific reference implementation.

Note:

- Better as a reference or baseline, not as the main research framework.

## Data Comes First, But Public Data Is Enough To Start

For algorithm research, it is best to have data first. But the first stage does not require private/real production data.

Recommended path:

```text
public dataset
-> run algorithm pipeline
-> replace with real IoT/security data
-> optimize warning thresholds, streaming detection, drift handling, and false-positive control
```

## Recommended Dataset Categories

### IoT network security

- BoT-IoT
- TON_IoT
- IoT-23
- CICIoT2023

Best first choices for IoT security warning research:

- TON_IoT
- BoT-IoT
- CICIoT2023

### Industrial sensor anomaly detection

- SWaT
- WADI
- SMD
- PSM
- MSL / SMAP

### General network intrusion detection

- UNSW-NB15
- CICIDS2017
- NSL-KDD

## Suggested Next Project Direction

Create a new Python project that starts with:

1. Dataset adapter
2. Feature preprocessing
3. Baseline anomaly detection with PyOD
4. Time-series forecasting warning with Darts
5. Streaming experiment with River
6. Evaluation metrics and visual reports

Suggested project structure:

```text
iot-security-algorithm-lab/
  data/
    raw/
    processed/
  notebooks/
  src/
    datasets/
    features/
    models/
    experiments/
    evaluation/
    visualization/
  configs/
  results/
  README.md
```

## Practical First Experiment

Start with one public dataset, then implement:

1. Load dataset into pandas.
2. Normalize numeric features.
3. Train several PyOD models:
   - Isolation Forest
   - LOF
   - ECOD
   - COPOD
   - AutoEncoder, if deep learning is needed
4. Compare anomaly scores and labels.
5. Choose a threshold strategy.
6. Plot alerts over time.
7. Replace batch detection with River if streaming behavior is required.
