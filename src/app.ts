import { createClient, User } from '@supabase/supabase-js';

// 1. Configuração do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variáveis de ambiente do Supabase não configuradas!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Interfaces
interface Theme {
  id: string;
  user_id: string;
  name: string;
  used: boolean;
  created_at?: string;
}

// Estados Locais
let themes: Theme[] = [];
let currentUser: User | null = null;

// Elementos do DOM
const loginScreen = document.getElementById("login-screen") as HTMLDivElement;
const mainContent = document.getElementById("main-content") as HTMLDivElement;
const btnLoginGoogle = document.getElementById("btn-login-google") as HTMLButtonElement;
const btnLogoutMain = document.getElementById("btn-logout-main") as HTMLButtonElement;

const themeForm = document.getElementById("theme-form") as HTMLFormElement;
const themeInput = document.getElementById("theme-input") as HTMLInputElement;
const themeList = document.getElementById("theme-list") as HTMLUListElement;
const btnDraw = document.getElementById("btn-draw") as HTMLButtonElement;
const drawnResult = document.getElementById("drawn-result") as HTMLDivElement;

// ==========================================
// 🔐 AUTENTICAÇÃO
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

btnLogoutMain?.addEventListener("click", handleLogout);

// Checagem de Autenticação Simplificada (Sem Painel de Aprovação)
async function checkAuth(): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    showLoginScreen();
    return;
  }

  currentUser = session.user;
  showMainScreen();

  // Carrega apenas os dados do usuário atual e ativa a sincronização
  await fetchThemes();
  await fetchLastDrawnTheme();
  subscribeToRealtime();
}

function showLoginScreen(): void {
  loginScreen?.classList.remove("hidden");
  mainContent?.classList.add("hidden");
}

function showMainScreen(): void {
  loginScreen?.classList.add("hidden");
  mainContent?.classList.remove("hidden");
}

// Escuta eventos de sessão
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || session) {
    checkAuth();
  } else if (event === 'SIGNED_OUT') {
    showLoginScreen();
  }
});

// ==========================================
// 🎯 GERENCIAMENTO DE TEMAS (CRUD MULTIUSUÁRIO)
// ==========================================

// 1. READ - Buscar Temas (O RLS do Supabase já filtra por usuário automaticamente)
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

// 2. READ - Buscar Último Tema Sorteado do Usuário
async function fetchLastDrawnTheme(): Promise<void> {
  const { data, error } = await supabase
    .from('themes')
    .select('name')
    .eq('used', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar último tema:', error);
    return;
  }

  if (data && drawnResult) {
    drawnResult.innerHTML = `🎉 Último Tema Sorteado: <br><span class="text-amber-400 text-3xl font-extrabold">${data.name}</span>`;
  }
}

// Renderizar Lista
function renderThemes(): void {
  if (!themeList) return;
  themeList.innerHTML = "";

  if (themes.length === 0) {
    themeList.innerHTML = `<li class="text-slate-500 text-center py-4">Nenhum tema cadastrado. Crie o seu primeiro abaixo!</li>`;
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

// 3. CREATE - Inserir Tema (Injetando user_id)
themeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = themeInput.value.trim();
  if (!name || !currentUser) return;

  const { data, error } = await supabase
    .from('themes')
    .insert([{ 
      name, 
      used: false,
      user_id: currentUser.id // 👈 Obrigatório para a regra do RLS
    }])
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
    if (drawnResult) drawnResult.innerHTML = "⚠️ Todos os seus temas já foram usados!";
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

// 4. UPDATE - Riscar/Desmarcar
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

// 5. DELETE - Excluir
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

// ==========================================
// ⚡ TEMPO REAL (REALTIME)
// ==========================================

function subscribeToRealtime(): void {
  supabase
    .channel('themes-realtime-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'themes' },
      () => {
        fetchThemes();
        fetchLastDrawnTheme();
      }
    )
    .subscribe();
}

// Inicialização
checkAuth();