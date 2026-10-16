/* EcoData Brasil — dashboard.js
   Dashboard público (sem login). Lê as coleções "destaques", "graficos" e "pontos"
   do Firestore em tempo real e renderiza cards de destaque + gráficos de
   barra, linha e pizza — cada um com título, descrição e fonte visíveis.
*/
"use strict";

import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CORES = ["#2196ff", "#10d5a2", "#ffbf47", "#ff6cc7", "#9b8cff", "#6fe3ff", "#ff8585"];

document.addEventListener("DOMContentLoaded", () => new Dashboard().init());

class Dashboard {
  constructor() {
    this.destaquesGrid = document.querySelector("#destaquesGrid");
    this.themeTabs = document.querySelector("#themeTabs");
    this.chartsGrid = document.querySelector("#chartsGrid");
    this.chartCardTemplate = document.querySelector("#chartCardTemplate");
    this.statusText = document.querySelector("#statusText");
    this.chartSearch = document.querySelector("#chartSearch");

    this.destaques = [];
    this.graficos = [];
    this.pontos = [];
    this.temaAtivo = "";
  }

  init() {
    this.bindEvents();
    this.listen();
  }

  bindEvents() {
    this.chartSearch.addEventListener("input", () => this.renderCharts());
  }

  listen() {
    let carregados = 0;
    const marcarCarregado = () => {
      carregados++;
      if (carregados >= 3) this.statusText.textContent = "dados atualizados";
    };

    onSnapshot(collection(db, "destaques"), snap => {
      this.destaques = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderDestaques();
      marcarCarregado();
    }, () => { this.statusText.textContent = "erro ao carregar"; });

    onSnapshot(collection(db, "graficos"), snap => {
      this.graficos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderThemeTabs();
      this.renderCharts();
      marcarCarregado();
    }, () => { this.statusText.textContent = "erro ao carregar"; });

    onSnapshot(collection(db, "pontos"), snap => {
      this.pontos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderCharts();
      marcarCarregado();
    }, () => { this.statusText.textContent = "erro ao carregar"; });
  }

  /* ---------- destaques ---------- */

  renderDestaques() {
    if (!this.destaques.length) {
      this.destaquesGrid.innerHTML = `<p class="empty-hint">Nenhum número de destaque cadastrado ainda.</p>`;
      return;
    }
    this.destaquesGrid.innerHTML = this.destaques.map((d, index) => `
      <article class="kpi-card" data-aos="fade-up" data-aos-delay="${Math.min(index * 120, 480)}">
        <div class="kpi-icon">◉</div>
        <div class="kpi-body">
          <span>${this.escape(d.titulo)}</span>
          <strong>${this.escape(d.valor)}</strong>
          <small>${this.escape(d.descricao)}</small>
        </div>
      </article>
    `).join("");

    // Os KPI cards são criados dinamicamente pelo Firestore; atualize o AOS após renderizá-los.
    if (window.AOS) window.AOS.refreshHard();
  }

  /* ---------- abas de tema ---------- */

