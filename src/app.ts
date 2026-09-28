import { createClient, User } from '@supabase/supabase-js';

// 1. Configuração do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variáveis de ambiente do Supabase não configuradas!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Interfaces de Tipagem
interface Theme {
  id: string;
  name: string;
  used: boolean;
  created_at?: string;
}

interface UserPermission {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
}

// Estados Locais
let themes: Theme[] = [];
let currentUser: User | null = null;
let isAdmin = false;
let isApprovedUser = false;

// Captura de Elementos do DOM
const loginScreen = document.getElementById("login-screen") as HTMLDivElement;
const mainContent = document.getElementById("main-content") as HTMLDivElement;
const btnLoginGoogle = document.getElementById("btn-login-google") as HTMLButtonElement;
const btnLogout = document.getElementById("btn-logout") as HTMLButtonElement;
const btnLogoutMain = document.getElementById("btn-logout-main") as HTMLButtonElement;
const authStatus = document.getElementById("auth-status") as HTMLDivElement;
const adminPanel = document.getElementById("admin-panel") as HTMLDivElement;

const themeForm = document.getElementById("theme-form") as HTMLFormElement;
const themeInput = document.getElementById("theme-input") as HTMLInputElement;
const themeList = document.getElementById("theme-list") as HTMLUListElement;
const btnDraw = document.getElementById("btn-draw") as HTMLButtonElement;
const drawnResult = document.getElementById("drawn-result") as HTMLDivElement;

// ==========================================
// 🔐 AUTENTICAÇÃO E PERMISSÕES
// ==========================================

// Login com Google OAuth
btnLoginGoogle?.addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
});

// Realizar Logout
const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

btnLogout?.addEventListener("click", handleLogout);
btnLogoutMain?.addEventListener("click", handleLogout);

// Verifica Permissões e Estado da Sessão
async function checkAuth(): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    showLoginScreen();
    return;
  }

  currentUser = session.user;
  const userEmail = currentUser.email;

  if (!userEmail) {
    showLoginScreen();
    return;
  }

  // Consulta a tabela de permissões no Supabase
  const { data: permission, error: permError } = await supabase
    .from('user_permissions')
    .select('is_approved, is_admin')
    .eq('email', userEmail)
    .maybeSingle();

  if (permError) {
    console.error('Erro ao consultar permissões:', permError);
  }

  if (!permission) {
    // Se for o primeiro acesso, registra a solicitação como pendente
    await supabase.from('user_permissions').insert([{ email: userEmail, is_approved: false, is_admin: false }]);
    isApprovedUser = false;
    isAdmin = false;
  } else {
    isApprovedUser = permission.is_approved;
    isAdmin = permission.is_admin;
  }

  if (isApprovedUser) {
    showMainScreen();
    if (isAdmin) {
      loadAdminPanel();
    }
    await fetchThemes(); // Carrega os temas assim que for liberado
  } else {
    showPendingApproval(userEmail);
  }
}

// Controle de Telas
function showLoginScreen(): void {
  loginScreen?.classList.remove("hidden");
  mainContent?.classList.add("hidden");
  btnLoginGoogle?.classList.remove("hidden");
  btnLogout?.classList.add("hidden");
  if (authStatus) authStatus.innerHTML = "";
}

function showPendingApproval(email: string): void {
  loginScreen?.classList.remove("hidden");
  mainContent?.classList.add("hidden");
  btnLoginGoogle?.classList.add("hidden");
  btnLogout?.classList.remove("hidden");

  if (authStatus) {
    authStatus.innerHTML = `
      <div class="bg-amber-900/30 border border-amber-500/50 p-4 rounded-lg text-amber-300 text-left text-sm">
        <p class="font-bold text-base mb-1">⚠️ Acesso Pendente</p>
        <p>Sua conta (<strong>${email}</strong>) foi registrada, mas precisa da aprovação do administrador para acessar o site.</p>
      </div>
    `;
  }
}

function showMainScreen(): void {
  loginScreen?.classList.add("hidden");
  mainContent?.classList.remove("hidden");
}

// Escuta mudanças de sessão para garantir o estado após redirecionamento
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || session) {
    checkAuth();
  } else if (event === 'SIGNED_OUT') {
    showLoginScreen();
  }
});

// ==========================================
// 🛡️ PAINEL DO ADMINISTRADOR (APROVAÇÃO)
// ==========================================

