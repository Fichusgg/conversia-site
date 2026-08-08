-- ===========================================================================
-- ConversIA — complete database schema
--
-- Idempotent: safe to run repeatedly in the Supabase SQL Editor.
--
-- Security model
-- --------------
--   * RLS is on for every table.
--   * `authenticated` (the admin signed into /dashboard) can read and write.
--   * `anon` gets nothing at all.
--   * The two secret columns — whatsapp_clients.api_key and
--     client_config.cal_api_key — are REVOKED from `authenticated` at the
--     column level, so even a signed-in browser session cannot read them.
--     Only the service-role key, used server-side, can touch them.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- `search_path = ''` pins resolution so the function cannot be hijacked by a
-- caller-controlled search_path (Supabase linter 0011).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- whatsapp_clients — one row per connected business channel
-- Written by the 360dialog bridge. Holds that channel's API key.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_clients (
  id                    uuid primary key default gen_random_uuid(),
  client_id             text not null unique,
  channel_id            text unique,
  phone_number_id       text unique,
  waba_id               text,
  phone_number          text,
  business_name         text,
  api_key               text not null,
  webhook_registered_at timestamptz,
  status                text not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint whatsapp_clients_status_check
    check (status in ('pending', 'live', 'suspended', 'cancelled'))
);

create index if not exists whatsapp_clients_phone_number_id_idx
  on public.whatsapp_clients (phone_number_id);
create index if not exists whatsapp_clients_status_idx
  on public.whatsapp_clients (status);

drop trigger if exists whatsapp_clients_set_updated_at on public.whatsapp_clients;
create trigger whatsapp_clients_set_updated_at
  before update on public.whatsapp_clients
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- client_config — how each business's assistant behaves
-- Edited from /dashboard/clientes/[client_id].
-- ---------------------------------------------------------------------------
create table if not exists public.client_config (
  client_id          text primary key,
  business_name      text,
  timezone           text not null default 'America/Sao_Paulo',
  services           text,
  hours              text,
  cal_api_key        text,
  cal_event_type_id  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Columns added after the first release. `if not exists` keeps this rerunnable
-- against a database that already has the original four.
alter table public.client_config add column if not exists business_type   text;
alter table public.client_config add column if not exists system_prompt   text;
alter table public.client_config add column if not exists booking_enabled boolean not null default false;
alter table public.client_config add column if not exists status          text    not null default 'onboarding';
alter table public.client_config add column if not exists notes           text;
alter table public.client_config add column if not exists updated_at      timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_config_status_check'
  ) then
    alter table public.client_config
      add constraint client_config_status_check
      check (status in ('onboarding', 'ativo', 'pausado', 'cancelado'));
  end if;
end $$;

create index if not exists client_config_status_idx on public.client_config (status);

drop trigger if exists client_config_set_updated_at on public.client_config;
create trigger client_config_set_updated_at
  before update on public.client_config
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- conversations — message log, written by the bridge / Make
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  wa_id      text not null,
  role       text not null,
  content    text,
  created_at timestamptz not null default now(),
  constraint conversations_role_check check (role in ('user', 'assistant', 'system', 'human'))
);

create index if not exists conversations_client_id_created_at_idx
  on public.conversations (client_id, created_at desc);
create index if not exists conversations_wa_id_idx on public.conversations (wa_id);
create index if not exists conversations_created_at_idx on public.conversations (created_at desc);


