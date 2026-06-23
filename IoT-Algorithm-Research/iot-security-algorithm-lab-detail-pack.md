---
title: "Detail Pack: IoT Security Algorithm Lab"
type: llm-distillate
source:
  - "IoT-Algorithm-Research/iot-security-algorithm-lab-brief.md"
  - "IoT-Algorithm-Research/iot-security-algorithm-research-notes.md"
created: "2026-05-18"
purpose: "Token-efficient context for downstream PRD and architecture creation"
---

# IoT Security Algorithm Lab Detail Pack

## Core Direction

- New project should be treated as an algorithm research lab, not a production monitoring platform.
- Primary language should be Python because the current goal is data science experimentation, algorithm comparison, and reproducible research.
- First milestone should prove an end-to-end anomaly detection workflow on a public IoT/security dataset before considering real-time systems or UI.
- Project should remain independent from PPA at MVP stage; integration can be considered after algorithm value is demonstrated.

## Source Material

- Existing source note: `IoT-Algorithm-Research/iot-security-algorithm-research-notes.md`.
- The note already concludes that Python + Jupyter/scripts is the right research path.
- The note recommends PyOD as the main baseline framework, with River, Darts, PyPOTS, Time-Series-Library, and Kitsune-py as later extensions or references.

## MVP Scope Signals

- In scope: dataset adapter, preprocessing, PyOD baseline models, threshold comparison, evaluation metrics, visual report.
- In scope: standard project layout with `data/`, `notebooks/`, `src/`, `configs/`, `results/`, and `README.md`.
- Out of scope: production streaming platform, Web UI, device integration, alert notification, authentication, PPA integration, large deep-learning experiments.
- First deliverable should be reproducible experiment artifacts, not polished product screens.

## Dataset Decision

- Recommended first dataset: TON_IoT.
- Backup first dataset: BoT-IoT.
- Later expansion datasets: CICIoT2023, IoT-23, SWaT, WADI, SMD, PSM, MSL, SMAP, UNSW-NB15, CICIDS2017, NSL-KDD.
- PRD should force a single first dataset decision to avoid broad-but-shallow work.
- If speed matters most, BoT-IoT may be easier for baseline anomaly detection.
- If IoT/IIoT scenario fit matters most, TON_IoT should be preferred.

## Candidate Libraries

- Python baseline: use Python 3.11+ so later River-based streaming work is not blocked by runtime compatibility.
- Dependency strategy: make PyOD the only required MVP anomaly detection dependency; keep River, Darts, and PyPOTS as optional staged extensions.
- PyOD: main anomaly detection research base; current checked version `3.5.1`; Python `>=3.9`; BSD-2-Clause; unified API; suitable for comparing Isolation Forest, LOF, ECOD, COPOD, AutoEncoder.
- River: online learning and streaming anomaly detection; current checked version `0.24.2`; Python `>=3.11`; BSD-3-Clause; best reserved for Phase 3 unless MVP explicitly requires streaming.
- Darts: time-series forecasting and warning based on residuals; current checked version `0.44.1`; Python `>=3.10`; Apache-2.0; install package is `darts`, not deprecated `u8darts`; useful once time-indexed warning is needed.
- PyPOTS: missing-value and partially observed time-series research; current checked version `1.5`; Python `>=3.8`; BSD-3-Clause; useful for real IoT sensor data readiness.
- Time-Series-Library: deep time-series model reproduction; useful for advanced research after baselines.
- Kitsune-py: security-specific online intrusion detection reference; useful as baseline/reference, not main framework.

## Evaluation Requirements

- Required model metrics: Precision, Recall, F1, ROC-AUC, PR-AUC.
- Required operational metrics: false-positive rate, false-negative rate, confusion matrix.
- Recommended research outputs: anomaly score distribution, alert timeline, model comparison table.
- Threshold strategies to compare: contamination-based threshold, percentile threshold, validation-set optimized threshold.
- Avoid judging success by accuracy alone because anomaly datasets are usually imbalanced.
- PR-AUC and false-positive behavior should be emphasized because warning systems fail operationally when alerts are too noisy.

## Suggested Project Structure

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

## Phase Plan

- Phase 0: create brief, PRD, and architecture for the research lab.
- Phase 1: implement batch anomaly detection baseline with PyOD on one public dataset.
- Phase 2: add Darts only if forecasting residuals, time-indexed warning, or alert timeline experiments become necessary.
- Phase 3: add River only when online detection, streaming input, or concept drift becomes a real requirement.
- Phase 4: add PyPOTS when real IoT data shows missing values, irregular sampling, or partially observed multivariate time-series behavior.
- Phase 5: define real-data readiness contract for future private IoT/security data.

## Open Questions For PRD

- Which dataset should be the mandatory MVP dataset: TON_IoT or BoT-IoT?
- Should dataset download be automated, manual, or documented-only for MVP?
- Should MVP be notebook-first, CLI-first, or both?
- What exact command should reproduce the first experiment?
- What output report format is required: Markdown, HTML, CSV metrics, PNG plots, or all of these?
- Is the first version expected to include time-indexed alert visualization?
- Does the project need Chinese documentation, English documentation, or both?
- Should dependency management use `uv`, `poetry`, `pip-tools`, or plain `requirements.txt`?
- Should optional dependencies be exposed as install extras such as `.[stream]`, `.[timeseries]`, and `.[missing]`?

## Risks To Preserve

- Public datasets may not represent real business traffic or industrial sensor distributions.
- Dataset preprocessing can dominate effort and delay algorithm comparison.
- High ROC-AUC can hide poor alert usefulness under class imbalance.
- Deep learning models may add complexity before baseline value is proven.
- Without real scenario definitions, warning lead time and operational value are hard to measure.

## Recommended Next Workflow

- Next BMad role: `bmad-create-prd` to convert this brief into implementable requirements.
- After PRD: `bmad-create-architecture` or Winston / Architect for Python project structure and experiment pipeline design.
- After architecture: Amelia / Developer or `bmad-quick-dev` for initial project scaffold and first baseline experiment.
