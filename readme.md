# 🚀 Como Executar o Projeto Localmente

Siga o passo a passo abaixo para configurar e rodar a aplicação em seu ambiente local.

---

## 🛠️ Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

- **[Node.js](https://nodejs.org/)** (Versão LTS recomendada)
- **[Git](https://git-scm.com/)**
- Uma conta ativa no **[Supabase](https://supabase.com/)**

---

## 📂 1. Clonar o Repositório

No terminal, clone o projeto e acesse a pasta:

```bash
git clone [https://github.com/lklukas007/cs2-themes.git](https://github.com/lklukas007/cs2-themes.git)
cd cs2-themes

```

---

## 📦 2. Instalar as Dependências

Execute o comando abaixo para instalar todos os pacotes necessários:

```bash
npm install

```

---

## 🗄️ 3. Configurar o Banco de Dados (Supabase)

1. Acesse o painel do seu projeto no **Supabase**.
2. Vá até o menu **SQL Editor** (`>_`) e selecione **New Query**.
3. Execute a query abaixo para criar a tabela principal:

```sql
create table themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  used boolean default false,
  created_at timestamp with time zone default now()
);

```

*(Opcional)* Se quiser popular o banco com uma lista inicial de temas, execute uma instrução `INSERT INTO themes (name, used) VALUES ('Nome do Tema', false);`.

---

## 🔑 4. Configurar as Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado **`.env`** baseado no arquivo `.env.example`.
2. Adicione suas credenciais do Supabase (encontradas em *Project Settings > API*):

```env
VITE_SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

```

> ⚠️ **Atenção:** Nunca envie o arquivo `.env` para o repositório público. Verifique se ele está listado no `.gitignore`.

---

## ▶️ 5. Executar a Aplicação

Com as variáveis configuradas, inicie o servidor de desenvolvimento do Vite:

```bash
npm run dev

```

O terminal exibirá o endereço local (geralmente `http://localhost:5173`). Abra o link no seu navegador para utilizar a aplicação!