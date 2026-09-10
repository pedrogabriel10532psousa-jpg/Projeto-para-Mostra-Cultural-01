/* IBGE Analytics — firebase-config.js
   Configuração central do Firebase, usada por login.js e dashboard.js.

   COMO OBTER ESSES VALORES:
   1. Acesse https://console.firebase.google.com e crie um projeto (ou use um existente).
   2. No menu lateral, vá em "Compilação" > "Authentication" > aba "Sign-in method"
      e habilite o provedor "E-mail/senha".
   3. Ainda em Authentication, na aba "Users", crie um usuário de teste (e-mail + senha)
      para conseguir fazer login.
   4. Vá em "Configurações do projeto" (ícone de engrenagem) > "Geral" > role até
      "Seus apps" > clique no ícone "</>" para registrar um app da Web.
   5. Copie o objeto firebaseConfig gerado e cole abaixo, substituindo os valores de exemplo.

   Este arquivo não guarda segredos sensíveis: a apiKey do Firebase é pública por
   design (a segurança real vem das regras do Firestore/Auth), mas ainda assim
   evite versionar chaves de projetos de produção em repositórios públicos.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
