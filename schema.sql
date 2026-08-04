-- ===========================================================================
-- ConversIA — Supabase schema
-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: everything is IF NOT EXISTS / OR REPLACE.
--
-- Both tables have Row Level Security ON with NO policies. That means the anon
-- and authenticated keys can read and write nothing at all. Only the
-- service-role key — used exclusively inside the serverless functions, never in
-- the browser — bypasses RLS and can touch these tables. This is deliberate.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- whatsapp_clients — one row per business connected through 360dialog
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_clients (
  id                    uuid primary key default gen_random_uuid(),

  -- 360dialog identifiers. client_id is our stable key: Make sends it to
  -- /api/send, and /api/partner-events upserts on it.
  client_id             text not null unique,
  channel_id            text unique,

  -- WhatsApp Cloud API identifiers. phone_number_id is how /api/inbound finds
  -- the business for an incoming message, so it must be unique and indexed.
  phone_number_id       text unique,
  waba_id               text,
  phone_number          text,

  business_name         text,

  -- 360dialog channel API key. Server-side only: RLS keeps it away from any
  -- browser-facing key, and no function ever returns it in a response.
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

alter table public.whatsapp_clients enable row level security;

comment on table public.whatsapp_clients is
  'Businesses connected through the 360dialog partner flow. Service-role access only.';
comment on column public.whatsapp_clients.api_key is
  'SECRET. 360dialog channel API key — never expose to the browser.';

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

  -- LGPD: the form requires an explicit opt-in, recorded here with the row.
  consentimento   boolean not null default false,

  origem          text not null default 'site',
  user_agent      text,
  ip              text,

  -- Simple pipeline tracking so the table is usable as-is.
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

alter table public.leads enable row level security;

comment on table public.leads is
  'Demo requests from the site form. Written by /api/leads with the service-role key.';
comment on column public.leads.consentimento is
  'LGPD opt-in captured at submission time. Always true for rows written by the site.';
