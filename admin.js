/* IBGE Analytics — admin.js
   CRUD de registros (estados/municípios) na coleção "localidades" do Firestore.
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
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { ESTADOS, regiaoDoEstado } from "./dados-brasil.js";

const COLLECTION = "localidades";

document.addEventListener("DOMContentLoaded", () => new AdminPanel().init());

class AdminPanel {
  constructor() {
    this.form = document.querySelector("#recordForm");
    this.recordId = document.querySelector("#recordId");
    this.tipo = document.querySelector("#tipo");
    this.nome = document.querySelector("#nome");
    this.uf = document.querySelector("#uf");
    this.regiao = document.querySelector("#regiao");
    this.populacao = document.querySelector("#populacao");
    this.ano = document.querySelector("#ano");
    this.pib = document.querySelector("#pib");
    this.idhm = document.querySelector("#idhm");
    this.formTitle = document.querySelector("#formTitle");
    this.saveBtn = document.querySelector("#saveBtn");
    this.cancelEditBtn = document.querySelector("#cancelEditBtn");
    this.formMessage = document.querySelector("#formMessage");
    this.recordsBody = document.querySelector("#recordsBody");
    this.recordCount = document.querySelector("#recordCount");
    this.filterTipo = document.querySelector("#filterTipo");
    this.adminSearch = document.querySelector("#adminSearch");
    this.adminEmail = document.querySelector("#adminEmail");
    this.logoutLink = document.querySelector("#logoutLink");

    this.records = [];
  }

  init() {
    this.guardAuth();
    this.fillUfOptions();
    this.uf.addEventListener("change", () => this.updateRegiaoField());
    this.updateRegiaoField();

    this.form.addEventListener("submit", e => this.handleSubmit(e));
    this.cancelEditBtn.addEventListener("click", () => this.resetForm());
    this.filterTipo.addEventListener("change", () => this.renderTable());
    this.adminSearch.addEventListener("input", () => this.renderTable());

    this.logoutLink.addEventListener("click", async e => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = "login.html";
    });

    this.listenToRecords();
  }

  guardAuth() {
    onAuthStateChanged(auth, user => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      this.adminEmail.textContent = user.email;
    });
  }

  fillUfOptions() {
    this.uf.innerHTML = ESTADOS
      .map(e => `<option value="${e.uf}">${e.uf} — ${e.nome}</option>`)
      .join("");
  }

  updateRegiaoField() {
    this.regiao.value = regiaoDoEstado(this.uf.value);
  }

  listenToRecords() {
    // onSnapshot mantém a tabela em tempo real, sem precisar recarregar a página.
    onSnapshot(collection(db, COLLECTION), snapshot => {
      this.records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      this.renderTable();
    }, error => {
      this.recordsBody.innerHTML = `<tr><td colspan="8">Erro ao carregar registros: ${this.escape(error.message)}</td></tr>`;
    });
  }

  async handleSubmit(event) {
    event.preventDefault();

    const payload = {
      tipo: this.tipo.value,
      nome: this.nome.value.trim(),
      uf: this.uf.value,
      regiao: regiaoDoEstado(this.uf.value),
      populacao: Number(this.populacao.value) || 0,
      ano: Number(this.ano.value) || null,
      pib: this.pib.value ? Number(this.pib.value) : null,
      idhm: this.idhm.value ? Number(this.idhm.value) : null,
      atualizadoEm: serverTimestamp()
    };

    if (!payload.nome || !payload.uf || !payload.ano) {
      this.setMessage("Preencha nome, UF e ano de referência.", "error");
      return;
    }

    this.saveBtn.disabled = true;

    try {
      if (this.recordId.value) {
        await updateDoc(doc(db, COLLECTION, this.recordId.value), payload);
        this.setMessage("Registro atualizado com sucesso.", "success");
      } else {
        await addDoc(collection(db, COLLECTION), payload);
        this.setMessage("Registro adicionado com sucesso.", "success");
      }
      this.resetForm();
    } catch (error) {
      this.setMessage(`Erro ao salvar: ${error.message}`, "error");
    } finally {
      this.saveBtn.disabled = false;
    }
  }

  editRecord(id) {
    const record = this.records.find(r => r.id === id);
    if (!record) return;

    this.recordId.value = record.id;
    this.tipo.value = record.tipo || "municipio";
    this.nome.value = record.nome || "";
    this.uf.value = record.uf || "";
    this.updateRegiaoField();
    this.populacao.value = record.populacao ?? "";
    this.ano.value = record.ano ?? "";
    this.pib.value = record.pib ?? "";
    this.idhm.value = record.idhm ?? "";

    this.formTitle.textContent = `Editando: ${record.nome}`;
    this.saveBtn.textContent = "Atualizar registro";
    this.cancelEditBtn.hidden = false;
    this.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async deleteRecord(id, nome) {
    if (!confirm(`Excluir o registro "${nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  }

  resetForm() {
    this.form.reset();
    this.recordId.value = "";
    this.updateRegiaoField();
    this.formTitle.textContent = "Novo registro";
    this.saveBtn.textContent = "Salvar registro";
    this.cancelEditBtn.hidden = true;
  }

  renderTable() {
    const tipoFiltro = this.filterTipo.value;
    const termo = this.adminSearch.value.trim().toLowerCase();

    let rows = this.records;
    if (tipoFiltro) rows = rows.filter(r => r.tipo === tipoFiltro);
    if (termo) {
      rows = rows.filter(r =>
        [r.nome, r.uf, r.regiao].filter(Boolean).some(v => v.toLowerCase().includes(termo))
      );
    }
    rows = [...rows].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    this.recordCount.textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;

    if (!rows.length) {
      this.recordsBody.innerHTML = `<tr><td colspan="8">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    this.recordsBody.innerHTML = rows.map(r => `
      <tr>
        <td>${this.escape(r.nome)} <span class="badge ${r.tipo}">${r.tipo === "estado" ? "Estado" : "Município"}</span></td>
        <td>${this.escape(r.uf || "—")}</td>
        <td>${this.escape(r.regiao || "—")}</td>
        <td>${this.formatNumber(r.populacao)}</td>
        <td>${r.pib != null ? this.formatNumber(r.pib) : "—"}</td>
        <td>${r.idhm != null ? r.idhm.toFixed(3) : "—"}</td>
        <td>${r.ano ?? "—"}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-edit="${r.id}">Editar</button>
            <button type="button" class="delete-btn" data-delete="${r.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("");

    this.recordsBody.querySelectorAll("[data-edit]").forEach(btn =>
      btn.addEventListener("click", () => this.editRecord(btn.dataset.edit))
    );
    this.recordsBody.querySelectorAll("[data-delete]").forEach(btn =>
      btn.addEventListener("click", () => {
        const record = this.records.find(r => r.id === btn.dataset.delete);
        this.deleteRecord(btn.dataset.delete, record?.nome || "");
      })
    );
  }

  setMessage(text, type) {
    this.formMessage.textContent = text;
    this.formMessage.className = `form-message ${type}`;
    setTimeout(() => {
      this.formMessage.textContent = "";
      this.formMessage.className = "form-message";
    }, 3500);
  }

  formatNumber(value) {
    if (value == null) return "—";
    return Number(value).toLocaleString("pt-BR");
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }
}