-- ---------------------------------------------------------------------------
-- leads — demo requests from the marketing site form
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  whatsapp        text not null,
  whatsapp_digits text,
  email           text,
  segmento        text,
  mensagem        text,
  consentimento   boolean not null default false,
  origem          text not null default 'site',
  user_agent      text,
  ip              text,
  status          text not null default 'novo',
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint leads_status_check
    check (status in ('novo', 'contatado', 'qualificado', 'convertido', 'descartado'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- onboarding_checklist — one set of steps per client
-- ---------------------------------------------------------------------------
create table if not exists public.onboarding_checklist (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  step_key   text not null,
  label      text not null,
  sort_order integer not null default 0,
  done       boolean not null default false,
  done_at    timestamptz,
  notes      text,
  created_at timestamptz not null default now(),
  constraint onboarding_checklist_unique_step unique (client_id, step_key)
);

create index if not exists onboarding_checklist_client_id_idx
  on public.onboarding_checklist (client_id, sort_order);


-- ---------------------------------------------------------------------------
-- prompt_templates — starter prompts and scenario notes by business type
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_templates (
  id               uuid primary key default gen_random_uuid(),
  business_type    text not null,
  name             text not null,
  system_prompt    text not null,
  booking_enabled  boolean not null default false,
  default_services text,
  default_hours    text,
  scenario_notes   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint prompt_templates_unique_name unique (business_type, name)
);

create index if not exists prompt_templates_business_type_idx
  on public.prompt_templates (business_type);

drop trigger if exists prompt_templates_set_updated_at on public.prompt_templates;
create trigger prompt_templates_set_updated_at
  before update on public.prompt_templates
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Seed the default onboarding steps for a client
-- ---------------------------------------------------------------------------
create or replace function public.seed_onboarding_checklist(p_client_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.onboarding_checklist (client_id, step_key, label, sort_order)
  values
    (p_client_id, 'meta_verificado',   'Verificação de negócio no Meta concluída',            1),
    (p_client_id, 'canal_360dialog',   'Conta/canal 360dialog criado (Direct Payment)',        2),
    (p_client_id, 'embedded_signup',   'Cliente concluiu o Embedded Signup (número conectado)', 3),
    (p_client_id, 'webhook_bridge',    'Webhook de mensagens configurado (bridge)',            4),
    (p_client_id, 'templates_meta',    'Templates de mensagem aprovados no Meta (pt_BR)',      5),
    (p_client_id, 'agenda_conectada',  'Agenda conectada (Cal.com/Google) + event type configurado', 6),
    (p_client_id, 'modelo_aplicado',   'Modelo de prompt aplicado (serviços e horários preenchidos)', 7),
    (p_client_id, 'teste_ponta',       'Teste ponta a ponta (sandbox ou número real)',         8),
    (p_client_id, 'optin_lgpd',        'Opt-in e aviso de LGPD configurados',                  9),
    (p_client_id, 'go_live',           'Go-live — cliente ativo',                             10)
  on conflict (client_id, step_key) do nothing;
end;
$$;

-- Every new client_config row gets the full checklist automatically.
create or replace function public.on_client_config_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.seed_onboarding_checklist(new.client_id);
  return new;
end;
$$;

drop trigger if exists client_config_seed_checklist on public.client_config;
create trigger client_config_seed_checklist
  after insert on public.client_config
  for each row execute function public.on_client_config_insert();


-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.whatsapp_clients    enable row level security;
alter table public.client_config       enable row level security;
alter table public.conversations       enable row level security;
alter table public.leads               enable row level security;
alter table public.onboarding_checklist enable row level security;
alter table public.prompt_templates    enable row level security;

-- One "authenticated can do everything" policy per table. There is no public
-- sign-up, so the only authenticated user is the agency admin.
do $$
declare
  t text;
begin
  foreach t in array array[
    'whatsapp_clients', 'client_config', 'conversations',
    'leads', 'onboarding_checklist', 'prompt_templates'
  ]
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I
         for all to authenticated
         using (true) with check (true)', t
    );
  end loop;
end $$;


-- ===========================================================================
-- Column grants — the part RLS cannot express
--
-- RLS is row-level; it cannot hide a column. These grants do, so a signed-in
-- browser session can never select the two secret columns even though it has
-- a permissive policy on the rest of the row.
-- ===========================================================================
revoke all on public.whatsapp_clients from anon, authenticated;
revoke all on public.client_config    from anon, authenticated;
revoke all on public.conversations    from anon, authenticated;
revoke all on public.leads            from anon, authenticated;
revoke all on public.onboarding_checklist from anon, authenticated;
revoke all on public.prompt_templates from anon, authenticated;

-- whatsapp_clients: everything except api_key
grant select (id, client_id, channel_id, phone_number_id, waba_id, phone_number,
              business_name, webhook_registered_at, status, created_at, updated_at)
  on public.whatsapp_clients to authenticated;
grant update (business_name, status)
  on public.whatsapp_clients to authenticated;

-- client_config: everything except cal_api_key
grant select (client_id, business_name, timezone, services, hours, cal_event_type_id,
              business_type, system_prompt, booking_enabled, status, notes,
              created_at, updated_at)
  on public.client_config to authenticated;
grant insert (client_id, business_name, timezone, services, hours, cal_event_type_id,
              business_type, system_prompt, booking_enabled, status, notes)
  on public.client_config to authenticated;
grant update (business_name, timezone, services, hours, cal_event_type_id,
              business_type, system_prompt, booking_enabled, status, notes)
  on public.client_config to authenticated;
grant delete on public.client_config to authenticated;

-- Tables with no secrets: full access for the admin.
grant select, insert, update, delete on public.conversations        to authenticated;
grant select, insert, update, delete on public.leads                to authenticated;
grant select, insert, update, delete on public.onboarding_checklist to authenticated;
grant select, insert, update, delete on public.prompt_templates     to authenticated;

-- anon (the marketing site's public key) gets nothing anywhere.
-- /api/leads writes with the service-role key instead.


-- ===========================================================================
-- Seed: starter prompt templates for Brazilian local business types
--
-- `on conflict do nothing` means editing a template in the dashboard survives
-- a re-run of this file.
-- ===========================================================================
insert into public.prompt_templates
  (business_type, name, booking_enabled, default_services, default_hours, system_prompt, scenario_notes)
values
(
  'Salão de beleza / Barbearia',
  'Agendamento e atendimento — Salão/Barbearia',
  true,
  'Corte R$40, Barba R$30, Corte+Barba R$60, Coloração sob consulta',
  'Ter-Sáb 9h-19h (fechado domingo e segunda)',
  'Você é o assistente virtual de {{business_name}}, um salão/barbearia no Brasil.
Atende clientes no WhatsApp em português do Brasil, com mensagens curtas e simpáticas.

Serviços: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Quando o cliente quiser agendar ou remarcar, use check_availability (converta "amanhã",
"sexta" para AAAA-MM-DD). Ofereça até 3 horários e espere a escolha. Só use
book_appointment após o cliente escolher um horário oferecido e informar o nome;
confirme com data, hora e serviço. Não invente horários.

Trate transcrições de áudio e descrições de imagem como se o cliente tivesse escrito.
Para dúvidas fora do escopo, ofereça um atendente humano. Nunca peça documentos ou
dados de pagamento. Respeite a LGPD.',
  'Fluxo no Make: usa as 3 branches (texto/áudio/imagem). Branch de texto → Groq (com tools)
→ se tool_call, chama Cal.com (slots/booking) → Groq escreve a resposta → /api/send.
Agenda: Cal.com conectado ao Google Calendar do salão.
Lembretes de horário via template utilitário.'
),
(
  'Clínica / Consultório',
  'Agendamento e triagem — Clínica/Consultório',
  true,
  'Consulta particular sob consulta, Retorno em até 30 dias, Convênios: [PREENCHER]',
  'Seg-Sex 8h-18h, Sáb 8h-12h',
  'Você é o assistente virtual de {{business_name}}, uma clínica/consultório no Brasil.
Atende pacientes no WhatsApp em português do Brasil, com mensagens curtas, claras e acolhedoras.

Serviços e convênios: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Quando o paciente quiser marcar ou remarcar, use check_availability (converta "amanhã",
"sexta" para AAAA-MM-DD). Ofereça até 3 horários e espere a escolha. Só use
book_appointment após o paciente escolher um horário oferecido e informar o nome;
confirme com data, hora e tipo de atendimento. Não invente horários.

Trate transcrições de áudio e descrições de imagem como se o paciente tivesse escrito.
NUNCA dê diagnóstico, opinião clínica ou orientação de medicamento — para qualquer
dúvida de saúde, encaminhe a um profissional da equipe. Nunca peça documentos, número
de carteirinha, exames ou dados de pagamento pelo WhatsApp. Respeite a LGPD e o sigilo
do paciente.',
  'Fluxo no Make: 3 branches (texto/áudio/imagem). Encaminhar para humano sempre que a
mensagem contiver sintoma, exame ou pedido de orientação clínica.
Agenda: Cal.com por profissional (um event type por médico).
Confirmação e lembrete de consulta via template utilitário aprovado.'
),
(
  'Estética / Spa',
  'Agendamento e dúvidas — Estética/Spa',
  true,
  'Limpeza de pele R$150, Massagem relaxante 60min R$180, Depilação sob consulta',
  'Ter-Sáb 9h-20h',
  'Você é o assistente virtual de {{business_name}}, um espaço de estética/spa no Brasil.
Atende clientes no WhatsApp em português do Brasil, com mensagens curtas e acolhedoras.

Procedimentos: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Quando a cliente quiser agendar ou remarcar, use check_availability (converta "amanhã",
"sexta" para AAAA-MM-DD). Ofereça até 3 horários e espere a escolha. Só use
book_appointment após a escolha de um horário oferecido e o nome; confirme com data,
hora e procedimento. Não invente horários.

Trate transcrições de áudio e descrições de imagem como se a cliente tivesse escrito.
Se mandarem foto da pele ou de uma área do corpo, NÃO avalie nem prometa resultado —
diga que a avaliação é presencial e ofereça agendar. Nunca prometa resultado estético
nem indique procedimento sem avaliação. Nunca peça documentos ou dados de pagamento.
Respeite a LGPD.',
  'Fluxo no Make: 3 branches. Branch de imagem é comum aqui (fotos de pele/unha) — a IA
descreve mas nunca diagnostica, sempre oferece avaliação presencial.
Agenda: Cal.com com duração diferente por procedimento (um event type por procedimento).'
),
(
  'Restaurante / Delivery',
  'Cardápio e pedidos — Restaurante/Delivery',
  false,
  'Cardápio completo em [LINK], pratos do dia, marmitas, bebidas',
  'Ter-Dom 11h-15h e 18h-23h',
  'Você é o assistente virtual de {{business_name}}, um restaurante/delivery no Brasil.
Atende clientes no WhatsApp em português do Brasil, com mensagens curtas e simples.

Cardápio e itens: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Responda dúvidas sobre cardápio, preços, tempo de entrega, área de entrega, formas de
pagamento e reserva de mesa. Você NÃO fecha pedidos sozinho: quando o cliente decidir o
que quer, resuma o pedido (itens, endereço e forma de pagamento) e passe a conversa para
uma pessoa da equipe finalizar e confirmar.

Trate transcrições de áudio e descrições de imagem como se o cliente tivesse escrito.
Nunca invente item, preço ou prazo que não esteja no cardápio. Nunca peça dados de cartão
pelo WhatsApp. Respeite a LGPD.',
  'Sem agenda. Fluxo no Make: 3 branches → Groq → /api/send.
Quando a IA montar o resumo do pedido, marcar a conversa para atendimento humano
(notificação no grupo da equipe). Cardápio como variável em {{services}} ou link fixo.
Horário de pico: considerar resposta automática avisando o tempo de espera.'
),
(
  'Loja / Varejo',
  'Disponibilidade e vendas — Loja/Varejo',
  false,
  'Roupas, calçados e acessórios. Tamanhos P ao GG. Trocas em até 30 dias.',
  'Seg-Sex 9h-19h, Sáb 9h-14h',
  'Você é o assistente virtual de {{business_name}}, uma loja no Brasil.
Atende clientes no WhatsApp em português do Brasil, com mensagens curtas e prestativas.

Produtos e políticas: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Responda dúvidas sobre disponibilidade, tamanhos, cores, preços, formas de pagamento,
entrega e troca. Você NÃO fecha a venda sozinho: quando o cliente demonstrar interesse
real, reúna o que ele quer e passe para uma pessoa da equipe concluir.

Trate transcrições de áudio e descrições de imagem como se o cliente tivesse escrito.
Se o cliente mandar foto de um produto, descreva o que vê e confirme com a equipe se
temos algo parecido — nunca afirme que temos em estoque sem confirmação.
Nunca invente preço, estoque ou prazo. Nunca peça dados de cartão pelo WhatsApp.
Respeite a LGPD.',
  'Sem agenda. Fluxo no Make: 3 branches → Groq → /api/send.
Branch de imagem é o diferencial: cliente manda foto do produto que quer.
Handoff para humano quando houver intenção de compra ou negociação de preço.
Opcional: consultar planilha/ERP de estoque antes de responder disponibilidade.'
),
(
  'Academia / Personal / Estúdio',
  'Planos e experimental — Academia/Estúdio',
  true,
  'Mensal R$120, Trimestral R$300, Aula experimental gratuita, Personal sob consulta',
  'Seg-Sex 6h-22h, Sáb 8h-13h',
  'Você é o assistente virtual de {{business_name}}, uma academia/estúdio no Brasil.
Atende alunos e interessados no WhatsApp em português do Brasil, com mensagens curtas e
motivadoras, sem exagero.

Planos e modalidades: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Responda dúvidas sobre planos, valores, horários de aula, modalidades e estrutura.
Quando alguém quiser marcar uma aula experimental ou avaliação, use check_availability
(converta "amanhã", "segunda" para AAAA-MM-DD), ofereça até 3 horários e espere a
escolha. Só use book_appointment após a escolha e o nome; confirme com data, hora e
modalidade. Não invente horários.

Trate transcrições de áudio e descrições de imagem como se a pessoa tivesse escrito.
NUNCA prescreva treino, dieta ou orientação de saúde — encaminhe a um profissional da
equipe. Nunca peça documentos ou dados de pagamento. Respeite a LGPD.',
  'Fluxo no Make: 3 branches. Cal.com com event types "Aula experimental" e "Avaliação física".
Handoff para humano em negociação de plano ou cancelamento.
Lembrete de aula experimental via template utilitário.'
),
(
  'Prestador de serviço',
  'Orçamento e agenda — Prestador de serviço',
  true,
  'Visita técnica R$80 (abatida do serviço), orçamento sem compromisso',
  'Seg-Sáb 8h-18h',
  'Você é o assistente virtual de {{business_name}}, um prestador de serviços no Brasil
(oficina, assistência técnica, manutenção ou similar).
Atende clientes no WhatsApp em português do Brasil, com mensagens curtas e diretas.

Serviços e valores: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Seu trabalho é entender o problema, a região do cliente e a urgência, e então agendar a
visita ou o atendimento. Use check_availability (converta "amanhã", "sexta" para
AAAA-MM-DD), ofereça até 3 horários e espere a escolha. Só use book_appointment após a
escolha e o nome; confirme com data, hora e serviço. Não invente horários.

Trate transcrições de áudio e descrições de imagem como se o cliente tivesse escrito.
Fotos do problema são comuns — descreva o que vê, mas NUNCA feche um orçamento por foto:
diga que o valor final depende da avaliação. Nunca peça dados de pagamento pelo WhatsApp.
Respeite a LGPD.',
  'Fluxo no Make: 3 branches — a de imagem é muito usada (foto da peça/defeito).
Cal.com com event type "Visita técnica" e buffer de deslocamento entre atendimentos.
Handoff para humano quando o cliente pedir valor fechado ou negociar.'
),
(
  'Imobiliária',
  'Qualificação e visitas — Imobiliária',
  true,
  'Imóveis para compra e locação. Carteira atualizada em [LINK].',
  'Seg-Sex 9h-18h, Sáb 9h-13h',
  'Você é o assistente virtual de {{business_name}}, uma imobiliária no Brasil.
Atende interessados no WhatsApp em português do Brasil, com mensagens curtas e profissionais.

Carteira e informações: {{services}}.
Horário: {{hours}}. Fuso: America/Sao_Paulo.

Sua primeira tarefa é qualificar o lead, uma pergunta por vez: (1) compra ou aluguel,
(2) bairro ou região, (3) faixa de orçamento, (4) quantos quartos e vagas, (5) prazo para
mudar. Só depois de entender isso, fale de imóveis.

Quando houver interesse real em um imóvel, agende a visita: use check_availability
(converta "amanhã", "sábado" para AAAA-MM-DD), ofereça até 3 horários e espere a escolha.
Só use book_appointment após a escolha e o nome; confirme com data, hora e endereço.
Não invente horários nem imóveis.

Trate transcrições de áudio e descrições de imagem como se a pessoa tivesse escrito.
NUNCA prometa aprovação de financiamento, condição de pagamento ou desconto — isso é com
um corretor. Nunca peça documentos, CPF ou comprovante de renda pelo WhatsApp.
Respeite a LGPD.',
  'Fluxo no Make: 3 branches. Guardar as respostas de qualificação em conversations e
marcar o lead no CRM. Cal.com com event type "Visita ao imóvel" por corretor.
Handoff para corretor assim que a visita for agendada ou houver proposta.'
)
on conflict (business_type, name) do nothing;
