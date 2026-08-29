# Optic — contexto do projeto

App para a Opticalia Felgueiras gerir redes sociais: gera conteúdo com IA (Claude), guarda numa biblioteca partilhada pela equipa.

## Stack
- React + Vite, Tailwind via CDN (sem build config), lucide-react
- Netlify (hosting + functions)
- Netlify Blobs (dados: contas + posts)
- Repo GitHub: bfcspereira-byte/social-optic
- Site: social-optic.netlify.app

## Estado atual (ver STATUS.md para detalhe)
- ✅ Login/registo — funcional (netlify/functions/accounts.js)
- ✅ Biblioteca de posts partilhada — funcional (netlify/functions/posts.js)
- ⏳ Geração de conteúdo com IA — função criada (netlify/functions/generate.js), falta:
  1. utilizador criar conta em platform.anthropic.com + gerar API key
  2. configurar env var ANTHROPIC_API_KEY no Netlify (Site settings > Environment variables)
  3. atualizar App.jsx: trocar chamada direta a api.anthropic.com por fetch("/.netlify/functions/generate", {method:"POST", body: JSON.stringify({prompt})})

## Lições aprendidas (para não repetir erros)
- Netlify functions ficam em `netlify/functions/` — path exato, GitHub mobile upload por vezes "achata" pastas; usar "Create new file" com caminho completo no nome quando isso acontecer
- Não fixar versões exatas em package.json para pacotes Netlify (usar "*") — versões erradas quebram o build silenciosamente
- index.html deve apontar para `/main.jsx` (não `/src/main.jsx`) — os ficheiros estão todos na raiz do repo, não numa pasta src
- Utilizador não é técnico, usa GitHub/Netlify só pelo telemóvel — preferir instruções passo a passo muito explícitas, confirmar prints antes de avançar
