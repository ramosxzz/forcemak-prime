# Deploy manual na Cloudflare

Este projeto agora tem uma camada compatível com Cloudflare Pages:

- `public/`: frontend estático.
- `functions/api/[[path]].js`: APIs usadas pelo site e painel.
- `functions/imagens/uploads/[[path]].js`: leitura de uploads novos via R2.
- `scripts/cloudflare/seed-kv.ps1`: envia os JSON da pasta `dados/` para KV.
- `scripts/cloudflare/upload-r2.ps1`: envia imagens atuais para R2.

Mantenha o Render ativo até testar o link `*.pages.dev`.

## 1. Login na conta correta

```powershell
npx wrangler login
npx wrangler whoami
```

Confirme que o `whoami` mostra a conta Cloudflare da Forcemak.

## 2. Criar KV e R2

```powershell
npx wrangler kv namespace create FORCEMAK_DATA
npx wrangler r2 bucket create forcemak-prime-uploads
```

Guarde o `id` do KV retornado no terminal.

## 3. Enviar dados e imagens

Substitua `SEU_KV_ID` pelo ID retornado no passo anterior.

```powershell
cd "D:\projetos\solaire w+\empresa avante\FORCEMAK\forcemak-prime"
powershell -ExecutionPolicy Bypass -File .\scripts\cloudflare\seed-kv.ps1 -NamespaceId "SEU_KV_ID"
powershell -ExecutionPolicy Bypass -File .\scripts\cloudflare\upload-r2.ps1 -Bucket "forcemak-prime-uploads"
```

## 4. Criar o Pages pelo painel

No painel da Cloudflare:

1. Acesse **Workers & Pages**.
2. Clique em **Create application**.
3. Escolha **Pages**.
4. Conecte o GitHub e selecione o repositório `forcemak-prime`.
5. Configure:
   - Project name: `forcemak-prime`
   - Production branch: `master`
   - Framework preset: `None`
   - Build command: deixe vazio
   - Build output directory: `public`

## 5. Configurar bindings do Pages

No projeto criado em Cloudflare Pages:

1. Abra **Settings**.
2. Vá em **Functions**.
3. Configure as bindings de produção:
   - KV namespace:
     - Variable name: `FORCEMAK_DATA`
     - KV namespace: o KV criado no passo 2.
   - R2 bucket:
     - Variable name: `FORCEMAK_UPLOADS`
     - R2 bucket: `forcemak-prime-uploads`.
4. Configure variáveis de ambiente:
   - `JWT_SEGREDO`: use uma senha forte.
   - `FACEBOOK_PIXEL_ID`: `1433120138425099` ou o pixel correto.
   - `FACEBOOK_ACCESS_TOKEN`: opcional, só se forem usar métricas/CAPI server-side.

Depois de salvar bindings/variáveis, faça **Redeploy**.

Se aparecer campo de compatibilidade nas configurações de Functions, use:

- Compatibility date: `2026-05-14`
- Compatibility flag: `nodejs_compat`

## 6. Testar no domínio temporário

Teste no `https://forcemak-prime.pages.dev`:

- `/`
- `/produtos.html`
- `/produto.html?id=ALGUM_ID`
- `/videos.html?video=latest`
- `/admin.html`
- Login do admin.
- Cadastro/edição de produto.
- Upload de imagem.
- Formulário de contato.

Também teste as APIs:

```powershell
Invoke-RestMethod "https://forcemak-prime.pages.dev/api/produtos" | Measure-Object
Invoke-RestMethod "https://forcemak-prime.pages.dev/api/videos-youtube" | Measure-Object
```

## 7. Virar o domínio

Só depois dos testes:

1. Adicione `forcemak.com.br` como custom domain do Pages.
2. Siga a instrução de DNS que a Cloudflare mostrar.
3. Se o domínio também estiver usando DNS da Cloudflare, normalmente será um CNAME para o projeto Pages.
4. Mantenha o Render ativo por alguns dias como rollback.

## Observações importantes

- A Cloudflare não usa o disco `/var/data` do Render. Os JSON ficam no KV e uploads novos ficam no R2.
- Se o painel admin foi usado no Render depois da última migração, rode novamente `seed-kv.ps1` e `upload-r2.ps1` antes da virada final.
- Imagens já existentes em `public/imagens/uploads` também são enviadas para R2 para cobrir produtos antigos e futuros deletes/uploads.
