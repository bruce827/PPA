(function () {
  function formatThresholds(thresholds, unit) {
    if (!Array.isArray(thresholds) || !thresholds.length) return "";
    return thresholds
      .map(function (item, idx) {
        if (typeof item.max === "number") return "`<=" + item.max + " " + unit + "` " + item.label;
        if (idx === thresholds.length - 1) return "`>" + thresholds[idx - 1].max + " " + unit + "` " + item.label;
        return String(item.label || "");
      })
      .join("；");
  }

  function findStrategy(count, thresholds) {
    if (!Array.isArray(thresholds) || !thresholds.length) return "-";
    for (var i = 0; i < thresholds.length; i += 1) {
      var item = thresholds[i];
      if (typeof item.max === "number" && count <= item.max) return item.label;
    }
    return thresholds[thresholds.length - 1].label || "-";
  }

  function create(config) {
    var cfg = config || {};
    var infoContainerId = cfg.infoContainerId || "baseInfo";
    var stateBoxId = cfg.stateBoxId || "stateBox";
    var policyClass = cfg.policyClass || "policy";
    var boundaryClass = cfg.boundaryClass || "boundary";
    var stateBaseClass = cfg.stateBaseClass || "state-box";
    var scaleHintId = cfg.scaleHintId || "scaleHint";
    var unit = cfg.unit || "行";
    var amountLabel = cfg.amountLabel || "当前数据量";
    var thresholds = Array.isArray(cfg.thresholds) ? cfg.thresholds : [];
    var boundaryText = cfg.boundaryText || "";

    var infoHost = document.getElementById(infoContainerId);
    var stateBox = document.getElementById(stateBoxId);

    function renderInfoBlocks() {
      if (!infoHost) return;
      var thresholdText = formatThresholds(thresholds, unit);
      infoHost.innerHTML =
        '<div class="' + policyClass + '">' +
        "规模阈值策略：" + thresholdText + "。<br />" +
        '<span id="' + scaleHintId + '">' + amountLabel + " 0 " + unit + "，建议策略：-</span>" +
        "</div>" +
        '<div class="' + boundaryClass + '">' +
        "图表-表格分工边界：" + boundaryText +
        "</div>";
    }

    function setState(type, message) {
      if (!stateBox) return;
      stateBox.className = stateBaseClass;
      if (!type || type === "ready") {
        stateBox.classList.add("hidden");
        stateBox.textContent = "";
        return;
      }
      stateBox.classList.add("state-" + type);
      stateBox.textContent = String(message || "");
    }

    function updateScaleHint(count) {
      var hintEl = document.getElementById(scaleHintId);
      var strategy = findStrategy(count, thresholds);
      if (hintEl) {
        hintEl.textContent = amountLabel + " " + count + " " + unit + "，建议策略：" + strategy;
      }
      return strategy;
    }

    renderInfoBlocks();

    return {
      setState: setState,
      updateScaleHint: updateScaleHint
    };
  }

  window.TableDemoBase = {
    create: create
  };
})();
