const SERVICE_TYPES = [
  "Chinesischer Haus-zu-Haus",
  "Deutscher Haus-zu-Haus",
  "Trolley",
  "ÖZB",
  "Hafendienst",
  "Fernfahrer",
  "Informell",
  "Studien",
  "Sonstige",
];

const TILE_TOP = {
  "Chinesischer Haus-zu-Haus": "你好",
  "Deutscher Haus-zu-Haus": "Hallo",
  "Trolley": "JW.ORG",
  "ÖZB": "🏙️",
  "Hafendienst": "🚢",
  "Fernfahrer": "🚚",
  "Informell": "💬",
  "Studien": "📖",
  "Sonstige": "⋯",
};

const TILE_BOTTOM = {
  "Chinesischer Haus-zu-Haus": "Chin. H2H",
  "Deutscher Haus-zu-Haus": "Deu. H2H",
  "Trolley": "Trolley",
  "ÖZB": "ÖZB",
  "Hafendienst": "Hafen",
  "Fernfahrer": "Fernfahrer",
  "Informell": "Informell",
  "Studien": "Studien",
  "Sonstige": "Sonstige",
};

const STORAGE_KEY = "predigtdienst_data_v1";

function defaultData() {
  return {
    entries: [],      // {date:"YYYY-MM-01", service_type:"...", hours: 1.25}
    ldc_entries: [],  // {date:"YYYY-MM-01", hours: 0.25}
    selected_service: SERVICE_TYPES[0],
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const obj = JSON.parse(raw);
    // minimal fallback
    return {
      entries: Array.isArray(obj.entries) ? obj.entries : [],
      ldc_entries: Array.isArray(obj.ldc_entries) ? obj.ldc_entries : [],
      selected_service: obj.selected_service || SERVICE_TYPES[0],
    };
  } catch {
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data, null, 2));
  setStatus("💾 Gespeichert.");
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function getEntryDate() {
  const y = parseInt(document.getElementById("year").value, 10);
  const m = parseInt(document.getElementById("month").value, 10);
  if (!Number.isFinite(y)) throw new Error("Jahr ungültig");
  if (!(m >= 1 && m <= 12)) throw new Error("Monat muss 1-12 sein");
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

function hmToHours(h, m) {
  return h + (m / 60);
}

function hoursByServiceAllTime() {
  const res = Object.fromEntries(SERVICE_TYPES.map(s => [s, 0]));
  for (const e of state.data.entries) {
    if (res[e.service_type] != null) res[e.service_type] += Number(e.hours || 0);
  }
  return res;
}

function totalHoursAllTime() {
  return state.data.entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
}

function ldcTotalAllTime() {
  return state.data.ldc_entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
}

// Dienstjahr: Sep (start_year) bis Aug (start_year+1)
function isInServiceYear(dateStr, startYear) {
  const [yy, mm] = dateStr.split("-").map(n => parseInt(n, 10));
  if (!yy || !mm) return false;
  // Sep-Dec im Startjahr
  if (yy === startYear && mm >= 9) return true;
  // Jan-Aug im Folgejahr
  if (yy === startYear + 1 && mm <= 8) return true;
  return false;
}

function serviceYearSummary(startYear) {
  const res = Object.fromEntries(SERVICE_TYPES.map(s => [s, 0]));
  for (const e of state.data.entries) {
    if (!e.date) continue;
    if (!isInServiceYear(e.date, startYear)) continue;
    if (res[e.service_type] != null) res[e.service_type] += Number(e.hours || 0);
  }
  return res;
}

function serviceYearLdcTotal(startYear) {
  let t = 0;
  for (const e of state.data.ldc_entries) {
    if (!e.date) continue;
    if (!isInServiceYear(e.date, startYear)) continue;
    t += Number(e.hours || 0);
  }
  return t;
}

// ---------- UI State ----------
const state = {
  data: loadData(),
  gH: 0,
  gM: 0,
  lH: 0,
  lM: 0,
};

function renderTiles() {
  const tiles = document.getElementById("tiles");
  tiles.innerHTML = "";

  const selected = state.data.selected_service;
  for (const service of SERVICE_TYPES) {
    const tile = document.createElement("div");
    tile.className = "tile" + (service === selected ? " selected" : "");

    const top = document.createElement("div");
    top.className = "top";
    top.textContent = TILE_TOP[service] ?? service;

    const bottom = document.createElement("div");
    bottom.className = "bottom";
    bottom.textContent = TILE_BOTTOM[service] ?? service;

    tile.appendChild(top);
    tile.appendChild(bottom);

    tile.addEventListener("click", () => {
      state.data.selected_service = service;
      document.getElementById("selectedLabel").textContent = TILE_BOTTOM[service] ?? service;
      renderTiles();
    });

    tiles.appendChild(tile);
  }

  document.getElementById("selectedLabel").textContent =
    TILE_BOTTOM[selected] ?? selected;
}

function refreshTimeLabels() {
  document.getElementById("generalTime").textContent = `${state.gH} h ${state.gM} m`;
  document.getElementById("ldcTime").textContent = `${state.lH} h ${state.lM} m`;
}

function add15(which) {
  if (which === "g") {
    let m = state.gM + 15;
    let h = state.gH;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    state.gH = h; state.gM = m;
  } else {
    let m = state.lM + 15;
    let h = state.lH;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    state.lH = h; state.lM = m;
  }
  refreshTimeLabels();
}

function reset(which) {
  if (which === "g") { state.gH = 0; state.gM = 0; }
  else { state.lH = 0; state.lM = 0; }
  refreshTimeLabels();
}

function saveGeneral() {
  const date = getEntryDate();
  const m = state.gM;
  if (![0, 15, 30, 45].includes(m)) throw new Error("Minuten müssen 0/15/30/45 sein");
  const hours = hmToHours(state.gH, state.gM);
  if (hours <= 0) return;

  state.data.entries.push({
    date,
    service_type: state.data.selected_service,
    hours: Number(hours.toFixed(2)),
  });
  reset("g");
  saveData();
  setStatus("✅ Allgemein gespeichert.");
}

function saveLdc() {
  const date = getEntryDate();
  const m = state.lM;
  if (![0, 15, 30, 45].includes(m)) throw new Error("Minuten müssen 0/15/30/45 sein");
  const hours = hmToHours(state.lH, state.lM);
  if (hours <= 0) return;

  state.data.ldc_entries.push({
    date,
    hours: Number(hours.toFixed(2)),
  });
  reset("l");
  saveData();
  setStatus("✅ LDC gespeichert.");
}

function showOverview() {
  const y = parseInt(document.getElementById("year").value, 10);
  const m = parseInt(document.getElementById("month").value, 10);
  const startYear = (m >= 9) ? y : (y - 1);

  const perService = hoursByServiceAllTime();
  const generalAll = totalHoursAllTime();
  const ldcAll = ldcTotalAllTime();

  const sy = serviceYearSummary(startYear);
  const syGeneral = Object.values(sy).reduce((a,b)=>a+b,0);
  const syLdc = serviceYearLdcTotal(startYear);

  const lines = [];
  lines.push("Übersicht (alle Zeit)");
  lines.push(`- Allgemein: ${generalAll.toFixed(2)} h`);
  lines.push(`- LDC: ${ldcAll.toFixed(2)} h`);
  lines.push(`- Gesamt: ${(generalAll + ldcAll).toFixed(2)} h`);
  lines.push("");
  lines.push(`Dienstjahr ${startYear}/${startYear + 1} (Sep–Aug)`);
  lines.push(`- Allgemein: ${syGeneral.toFixed(2)} h`);
  lines.push(`- LDC: ${syLdc.toFixed(2)} h`);
  lines.push(`- Gesamt: ${(syGeneral + syLdc).toFixed(2)} h`);
  lines.push("");
  lines.push("Summe pro Dienstart (alle Zeit):");
  for (const s of SERVICE_TYPES) {
    lines.push(`- ${TILE_BOTTOM[s] ?? s}: ${perService[s].toFixed(2)} h`);
  }

  document.getElementById("overviewText").textContent = lines.join("\n");
  document.getElementById("overviewDialog").showModal();
}

// Export / Import JSON
function exportJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "predigtdienst_data.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("⬇️ Export erstellt.");
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      state.data = {
        entries: Array.isArray(obj.entries) ? obj.entries : [],
        ldc_entries: Array.isArray(obj.ldc_entries) ? obj.ldc_entries : [],
        selected_service: obj.selected_service || SERVICE_TYPES[0],
      };
      saveData();
      renderTiles();
      setStatus("✅ Import erfolgreich.");
    } catch (e) {
      alert("Import fehlgeschlagen: " + e.message);
    }
  };
  reader.readAsText(file);
}

