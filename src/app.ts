import { createClient } from '@supabase/supabase-js';

// Leitura segura das variáveis de ambiente via Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variáveis de ambiente do Supabase não configuradas!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Theme {
  id: string;
  name: string;
  used: boolean;
}

// Elementos do DOM
const themeForm = document.getElementById("theme-form") as HTMLFormElement;
const themeInput = document.getElementById("theme-input") as HTMLInputElement;
const themeList = document.getElementById("theme-list") as HTMLUListElement;
const btnDraw = document.getElementById("btn-draw") as HTMLButtonElement;
const drawnResult = document.getElementById("drawn-result") as HTMLDivElement;

let themes: Theme[] = [];

// 1. READ - Buscar temas do banco de dados
async function fetchThemes(): Promise<void> {
  drawnResult.innerHTML = "Carregando temas...";

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar temas:', error);
    drawnResult.innerHTML = "Erro ao carregar os temas.";
    return;
  }

  themes = data || [];
  drawnResult.innerHTML = "Clique para sortear um tema!";
  renderThemes();
}

// Renderizar a lista na tela
function renderThemes(): void {
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

// 2. CREATE - Adicionar um novo tema
themeForm.addEventListener("submit", async (e) => {
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

// Sortear um tema não utilizado
btnDraw.addEventListener("click", async () => {
  const availableThemes = themes.filter(t => !t.used);

  if (availableThemes.length === 0) {
    drawnResult.innerHTML = "⚠️ Todos os temas já foram usados!";
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  const selectedTheme = availableThemes[randomIndex];

  // 3. UPDATE - Marcar tema sorteado como utilizado no banco
  const { error } = await supabase
    .from('themes')
    .update({ used: true })
    .eq('id', selectedTheme.id);

  if (error) {
    console.error('Erro ao atualizar sorteio:', error);
    return;
  }

  selectedTheme.used = true;
  drawnResult.innerHTML = `🎉 Tema Sorteado: <br><span class="text-amber-400 text-3xl font-extrabold">${selectedTheme.name}</span>`;
  renderThemes();
});

// 3. UPDATE - Alterar estado (riscar/desmarcar)
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

// 4. DELETE - Excluir um tema
(window as any).deleteTheme = async (id: string) => {
  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar tema:', error);
    return;
  }

  themes = themes.filter(t => t.id !== id);
  renderThemes();
};

// Inicializa a consulta dos dados
fetchThemes();