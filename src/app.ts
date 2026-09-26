// Define a estrutura de um Tema
interface Theme {
  id: string;
  name: string;
  used: boolean;
}

// Lista inicial de temas fornecida
const initialThemes: string[] = [
  "Tipos de Vermes", "Bebidas Alcoólica", "Lendas Urbanas", "Plantas", "Bandas de Rock",
  "Cantores (Duplas) Sertanejo", "Funkeiros", "Traficantes Famosos", "Vilões Farcry",
  "Vilões Cinema", "Velho Oeste", "Pássaros", "Peixes", "Mamíferos", "Candidatos Presidente",
  "Tipos de Drogas", "Felinos", "Os 7 Monstrinhos", "Castelo Rá Tim Bum", "Streaming",
  "Tipos de Urnas Funerárias", "Raças de Cachorros", "Animais da Fazenda", "Personagens Call Of Duty",
  "Personagens Assassin's Creed", "Personagens Resident Evil", "Personagem Mário",
  "Grandes Conquistadores (Alexandre o Grande, Napoleão...)", "Imperadores Romanos",
  "Filósofos", "Mitologia Grega", "Mitologia Nórdica", "Massas", "Comidas Japonesas",
  "Churrasco", "Salgados", "Gays 2.0", "Obesos 2.0", "Tipos de Xibiu", "Partes da Piroca",
  "Clube da Toro", "Famosos que foram Cornos", "Caverna do Dragão", "Star Wars",
  "Relacionados ao CS", "Nomes de Comidas do Sul", "A Fazenda", "BBB", "Emos",
  "Nordestinos", "Picapes", "Pescadores", "Militares", "Vingadores", "Rei Leão",
  "Simpsons", "Turma da Mônica", "Pica-Pau", "A Grande Família", "Zorra Total",
  "Moto Clube", "Peças de Computador", "Peões de Rodeio", "Carros F1", "Transformers",
  "Carros (Relâmpago McQueen)"
];

// Temas que já começam rascados conforme sua lista
const defaultUsedNames = ["Lendas Urbanas", "Filósofos", "Mitologia Grega", "Massas", "Churrasco", "Partes da Piroca", "Star Wars"];

// Captura dos elementos do DOM
const themeForm = document.getElementById("theme-form") as HTMLFormElement;
const themeInput = document.getElementById("theme-input") as HTMLInputElement;
const themeList = document.getElementById("theme-list") as HTMLUListElement;
const btnDraw = document.getElementById("btn-draw") as HTMLButtonElement;
const drawnResult = document.getElementById("drawn-result") as HTMLDivElement;

// Carregar temas salvos ou popular a lista padrão
let themes: Theme[] = loadThemes();

function loadThemes(): Theme[] {
  const saved = localStorage.getItem("cs2_themes");
  if (saved) {
    return JSON.parse(saved);
  }

  return initialThemes.map((name) => ({
    id: crypto.randomUUID(),
    name,
    used: defaultUsedNames.includes(name)
  }));
}

function saveThemes(): void {
  localStorage.setItem("cs2_themes", JSON.stringify(themes));
}

// Renderizar a lista na tela
function renderThemes(): void {
  themeList.innerHTML = "";

  themes.forEach((theme, index) => {
    const li = document.createElement("li");
    li.className = `flex items-center justify-between p-3 rounded-lg border transition ${
      theme.used ? "bg-slate-950/40 border-slate-800 text-slate-500 line-through" : "bg-slate-900 border-slate-700 text-slate-200"
    }`;

    li.innerHTML = `
      <span class="font-medium">${index + 1}. ${theme.name}</span>
      <div class="flex items-center gap-2 no-underline">
        <button 
          onclick="toggleTheme('${theme.id}')" 
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

// Adicionar um novo tema
themeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = themeInput.value.trim();
  if (!name) return;

  themes.push({
    id: crypto.randomUUID(),
    name,
    used: false
  });

  themeInput.value = "";
  saveThemes();
  renderThemes();
});

// Sortear um tema que ainda NÃO foi usado
btnDraw.addEventListener("click", () => {
  const availableThemes = themes.filter(t => !t.used);

  if (availableThemes.length === 0) {
    drawnResult.innerHTML = "⚠️ Todos os temas já foram usados!";
    return;
  }

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  const selectedTheme = availableThemes[randomIndex];

  // Marcar o tema sorteado como usado
  selectedTheme.used = true;

  drawnResult.innerHTML = `🎉 Tema Sorteado: <br><span class="text-amber-400 text-3xl font-extrabold">${selectedTheme.name}</span>`;

  saveThemes();
  renderThemes();
});

// Funções globais para manipular botões da lista
(window as any).toggleTheme = (id: string) => {
  themes = themes.map(t => t.id === id ? { ...t, used: !t.used } : t);
  saveThemes();
  renderThemes();
};

(window as any).deleteTheme = (id: string) => {
  themes = themes.filter(t => t.id !== id);
  saveThemes();
  renderThemes();
};

// Inicialização
renderThemes();