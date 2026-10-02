const SUPABASE_URL = "https://ffiuayjfnhlvxgktxbal.supabase.co";
const SUPABASE_KEY = "sb_publishable_F8h3Zay5r9pVATEnvAIa-Q_bnaXgj1U";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels = {
  color: "#3D4FCC",
  font: { family: "Inter", size: 10, weight: "600" },
  anchor: "end", align: "end", offset: 2, clamp: true,
};

let ventas = [];
let charts = {};

const COLORS = {
  primary: "#5B6EF5", primaryDark: "#3D4FCC", primaryLight: "#C7CEFA",
  accent: "#7B4DFF", pink: "#EC4899", orange: "#F97316", green: "#10B981",
  textDim: "#6B7392",
};
const PALETTE = [COLORS.primary, COLORS.accent, COLORS.pink, COLORS.green, COLORS.orange, COLORS.primaryLight];

document.getElementById("fechaActual1").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
document.getElementById("fechaActual2").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
document.getElementById("fechaActual3").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
document.getElementById("fechaActual4").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

// HELPERS
function col(data, clave) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);
  return keys.find(k => k.trim().toLowerCase() === clave.trim().toLowerCase());
}
function norm(v) { return v !== undefined && v !== null ? v.toString().trim() : ""; }
function num(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[^0-9.-]/g, "")) || 0;
}
function money(v) { return "S/ " + Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function tooltipStyle() {
  return { backgroundColor: "#3D4FCC", titleColor: "#FFFFFF", bodyColor: "#FFFFFF", borderColor: "#5B6EF5", borderWidth: 1, padding: 12, cornerRadius: 8 };
}
async function cargarHoja(nombre) {
  const TAMANO = 1000;
  let todos = [], desde = 0, seguir = true;
  while (seguir) {
    const { data, error } = await supabaseClient
      .from("dashboard_data").select("row_index, data")
      .eq("sheet_name", nombre).order("row_index", { ascending: true })
      .range(desde, desde + TAMANO - 1);
    if (error) throw error;
    if (data.length === 0) seguir = false;
    else { todos = todos.concat(data); desde += TAMANO; if (data.length < TAMANO) seguir = false; }
  }
  return todos.map(r => r.data);
}

// RENDERIZADORES
function renderBar(id, labels, data, color) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color || COLORS.primary, borderRadius: 6, borderSkipped: false, maxBarThickness: 80, categoryPercentage: 0.7, barPercentage: 0.9 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle(),
        datalabels: { anchor: "end", align: "top", formatter: v => Number(v).toLocaleString("es-PE", { maximumFractionDigits: 0 }) } },
      scales: {
        x: { ticks: { color: COLORS.textDim, font: { family: "Inter", size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(225, 230, 240, 0.8)" }, suggestedMax: Math.max(...data) * 1.15 }
      }
    }
  });
}
function renderHBar(id, labels, data, color) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  const wrap = ctx.parentElement;
  if (labels.length > 12) { wrap.style.maxHeight = "500px"; wrap.style.overflowY = "auto"; ctx.style.height = labels.length * 34 + "px"; ctx.style.maxHeight = "none"; }
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color || COLORS.primary, borderRadius: 6, borderSkipped: false }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle(),
        datalabels: { anchor: "end", align: "right", formatter: v => Number(v).toLocaleString("es-PE", { maximumFractionDigits: 0 }) } },
      scales: {
        x: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(225, 230, 240, 0.8)" } },
        y: { ticks: { color: COLORS.primaryDark, font: { family: "Inter", size: 10 } }, grid: { display: false } }
      }
    }
  });
}
function renderDoughnut(id, labels, data) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: PALETTE.slice(0, labels.length), borderColor: "#FFFFFF", borderWidth: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      animation: { duration: 1000, easing: "easeOutQuart" },
      plugins: {
        legend: { position: "bottom", labels: { color: COLORS.textDim, font: { family: "Inter", size: 11 }, padding: 12, usePointStyle: true, boxWidth: 8 } },
        tooltip: tooltipStyle(),
        datalabels: { color: "#FFFFFF", anchor: "center", align: "center",
          formatter: (v, ctx) => { const t = ctx.dataset.data.reduce((a, b) => a + Number(b), 0); const p = t > 0 ? (Number(v) / t) * 100 : 0; return p >= 4 ? v : ""; } }
      }
    }
  });
}
function renderLine(id, labels, datasets) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: COLORS.textDim, font: { family: "Inter", size: 11 }, usePointStyle: true, boxWidth: 8 } },
        tooltip: tooltipStyle(),
        datalabels: { display: true, align: "top", anchor: "end", offset: 4, color: "#3D4FCC", font: { family: "Inter", size: 10, weight: "600" }, formatter: v => Number(v).toLocaleString("es-PE", { maximumFractionDigits: 0 }) } },
      scales: {
        x: { ticks: { color: COLORS.textDim, font: { family: "Inter", size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(225, 230, 240, 0.8)" } }
      }
    }
  });
}
function agruparYRender(data, id, columna, tipo, color) {
  if (!columna) return;
  const conteo = {};
  data.forEach(f => { const v = norm(f[columna]) || "Sin dato"; conteo[v] = (conteo[v] || 0) + 1; });
  const entries = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0]);
  const valores = entries.map(e => e[1]);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) {
    charts[id].data.labels = labels;
    charts[id].data.datasets[0].data = valores;
    charts[id].update();
    return;
  }
  if (tipo === "bar") renderBar(id, labels, valores, color);
  else if (tipo === "hbar") renderHBar(id, labels, valores, color);
  else renderDoughnut(id, labels, valores);
}
function llenarSelect(id, data, columna) {
  const select = document.getElementById(id);
  if (!select || !columna) return;
  const labelInicial = select.dataset.label || select.options[0]?.text || "Opción";
  select.dataset.label = labelInicial;
  const valorActual = select.value;
  const valores = [...new Set(data.map(f => norm(f[columna])).filter(v => v !== ""))];
  select.innerHTML = `<option value="">${labelInicial}</option>`;
  valores.sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  });
  if (valorActual && valores.includes(valorActual)) select.value = valorActual;
}
function marcarSegmentadorActivo(select) {
  if (!select) return;
  if (select.value) select.classList.add("activo");
  else select.classList.remove("activo");
}
function crearKPI(icono, clase, titulo, valor, sub) {
  return `<div class="kpi-card"><div class="kpi-icon-circle ${clase}"><i class="fas ${icono}"></i></div>
    <div class="kpi-content"><span class="kpi-title">${titulo}</span><span class="kpi-main">${valor}</span><span class="kpi-trend">${sub}</span></div></div>`;
}
function crearChart(id, icono, titulo, full = false) {
  return `<div class="chart-exec-card ${full ? "chart-full" : ""}"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><canvas id="${id}"></canvas></div>`;
}
function crearChartDonut(id, icono, titulo) {
  return `<div class="chart-exec-card"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><div class="chart-doughnut-wrapper"><canvas id="${id}"></canvas></div></div>`;
}
function crearChartTabla(icono, titulo, id) {
  return `<div class="chart-exec-card"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><div id="${id}" class="mini-table"></div></div>`;
}

