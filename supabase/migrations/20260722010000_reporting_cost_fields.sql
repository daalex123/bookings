-- Phase 2 reporting foundation: capture direct costs for profit reporting.
-- Service cost is defined on services so both primary services and additional services can contribute cost.

alter table public.services
  add column if not exists cost_price numeric(10,2) not null default 0;

comment on column public.services.cost_price is
  'Direct cost for delivering this service (used for gross profit reports).';

alter table public.appointment_addons
  add column if not exists cost_price numeric(10,2) not null default 0;

comment on column public.appointment_addons.cost_price is
  'Snapshot of add-on cost at booking time for profit reporting.';
