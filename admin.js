/* EcoData Brasil — admin.js
   CRUD de três coleções no Firestore:
   - "destaques": números de impacto (KPIs editoriais)
   - "graficos": definição de cada gráfico (título, tipo, tema, fonte)
   - "pontos": os valores que alimentam cada gráfico
   Protegido por autenticação: sem sessão válida, redireciona pro login.
*/
"use strict";

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => new AdminPanel().init());

class AdminPanel {
  constructor() {
    this.adminEmail = document.querySelector("#adminEmail");
    this.logoutLink = document.querySelector("#logoutLink");
    this.tabButtons = [...document.querySelectorAll(".tab-btn")];

    this.destaques = [];
    this.graficos = [];
    this.pontos = [];
  }

  init() {
    this.guardAuth();
    this.bindTabs();
    this.bindDestaqueForm();
    this.bindGraficoForm();
    this.bindPontoForm();
    this.listenCollections();
  }

  guardAuth() {
    onAuthStateChanged(auth, user => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      this.adminEmail.textContent = user.email;
    });
    this.logoutLink.addEventListener("click", async e => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = "login.html";
    });
  }

  bindTabs() {
    this.tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        this.tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".tab-panel").forEach(panel => panel.hidden = true);
        document.querySelector(`#tab-${btn.dataset.tab}`).hidden = false;
      });
    });
  }

  listenCollections() {
    onSnapshot(collection(db, "destaques"), snap => {
      this.destaques = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderDestaques();
    });

    onSnapshot(collection(db, "graficos"), snap => {
      this.graficos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderGraficos();
      this.fillGraficoSelects();
    });

    onSnapshot(collection(db, "pontos"), snap => {
      this.pontos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderPontos();
      this.renderGraficos(); // atualiza a contagem de pontos por gráfico
    });
  }

  /* ---------- DESTAQUES ---------- */

  bindDestaqueForm() {
    this.destaqueForm = document.querySelector("#destaqueForm");
    this.destaqueId = document.querySelector("#destaqueId");
    this.destaqueTitulo = document.querySelector("#destaqueTitulo");
    this.destaqueValor = document.querySelector("#destaqueValor");
    this.destaqueDescricao = document.querySelector("#destaqueDescricao");
    this.destaqueTema = document.querySelector("#destaqueTema");
    this.destaqueFonte = document.querySelector("#destaqueFonte");
    this.destaqueFormTitle = document.querySelector("#destaqueFormTitle");
    this.destaqueSaveBtn = document.querySelector("#destaqueSaveBtn");
    this.destaqueCancelBtn = document.querySelector("#destaqueCancelBtn");
    this.destaqueFormMessage = document.querySelector("#destaqueFormMessage");
    this.destaqueBody = document.querySelector("#destaqueBody");
    this.destaqueCount = document.querySelector("#destaqueCount");

    this.destaqueForm.addEventListener("submit", e => this.submitDestaque(e));
    this.destaqueCancelBtn.addEventListener("click", () => this.resetDestaqueForm());
  }

  async submitDestaque(event) {
    event.preventDefault();
    const payload = {
      titulo: this.destaqueTitulo.value.trim(),
      valor: this.destaqueValor.value.trim(),
      descricao: this.destaqueDescricao.value.trim(),
      tema: this.destaqueTema.value,
      fonte: this.destaqueFonte.value.trim()
    };
    if (!payload.titulo || !payload.valor || !payload.fonte) {
      this.setMessage(this.destaqueFormMessage, "Preencha título, valor e fonte.", "error");
      return;
    }
    this.destaqueSaveBtn.disabled = true;
    try {
      if (this.destaqueId.value) {
        await updateDoc(doc(db, "destaques", this.destaqueId.value), payload);
        this.setMessage(this.destaqueFormMessage, "Destaque atualizado.", "success");
      } else {
        await addDoc(collection(db, "destaques"), payload);
        this.setMessage(this.destaqueFormMessage, "Destaque adicionado.", "success");
      }
      this.resetDestaqueForm();
    } catch (error) {
      this.setMessage(this.destaqueFormMessage, `Erro: ${error.message}`, "error");
    } finally {
      this.destaqueSaveBtn.disabled = false;
    }
  }

  editDestaque(id) {
    const r = this.destaques.find(x => x.id === id);
    if (!r) return;
    this.destaqueId.value = r.id;
    this.destaqueTitulo.value = r.titulo || "";
    this.destaqueValor.value = r.valor || "";
    this.destaqueDescricao.value = r.descricao || "";
    this.destaqueTema.value = r.tema || "Outro";
    this.destaqueFonte.value = r.fonte || "";
    this.destaqueFormTitle.textContent = `Editando: ${r.titulo}`;
    this.destaqueSaveBtn.textContent = "Atualizar destaque";
    this.destaqueCancelBtn.hidden = false;
    this.destaqueForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async deleteDestaque(id, titulo) {
    if (!confirm(`Excluir o destaque "${titulo}"?`)) return;
    try { await deleteDoc(doc(db, "destaques", id)); }
    catch (error) { alert(`Erro ao excluir: ${error.message}`); }
  }

  resetDestaqueForm() {
    this.destaqueForm.reset();
    this.destaqueId.value = "";
    this.destaqueFormTitle.textContent = "Novo número de destaque";
    this.destaqueSaveBtn.textContent = "Salvar destaque";
    this.destaqueCancelBtn.hidden = true;
  }

  renderDestaques() {
    const rows = [...this.destaques].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
    this.destaqueCount.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;
    if (!rows.length) {
      this.destaqueBody.innerHTML = `<tr><td colspan="5">Nenhum destaque cadastrado ainda.</td></tr>`;
      return;
    }
    this.destaqueBody.innerHTML = rows.map(r => `
      <tr>
        <td>${this.escape(r.titulo)}</td>
        <td><strong>${this.escape(r.valor)}</strong></td>
        <td><span class="tag-tema">${this.escape(r.tema)}</span></td>
        <td>${this.escape(r.fonte)}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-edit="${r.id}">Editar</button>
            <button type="button" class="delete-btn" data-delete="${r.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("");
    this.destaqueBody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.editDestaque(b.dataset.edit)));
    this.destaqueBody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => {
      const r = this.destaques.find(x => x.id === b.dataset.delete);
      this.deleteDestaque(b.dataset.delete, r?.titulo || "");
    }));
  }

  /* ---------- GRÁFICOS ---------- */

  bindGraficoForm() {
    this.graficoForm = document.querySelector("#graficoForm");
    this.graficoId = document.querySelector("#graficoId");
    this.graficoTitulo = document.querySelector("#graficoTitulo");
    this.graficoTipo = document.querySelector("#graficoTipo");
    this.graficoDescricao = document.querySelector("#graficoDescricao");
    this.graficoTema = document.querySelector("#graficoTema");
    this.graficoUnidade = document.querySelector("#graficoUnidade");
    this.graficoFonte = document.querySelector("#graficoFonte");
    this.graficoFormTitle = document.querySelector("#graficoFormTitle");
    this.graficoSaveBtn = document.querySelector("#graficoSaveBtn");
    this.graficoCancelBtn = document.querySelector("#graficoCancelBtn");
    this.graficoFormMessage = document.querySelector("#graficoFormMessage");
    this.graficoBody = document.querySelector("#graficoBody");
    this.graficoCount = document.querySelector("#graficoCount");

    this.graficoForm.addEventListener("submit", e => this.submitGrafico(e));
    this.graficoCancelBtn.addEventListener("click", () => this.resetGraficoForm());
  }

  async submitGrafico(event) {
    event.preventDefault();
    const payload = {
      titulo: this.graficoTitulo.value.trim(),
      tipo: this.graficoTipo.value,
      descricao: this.graficoDescricao.value.trim(),
      tema: this.graficoTema.value,
      unidade: this.graficoUnidade.value.trim(),
      fonte: this.graficoFonte.value.trim()
    };
    if (!payload.titulo || !payload.descricao || !payload.fonte) {
      this.setMessage(this.graficoFormMessage, "Preencha título, descrição e fonte.", "error");
      return;
    }
    this.graficoSaveBtn.disabled = true;
    try {
      if (this.graficoId.value) {
        await updateDoc(doc(db, "graficos", this.graficoId.value), payload);
        this.setMessage(this.graficoFormMessage, "Gráfico atualizado.", "success");
      } else {
        await addDoc(collection(db, "graficos"), payload);
        this.setMessage(this.graficoFormMessage, "Gráfico adicionado.", "success");
      }
      this.resetGraficoForm();
    } catch (error) {
      this.setMessage(this.graficoFormMessage, `Erro: ${error.message}`, "error");
    } finally {
      this.graficoSaveBtn.disabled = false;
    }
  }

  editGrafico(id) {
    const r = this.graficos.find(x => x.id === id);
    if (!r) return;
    this.graficoId.value = r.id;
    this.graficoTitulo.value = r.titulo || "";
    this.graficoTipo.value = r.tipo || "barra";
    this.graficoDescricao.value = r.descricao || "";
    this.graficoTema.value = r.tema || "Outro";
    this.graficoUnidade.value = r.unidade || "";
    this.graficoFonte.value = r.fonte || "";
    this.graficoFormTitle.textContent = `Editando: ${r.titulo}`;
    this.graficoSaveBtn.textContent = "Atualizar gráfico";
    this.graficoCancelBtn.hidden = false;
    this.graficoForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async deleteGrafico(id, titulo) {
    const pontosVinculados = this.pontos.filter(p => p.graficoId === id);
    const aviso = pontosVinculados.length
      ? ` Isso NÃO apaga automaticamente os ${pontosVinculados.length} ponto(s) de dados vinculados — eles ficarão órfãos.`
      : "";
    if (!confirm(`Excluir o gráfico "${titulo}"?${aviso}`)) return;
    try { await deleteDoc(doc(db, "graficos", id)); }
    catch (error) { alert(`Erro ao excluir: ${error.message}`); }
  }

  resetGraficoForm() {
    this.graficoForm.reset();
    this.graficoId.value = "";
    this.graficoFormTitle.textContent = "Novo gráfico";
    this.graficoSaveBtn.textContent = "Salvar gráfico";
    this.graficoCancelBtn.hidden = true;
  }

  renderGraficos() {
    const rows = [...this.graficos].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
    this.graficoCount.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;
    if (!rows.length) {
      this.graficoBody.innerHTML = `<tr><td colspan="6">Nenhum gráfico cadastrado ainda.</td></tr>`;
      return;
    }
    this.graficoBody.innerHTML = rows.map(r => {
      const qtdPontos = this.pontos.filter(p => p.graficoId === r.id).length;
      return `
      <tr>
        <td>${this.escape(r.titulo)}</td>
        <td><span class="badge ${r.tipo}">${this.escape(r.tipo)}</span></td>
        <td><span class="tag-tema">${this.escape(r.tema)}</span></td>
        <td>${this.escape(r.unidade)}</td>
        <td>${qtdPontos}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-edit="${r.id}">Editar</button>
            <button type="button" class="delete-btn" data-delete="${r.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `;
    }).join("");
    this.graficoBody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.editGrafico(b.dataset.edit)));
    this.graficoBody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => {
      const r = this.graficos.find(x => x.id === b.dataset.delete);
      this.deleteGrafico(b.dataset.delete, r?.titulo || "");
    }));
  }

  fillGraficoSelects() {
    const options = this.graficos
      .slice()
      .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""))
      .map(g => `<option value="${g.id}">${this.escape(g.titulo)} (${g.tipo})</option>`)
      .join("");

    if (this.pontoGrafico) {
      const current = this.pontoGrafico.value;
      this.pontoGrafico.innerHTML = options || `<option value="">Cadastre um gráfico primeiro</option>`;
      if ([...this.pontoGrafico.options].some(o => o.value === current)) this.pontoGrafico.value = current;
    }
    if (this.pontoFiltroGrafico) {
      const current = this.pontoFiltroGrafico.value;
      this.pontoFiltroGrafico.innerHTML = `<option value="">Todos os gráficos</option>` + options;
      if ([...this.pontoFiltroGrafico.options].some(o => o.value === current)) this.pontoFiltroGrafico.value = current;
    }
  }

  /* ---------- PONTOS DE DADOS ---------- */

  bindPontoForm() {
    this.pontoForm = document.querySelector("#pontoForm");
    this.pontoId = document.querySelector("#pontoId");
    this.pontoGrafico = document.querySelector("#pontoGrafico");
    this.pontoRotulo = document.querySelector("#pontoRotulo");
    this.pontoValor = document.querySelector("#pontoValor");
    this.pontoOrdem = document.querySelector("#pontoOrdem");
    this.pontoFormTitle = document.querySelector("#pontoFormTitle");
    this.pontoSaveBtn = document.querySelector("#pontoSaveBtn");
    this.pontoCancelBtn = document.querySelector("#pontoCancelBtn");
    this.pontoFormMessage = document.querySelector("#pontoFormMessage");
    this.pontoBody = document.querySelector("#pontoBody");
    this.pontoCount = document.querySelector("#pontoCount");
    this.pontoFiltroGrafico = document.querySelector("#pontoFiltroGrafico");

    this.pontoForm.addEventListener("submit", e => this.submitPonto(e));
    this.pontoCancelBtn.addEventListener("click", () => this.resetPontoForm());
    this.pontoFiltroGrafico.addEventListener("change", () => this.renderPontos());
  }

  async submitPonto(event) {
    event.preventDefault();
    const payload = {
      graficoId: this.pontoGrafico.value,
      rotulo: this.pontoRotulo.value.trim(),
      valor: Number(this.pontoValor.value),
      ordem: this.pontoOrdem.value ? Number(this.pontoOrdem.value) : null
    };
    if (!payload.graficoId || !payload.rotulo || Number.isNaN(payload.valor)) {
      this.setMessage(this.pontoFormMessage, "Escolha um gráfico e preencha rótulo e valor.", "error");
      return;
    }
    this.pontoSaveBtn.disabled = true;
    try {
      if (this.pontoId.value) {
        await updateDoc(doc(db, "pontos", this.pontoId.value), payload);
        this.setMessage(this.pontoFormMessage, "Ponto atualizado.", "success");
      } else {
        await addDoc(collection(db, "pontos"), payload);
        this.setMessage(this.pontoFormMessage, "Ponto adicionado.", "success");
      }
      this.resetPontoForm();
    } catch (error) {
      this.setMessage(this.pontoFormMessage, `Erro: ${error.message}`, "error");
    } finally {
      this.pontoSaveBtn.disabled = false;
    }
  }

  editPonto(id) {
    const r = this.pontos.find(x => x.id === id);
    if (!r) return;
    this.pontoId.value = r.id;
    this.pontoGrafico.value = r.graficoId || "";
    this.pontoRotulo.value = r.rotulo || "";
    this.pontoValor.value = r.valor ?? "";
    this.pontoOrdem.value = r.ordem ?? "";
    this.pontoFormTitle.textContent = `Editando: ${r.rotulo}`;
    this.pontoSaveBtn.textContent = "Atualizar ponto";
    this.pontoCancelBtn.hidden = false;
    this.pontoForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async deletePonto(id, rotulo) {
    if (!confirm(`Excluir o ponto "${rotulo}"?`)) return;
    try { await deleteDoc(doc(db, "pontos", id)); }
    catch (error) { alert(`Erro ao excluir: ${error.message}`); }
  }

  resetPontoForm() {
    this.pontoForm.reset();
    this.pontoId.value = "";
    this.pontoFormTitle.textContent = "Novo ponto de dado";
    this.pontoSaveBtn.textContent = "Salvar ponto";
    this.pontoCancelBtn.hidden = true;
  }

  renderPontos() {
    const filtro = this.pontoFiltroGrafico?.value || "";
    let rows = filtro ? this.pontos.filter(p => p.graficoId === filtro) : this.pontos;
    rows = [...rows].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

    this.pontoCount.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;
    if (!rows.length) {
      this.pontoBody.innerHTML = `<tr><td colspan="5">Nenhum ponto cadastrado ainda.</td></tr>`;
      return;
    }
    this.pontoBody.innerHTML = rows.map(r => {
      const grafico = this.graficos.find(g => g.id === r.graficoId);
      return `
      <tr>
        <td>${this.escape(grafico?.titulo || "(gráfico removido)")}</td>
        <td>${this.escape(r.rotulo)}</td>
        <td>${r.valor}</td>
        <td>${r.ordem ?? "—"}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-edit="${r.id}">Editar</button>
            <button type="button" class="delete-btn" data-delete="${r.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `;
    }).join("");
    this.pontoBody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => this.editPonto(b.dataset.edit)));
    this.pontoBody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => {
      const r = this.pontos.find(x => x.id === b.dataset.delete);
      this.deletePonto(b.dataset.delete, r?.rotulo || "");
    }));
  }

  /* ---------- utilidades ---------- */

  setMessage(el, text, type) {
    el.textContent = text;
    el.className = `form-message ${type}`;
    setTimeout(() => { el.textContent = ""; el.className = "form-message"; }, 3500);
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }
}
