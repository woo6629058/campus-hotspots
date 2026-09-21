const charts = {};
const panelButtons = document.querySelectorAll("[data-panel]");
const panels = document.querySelectorAll(".chart-panel");
const regionButtons = document.querySelectorAll("[data-region]");
const statusMessage = document.querySelector("#data-status");
let allRows = [];

function showPanel(id) {
  for (const panel of panels) panel.hidden = panel.id !== id;
  for (const button of panelButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.panel === id));
  }
  requestAnimationFrame(function () {
    if (charts[id]) charts[id].resize();
  });
}

for (const button of panelButtons) {
  button.addEventListener("click", function () {
    showPanel(button.dataset.panel);
  });
}

function closingMinutes(value) {
  const match = String(value || "").trim().match(/^([01]?\d|2[0-4]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeDistrictName(value, region) {
  let name = String(value || "").replace(/\s+/g, " ").trim();
  if (region === "서울특별시") name = name.replace(/^서울특별시\s+/, "");
  if (region === "인천광역시" && name === "깅화군") name = "강화군";
  return name;
}

function prepareDistrictData(rows, region) {
  const districts = new Map();
  let skippedRows = 0;
  let missingHours = 0;
  const regionRows = rows.filter(function (row) {
    return String(row["시도명"] || "").trim() === region;
  });

  for (const row of regionRows) {
    const district = normalizeDistrictName(row["시군구명"], region);
    const libraryName = String(row["도서관명"] || "").trim();
    if (!district || !libraryName) {
      skippedRows += 1;
      continue;
    }
    if (!districts.has(district)) {
      districts.set(district, { count: 0, validHours: 0, lateHours: 0 });
    }
    const item = districts.get(district);
    item.count += 1;
    const closingTime = closingMinutes(row["평일운영종료시각"]);
    if (closingTime === null) {
      missingHours += 1;
      continue;
    }
    item.validHours += 1;
    if (closingTime >= 21 * 60) item.lateHours += 1;
  }

  const result = Array.from(districts, function ([name, values]) {
    return {
      name,
      count: values.count,
      validHours: values.validHours,
      lateHours: values.lateHours,
      lateRate: values.validHours ? Math.round((values.lateHours / values.validHours) * 1000) / 10 : null
    };
  });
  return { result, regionRows, skippedRows, missingHours };
}

function setChartHeight(itemCount) {
  const height = Math.max(520, itemCount * 31 + 150);
  for (const box of document.querySelectorAll(".chart-box")) box.style.height = `${height}px`;
}

function drawCharts(region) {
  const prepared = prepareDistrictData(allRows, region);
  const result = prepared.result;
  if (!result.length) throw new Error(`${region}에서 분석할 수 있는 시군구 데이터가 없습니다.`);

  const byCount = [...result].sort(function (a, b) {
    return b.count - a.count || a.name.localeCompare(b.name, "ko");
  });
  const byLateRate = result.filter(function (item) {
    return item.lateRate !== null;
  }).sort(function (a, b) {
    return b.lateRate - a.lateRate || b.lateHours - a.lateHours || a.name.localeCompare(b.name, "ko");
  });

  for (const chart of Object.values(charts)) chart.destroy();
  setChartHeight(result.length);

  charts["library-count"] = new Chart(document.querySelector("#library-count-chart"), {
    type: "bar",
    data: {
      labels: byCount.map(function (item) { return item.name; }),
      datasets: [{
        label: "공공도서관 수(개관)",
        data: byCount.map(function (item) { return item.count; }),
        backgroundColor: "#457b9d",
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "도서관 수(개관)" }, ticks: { precision: 0 } },
        y: { ticks: { autoSkip: false } }
      },
      plugins: { legend: { display: true } }
    }
  });

  charts["late-hours"] = new Chart(document.querySelector("#late-hours-chart"), {
    type: "bar",
    data: {
      labels: byLateRate.map(function (item) { return item.name; }),
      datasets: [{
        label: "평일 21시 이후 운영 비율(%)",
        data: byLateRate.map(function (item) { return item.lateRate; }),
        backgroundColor: "#a96845",
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: true, text: "평일 야간 운영 비율(%)" } },
        y: { ticks: { autoSkip: false } }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            afterLabel: function (context) {
              const item = byLateRate[context.dataIndex];
              return `${item.lateHours}/${item.validHours}개관`;
            }
          }
        }
      }
    }
  });

  const most = byCount[0];
  const fewest = byCount[byCount.length - 1];
  const mostNames = byCount.filter(function (item) { return item.count === most.count; }).map(function (item) { return item.name; }).join("·");
  const fewestNames = byCount.filter(function (item) { return item.count === fewest.count; }).map(function (item) { return item.name; }).join("·");
  document.querySelector("#count-finding").innerHTML = `<strong>해석:</strong> ${region}에서 가장 많은 수는 ${most.count}개관이며 해당 지역은 ${mostNames}입니다. 가장 적은 수는 ${fewest.count}개관이며 해당 지역은 ${fewestNames}입니다. 단순 개수 차이는 인구와 면적을 함께 보지 않으면 접근성 차이로 해석할 수 없습니다.`;

  const validHoursTotal = byLateRate.reduce(function (sum, item) { return sum + item.validHours; }, 0);
  const lateHoursTotal = byLateRate.reduce(function (sum, item) { return sum + item.lateHours; }, 0);
  if (byLateRate.length) {
    const highestRate = byLateRate[0];
    const highestRateNames = byLateRate.filter(function (item) { return item.lateRate === highestRate.lateRate; }).map(function (item) { return item.name; }).join("·");
    document.querySelector("#late-finding").innerHTML = `<strong>해석:</strong> ${region}에서 가장 높은 비율은 ${highestRateNames}의 ${highestRate.lateRate}%입니다. 전체로는 유효한 평일 종료 시각 ${validHoursTotal}개 중 ${lateHoursTotal}개가 21시 이후 운영 기준에 해당합니다.`;
  } else {
    document.querySelector("#late-finding").innerHTML = `<strong>해석:</strong> ${region}에는 해석 가능한 평일 종료 시각이 없어 비율을 계산하지 못했습니다.`;
  }

  for (const name of document.querySelectorAll(".selected-region-name")) name.textContent = region;
  document.querySelector("#library-count-chart").setAttribute("aria-label", `${region} 시군구별 공공도서관 수 막대그래프`);
  document.querySelector("#late-hours-chart").setAttribute("aria-label", `${region} 시군구별 평일 야간 운영 도서관 비율 막대그래프`);

  const notices = [];
  if (prepared.missingHours) notices.push(`평일 종료 시각을 해석하지 못한 ${prepared.missingHours}개 행은 두 번째 그래프에서 제외`);
  if (prepared.skippedRows) notices.push(`필수 이름이 없는 ${prepared.skippedRows}개 행은 전체 분석에서 제외`);
  statusMessage.classList.remove("error");
  statusMessage.textContent = `${region} 공공도서관 ${prepared.regionRows.length}개 행을 읽어 시군구 ${result.length}곳을 분석했습니다.${notices.length ? ` (${notices.join(", ")})` : ""}`;
}

