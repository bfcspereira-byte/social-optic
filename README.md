# Optic — Opticalia Felgueiras

## Como publicar no Netlify (via GitHub)

1. Cria uma conta gratuita em github.com (se ainda não tiveres)
2. Cria um novo repositório (ex: "optic-app") e faz upload de todos os ficheiros desta pasta
3. Em netlify.com, "Add new site" → "Import an existing project" → escolhe o teu repositório GitHub
4. Configurações de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Clica em "Deploy site"

Depois disto, sempre que quiseres uma atualização, basta substituíres o
ficheiro `src/App.jsx` pela versão nova (que eu te vou dando aqui na
conversa) e voltares a fazer upload para o GitHub — o Netlify publica a
versão nova automaticamente.

## Importante: geração de conteúdo com IA

O botão "Gerar publicação" faz um pedido direto à API da Anthropic. Dentro
desta conversa do Claude isso funciona sem configuração. Fora daqui, num
site Netlify normal, esse pedido só vai funcionar se ligares a tua própria
chave de API da Anthropic através de uma função de servidor (Netlify
Functions), porque uma chave de API nunca deve ficar exposta diretamente
no código do site. Quando chegares a este passo, pede-me ajuda e preparo
essa função contigo.
