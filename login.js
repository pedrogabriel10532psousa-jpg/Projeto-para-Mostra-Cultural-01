/* IBGE Analytics — login.js
   Validação no cliente e preparação para futura API de autenticação.
   Nunca coloque credenciais reais neste arquivo.
*/
"use strict";

document.addEventListener("DOMContentLoaded", () => new LoginPage().init());

class LoginPage {
  constructor() {
    this.form = document.querySelector("form");
    this.email = document.querySelector("#email");
    this.password = document.querySelector("#password");
    this.remember = document.querySelector('input[name="remember"]');
    this.submit = document.querySelector(".submit-btn");
  }

  init() {
    if (!this.form) return;
    this.restoreEmail();
    [this.email, this.password].forEach(input => {
      input?.addEventListener("blur", () => this.validate(input));
      input?.addEventListener("input", () => this.clearError(input));
    });
    this.passwordVisibility();
    this.form.addEventListener("submit", e => this.submitLogin(e));
  }

  validate(input) {
    if (!input) return false;
    let error = "";
    if (!input.value.trim()) error = "Preencha este campo.";
    else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value))
      error = "Digite um e-mail válido.";
    else if (input.type === "password" && input.value.length < 6)
      error = "A senha deve ter pelo menos 6 caracteres.";

    this.clearError(input);
    if (error) {
      input.classList.add("field-error");
      const msg = document.createElement("small");
      msg.className = "field-message";
      msg.textContent = error;
      input.insertAdjacentElement("afterend", msg);
      return false;
    }
    input.classList.add("field-valid");
    return true;
  }

  clearError(input) {
    if (!input) return;
    input.classList.remove("field-error", "field-valid");
    input.nextElementSibling?.classList.contains("field-message") && input.nextElementSibling.remove();
  }

  passwordVisibility() {
    if (!this.password) return;
    const wrapper = document.createElement("div");
    wrapper.className = "password-wrapper";
    this.password.parentNode.insertBefore(wrapper, this.password);
    wrapper.appendChild(this.password);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "password-toggle";
    button.textContent = "◉";
    button.setAttribute("aria-label", "Mostrar senha");
    wrapper.appendChild(button);

    button.onclick = () => {
      const hidden = this.password.type === "password";
      this.password.type = hidden ? "text" : "password";
      button.textContent = hidden ? "◎" : "◉";
      button.setAttribute("aria-label", hidden ? "Ocultar senha" : "Mostrar senha");
    };
  }

  async submitLogin(event) {
    event.preventDefault();

    const emailOk = this.validate(this.email);
    const passwordOk = this.validate(this.password);
    if (!emailOk || !passwordOk) {
      this.message("Revise os campos destacados.", "error");
      return;
    }

    this.setLoading(true);

    /*
      FUTURA API:
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: this.email.value,
          password: this.password.value
        })
      });
    */

    await new Promise(resolve => setTimeout(resolve, 650));

    if (this.remember?.checked) localStorage.setItem("ibge_admin_email", this.email.value.trim());
    else localStorage.removeItem("ibge_admin_email");

    this.message("Acesso autorizado. Abrindo o painel...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 650);
  }

  restoreEmail() {
    const saved = localStorage.getItem("ibge_admin_email");
    if (saved && this.email) {
      this.email.value = saved;
      if (this.remember) this.remember.checked = true;
    }
  }

  setLoading(loading) {
    if (!this.submit) return;
    this.submit.disabled = loading;
    if (loading) {
      this.submit.dataset.normal = this.submit.innerHTML;
      this.submit.innerHTML = '<span class="login-loader"></span> Validando acesso...';
    } else {
      this.submit.innerHTML = this.submit.dataset.normal || 'Entrar no painel <span>→</span>';
    }
  }

  message(text, type) {
    document.querySelector(".login-message")?.remove();
    const box = document.createElement("div");
    box.className = `login-message login-message--${type} visible`;
    box.textContent = text;
    this.form.insertAdjacentElement("beforebegin", box);
    setTimeout(() => box.remove(), 3200);
  }
}

const loginRuntimeStyles = document.createElement("style");
loginRuntimeStyles.textContent = `
.password-wrapper{position:relative}.password-wrapper input{padding-right:45px!important}.password-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#6e8eaf;cursor:pointer}
.field-error{border-color:rgba(244,92,92,.8)!important;box-shadow:0 0 0 3px rgba(244,92,92,.08)}.field-valid{border-color:rgba(16,213,162,.38)!important}.field-message{display:block;margin:-3px 0 4px;color:#ff8585;font-size:9px}
.login-message{margin:0 0 15px;padding:10px 12px;border-radius:10px;font-size:10px}.login-message--error{color:#ffb0b0;border:1px solid rgba(244,92,92,.2);background:rgba(244,92,92,.06)}.login-message--success{color:#8ff0d4;border:1px solid rgba(16,213,162,.2);background:rgba(16,213,162,.06)}
.submit-btn:disabled{opacity:.75;cursor:wait}.login-loader{display:inline-block;width:11px;height:11px;margin-right:7px;vertical-align:-1px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:ibge-spin .7s linear infinite}@keyframes ibge-spin{to{transform:rotate(360deg)}}
`;
document.head.appendChild(loginRuntimeStyles);