// Monat Buttons
function prevMonth() {
  let y = parseInt(document.getElementById("year").value, 10);
  let m = parseInt(document.getElementById("month").value, 10);
  m -= 1;
  if (m < 1) { m = 12; y -= 1; }
  document.getElementById("year").value = y;
  document.getElementById("month").value = m;
  setStatus(`Monat gesetzt: ${y}-${String(m).padStart(2,"0")}`);
}

function nextMonth() {
  let y = parseInt(document.getElementById("year").value, 10);
  let m = parseInt(document.getElementById("month").value, 10);
  m += 1;
  if (m > 12) { m = 1; y += 1; }
  document.getElementById("year").value = y;
  document.getElementById("month").value = m;
  setStatus(`Monat gesetzt: ${y}-${String(m).padStart(2,"0")}`);
}

// ---------- Wire up ----------
function init() {
  renderTiles();
  refreshTimeLabels();

  document.getElementById("gPlus1h").onclick = () => { state.gH += 1; refreshTimeLabels(); };
  document.getElementById("gPlus15m").onclick = () => add15("g");
  document.getElementById("gReset").onclick = () => reset("g");
  document.getElementById("gSave").onclick = () => {
    try { saveGeneral(); } catch(e) { alert(e.message); }
  };

  document.getElementById("lPlus1h").onclick = () => { state.lH += 1; refreshTimeLabels(); };
  document.getElementById("lPlus15m").onclick = () => add15("l");
  document.getElementById("lReset").onclick = () => reset("l");
  document.getElementById("lSave").onclick = () => {
    try { saveLdc(); } catch(e) { alert(e.message); }
  };

  document.getElementById("btnSave").onclick = saveData;
  document.getElementById("btnOverview").onclick = showOverview;

  document.getElementById("closeOverview").onclick = () => document.getElementById("overviewDialog").close();

  document.getElementById("prevMonth").onclick = prevMonth;
  document.getElementById("nextMonth").onclick = nextMonth;

  document.getElementById("btnExport").onclick = exportJson;
  document.getElementById("btnImport").onclick = () => document.getElementById("importFile").click();
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJsonFile(file);
    e.target.value = "";
  });
}

init();
