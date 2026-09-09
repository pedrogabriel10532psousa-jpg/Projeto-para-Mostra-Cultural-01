/* IBGE Analytics — dashboard.js
   Dashboard público (sem login). Lê a coleção "localidades" do Firestore
   em tempo real e recalcula KPIs, gráfico, ranking e tabela conforme os filtros.
*/
"use strict";

import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { ESTADOS, REGIOES } from "./dados-brasil.js";

const COLLECTION = "localidades";

document.addEventListener("DOMContentLoaded", () => new Dashboard().init());

class Dashboard {
  constructor() {
    this.filterRegiao = document.querySelector("#filterRegiao");
    this.filterEstado = document.querySelector("#filterEstado");
    this.filterAno = document.querySelector("#filterAno");
    this.clearFiltersBtn = document.querySelector("#clearFilters");
    this.tableSearch = document.querySelector("#tableSearch");
    this.rankingLimit = document.querySelector("#rankingLimit");
    this.notificationButton = document.querySelector(".icon-btn");
    this.exploreBtn = document.querySelector("#exploreBtn");

    this.lastUpdate = document.querySelector("#lastUpdate");
    this.statusDot = document.querySelector("#statusDot");

    this.kpiPopulacao = document.querySelector("#kpiPopulacao");
    this.kpiPopulacaoSub = document.querySelector("#kpiPopulacaoSub");
    this.kpiMunicipios = document.querySelector("#kpiMunicipios");
    this.kpiEstados = document.querySelector("#kpiEstados");
    this.kpiPib = document.querySelector("#kpiPib");
    this.kpiPibSub = document.querySelector("#kpiPibSub");

    this.chartYLabels = document.querySelector("#chartYLabels");
    this.chartXLabels = document.querySelector("#chartXLabels");
    this.chartAreaPath = document.querySelector("#chartAreaPath");
    this.chartLinePath = document.querySelector("#chartLinePath");
    this.chartEmptyHint = document.querySelector("#chartEmptyHint");
    this.chartSvg = document.querySelector("#chartSvg");

    this.regionList = document.querySelector("#regionList");
    this.regionProgressBar = document.querySelector("#regionProgressBar");
    this.rankingBars = document.querySelector("#rankingBars");
    this.cityTableBody = document.querySelector("#cityTableBody");

    this.allRecords = [];
  }

  init() {
    this.fillFilterOptions();
    this.bindEvents();
    this.listenToRecords();
    this.shortcuts();
  }

  fillFilterOptions() {
    this.filterRegiao.innerHTML = `<option value="">Todas as regiões</option>` +
      REGIOES.map(r => `<option value="${r}">${r}</option>`).join("");

    this.filterEstado.innerHTML = `<option value="">Todos os estados</option>` +
      ESTADOS.map(e => `<option value="${e.uf}">${e.uf} — ${e.nome}</option>`).join("");
  }

  bindEvents() {
    [this.filterRegiao, this.filterEstado, this.filterAno, this.rankingLimit].forEach(el =>
      el.addEventListener("change", () => this.render())
    );

    this.filterRegiao.addEventListener("change", () => {
      // Ao trocar a região, restringe o select de estados àquela região.
      const regiao = this.filterRegiao.value;
      const ufsDaRegiao = regiao ? ESTADOS.filter(e => e.regiao === regiao).map(e => e.uf) : null;
      if (ufsDaRegiao && !ufsDaRegiao.includes(this.filterEstado.value)) {
        this.filterEstado.value = "";
      }
    });

    this.clearFiltersBtn.addEventListener("click", () => {
      this.filterRegiao.value = "";
      this.filterEstado.value = "";
      this.filterAno.value = "";
      this.tableSearch.value = "";
      this.render();
    });

    this.tableSearch.addEventListener("input", () => this.render());

    this.notificationButton?.addEventListener("click", e => {
      e.stopPropagation();
      this.toast("Painel público · dados sincronizados em tempo real com o Firestore.", "info");
    });

    this.exploreBtn?.addEventListener("click", () => {
      document.querySelector(".table-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  shortcuts() {
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.tableSearch?.focus();
      }
    });
  }

