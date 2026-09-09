/* IBGE Analytics — dashboard.js
   Interações da interface.
   Os números exibidos no HTML são demonstrativos até a integração com a fonte real do IBGE.
*/
"use strict";

document.addEventListener("DOMContentLoaded", () => new Dashboard().init());

class Dashboard {
  constructor() {
    this.nav = [...document.querySelectorAll(".main-nav .nav-item")];
    this.search = document.querySelector(".search-box input");
    this.regionSelect = document.querySelector(".chart-panel select");
    this.rankingSelect = document.querySelector(".ranking-panel select");
    this.notificationButton = document.querySelector(".icon-btn");
    this.profile = document.querySelector(".profile");
    this.rows = [...document.querySelectorAll("tbody tr")];
  }

  init() {
    this.navigation();
    this.searching();
    this.filters();
    this.notifications();
    this.profileMenu();
    this.actions();
    this.shortcuts();
    this.animateCards();
  }

  navigation() {
    this.nav.forEach(item => item.addEventListener("click", e => {
      e.preventDefault();
      this.nav.forEach(x => x.classList.remove("active"));
      item.classList.add("active");
      const name = item.querySelector("span:last-child")?.textContent.trim();
      if (name) this.toast(`Seção "${name}" selecionada.`, "info");
    }));
  }

  searching() {
    this.search?.addEventListener("input", () => {
      const term = this.search.value.trim().toLowerCase();
      this.rows.forEach(row => row.hidden = Boolean(term) && !row.textContent.toLowerCase().includes(term));
    });

    this.search?.addEventListener("focus", () => {
      this.search.closest(".search-box")?.classList.add("is-focused");
    });

    this.search?.addEventListener("blur", () => {
      this.search.closest(".search-box")?.classList.remove("is-focused");
    });
  }

