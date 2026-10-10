/**
 * CrowdRoute AI — Interactive Frontend Controller
 * Connects UI directly to FastAPI endpoints (/api/scenario, /api/forecast, /api/allocate, /api/simulate, /api/historical/upload)
 */

let systemMode = "DEMO_SYNTHETIC"; // 'DEMO_SYNTHETIC' or 'USER_DATA'
let activeScenario = null;
let historicalRecords = null;
let historicalDatasetInfo = null;

// =====================================================================
// INITIALIZATION
// =====================================================================
document.addEventListener("DOMContentLoaded", async () => {
  setupDropzone();
  await fetchLiveStatus();
  await loadScenarioFromBackend();
  await runCompleteAnalysis();
});

// =====================================================================
// MODE SELECTION
// =====================================================================
function setSystemMode(mode) {
  systemMode = mode;
  const btnDemo = document.getElementById("btn-mode-demo");
  const btnUser = document.getElementById("btn-mode-user");
  const bannerBadge = document.getElementById("banner-mode-badge");
  const bannerDesc = document.getElementById("banner-mode-desc");
  const bannerProv = document.getElementById("banner-provenance-tag");

  if (mode === "USER_DATA") {
    btnDemo.classList.remove("active");
    btnUser.classList.add("active");

    bannerBadge.textContent = "USER DATA MODE ACTIVE";
    bannerBadge.className = "badge badge-success";
    bannerDesc.textContent = "Forecasts and bus allocations are dynamically driven by user-supplied inputs and uploaded historical records.";
    bannerProv.textContent = "DYNAMIC USER / HISTORICAL INPUTS";
    bannerProv.style.color = "var(--color-emerald)";
    bannerProv.style.borderColor = "rgba(16, 185, 129, 0.3)";
    bannerProv.style.background = "rgba(16, 185, 129, 0.1)";
  } else {
    btnUser.classList.remove("active");
    btnDemo.classList.add("active");

    bannerBadge.textContent = "SYNTHETIC DEMO MODE";
    bannerBadge.className = "badge badge-warning";
    bannerDesc.textContent = "Using verified baseline synthetic scenario for Maha Deepam finale. Predictions utilize deterministic rule-based Gaussian egress model.";
    bannerProv.textContent = "SYNTHETIC DEMO ONLY • NOT REAL TELEMETRY";
    bannerProv.style.color = "var(--color-amber)";
    bannerProv.style.borderColor = "rgba(245, 158, 11, 0.25)";
    bannerProv.style.background = "rgba(245, 158, 11, 0.1)";
  }

  runCompleteAnalysis();
}

// =====================================================================
// BACKEND API CALLS
// =====================================================================

async function loadScenarioFromBackend() {
  try {
    const res = await fetch("/api/scenario");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    activeScenario = await res.json();
    populateFormWithScenario(activeScenario);
  } catch (err) {
    console.error("Failed to load scenario:", err);
  }
}

async function fetchLiveStatus() {
  try {
    const res = await fetch("/api/live/status");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const wBadge = document.getElementById("badge-live-weather-status");
    const wDesc = document.getElementById("desc-live-weather-status");
    const wMeta = document.getElementById("meta-live-weather-status");

    if (data.weather_feed.is_available) {
      wBadge.textContent = "ONLINE";
      wBadge.className = "badge badge-success";
      wDesc.textContent = data.weather_feed.message;
      wMeta.textContent = `Updated: ${data.weather_feed.last_updated}`;
    } else {
      wBadge.textContent = data.weather_feed.status;
      wBadge.className = "badge badge-danger";
      wDesc.textContent = data.weather_feed.message;
      wMeta.textContent = "Feed: Standalone Offline Mode";
    }
  } catch (err) {
    console.warn("Could not fetch live status:", err);
  }
}

async function resetToDemoDefaults() {
  historicalRecords = null;
  historicalDatasetInfo = null;
  document.getElementById("upload-results-panel").style.display = "none";
  document.getElementById("accuracy-panel").style.display = "none";
  document.getElementById("badge-historical-status").textContent = "NOT LOADED";
  document.getElementById("badge-historical-status").className = "badge badge-neutral";
  document.getElementById("desc-historical-status").textContent = "Upload previous festival passenger counts or boarding logs to calibrate empirical departure weights.";
  document.getElementById("meta-historical-status").textContent = "Records: 0 • Coverage: 0 stops";

  setSystemMode("DEMO_SYNTHETIC");
  await loadScenarioFromBackend();
  await runCompleteAnalysis();
}