  renderThemeTabs() {
    const temas = [...new Set(this.graficos.map(g => g.tema).filter(Boolean))].sort();
    this.themeTabs.innerHTML = `<button type="button" class="theme-tab ${this.temaAtivo === "" ? "active" : ""}" data-tema="">Todos os temas</button>` +
      temas.map(t => `<button type="button" class="theme-tab ${this.temaAtivo === t ? "active" : ""}" data-tema="${this.escape(t)}">${this.escape(t)}</button>`).join("");

    this.themeTabs.querySelectorAll(".theme-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this.temaAtivo = btn.dataset.tema;
        this.renderThemeTabs();
        this.renderCharts();
      });
    });
  }

  /* ---------- gráficos ---------- */

  renderCharts() {
    const termo = this.chartSearch.value.trim().toLowerCase();
    let graficos = this.graficos;
    if (this.temaAtivo) graficos = graficos.filter(g => g.tema === this.temaAtivo);
    if (termo) {
      graficos = graficos.filter(g =>
        [g.titulo, g.tema, g.descricao].filter(Boolean).some(v => v.toLowerCase().includes(termo))
      );
    }
    graficos = [...graficos].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));

    if (!graficos.length) {
      this.chartsGrid.innerHTML = `<p class="empty-hint">Nenhum gráfico encontrado para este filtro.</p>`;
      return;
    }

    this.chartsGrid.innerHTML = "";
    graficos.forEach(g => {
      const node = this.chartCardTemplate.content.cloneNode(true);
      node.querySelector('[data-field="tema"]').textContent = g.tema || "—";
      node.querySelector('[data-field="titulo"]').textContent = g.titulo || "—";
      node.querySelector('[data-field="descricao"]').textContent = g.descricao || "";
      node.querySelector('[data-field="fonte"]').textContent = g.fonte || "não informada";

      const renderSlot = node.querySelector('[data-field="render"]');
      const pontos = this.pontos
        .filter(p => p.graficoId === g.id)
        .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

      if (!pontos.length) {
        renderSlot.innerHTML = `<p class="empty-hint">Sem pontos de dados cadastrados para este gráfico ainda.</p>`;
      } else if (g.tipo === "pizza") {
        renderSlot.innerHTML = this.renderPizza(pontos, g.unidade);
      } else if (g.tipo === "linha") {
        renderSlot.innerHTML = this.renderLinha(pontos, g.unidade);
      } else {
        renderSlot.innerHTML = this.renderBarra(pontos, g.unidade);
      }

      this.chartsGrid.appendChild(node);
    });
  }

  renderBarra(pontos, unidade) {
    const max = Math.max(...pontos.map(p => Number(p.valor) || 0), 1);
    return `<div class="simple-bars">${pontos.map(p => `
      <div class="simple-bar-row">
        <span>${this.escape(p.rotulo)}</span>
        <div class="simple-bar-track"><div class="simple-bar-fill" style="width:${((Number(p.valor) || 0) / max * 100).toFixed(1)}%"></div></div>
        <strong>${this.formatNumber(p.valor)}${unidade ? " " + this.escape(unidade) : ""}</strong>
      </div>
    `).join("")}</div>`;
  }

  renderLinha(pontos, unidade) {
    const width = 560;
    const height = 200;
    const padLeft = 44;
    const padBottom = 26;
    const valores = pontos.map(p => Number(p.valor) || 0);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const range = max - min || 1;
    const usableWidth = width - padLeft - 10;
    const usableHeight = height - padBottom;

    const coords = pontos.map((p, i) => {
      const x = padLeft + (pontos.length === 1 ? 0 : (i / (pontos.length - 1)) * usableWidth);
      const y = usableHeight - ((Number(p.valor) - min) / range) * usableHeight + 8;
      return { x, y, ...p };
    });

    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const areaPath = `${path} L${coords[coords.length - 1].x} ${usableHeight + 8} L${coords[0].x} ${usableHeight + 8} Z`;

    const pontosSvg = coords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#2196ff" stroke="#04101f" stroke-width="2"/>`).join("");
    const labelsSvg = coords.map(c => `<text x="${c.x.toFixed(1)}" y="${height - 6}" font-size="10" fill="#7f96b3" text-anchor="middle">${this.escape(c.rotulo)}</text>`).join("");
    const valuesSvg = coords.map(c => `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" font-size="10" fill="#c9d9ec" text-anchor="middle">${this.formatNumber(c.valor)}</text>`).join("");

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto">
        <defs>
          <linearGradient id="lg-${Math.random().toString(36).slice(2)}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#2196ff" stop-opacity=".28"/>
            <stop offset="100%" stop-color="#2196ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="rgba(33,150,255,.16)"/>
        <path d="${path}" fill="none" stroke="#2196ff" stroke-width="3"/>
        ${pontosSvg}
        ${valuesSvg}
        ${labelsSvg}
      </svg>
      ${unidade ? `<p class="chart-desc">Valores em ${this.escape(unidade)}</p>` : ""}
    `;
  }

  renderPizza(pontos, unidade) {
    const total = pontos.reduce((sum, p) => sum + (Number(p.valor) || 0), 0) || 1;
    let anguloAtual = -90;
    const raio = 70;
    const cx = 80;
    const cy = 80;

    const fatias = pontos.map((p, i) => {
      const valor = Number(p.valor) || 0;
      const fatiaAngulo = (valor / total) * 360;
      const inicio = anguloAtual;
      const fim = anguloAtual + fatiaAngulo;
      anguloAtual = fim;

      const [x1, y1] = this.pontoNoCirculo(cx, cy, raio, inicio);
      const [x2, y2] = this.pontoNoCirculo(cx, cy, raio, fim);
      const largeArc = fatiaAngulo > 180 ? 1 : 0;
      const cor = CORES[i % CORES.length];

      return {
        path: `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${raio} ${raio} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
        cor,
        rotulo: p.rotulo,
        valor,
        pct: ((valor / total) * 100).toFixed(1)
      };
    });

    const pathsSvg = fatias.map(f => `<path d="${f.path}" fill="${f.cor}" stroke="#04101f" stroke-width="1.5"/>`).join("");
    const legendaHtml = fatias.map(f => `
      <div class="pie-legend-item">
        <i style="background:${f.cor}"></i>
        <span>${this.escape(f.rotulo)} — <strong>${f.pct}%</strong>${unidade ? ` (${this.formatNumber(f.valor)} ${this.escape(unidade)})` : ""}</span>
      </div>
    `).join("");

    return `
      <div class="pie-wrap">
        <svg viewBox="0 0 160 160">${pathsSvg}</svg>
        <div class="pie-legend">${legendaHtml}</div>
      </div>
    `;
  }

  pontoNoCirculo(cx, cy, raio, anguloGraus) {
    const rad = (anguloGraus * Math.PI) / 180;
    return [cx + raio * Math.cos(rad), cy + raio * Math.sin(rad)];
  }

  formatNumber(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }
}