  filters() {
    this.regionSelect?.addEventListener("change", e => {
      const region = e.target.value;
      const title = document.querySelector(".chart-panel h2");
      if (title) {
        title.textContent = region === "Brasil"
          ? "Evolução da população brasileira"
          : `Evolução da população — ${region}`;
      }
      document.querySelector(".line-chart")?.animate(
        [{ opacity: .45, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 260, easing: "ease-out" }
      );
      this.toast(`Filtro aplicado: ${region}`, "success");
    });

    this.rankingSelect?.addEventListener("change", e => {
      const limit = Number.parseInt(e.target.value, 10) || 5;
      document.querySelectorAll(".bar-row").forEach((row, index) => row.hidden = index >= limit);
      this.toast(`Ranking atualizado para ${limit} posições.`, "info");
    });
  }

  notifications() {
    this.notificationButton?.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelector(".notification-popover")?.remove();

      const pop = document.createElement("div");
      pop.className = "notification-popover visible";
      pop.innerHTML = `
        <div class="popover-header"><strong>Notificações</strong><span>2 novas</span></div>
        <div class="notification-item"><i></i><div><strong>Dashboard pronto</strong><p>Os componentes de visualização foram carregados.</p></div></div>
        <div class="notification-item"><i></i><div><strong>Integração pendente</strong><p>Conecte a fonte de dados para usar informações reais.</p></div></div>
      `;
      document.body.appendChild(pop);

      const rect = this.notificationButton.getBoundingClientRect();
      pop.style.top = `${rect.bottom + window.scrollY + 10}px`;
      pop.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;

      setTimeout(() => document.addEventListener("click", () => pop.remove(), { once: true }), 0);
    });
  }

  profileMenu() {
    this.profile?.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelector(".profile-menu")?.remove();

      const menu = document.createElement("div");
      menu.className = "profile-menu visible";
      menu.innerHTML = `
        <button data-action="profile">Meu perfil</button>
        <button data-action="settings">Configurações</button>
        <button data-action="logout">Sair</button>
      `;

      document.body.appendChild(menu);
      const rect = this.profile.getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;

      menu.addEventListener("click", event => {
        const action = event.target.closest("button")?.dataset.action;
        if (!action) return;
        if (action === "logout") window.location.href = "login.html";
        else this.toast(action === "profile" ? "Perfil administrativo." : "Configurações administrativas.", "info");
        menu.remove();
      });

      setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
    });
  }

  actions() {
    document.querySelector(".primary-btn")?.addEventListener("click", () => {
      document.querySelector(".table-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      this.toast("Indicadores detalhados exibidos.", "success");
    });

    document.querySelector(".more-btn")?.addEventListener("click", () =>
      this.toast("Mais opções do mapa estarão disponíveis na integração.", "info")
    );

    document.querySelector(".text-link")?.addEventListener("click", e => {
      e.preventDefault();
      this.rows.forEach(row => row.hidden = false);
      if (this.search) this.search.value = "";
      this.toast("Todos os registros demonstrativos foram exibidos.", "success");
    });
  }

  shortcuts() {
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.search?.focus();
      }
      if (e.key === "Escape") {
        document.querySelector(".notification-popover, .profile-menu")?.remove();
        this.search?.blur();
      }
    });
  }

  animateCards() {
    document.querySelectorAll(".kpi-card, .panel").forEach((card, index) => {
      card.animate(
        [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 420, delay: Math.min(index * 40, 320), easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }
      );
    });
  }

  toast(message, type = "info") {
    document.querySelector(".dashboard-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `dashboard-toast dashboard-toast--${type} visible`;
    toast.innerHTML = `<span></span><label>${this.escape(message)}</label><button aria-label="Fechar">×</button>`;
    document.body.appendChild(toast);
    toast.querySelector("button").onclick = () => toast.remove();
    setTimeout(() => toast.remove(), 3200);
  }

  escape(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
}

const dashboardRuntimeStyles = document.createElement("style");
dashboardRuntimeStyles.textContent = `
.is-focused{border-color:rgba(33,150,255,.58)!important;box-shadow:0 0 0 3px rgba(33,150,255,.08)}
.notification-popover,.profile-menu{position:absolute;z-index:1000;border:1px solid rgba(84,154,226,.2);border-radius:14px;background:#0b213d;box-shadow:0 24px 60px rgba(0,0,0,.34);opacity:0;transform:translateY(-5px);padding:8px;transition:.18s}
.notification-popover.visible,.profile-menu.visible{opacity:1;transform:translateY(0)}
.notification-popover{width:300px;padding:12px}.popover-header{display:flex;justify-content:space-between;padding:4px;color:#edf5ff;font-size:12px}.popover-header span{color:#55c5ff;font-size:9px}
.notification-item{display:flex;gap:10px;padding:10px 4px;border-top:1px solid rgba(84,154,226,.1)}.notification-item i{width:7px;height:7px;margin-top:4px;border-radius:50%;background:#2196ff}.notification-item strong{display:block;font-size:10px;color:#dcecff}.notification-item p{margin-top:3px;font-size:9px;color:#7992b1;line-height:1.45}
.profile-menu{width:170px}.profile-menu button{display:block;width:100%;border:0;border-radius:9px;padding:10px;background:transparent;color:#adc2da;text-align:left;font-size:10px;cursor:pointer}.profile-menu button:hover{background:rgba(33,150,255,.1);color:white}
.dashboard-toast{position:fixed;z-index:1100;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 40px);padding:12px 13px;border:1px solid rgba(84,154,226,.2);border-radius:12px;background:rgba(8,27,49,.96);box-shadow:0 18px 40px rgba(0,0,0,.34);color:#cbdcf0;font-size:10px}.dashboard-toast>span{width:7px;height:7px;border-radius:50%;background:#56c8ff}.dashboard-toast--success>span{background:#10d5a2}.dashboard-toast button{margin-left:auto;border:0;background:transparent;color:#6e8aa9;font-size:17px;cursor:pointer}
`;
document.head.appendChild(dashboardRuntimeStyles);