function selectRegion(region) {
  for (const button of regionButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.region === region));
  }
  drawCharts(region);
  const activePanel = document.querySelector("[data-panel][aria-pressed='true']");
  showPanel(activePanel ? activePanel.dataset.panel : "library-count");
}

for (const button of regionButtons) {
  button.addEventListener("click", function () {
    try {
      selectRegion(button.dataset.region);
    } catch (error) {
      showDataError(error.message);
    }
  });
}

function showDataError(message) {
  statusMessage.classList.add("error");
  statusMessage.textContent = `데이터를 표시하지 못했습니다: ${message} CSV 경로와 열 이름을 확인해 주세요.`;
}

if (typeof Papa === "undefined" || typeof Chart === "undefined") {
  showDataError("그래프 라이브러리를 불러오지 못했습니다.");
} else {
  Papa.parse("data/metropolitan-public-libraries.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.errors.length) {
        showDataError(`CSV 해석 중 오류가 ${results.errors.length}개 발견되었습니다.`);
        return;
      }
      const fields = results.meta.fields || [];
      const requiredFields = ["도서관명", "시도명", "시군구명", "도서관유형", "평일운영종료시각"];
      const missingFields = requiredFields.filter(function (field) { return !fields.includes(field); });
      if (missingFields.length) {
        showDataError(`필수 열(${missingFields.join(", ")})이 없습니다.`);
        return;
      }
      allRows = results.data.filter(function (row) {
        return String(row["도서관유형"] || "").trim() === "공공도서관";
      });
      try {
        selectRegion("서울특별시");
        showPanel("library-count");
      } catch (error) {
        showDataError(error.message);
      }
    },
    error: function () {
      showDataError("CSV 파일 요청에 실패했습니다.");
    }
  });
}