async function loadAdminPanel(): Promise<void> {
  if (!adminPanel) return;
  adminPanel.classList.remove("hidden");

  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('*')
    .order('created_at', { ascending: false });

  const listContainer = document.getElementById("permissions-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  permissions?.forEach((p: UserPermission) => {
    if (p.is_admin) return; // Não exibe admins na lista de aprovação

    const li = document.createElement("li");
    li.className = "flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700 my-2";
    li.innerHTML = `
      <span class="text-sm text-slate-200 font-medium">${p.email}</span>
      <button 
        onclick="toggleUserApproval('${p.id}', ${!p.is_approved})"
        class="text-xs px-3 py-1.5 rounded font-bold transition ${
          p.is_approved 
            ? 'bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700' 
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }"
      >
        ${p.is_approved ? 'Revogar Acesso' : 'Aprovar Acesso'}
      </button>
    `;
    listContainer.appendChild(li);
  });
}

(window as any).toggleUserApproval = async (id: string, newStatus: boolean) => {
  await supabase
    .from('user_permissions')
    .update({ is_approved: newStatus })
    .eq('id', id);

  loadAdminPanel();
};

// ==========================================
// 🎯 GERENCIAMENTO DE TEMAS (CRUD)
// ==========================================

// 1. READ - Buscar Temas
async function fetchThemes(): Promise<void> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar temas:', error);
    return;
  }

  themes = data || [];
  renderThemes();
}

// Renderizar Lista na Tela
function renderThemes(): void {
  if (!themeList) return;
  themeList.innerHTML = "";

  if (themes.length === 0) {
    themeList.innerHTML = `<li class="text-slate-500 text-center py-4">Nenhum tema cadastrado no banco.</li>`;
    return;
  }

  themes.forEach((theme, index) => {
    const li = document.createElement("li");
    li.className = `flex items-center justify-between p-3 rounded-lg border transition ${
      theme.used 
        ? "bg-slate-950/40 border-slate-800 text-slate-500 line-through" 
        : "bg-slate-900 border-slate-700 text-slate-200"
    }`;

    li.innerHTML = `
      <span class="font-medium">${index + 1}. ${theme.name}</span>
      <div class="flex items-center gap-2 no-underline">
        <button 
          onclick="toggleTheme('${theme.id}', ${theme.used})" 
          class="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 transition"
        >
          ${theme.used ? "Desmarcar" : "Riscar"}
        </button>
        <button 
          onclick="deleteTheme('${theme.id}')" 
          class="text-xs bg-red-900/40 hover:bg-red-800 text-red-300 px-2 py-1 rounded transition"
        >
          Excluir
        </button>
      </div>
    `;

    themeList.appendChild(li);
  });
}

// 2. CREATE - Criar Novo Tema
themeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = themeInput.value.trim();
  if (!name) return;

  const { data, error } = await supabase
    .from('themes')
    .insert([{ name, used: false }])
    .select();

  if (error) {
    console.error('Erro ao salvar tema:', error);
    return;
  }

  if (data) {
    themes.push(data[0]);
    themeInput.value = "";
    renderThemes();
  }
});

// Sortear Tema
btnDraw?.addEventListener("click", async () => {
  const availableThemes = themes.filter(t => !t.used);

  if (availableThemes.length === 0) {
    if (drawnResult) drawnResult.innerHTML = "⚠️ Todos os temas já foram usados!";
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  const selectedTheme = availableThemes[randomIndex];

  const { error } = await supabase
    .from('themes')
    .update({ used: true })
    .eq('id', selectedTheme.id);

  if (error) {
    console.error('Erro ao atualizar sorteio:', error);
    return;
  }

  selectedTheme.used = true;
  if (drawnResult) {
    drawnResult.innerHTML = `🎉 Tema Sorteado: <br><span class="text-amber-400 text-3xl font-extrabold">${selectedTheme.name}</span>`;
  }
  renderThemes();
});

// 3. UPDATE - Riscar / Desmarcar Tema
(window as any).toggleTheme = async (id: string, currentStatus: boolean) => {
  const newStatus = !currentStatus;

  const { error } = await supabase
    .from('themes')
    .update({ used: newStatus })
    .eq('id', id);

  if (error) {
    console.error('Erro ao alterar tema:', error);
    return;
  }

  themes = themes.map(t => t.id === id ? { ...t, used: newStatus } : t);
  renderThemes();
};

// 4. DELETE - Excluir Tema com Confirmação
(window as any).deleteTheme = async (id: string) => {
  const themeToDelete = themes.find(t => t.id === id);
  const themeName = themeToDelete ? `"${themeToDelete.name}"` : "este tema";

  const confirmed = window.confirm(`Tem certeza que deseja excluir ${themeName}?`);
  if (!confirmed) return;

  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar tema:', error);
    alert('Erro ao excluir o tema. Tente novamente.');
    return;
  }

  themes = themes.filter(t => t.id !== id);
  renderThemes();
};

// Inicialização
checkAuth();