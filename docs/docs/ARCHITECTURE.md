# Arquitetura — mapa de ficheiros

```
index.html → aponta para /main.jsx (na raiz, não /src/)
main.jsx → entry point React
App.jsx → app inteira (Login, Generator, Library, Dashboard)
package.json → deps: react, react-dom, lucide-react, @netlify/blobs (versão "*")
netlify.toml → build cmd "npm run build", publish "dist", functions "netlify/functions"
netlify/functions/
accounts.js → POST {action:"login"|"signup", email, password, name} → Netlify Blobs store "optic-accounts"
posts.js → GET/POST/PATCH/DELETE → Netlify Blobs store "optic-posts"
generate.js → POST {prompt} → chama api.anthropic.com com ANTHROPIC_API_KEY (env var), devolve {ok, text}
```

## Fluxo de dados
- App.jsx tem funções apiLogin/apiSignup/apiListPosts/apiSavePost/apiUpdatePostStatus/apiDeletePost que fazem fetch às functions acima
- Falta: função apiGenerate(prompt) que chama /.netlify/functions/generate em vez de api.anthropic.com direto

## Design (paleta "Ótica Bruna")
ink #4A1E2A · cream #FBF4EC · wine #8B3A4B · amber #F2A93B · mist #E6D6C7 · sage #5F7350
Fonte display: Fraunces (serif). Fonte corpo: Public Sans.