  listenToRecords() {
    onSnapshot(
      collection(db, COLLECTION),
      snapshot => {
        this.allRecords = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        this.statusDot.textContent = "● Dados atualizados";
        this.fillAnoOptions();
        this.render();
      },
      error => {
        this.statusDot.textContent = "● Erro ao conectar";
        this.lastUpdate.textContent = "indisponível";
        this.cityTableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados: ${this.escape(error.message)}</td></tr>`;
      }
    );
  }

  fillAnoOptions() {
    const anos = [...new Set(this.allRecords.map(r => r.ano).filter(Boolean))].sort((a, b) => b - a);
    const atual = this.filterAno.value;
    this.filterAno.innerHTML = `<option value="">Todos os anos</option>` +
      anos.map(a => `<option value="${a}">${a}</option>`).join("");
    if (anos.map(String).includes(atual)) this.filterAno.value = atual;
  }

  getFiltered() {
    const regiao = this.filterRegiao.value;
    const uf = this.filterEstado.value;
    const ano = this.filterAno.value;

    return this.allRecords.filter(r => {
      if (regiao && r.regiao !== regiao) return false;
      if (uf && r.uf !== uf) return false;
      if (ano && String(r.ano) !== ano) return false;
      return true;
    });
  }

  render() {
    const filtered = this.getFiltered();
    this.lastUpdate.textContent = `${this.allRecords.length} registro${this.allRecords.length === 1 ? "" : "s"} no total`;

    this.renderKpis(filtered);
    this.renderChart(filtered);
    this.renderRegions(filtered);
    this.renderRanking(filtered);
    this.renderTable(filtered);
  }

  renderKpis(rows) {
    const municipios = rows.filter(r => r.tipo === "municipio");
    const populacaoTotal = rows.reduce((sum, r) => sum + (Number(r.populacao) || 0), 0);
    const pibTotal = rows.reduce((sum, r) => sum + (Number(r.pib) || 0), 0);
    const estadosRepresentados = new Set(rows.map(r => r.uf).filter(Boolean));

    this.kpiPopulacao.textContent = populacaoTotal ? populacaoTotal.toLocaleString("pt-BR") : "—";
    this.kpiPopulacaoSub.textContent = rows.length ? `somatório de ${rows.length} registro(s)` : "nenhum registro no filtro";
    this.kpiMunicipios.textContent = municipios.length.toLocaleString("pt-BR");
    this.kpiEstados.textContent = estadosRepresentados.size.toLocaleString("pt-BR");
    this.kpiPib.textContent = pibTotal ? `R$ ${pibTotal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi` : "—";
    this.kpiPibSub.textContent = rows.some(r => r.pib != null) ? "estimativa a partir dos registros" : "sem dados de PIB cadastrados";
  }

  renderChart(rows) {
    // Agrupa população total por ano de referência.
    const porAno = new Map();
    rows.forEach(r => {
      if (!r.ano) return;
      porAno.set(r.ano, (porAno.get(r.ano) || 0) + (Number(r.populacao) || 0));
    });

    const pontos = [...porAno.entries()].sort((a, b) => a[0] - b[0]);

    if (pontos.length < 2) {
      this.chartSvg.style.display = "none";
      this.chartEmptyHint.hidden = false;
      this.chartYLabels.innerHTML = "";
      this.chartXLabels.innerHTML = "";
      return;
    }

    this.chartSvg.style.display = "";
    this.chartEmptyHint.hidden = true;

    const valores = pontos.map(p => p[1]);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const range = max - min || 1;

    const width = 800;
    const height = 310;
    const padBottom = 28;
    const usableHeight = height - padBottom;

    const coords = pontos.map(([ano, valor], i) => {
      const x = pontos.length === 1 ? 0 : (i / (pontos.length - 1)) * width;
      const y = usableHeight - ((valor - min) / range) * usableHeight;
      return { x, y };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;

    this.chartLinePath.setAttribute("d", linePath);
    this.chartAreaPath.setAttribute("d", areaPath);

    this.chartXLabels.innerHTML = pontos.map(([ano]) => `<span>${ano}</span>`).join("");

    const steps = 5;
    const labels = [];
    for (let i = 0; i < steps; i++) {
      const valor = max - (range / (steps - 1)) * i;
      labels.push(this.formatCompact(valor));
    }
    this.chartYLabels.innerHTML = labels.map(l => `<span>${l}</span>`).join("");
  }

  renderRegions(rows) {
    const porRegiao = new Map(REGIOES.map(r => [r, 0]));
    rows.forEach(r => {
      if (!r.regiao) return;
      porRegiao.set(r.regiao, (porRegiao.get(r.regiao) || 0) + (Number(r.populacao) || 0));
    });

    const total = [...porRegiao.values()].reduce((a, b) => a + b, 0);
    const entradas = [...porRegiao.entries()].sort((a, b) => b[1] - a[1]);

    if (!total) {
      this.regionList.innerHTML = `<p class="empty-hint">Sem dados de população cadastrados.</p>`;
      this.regionProgressBar.innerHTML = "";
      return;
    }

    this.regionList.innerHTML = entradas.map(([regiao, valor]) => {
      const pct = ((valor / total) * 100).toFixed(1);
      return `<div data-regiao="${regiao}"><i></i><span>${regiao}</span><strong>${this.formatCompact(valor)}</strong><em>${pct}%</em></div>`;
    }).join("");

    this.regionProgressBar.innerHTML = entradas.map(([, valor], i) => {
      const pct = ((valor / total) * 100).toFixed(1);
      return `<span style="width:${pct}%"></span>`;
    }).join("");

    this.regionList.querySelectorAll("[data-regiao]").forEach(el => {
      el.addEventListener("click", () => {
        this.filterRegiao.value = el.dataset.regiao;
        this.filterEstado.value = "";
        this.render();
      });
    });
  }

  renderRanking(rows) {
    const limit = Number(this.rankingLimit.value) || 5;
    const comPib = rows.filter(r => r.pib != null && r.uf).sort((a, b) => b.pib - a.pib).slice(0, limit);

    if (!comPib.length) {
      this.rankingBars.innerHTML = `<p class="empty-hint">Sem dados de PIB cadastrados para este filtro.</p>`;
      return;
    }

    const max = comPib[0].pib;
    this.rankingBars.innerHTML = comPib.map((r, i) => `
      <div class="bar-row">
        <b>${i + 1}</b>
        <span>${this.escape(r.uf)}</span>
        <div class="bar"><i style="width:${((r.pib / max) * 100).toFixed(1)}%"></i></div>
        <strong>${Number(r.pib).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong>
      </div>
    `).join("");
  }

  renderTable(rows) {
    const termo = this.tableSearch.value.trim().toLowerCase();
    let municipios = rows.filter(r => r.tipo === "municipio");
    if (termo) municipios = municipios.filter(r => (r.nome || "").toLowerCase().includes(termo));
    municipios = [...municipios].sort((a, b) => (Number(b.populacao) || 0) - (Number(a.populacao) || 0));

    if (!municipios.length) {
      this.cityTableBody.innerHTML = `<tr><td colspan="5">Nenhum município encontrado para este filtro.</td></tr>`;
      return;
    }

    this.cityTableBody.innerHTML = municipios.map((r, i) => `
      <tr class="city-row" data-id="${r.id}">
        <td>${String(i + 1).padStart(2, "0")}</td>
        <td><span class="city-dot"></span>${this.escape(r.nome)}</td>
        <td>${this.escape(r.uf || "—")}</td>
        <td>${(Number(r.populacao) || 0).toLocaleString("pt-BR")}</td>
        <td>${r.ano ?? "—"}</td>
      </tr>
    `).join("");

    this.cityTableBody.querySelectorAll(".city-row").forEach(row => {
      row.addEventListener("click", () => {
        window.location.href = `detalhe.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });
  }

  toast(message, type = "info") {
    document.querySelector(".dashboard-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `dashboard-toast dashboard-toast--${type} visible`;
    toast.innerHTML = `<span></span><label>${this.escape(message)}</label><button aria-label="Fechar">×</button>`;
    document.body.appendChild(toast);
    toast.querySelector("button").onclick = () => toast.remove();
    setTimeout(() => toast.remove(), 3600);
  }

  formatCompact(value) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}mil`;
    return String(Math.round(value));
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }
}

const dashboardRuntimeStyles = document.createElement("style");
dashboardRuntimeStyles.textContent = `
.dashboard-toast{position:fixed;z-index:1100;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 40px);padding:12px 13px;border:1px solid rgba(84,154,226,.2);border-radius:12px;background:rgba(8,27,49,.96);box-shadow:0 18px 40px rgba(0,0,0,.34);color:#cbdcf0;font-size:10px}.dashboard-toast>span{width:7px;height:7px;border-radius:50%;background:#56c8ff}.dashboard-toast--success>span{background:#10d5a2}.dashboard-toast button{margin-left:auto;border:0;background:transparent;color:#6e8aa9;font-size:17px;cursor:pointer}
`;
document.head.appendChild(dashboardRuntimeStyles);