// PESTAÑA VENTAS
function renderVentas() {
  const data = ventas;
  const cRegion = col(data, "Region");
  const cCategoria = col(data, "Categoria");
  const cVendedor = col(data, "Vendedor");
  const cUnidades = col(data, "Unidades");
  const cIngreso = col(data, "Ingreso_Total");
  const cPrecio = col(data, "Precio_Unitario");
  const cFecha = col(data, "Fecha");

  ["vRegion","vCategoria","vVendedor","vMes","vAnual","vUnidades"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  });

  let totalIngreso = 0, totalUnidades = 0, totalPrecio = 0, nVentas = 0;
  data.forEach(f => {
    totalIngreso += num(f[cIngreso]);
    totalUnidades += num(f[cUnidades]);
    totalPrecio += num(f[cPrecio]);
    nVentas++;
  });
  const ticketProm = nVentas > 0 ? totalIngreso / nVentas : 0;
  const precioProm = nVentas > 0 ? totalPrecio / nVentas : 0;

  document.getElementById("kpiVentas").innerHTML = `
    ${crearKPI("fa-sack-dollar", "", "Total Ventas", money(totalIngreso), "Ingreso acumulado")}
    ${crearKPI("fa-cubes", "icon-accent", "Unidades Vendidas", totalUnidades.toLocaleString("es-PE"), "Total")}
    ${crearKPI("fa-receipt", "icon-green", "Ticket Promedio", money(ticketProm), "Por venta")}
    ${crearKPI("fa-tag", "icon-pink", "Precio Unit. Prom.", money(precioProm), "Promedio")}
    ${crearKPI("fa-hashtag", "icon-orange", "N° de Ventas", nVentas, "Transacciones")}
  `;

  document.getElementById("chartsVentas").innerHTML = `
    ${crearChartDonut("vRegion", "fa-map-marker-alt", "Ventas por Región")}
    ${crearChartDonut("vCategoria", "fa-tags", "Ventas por Categoría")}
    ${crearChart("vVendedor", "fa-user-tie", "Ventas por Vendedor")}
    ${crearChart("vUnidades", "fa-cubes", "Unidades por Región")}
    <div class="chart-exec-card chart-full">
      <div class="chart-exec-header"><i class="fas fa-calendar chart-icon"></i><h3>Ventas por Mes</h3></div>
      <canvas id="vMes"></canvas>
    </div>
    ${crearChart("vAnual", "fa-calendar-alt", "Ventas por Año")}
  `;

  requestAnimationFrame(() => {
    agruparYRender(data, "vRegion", cRegion, "doughnut");
    agruparYRender(data, "vCategoria", cCategoria, "doughnut");
  });

  // Ventas por vendedor
  const porVend = {};
  data.forEach(f => { const v = norm(f[cVendedor]) || "Sin vendedor"; porVend[v] = (porVend[v] || 0) + num(f[cIngreso]); });
  const arrVend = Object.entries(porVend).sort((a, b) => b[1] - a[1]).slice(0, 10);
  renderBar("vVendedor", arrVend.map(v => v[0]), arrVend.map(v => +v[1].toFixed(2)), COLORS.primary);

  // Unidades por región
  const porRegU = {};
  data.forEach(f => { const r = norm(f[cRegion]) || "Sin región"; porRegU[r] = (porRegU[r] || 0) + num(f[cUnidades]); });
  const arrRegU = Object.entries(porRegU).sort((a, b) => b[1] - a[1]);
  renderBar("vUnidades", arrRegU.map(r => r[0]), arrRegU.map(r => r[1]), COLORS.accent);

  // Ventas por mes
  if (cFecha) {
    const porMes = {};
    data.forEach(f => {
      const raw = norm(f[cFecha]);
      if (!raw) return;
      const fecha = raw.split(" ")[0];
      const mes = fecha.substring(0, 7);
      porMes[mes] = (porMes[mes] || 0) + num(f[cIngreso]);
    });
    const keys = Object.keys(porMes).sort();
    const mesesAbrev = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];
    const labels = keys.map(k => { const [a, m] = k.split("-"); return mesesAbrev[parseInt(m) - 1] + " " + a.substring(2); });
    renderLine("vMes", labels, [{
      label: "Ventas", data: keys.map(k => +porMes[k].toFixed(2)),
      borderColor: COLORS.primary, backgroundColor: "rgba(91, 110, 245, 0.15)",
      borderWidth: 3, tension: 0.4, pointRadius: 5, fill: true
    }]);

    // Ventas por año
    const porAnio = {};
    data.forEach(f => {
      const raw = norm(f[cFecha]);
      if (!raw) return;
      const anio = raw.split(" ")[0].substring(0, 4);
      porAnio[anio] = (porAnio[anio] || 0) + num(f[cIngreso]);
    });
    const keysA = Object.keys(porAnio).sort();
    renderBar("vAnual", keysA, keysA.map(k => +porAnio[k].toFixed(2)), COLORS.green);
  }

  llenarSelect("filterRegionV", data, cRegion);
  llenarSelect("filterCategoriaV", data, cCategoria);
  llenarSelect("filterVendedorV", data, cVendedor);

  ["filterRegionV","filterCategoriaV","filterVendedorV"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.dataset.listener) {
      sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosVentas(); });
      sel.dataset.listener = "1";
    }
    marcarSegmentadorActivo(sel);
  });
}

