/* IBGE Analytics — detalhe.js
   Lê o parâmetro ?id= da URL, busca o registro correspondente no Firestore
   e mostra todos os indicadores daquela localidade, além de comparativos
   com outras localidades da mesma região.
*/
"use strict";

import { db } from "./firebase-config.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { nomeEstado } from "./dados-brasil.js";

const COLLECTION = "localidades";

document.addEventListener("DOMContentLoaded", () => new DetailPage().init());

class DetailPage {
  constructor() {
    this.state = document.querySelector("#detailState");
    this.template = document.querySelector("#detailTemplate");
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      this.showError("Nenhum registro informado na URL. Volte ao dashboard e selecione um município.");
      return;
    }

    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (!snap.exists()) {
        this.showError("Este registro não foi encontrado — pode ter sido removido.");
        return;
      }
      const record = { id: snap.id, ...snap.data() };
      await this.render(record);
    } catch (error) {
      this.showError(`Erro ao carregar dados: ${error.message}`);
    }
  }

  async render(record) {
    const content = this.template.content.cloneNode(true);

    content.querySelector('[data-field="tipo"]').textContent =
      record.tipo === "estado" ? "ESTADO" : "MUNICÍPIO";
    content.querySelector('[data-field="nome"]').textContent = record.nome || "—";
    content.querySelector('[data-field="subtitulo"]').textContent =
      `${record.regiao || "Região não informada"} · ${nomeEstado(record.uf) || record.uf || "—"}`;

    content.querySelector('[data-field="populacao"]').textContent =
      record.populacao != null ? Number(record.populacao).toLocaleString("pt-BR") : "—";
    content.querySelector('[data-field="ano"]').textContent = record.ano ?? "—";
    content.querySelector('[data-field="pib"]').textContent =
      record.pib != null ? `R$ ${Number(record.pib).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi` : "—";
    content.querySelector('[data-field="idhm"]').textContent =
      record.idhm != null ? Number(record.idhm).toFixed(3) : "—";
    content.querySelector('[data-field="regiao"]').textContent = record.regiao || "—";
    content.querySelector('[data-field="uf"]').textContent = record.uf || "—";

    const relacionadosBody = content.querySelector('[data-field="relacionados"]');
    const relacionados = await this.buscarRelacionados(record);

    if (!relacionados.length) {
      relacionadosBody.innerHTML = `<tr><td colspan="4">Nenhuma outra localidade cadastrada nesta região ainda.</td></tr>`;
    } else {
      relacionadosBody.innerHTML = relacionados.map(r => `
        <tr data-id="${r.id}">
          <td>${this.escape(r.nome)}</td>
          <td>${this.escape(r.uf || "—")}</td>
          <td>${r.populacao != null ? Number(r.populacao).toLocaleString("pt-BR") : "—"}</td>
          <td>${r.pib != null ? Number(r.pib).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</td>
        </tr>
      `).join("");

      relacionadosBody.querySelectorAll("tr[data-id]").forEach(row => {
        row.addEventListener("click", () => {
          window.location.href = `detalhe.html?id=${encodeURIComponent(row.dataset.id)}`;
        });
      });
    }

    this.state.innerHTML = "";
    this.state.appendChild(content);
    document.title = `IBGE Analytics — ${record.nome || "Detalhamento"}`;
  }

  async buscarRelacionados(record) {
    if (!record.regiao) return [];
    const q = query(collection(db, COLLECTION), where("regiao", "==", record.regiao));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.id !== record.id)
      .sort((a, b) => (Number(b.populacao) || 0) - (Number(a.populacao) || 0))
      .slice(0, 8);
  }

  showError(message) {
    this.state.innerHTML = `<p class="empty-hint">${this.escape(message)}</p>`;
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }
}
