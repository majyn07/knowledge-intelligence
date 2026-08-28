# Liberar o acesso da equipe

O produto está no ar e funcionando. O que trava a entrada de mais gente não é
código: é o serviço de e-mail do projeto.

## O que acontece hoje

O acesso é sem senha, por link enviado ao e-mail corporativo. Quem envia esse
link é o serviço embutido da Supabase, que existe para desenvolvimento e tem
dois limites de fábrica:

- entrega **poucos e-mails por hora**, daí o `email rate limit exceeded`;
- **só entrega para endereços da equipe do projeto** na Supabase. Um
  `nome@altoqi.com.br` que não esteja lá não recebe nada, e o erro é o mesmo.

Nenhum dos dois se resolve mexendo no produto, e nenhum se resolve esperando: o
teto por hora da Supabase **fica travado enquanto não houver servidor de e-mail
próprio configurado**. É por isso que só uma pessoa conseguiu entrar até agora.

## O caminho escolhido: servidor de e-mail próprio

A entrada pela conta Google resolveria o mesmo problema sem e-mail nenhum, mas
depende de criar credencial no Google Cloud Console da empresa, e isso está
adiado junto com o resto do que precisa da TI. O código dela já está pronto e
escondido atrás de uma variável; quando o dia chegar, é ligar.

Até lá, o caminho é configurar SMTP na Supabase. Feito isso, o link passa a
chegar em qualquer `@altoqi.com.br`, sem teto de fábrica.

### Onde configurar

Painel da Supabase → projeto `teebrsxpnypztwhtiupe` → **Project Settings →
Authentication → SMTP Settings**:

| Campo | Valor |
| --- | --- |
| Sender email | um endereço que a AltoQi possa usar como remetente |
| Sender name | `Visus Knowledge Intelligence` |
| Host | o do servidor de envio |
| Port | `587` (TLS) ou `465` (SSL), conforme o servidor |
| Username / Password | as credenciais do envio |

Depois, **Authentication → Rate Limits** → subir o limite de envio por hora. Ele
só destrava depois que o SMTP está salvo. Com o serviço embutido o campo fica
preso no valor de fábrica. Para catorze pessoas, qualquer número acima de trinta
por hora sobra.

### De onde tirar as credenciais

Três opções, da que menos depende de terceiros para a que entrega melhor.

**1. SMTP do Google Workspace, com senha de app.**
A AltoQi está no Google Workspace, então já existe servidor de envio. Numa
conta `@altoqi.com.br` com verificação em duas etapas ligada, gerar uma senha
de app em <https://myaccount.google.com/apppasswords> e usar:

- Host `smtp.gmail.com`, porta `465`
- Username: o próprio endereço
- Password: a senha de app (16 caracteres, não a senha da conta)

O limite do Workspace é de 2.000 envios por dia. Ordens de grandeza acima do
que este produto precisa. O administrador do Workspace pode ter desligado
senhas de app; se a página não abrir, é isso.

**2. Serviço de envio com remetente verificado.**
Brevo, SendGrid ou Mailjet permitem verificar **um endereço** de remetente por
e-mail de confirmação, sem mexer no DNS do domínio. É o caminho quando a opção
1 estiver bloqueada e não der para esperar a TI. As faixas gratuitas ficam
entre 100 e 300 envios por dia, e sobra.

**3. O servidor da própria AltoQi, ou autenticação de domínio completa.**
É o que entrega melhor e o único que não depende de conta pessoal de ninguém,
mas precisa da TI, registros SPF/DKIM no DNS de `altoqi.com.br`, ou os dados
do relay interno. É para onde migrar depois, sem pressa: trocar o SMTP é
mudar cinco campos num painel.

Em qualquer uma delas, **as credenciais vão direto para o painel da Supabase**.
Não passam por conversa, por commit, nem por arquivo do projeto.

### Como conferir que funcionou

1. Sair do produto e pedir o link para um endereço que **não** seja o de quem
   administra o projeto.
2. O e-mail deve chegar. Se voltar `email rate limit exceeded`, o SMTP não
   salvou ou o limite por hora ficou no valor antigo.
3. Entrar pelo link. O perfil é criado na hora, e a pessoa aparece em
   Configurações → Pessoas.

## O outro caminho, para quando a TI entrar na conversa

Conta Google da AltoQi. Elimina o e-mail do caminho: quem já está logado na
conta da empresa entra em um clique.

1. Em <https://console.cloud.google.com>, criar ou escolher um projeto.
2. **APIs e serviços → Tela de permissão OAuth**, tipo de usuário **Interno**.
   É o que restringe a entrada às contas `@altoqi.com.br`, e dispensa a
   verificação do Google.
3. **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   **Aplicativo da Web**.
   - Origem JavaScript autorizada:
     `https://knowledge-intelligence.vercel.app`
   - URI de redirecionamento autorizado. **Exatamente** este, é o da Supabase
     e não o do produto:
     `https://teebrsxpnypztwhtiupe.supabase.co/auth/v1/callback`
4. Colar Client ID e Client Secret em **Authentication → Providers → Google**
   no painel da Supabase, e ligar.
5. Na Vercel → **Settings → Environment Variables**: criar
   `NEXT_PUBLIC_GOOGLE_SIGN_IN` com valor `on`, nos três ambientes, e
   **redeploy**. É o que faz o botão aparecer. Enquanto está desligado, ele
   fica escondido de propósito, porque um botão que leva a uma página de erro é
   pior que botão nenhum.

Custo: nenhum.

## O que já está pronto do nosso lado

- A restrição de domínio vive **no banco** (`check constraint` na tabela de
  perfis e gatilho em `auth.users`). Nenhum caminho de entrada abre a porta
  para quem não é `@altoqi.com.br`: a conta é recusada na criação do perfil.
- A configuração de acesso está versionada em `supabase/config.toml`, com o
  bloco do Google já escrito. Os segredos ficam no ambiente, nunca no
  repositório.
- Os destinos de retorno já estão liberados, em produção e em
  desenvolvimento. Foi o defeito que fazia todo link cair em `localhost`.
- A tela de acesso traduz os erros da Supabase, inclusive o do limite de envio
  e o do provedor desligado.