function aplicarFiltrosVentas() {
  const reg = document.getElementById("filterRegionV").value;
  const cat = document.getElementById("filterCategoriaV").value;
  const vend = document.getElementById("filterVendedorV").value;
  const cRegion = col(ventas, "Region");
  const cCategoria = col(ventas, "Categoria");
  const cVendedor = col(ventas, "Vendedor");
  const filtrado = ventas.filter(f => {
    if (reg && norm(f[cRegion]) !== reg) return false;
    if (cat && norm(f[cCategoria]) !== cat) return false;
    if (vend && norm(f[cVendedor]) !== vend) return false;
    return true;
  });
  const backup = ventas; ventas = filtrado; renderVentas(); ventas = backup;
}

// PESTAÑA GANANCIAS
function renderGanancias() {
  const data = ventas;
  const cRegion = col(data, "Region");
  const cCategoria = col(data, "Categoria");
  const cVendedor = col(data, "Vendedor");
  const cIngreso = col(data, "Ingreso_Total");
  const cCosto = col(data, "Costo");
  const cGanancia = col(data, "Ganancia");

  ["gRegion","gVendedor","gCategoria","gMargen"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  });

  let totalIngreso = 0, totalCosto = 0, totalGanancia = 0;
  data.forEach(f => {
    totalIngreso += num(f[cIngreso]);
    totalCosto += num(f[cCosto]);
    totalGanancia += num(f[cGanancia]);
  });
  const margen = totalIngreso > 0 ? (totalGanancia / totalIngreso) * 100 : 0;

  document.getElementById("kpiGanancias").innerHTML = `
    ${crearKPI("fa-sack-dollar", "", "Ingreso Total", money(totalIngreso), "Bruto")}
    ${crearKPI("fa-money-bill-wave", "icon-pink", "Costo Total", money(totalCosto), "Inversión")}
    ${crearKPI("fa-coins", "icon-green", "Ganancia Total", money(totalGanancia), "Utilidad")}
    ${crearKPI("fa-percent", "icon-accent", "Margen", margen.toFixed(2) + "%", "Rentabilidad")}
  `;

  document.getElementById("chartsGanancias").innerHTML = `
    ${crearChart("gRegion", "fa-map-marker-alt", "Ganancia por Región")}
    ${crearChart("gVendedor", "fa-user-tie", "Ganancia por Vendedor")}
    ${crearChartDonut("gCategoria", "fa-tags", "Ganancia por Categoría")}
    <div class="chart-exec-card">
      <div class="chart-exec-header"><i class="fas fa-chart-pie chart-icon"></i><h3>Margen por Región</h3></div>
      <div id="tablaMargenRegion" class="mini-table"></div>
    </div>
  `;

  // Ganancia por región
  const porReg = {};
  data.forEach(f => { const r = norm(f[cRegion]) || "Sin región"; porReg[r] = (porReg[r] || 0) + num(f[cGanancia]); });
  const arrReg = Object.entries(porReg).sort((a, b) => b[1] - a[1]);
  renderBar("gRegion", arrReg.map(r => r[0]), arrReg.map(r => +r[1].toFixed(2)), COLORS.green);

  // Ganancia por vendedor
  const porVend = {};
  data.forEach(f => { const v = norm(f[cVendedor]) || "Sin vendedor"; porVend[v] = (porVend[v] || 0) + num(f[cGanancia]); });
  const arrVend = Object.entries(porVend).sort((a, b) => b[1] - a[1]);
  renderHBar("gVendedor", arrVend.map(v => v[0]), arrVend.map(v => +v[1].toFixed(2)), COLORS.accent);

  // Ganancia por categoría (donut)
  requestAnimationFrame(() => {
    agruparYRender(data, "gCategoria", cCategoria, "doughnut");
  });

  // Tabla margen por región
  const margenRegion = {};
  data.forEach(f => {
    const r = norm(f[cRegion]) || "Sin región";
    if (!margenRegion[r]) margenRegion[r] = { ing: 0, gan: 0 };
    margenRegion[r].ing += num(f[cIngreso]);
    margenRegion[r].gan += num(f[cGanancia]);
  });
  let html = "<table><thead><tr><th>Región</th><th>Ingreso</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>";
  Object.entries(margenRegion).sort((a, b) => b[1].gan - a[1].gan).forEach(([r, v]) => {
    const m = v.ing > 0 ? (v.gan / v.ing) * 100 : 0;
    html += `<tr><td>${r}</td><td>${money(v.ing)}</td><td>${money(v.gan)}</td><td>${m.toFixed(1)}%</td></tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("tablaMargenRegion").innerHTML = html;

  llenarSelect("filterRegionG", data, cRegion);
  llenarSelect("filterCategoriaG", data, cCategoria);
  llenarSelect("filterVendedorG", data, cVendedor);

  ["filterRegionG","filterCategoriaG","filterVendedorG"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.dataset.listener) {
      sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosGanancias(); });
      sel.dataset.listener = "1";
    }
    marcarSegmentadorActivo(sel);
  });
}

function aplicarFiltrosGanancias() {
  const reg = document.getElementById("filterRegionG").value;
  const cat = document.getElementById("filterCategoriaG").value;
  const vend = document.getElementById("filterVendedorG").value;
  const cRegion = col(ventas, "Region");
  const cCategoria = col(ventas, "Categoria");
  const cVendedor = col(ventas, "Vendedor");
  const filtrado = ventas.filter(f => {
    if (reg && norm(f[cRegion]) !== reg) return false;
    if (cat && norm(f[cCategoria]) !== cat) return false;
    if (vend && norm(f[cVendedor]) !== vend) return false;
    return true;
  });
  const backup = ventas; ventas = filtrado; renderGanancias(); ventas = backup;
}

// PESTAÑA RANKING
function renderRanking() {
  const data = ventas;
  const cVendedor = col(data, "Vendedor");
  const cCategoria = col(data, "Categoria");
  const cRegion = col(data, "Region");
  const cGanancia = col(data, "Ganancia");
  const cIngreso = col(data, "Ingreso_Total");
  const cUnidades = col(data, "Unidades");

  ["rkVendedor","rkCategoria","rkRegion"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  });

  const porVend = {};
  data.forEach(f => {
    const v = norm(f[cVendedor]) || "Sin vendedor";
    if (!porVend[v]) porVend[v] = { gan: 0, ing: 0, uni: 0, n: 0 };
    porVend[v].gan += num(f[cGanancia]);
    porVend[v].ing += num(f[cIngreso]);
    porVend[v].uni += num(f[cUnidades]);
    porVend[v].n++;
  });
  const arrVend = Object.entries(porVend).sort((a, b) => b[1].gan - a[1].gan);

  const topVend = arrVend[0];
  const topCat = (() => {
    const cat = {};
    data.forEach(f => { const c = norm(f[cCategoria]) || "Sin categoría"; cat[c] = (cat[c] || 0) + num(f[cGanancia]); });
    return Object.entries(cat).sort((a, b) => b[1] - a[1])[0];
  })();

  document.getElementById("kpiRanking").innerHTML = `
    ${crearKPI("fa-trophy", "icon-accent", "Top Vendedor", topVend ? topVend[0] : "-", topVend ? money(topVend[1].gan) + " ganancia" : "Sin datos")}
    ${crearKPI("fa-crown", "icon-green", "Categoría + Rentable", topCat ? topCat[0] : "-", topCat ? money(topCat[1]) + " ganancia" : "Sin datos")}
    ${crearKPI("fa-users", "icon-pink", "Vendedores activos", arrVend.length, "En ranking")}
  `;

  document.getElementById("chartsRanking").innerHTML = `
    <div class="chart-exec-card chart-full">
      <div class="chart-exec-header"><i class="fas fa-trophy chart-icon"></i><h3>Ranking de Vendedores por Ganancia</h3></div>
      <canvas id="rkVendedor"></canvas>
    </div>
    ${crearChart("rkCategoria", "fa-tags", "Ganancia por Categoría")}
    ${crearChart("rkRegion", "fa-map-marker-alt", "Ganancia por Región")}
    ${crearChartTabla("fa-table", "Detalle por Vendedor", "tablaRankingVend")}
  `;

  renderHBar("rkVendedor", arrVend.map(v => v[0]), arrVend.map(v => +v[1].gan.toFixed(2)), COLORS.accent);

  // Ganancia por categoría
  const porCat = {};
  data.forEach(f => { const c = norm(f[cCategoria]) || "Sin categoría"; porCat[c] = (porCat[c] || 0) + num(f[cGanancia]); });
  const arrCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  renderBar("rkCategoria", arrCat.map(c => c[0]), arrCat.map(c => +c[1].toFixed(2)), COLORS.pink);

  // Ganancia por región
  const porReg = {};
  data.forEach(f => { const r = norm(f[cRegion]) || "Sin región"; porReg[r] = (porReg[r] || 0) + num(f[cGanancia]); });
  const arrReg = Object.entries(porReg).sort((a, b) => b[1] - a[1]);
  renderBar("rkRegion", arrReg.map(r => r[0]), arrReg.map(r => +r[1].toFixed(2)), COLORS.green);

  // Tabla
  let html = "<table><thead><tr><th>Vendedor</th><th>Ventas</th><th>Ingreso</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>";
  arrVend.forEach(([v, d]) => {
    const m = d.ing > 0 ? (d.gan / d.ing) * 100 : 0;
    html += `<tr><td><strong>${v}</strong></td><td>${d.n}</td><td>${money(d.ing)}</td><td>${money(d.gan)}</td><td>${m.toFixed(1)}%</td></tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("tablaRankingVend").innerHTML = html;

  llenarSelect("filterRegionR", data, cRegion);
  llenarSelect("filterCategoriaR", data, cCategoria);

  ["filterRegionR","filterCategoriaR"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.dataset.listener) {
      sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosRanking(); });
      sel.dataset.listener = "1";
    }
    marcarSegmentadorActivo(sel);
  });
}