// =====================================================================
// FORM POPULATION & SYNCHRONIZATION
// =====================================================================

function populateFormWithScenario(sc) {
  if (!sc) return;
  const prog = sc.festival_programme;

  document.getElementById("inp-event-name").value = prog.event_name;
  document.getElementById("inp-event-end-time").value = prog.scheduled_event_end_time;
  document.getElementById("inp-total-attendance").value = prog.expected_total_attendance;
  document.getElementById("inp-transit-fraction").value = prog.exiting_passenger_fraction;
  document.getElementById("sel-weather").value = sc.weather.condition;

  document.getElementById("inp-horizon-start").value = prog.time_horizon.start_time;
  document.getElementById("inp-horizon-end").value = prog.time_horizon.end_time;
  document.getElementById("inp-interval-minutes").value = prog.time_horizon.interval_minutes;

  renderStopsTable(sc);
  renderFleetTable(sc);
}

function renderStopsTable(sc) {
  const tbody = document.getElementById("tbody-stops-demand");
  tbody.innerHTML = "";
  const dist = sc.festival_programme.demand_distribution;

  sc.stops.forEach((st) => {
    const tr = document.createElement("tr");
    const shareVal = (dist[st.stop_id] || 0) * 100;

    tr.innerHTML = `
      <td class="mono font-bold">${st.stop_id}</td>
      <td>${st.name}</td>
      <td><input type="number" class="form-input mono inp-min-buses" data-stop="${st.stop_id}" value="${st.min_service_buses}" min="0" max="20" style="width: 70px; padding: 0.25rem 0.5rem;" /></td>
      <td>
        <div style="display:flex; align-items:center; gap: 0.35rem;">
          <input type="number" step="0.5" min="0" max="100" class="form-input mono inp-stop-share" data-stop="${st.stop_id}" value="${shareVal.toFixed(1)}" style="width: 80px; padding: 0.25rem 0.5rem;" oninput="updateSharesSumDisplay()" />
          <span>%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateSharesSumDisplay();
}

function renderFleetTable(sc) {
  const tbody = document.getElementById("tbody-fleet-editor");
  tbody.innerHTML = "";
  document.getElementById("fleet-count-display").textContent = sc.fleet.length;

  sc.fleet.forEach((b) => {
    const tr = document.createElement("tr");
    const intervalCap = Math.floor(b.capacity / 2);

    tr.innerHTML = `
      <td class="mono font-bold text-cyan">${b.bus_id}</td>
      <td>
        <select class="form-select sel-bus-stop" data-bus="${b.bus_id}" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
          ${sc.stops.map(s => `<option value="${s.stop_id}" ${s.stop_id === b.initial_stop_id ? 'selected' : ''}>${s.stop_id}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="number" class="form-input mono inp-bus-cap" data-bus="${b.bus_id}" value="${b.capacity}" min="20" max="120" step="5" style="width: 65px; padding: 0.2rem 0.4rem;" oninput="updateBusIntervalCap(this)" />
      </td>
      <td class="mono font-bold text-green bus-interval-cap-cell">${intervalCap}</td>
      <td>
        <select class="form-select sel-bus-status" data-bus="${b.bus_id}" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
          <option value="available" ${b.status === 'available' ? 'selected' : ''}>available</option>
          <option value="maintenance" ${b.status === 'maintenance' ? 'selected' : ''}>maintenance</option>
          <option value="offline" ${b.status === 'offline' ? 'selected' : ''}>offline</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateBusIntervalCap(input) {
  const cap = parseInt(input.value) || 0;
  const row = input.closest("tr");
  const cell = row.querySelector(".bus-interval-cap-cell");
  cell.textContent = Math.floor(cap / 2);
}

function updateSharesSumDisplay() {
  const inputs = document.querySelectorAll(".inp-stop-share");
  let sum = 0;
  inputs.forEach(i => sum += parseFloat(i.value) || 0);

  const label = document.getElementById("shares-sum-indicator");
  label.textContent = `Shares Total: ${sum.toFixed(1)}%`;
  if (Math.abs(sum - 100) > 0.5) {
    label.style.color = "var(--color-amber)";
  } else {
    label.style.color = "var(--color-cyan)";
  }
}

// Build updated ScenarioData object from form inputs
function buildScenarioFromForm() {
  if (!activeScenario) return null;
  const sc = JSON.parse(JSON.stringify(activeScenario));

  sc.festival_programme.event_name = document.getElementById("inp-event-name").value.trim();
  sc.festival_programme.scheduled_event_end_time = document.getElementById("inp-event-end-time").value.trim();
  sc.festival_programme.expected_total_attendance = parseInt(document.getElementById("inp-total-attendance").value) || 40000;
  sc.festival_programme.exiting_passenger_fraction = parseFloat(document.getElementById("inp-transit-fraction").value) || 0.85;
  sc.weather.condition = document.getElementById("sel-weather").value;

  sc.festival_programme.time_horizon.start_time = document.getElementById("inp-horizon-start").value.trim();
  sc.festival_programme.time_horizon.end_time = document.getElementById("inp-horizon-end").value.trim();

  // Read stops min buses & shares
  const dist = {};
  document.querySelectorAll(".inp-stop-share").forEach(i => {
    const sId = i.dataset.stop;
    dist[sId] = (parseFloat(i.value) || 0) / 100.0;
  });
  sc.festival_programme.demand_distribution = dist;

  document.querySelectorAll(".inp-min-buses").forEach(i => {
    const sId = i.dataset.stop;
    const stopObj = sc.stops.find(s => s.stop_id === sId);
    if (stopObj) stopObj.min_service_buses = parseInt(i.value) || 0;
  });

  // Read fleet updates
  sc.fleet.forEach(b => {
    const stopSel = document.querySelector(`.sel-bus-stop[data-bus="${b.bus_id}"]`);
    const capInp = document.querySelector(`.inp-bus-cap[data-bus="${b.bus_id}"]`);
    const statusSel = document.querySelector(`.sel-bus-status[data-bus="${b.bus_id}"]`);

    if (stopSel) b.initial_stop_id = stopSel.value;
    if (capInp) b.capacity = parseInt(capInp.value) || 60;
    if (statusSel) b.status = statusSel.value;
  });

  return sc;
}

// =====================================================================
// MAIN ANALYSIS ORCHESTRATOR
// =====================================================================

async function runCompleteAnalysis() {
  const currentSc = buildScenarioFromForm();
  if (!currentSc) return;

  activeScenario = currentSc;

  // 1. Forecast Request
  const forecastReq = {
    scenario: currentSc,
    operational_mode: systemMode,
    historical_records: historicalRecords,
  };

  try {
    const fcRes = await fetch("/api/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forecastReq),
    });

    if (!fcRes.ok) {
      const err = await fcRes.json();
      alert(`Forecast Validation Error: ${err.detail || JSON.stringify(err)}`);
      return;
    }

    const forecastData = await fcRes.json();
    renderForecast(forecastData);

    // 2. Allocation Request
    const allocReq = {
      scenario: currentSc,
      forecast: forecastData,
      max_moves: 10,
    };

    const allocRes = await fetch("/api/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allocReq),
    });

    if (!allocRes.ok) {
      const err = await allocRes.json();
      console.error("Allocation error:", err);
      return;
    }

    const allocData = await allocRes.json();
    renderAllocation(allocData);

    // 3. Simulation Request
    const simReq = {
      scenario: currentSc,
      moves_override: allocData.recommended_moves,
    };

    const simRes = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simReq),
    });

    if (!simRes.ok) {
      const err = await simRes.json();
      console.error("Simulation error:", err);
      return;
    }

    const simData = await simRes.json();
    renderSimulation(simData);

  } catch (err) {
    console.error("Analysis execution error:", err);
  }
}

// =====================================================================
// RENDERING FUNCTIONS
// =====================================================================

function renderForecast(fc) {
  // Badges & Provenance
  document.getElementById("prediction-confidence-badge").textContent = fc.confidence_level;
  if (fc.confidence_level === "HIGH") {
    document.getElementById("prediction-confidence-badge").className = "badge badge-success";
  } else if (fc.confidence_level === "MODERATE") {
    document.getElementById("prediction-confidence-badge").className = "badge badge-accent";
  } else {
    document.getElementById("prediction-confidence-badge").className = "badge badge-warning";
  }

  document.getElementById("prediction-method-badge").textContent = fc.method_used;
  document.getElementById("prediction-engine-desc").textContent = fc.confidence_indicator;

  // Stop Summary Cards
  const cardsContainer = document.getElementById("stop-summary-cards");
  cardsContainer.innerHTML = "";

  Object.values(fc.stop_summaries).forEach(sum => {
    const card = document.createElement("div");
    card.className = `stop-card ${sum.overall_risk === 'CRITICAL' ? 'critical' : ''}`;

    const riskBadgeClass = sum.overall_risk === 'CRITICAL' ? 'badge-danger' :
      sum.overall_risk === 'HIGH' ? 'badge-warning' :
      sum.overall_risk === 'MODERATE' ? 'badge-accent' : 'badge-success';

    card.innerHTML = `
      <div class="stop-card-top">
        <div>
          <div class="stop-name-title">${sum.stop_id}</div>
          <div class="stop-id-sub">Total Demand: ${sum.total_demand.toLocaleString()} pax</div>
        </div>
        <span class="badge ${riskBadgeClass}">${sum.overall_risk}</span>
      </div>
      <div class="stop-metrics-row">
        <span>Peak Interval:</span>
        <span class="metric-item-val mono">${sum.peak_interval}</span>
      </div>
      <div class="stop-metrics-row">
        <span>Peak Interval Demand:</span>
        <span class="metric-item-val mono">${sum.peak_demand.toLocaleString()} pax</span>
      </div>
      <div class="stop-metrics-row">
        <span>Total Baseline Capacity:</span>
        <span class="metric-item-val mono">${sum.baseline_scheduled_capacity.toLocaleString()} pax</span>
      </div>
    `;
    cardsContainer.appendChild(card);
  });

  // Interval Table
  const tbody = document.getElementById("tbody-interval-predictions");
  tbody.innerHTML = "";

  fc.intervals.forEach(item => {
    const tr = document.createElement("tr");

    const riskBadge = item.risk_level === 'CRITICAL' ? '<span class="badge badge-danger">CRITICAL</span>' :
      item.risk_level === 'HIGH' ? '<span class="badge badge-warning">HIGH</span>' :
      item.risk_level === 'MODERATE' ? '<span class="badge badge-accent">MODERATE</span>' :
      '<span class="badge badge-success">LOW</span>';

    const defClass = item.deficit_surplus > 0 ? 'negative' : 'positive';
    const defPrefix = item.deficit_surplus > 0 ? '+' : '';

    tr.innerHTML = `
      <td class="mono font-bold">${item.start_time}-${item.end_time}</td>
      <td class="mono">${item.stop_id}</td>
      <td class="mono">${item.low_estimate.toLocaleString()}</td>
      <td class="mono font-bold text-white">${item.central_estimate.toLocaleString()}</td>
      <td class="mono">${item.high_estimate.toLocaleString()}</td>
      <td class="mono">${item.baseline_capacity.toLocaleString()}</td>
      <td><span class="deficit-pill ${defClass}">${defPrefix}${item.deficit_surplus.toLocaleString()}</span></td>
      <td>${riskBadge}</td>
      <td style="font-size: 0.7rem; color: var(--text-muted); max-width: 250px;">${item.provenance_note}</td>
    `;
    tbody.appendChild(tr);
  });

  // Actual vs Predicted summary (if present)
  const accPanel = document.getElementById("accuracy-panel");
  if (fc.actual_vs_predicted && fc.actual_vs_predicted.intervals_compared > 0) {
    accPanel.style.display = "block";
    const acc = fc.actual_vs_predicted;
    document.getElementById("badge-accuracy-mape").textContent = `MAPE: ${acc.overall_mape}%`;
    document.getElementById("stat-mae-val").textContent = `${acc.overall_mae} pax`;
    document.getElementById("stat-mape-val").textContent = `${acc.overall_mape}%`;
    document.getElementById("stat-compared-intervals").textContent = `${acc.intervals_compared} intervals`;
  } else {
    accPanel.style.display = "none";
  }
}

function renderAllocation(alloc) {
  const auditPill = document.getElementById("fleet-audit-pill");
  auditPill.innerHTML = `🛡️ Fleet Conserved: ${alloc.fleet_audit.initial_fleet_count} / ${alloc.fleet_audit.final_fleet_count} Buses`;

  const container = document.getElementById("moves-container");
  container.innerHTML = "";

  if (alloc.status === "NO_SAFE_MOVE" || alloc.recommended_moves.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 1.5rem; width: 100%; text-align: center;">
        <div style="font-weight: 700; color: var(--color-amber); font-size: 0.95rem; margin-bottom: 0.4rem;">⚠️ No Safe Reallocations Feasible</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">
          ${alloc.summary}
        </div>
      </div>
    `;
  } else {
    alloc.recommended_moves.forEach(m => {
      const card = document.createElement("div");
      card.className = "move-card";

      card.innerHTML = `
        <div class="move-card-header">
          <span class="bus-id-badge">${m.bus_id}</span>
          <span class="badge badge-success">RECOMMENDED</span>
        </div>
        <div class="move-route-flow">
          <span>${m.source_stop_id}</span>
          <span class="arrow-icon">➔</span>
          <span>${m.destination_stop_id}</span>
        </div>
        <div class="move-timings">
          <span>Departs: <strong class="mono text-white">${m.departure_time}</strong></span>
          <span>Arrives: <strong class="mono text-white">${m.estimated_arrival_time}</strong> (Peak: ${m.target_peak_interval})</span>
        </div>
        <div class="move-tradeoff-box">
          <div class="tradeoff-gain">🎯 Relieves: +${m.estimated_destination_benefit} passengers/interval at destination</div>
          <div class="tradeoff-loss">🔻 Donor Impact: ${m.source_service_impact_description}</div>
        </div>
        <ul class="constraints-checklist">
          ${m.constraints_passed.slice(0, 4).map(c => `<li>${c.split(':')[0]}</li>`).join('')}
        </ul>
      `;
      container.appendChild(card);
    });
  }

  // Rejected Candidates Table
  const tbodyRej = document.getElementById("tbody-rejected-candidates");
  tbodyRej.innerHTML = "";

  if (alloc.rejected_moves.length === 0) {
    tbodyRej.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No candidate moves were evaluated and rejected.</td></tr>`;
  } else {
    alloc.rejected_moves.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="mono font-bold">${r.candidate_id}</td>
        <td class="mono text-cyan">${r.bus_id}</td>
        <td class="mono">${r.source_stop_id} ➔ ${r.destination_stop_id}</td>
        <td><span class="badge badge-danger">${r.constraint_violated}</span></td>
        <td style="font-size: 0.72rem; color: var(--text-secondary);">${r.reason_rejected}</td>
      `;
      tbodyRej.appendChild(tr);
    });
  }
}

function renderSimulation(sim) {
  const net = sim.net_comparison;

  document.getElementById("kpi-boarded-val").textContent = `+${net.system_additional_passengers_boarded}`;
  document.getElementById("kpi-unmet-val").textContent = `-${net.system_unmet_demand_reduction}`;
  document.getElementById("kpi-main-queue-val").textContent = `-${net.main_hub_peak_queue_reduction}`;
  document.getElementById("kpi-donor-queue-val").textContent = `+${net.source_stop_peak_queue_increase}`;

  // Baseline metrics
  const baseBox = document.getElementById("sim-baseline-metrics");
  const bSim = sim.baseline_simulation;
  baseBox.innerHTML = `
    <div class="sim-metric-row"><span>Total Arrived:</span><span class="mono">${bSim.total_passengers_arrived.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Total Boarded:</span><span class="mono">${bSim.total_passengers_boarded.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Unmet Demand:</span><span class="mono text-rose font-bold">${bSim.system_unmet_demand.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>System Peak Queue:</span><span class="mono">${bSim.system_peak_queue.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Bus Utilization Rate:</span><span class="mono">${(bSim.bus_utilization_rate * 100).toFixed(1)}%</span></div>
  `;

  // Proposed metrics
  const propBox = document.getElementById("sim-proposed-metrics");
  const pSim = sim.proposed_simulation;
  propBox.innerHTML = `
    <div class="sim-metric-row"><span>Total Arrived:</span><span class="mono">${pSim.total_passengers_arrived.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Total Boarded:</span><span class="mono text-green font-bold">${pSim.total_passengers_boarded.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Unmet Demand:</span><span class="mono text-green font-bold">${pSim.system_unmet_demand.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>System Peak Queue:</span><span class="mono">${pSim.system_peak_queue.toLocaleString()}</span></div>
    <div class="sim-metric-row"><span>Bus Utilization Rate:</span><span class="mono">${(pSim.bus_utilization_rate * 100).toFixed(1)}%</span></div>
  `;
}

// =====================================================================
// HISTORICAL FILE UPLOAD HANDLING
// =====================================================================

function setupDropzone() {
  const dropzone = document.getElementById("upload-dropzone");

  ["dragenter", "dragover"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFile(files[0]);
  });
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (file) uploadFile(file);
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/historical/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Upload error: ${err.detail || JSON.stringify(err)}`);
      return;
    }

    const data = await res.json();
    displayUploadResult(data);

    if (data.status !== "INVALID_FILE" && data.records.length > 0) {
      historicalRecords = data.records;
      historicalDatasetInfo = data;
      // Switch to User Data Mode automatically to show empirical results
      setSystemMode("USER_DATA");
    }

  } catch (err) {
    console.error("File upload failed:", err);
    alert(`File upload failed: ${err.message}`);
  }
}

async function loadSampleHistoricalData() {
  try {
    const res = await fetch("/api/historical/sample");
    const csvBlob = await res.blob();
    const file = new File([csvBlob], "sample_festival_historical_data.csv", { type: "text/csv" });
    await uploadFile(file);
  } catch (err) {
    console.error("Failed to load sample CSV:", err);
  }
}

function displayUploadResult(res) {
  const panel = document.getElementById("upload-results-panel");
  panel.style.display = "block";

  const badge = document.getElementById("upload-status-badge");
  badge.textContent = res.status;
  badge.className = res.status === "SUCCESS" ? "badge badge-success" : (res.status === "PARTIAL_SUCCESS" ? "badge badge-warning" : "badge badge-danger");

  document.getElementById("upload-filename-txt").textContent = res.filename;
  document.getElementById("upload-stats-txt").textContent =
    `Valid rows: ${res.valid_rows} • Rejected rows: ${res.invalid_rows_count} • Total historical passengers: ${res.total_passenger_count.toLocaleString()}`;

  document.getElementById("upload-mapping-txt").textContent =
    `Mapped columns: ${JSON.stringify(res.column_mapping)} • Stops: ${res.stop_ids_found.join(', ')}`;

  const errList = document.getElementById("upload-errors-list");
  if (res.validation_errors && res.validation_errors.length > 0) {
    errList.style.display = "block";
    errList.innerHTML = "<strong>Validation notices:</strong><br>" + res.validation_errors.join("<br>");
  } else {
    errList.style.display = "none";
  }

  // Update card status
  const hBadge = document.getElementById("badge-historical-status");
  const hDesc = document.getElementById("desc-historical-status");
  const hMeta = document.getElementById("meta-historical-status");

  if (res.status !== "INVALID_FILE") {
    hBadge.textContent = "CALIBRATED";
    hBadge.className = "badge badge-success";
    hDesc.textContent = `Historical dataset '${res.filename}' loaded. Driving empirical interval departure distributions.`;
    hMeta.textContent = `Records: ${res.valid_rows} • Coverage: ${res.stop_ids_found.join(', ')}`;
  } else {
    hBadge.textContent = "INVALID";
    hBadge.className = "badge badge-danger";
    hDesc.textContent = res.validation_errors[0] || "Invalid file format.";
  }
}
