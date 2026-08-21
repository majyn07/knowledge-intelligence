# Liberar o acesso da equipe

O produto está no ar e funcionando. O que trava a entrada de mais gente não é
código: é o serviço de e-mail do projeto.

## O que acontece hoje

O acesso é sem senha, por link enviado ao e-mail corporativo. Quem envia esse
link é o serviço embutido da Supabase, que existe para desenvolvimento e tem
dois limites de fábrica:

- entrega **poucos e-mails por hora** — daí o `email rate limit exceeded`;
- **só entrega para endereços da equipe do projeto** na Supabase. Um
  `nome@altoqi.com.br` que não esteja lá não recebe nada, e o erro é o mesmo.

Nenhum dos dois se resolve mexendo no produto, e nenhum se resolve esperando: o
teto por hora da Supabase **fica travado enquanto não houver servidor de e-mail
próprio configurado**. É por isso que só uma pessoa conseguiu entrar até agora.

Há dois caminhos, e eles não são excludentes.

## Caminho A — conta Google da AltoQi (recomendado)

Elimina o e-mail do caminho: quem já está logado na conta da empresa no
navegador entra em um clique. Sem teto por hora, sem entrega, sem caixa de
spam, sem senha em lugar nenhum.

Precisa de alguém com acesso ao **Google Cloud Console** da AltoQi.

1. Em <https://console.cloud.google.com>, criar (ou escolher) um projeto.
2. **APIs e serviços → Tela de permissão OAuth**. Tipo de usuário: **Interno**.
   Interno é o que restringe a entrada às contas `@altoqi.com.br` — a
   verificação do Google não é necessária nesse modo.
   - Nome do app: `Visus Knowledge Intelligence`
   - E-mail de suporte e de contato: o de quem administra
3. **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   **Aplicativo da Web**.
   - Origens JavaScript autorizadas:
     `https://knowledge-intelligence.vercel.app`
   - URI de redirecionamento autorizado — **exatamente** este, é o da Supabase
     e não o do produto:
     `https://teebrsxpnypztwhtiupe.supabase.co/auth/v1/callback`
4. O Google devolve um **Client ID** e um **Client Secret**.

Onde colocar, sem que passem por conversa nenhuma:

5. No painel da Supabase → **Authentication → Providers → Google**: ligar,
   colar os dois campos, salvar.
6. Na Vercel → o projeto → **Settings → Environment Variables**: criar
   `NEXT_PUBLIC_GOOGLE_SIGN_IN` com valor `on`, nos três ambientes, e
   **redeploy**. É o que faz o botão "Entrar com a conta AltoQi" aparecer na
   tela — enquanto estiver desligado, ele fica escondido de propósito, porque
   um botão que leva a uma página de erro é pior que botão nenhum.

Custo: nenhum. O Client Secret não passa por aqui — vai do Google Cloud direto
para o painel da Supabase.

## Caminho B — servidor de e-mail próprio

Mantém o link por e-mail e o faz chegar em qualquer `@altoqi.com.br`, sem teto
de fábrica. Serve como alternativa para quem não estiver com a conta da empresa
no navegador.

Precisa de credenciais SMTP — do servidor da AltoQi ou de um serviço de envio.

No painel da Supabase → **Project Settings → Authentication → SMTP Settings**:

| Campo | Valor |
| --- | --- |
| Sender email | um endereço que a AltoQi possa usar como remetente |
| Sender name | `Visus Knowledge Intelligence` |
| Host / Port | os do servidor |
| Username / Password | as credenciais |

Depois, em **Authentication → Rate Limits**, subir o limite de envio por hora —
ele só destrava depois que o SMTP está configurado.

## O que já está pronto do nosso lado

- A restrição de domínio vive **no banco** (`check constraint` na tabela de
  perfis e gatilho em `auth.users`). Ligar o Google não abre a porta para
  ninguém de fora: uma conta que não seja `@altoqi.com.br` é recusada na
  criação do perfil, independentemente do caminho de entrada.
- A configuração de acesso está versionada em `supabase/config.toml`, com o
  bloco do Google já escrito. Os segredos ficam no ambiente, nunca no
  repositório.
- Os destinos de retorno já estão liberados, em produção e em
  desenvolvimento — foi o defeito que fazia todo link cair em `localhost`.
- A tela de acesso já traduz os erros da Supabase, inclusive este.

Feito o caminho A, resta ligar `NEXT_PUBLIC_GOOGLE_SIGN_IN=on` e publicar.