function aplicarFiltrosRanking() {
  const reg = document.getElementById("filterRegionR").value;
  const cat = document.getElementById("filterCategoriaR").value;
  const cRegion = col(ventas, "Region");
  const cCategoria = col(ventas, "Categoria");
  const filtrado = ventas.filter(f => {
    if (reg && norm(f[cRegion]) !== reg) return false;
    if (cat && norm(f[cCategoria]) !== cat) return false;
    return true;
  });
  const backup = ventas; ventas = filtrado; renderRanking(); ventas = backup;
}

// PESTAÑA DETALLE
function renderDetalle() {
  const data = ventas;
  const cID = col(data, "ID_Venta");
  const cFecha = col(data, "Fecha");
  const cRegion = col(data, "Region");
  const cCategoria = col(data, "Categoria");
  const cVendedor = col(data, "Vendedor");
  const cUnidades = col(data, "Unidades");
  const cPrecio = col(data, "Precio_Unitario");
  const cIngreso = col(data, "Ingreso_Total");
  const cCosto = col(data, "Costo");
  const cGanancia = col(data, "Ganancia");

  let html = `<table><thead><tr>
    <th>ID</th><th>Fecha</th><th>Región</th><th>Categoría</th><th>Vendedor</th>
    <th>Unid.</th><th>P. Unit.</th><th>Ingreso</th><th>Costo</th><th>Ganancia</th>
  </tr></thead><tbody>`;
  data.forEach(f => {
    let fecha = norm(f[cFecha]);
    if (fecha.includes(" ")) fecha = fecha.split(" ")[0];
    html += `<tr>
      <td><strong>${norm(f[cID]) || "-"}</strong></td>
      <td>${fecha || "-"}</td>
      <td>${norm(f[cRegion]) || "-"}</td>
      <td>${norm(f[cCategoria]) || "-"}</td>
      <td>${norm(f[cVendedor]) || "-"}</td>
      <td>${norm(f[cUnidades]) || "-"}</td>
      <td>${money(num(f[cPrecio]))}</td>
      <td>${money(num(f[cIngreso]))}</td>
      <td>${money(num(f[cCosto]))}</td>
      <td>${money(num(f[cGanancia]))}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("tablaDetalle").innerHTML = html;

  llenarSelect("filterRegionD", ventas, cRegion);
  llenarSelect("filterCategoriaD", ventas, cCategoria);
  llenarSelect("filterVendedorD", ventas, cVendedor);

  ["filterRegionD","filterCategoriaD","filterVendedorD"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.dataset.listener) {
      sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosDetalle(); });
      sel.dataset.listener = "1";
    }
    marcarSegmentadorActivo(sel);
  });
}

function aplicarFiltrosDetalle() {
  const reg = document.getElementById("filterRegionD").value;
  const cat = document.getElementById("filterCategoriaD").value;
  const vend = document.getElementById("filterVendedorD").value;
  const cRegion = col(ventas, "Region");
  const cCategoria = col(ventas, "Categoria");
  const cVendedor = col(ventas, "Vendedor");
  const filtrado = ventas.filter(f => {
    if (reg && norm(f[cRegion]) !== reg) return false;
    if (cat && norm(f[cCategoria]) !== cat) return false;
    if (vend && norm(f[cVendedor]) !== vend) return false;
    return true;
  });
  const backup = ventas; ventas = filtrado; renderDetalle(); ventas = backup;
}

// NAVEGACIÓN
function cambiarSeccion(seccion) {
  document.querySelectorAll("#dashTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.seccion === seccion));
  ["ventas","ganancias","ranking","detalle"].forEach(s => {
    document.getElementById(s).style.display = s === seccion ? "block" : "none";
  });
}

// INIT
(async function init() {
  try {
    ventas = await cargarHoja("VENTAS");
    document.getElementById("loading").style.display = "none";
    document.getElementById("dashTabs").style.display = "flex";
    document.getElementById("ventas").style.display = "block";

    if (ventas.length > 0) {
      renderVentas();
      renderGanancias();
      renderRanking();
      renderDetalle();
    }

    document.getElementById("clearVentas").addEventListener("click", () => {
      document.querySelectorAll("#ventas .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#ventas .filter-select").forEach(marcarSegmentadorActivo);
      renderVentas();
    });
    document.getElementById("clearGanancias").addEventListener("click", () => {
      document.querySelectorAll("#ganancias .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#ganancias .filter-select").forEach(marcarSegmentadorActivo);
      renderGanancias();
    });
    document.getElementById("clearRanking").addEventListener("click", () => {
      document.querySelectorAll("#ranking .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#ranking .filter-select").forEach(marcarSegmentadorActivo);
      renderRanking();
    });
    document.getElementById("clearDetalle").addEventListener("click", () => {
      document.querySelectorAll("#detalle .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#detalle .filter-select").forEach(marcarSegmentadorActivo);
      renderDetalle();
    });

    document.querySelectorAll("#dashTabs .tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        cambiarSeccion(tab.dataset.seccion);
      });
    });
  } catch (err) {
    console.error(err);
    document.getElementById("loading").innerHTML = `<p style="color:#F97316;">Error al cargar: ${err.message}</p>`;
  }
})();