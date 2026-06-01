-- schema.sql
-- Script de inicialización de la base de datos PostgreSQL para Supabase.

-- Habilitar extensión uuid-ossp si no está habilitada
create extension if not exists "uuid-ossp";

-- 1. TABLA DE PERFILES (Vinculada a auth.users de Supabase)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    display_name text,
    avatar_url text,
    bio text,
    services text,                     -- Descripción de servicios profesionales
    social_links jsonb,                -- Objeto JSON con enlaces a redes sociales
    google_access_token text,
    google_refresh_token text,
    google_token_expiry bigint, -- timestamp en milisegundos
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Políticas de RLS para profiles
create policy "Perfiles públicos son legibles por cualquiera" 
    on public.profiles for select using (true);

create policy "Usuarios pueden actualizar su propio perfil" 
    on public.profiles for update using (auth.uid() = id);

-- 2. TABLA DE ENLACES (Links del Link in Bio)
create table public.links (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    url text not null,
    icon_name text,
    sort_order integer default 0 not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para links
alter table public.links enable row level security;

create policy "Enlaces activos son públicos" 
    on public.links for select using (is_active = true);

create policy "Propietario puede ver todos sus enlaces" 
    on public.links for select using (auth.uid() = user_id);

create policy "Propietario puede insertar enlaces" 
    on public.links for insert with check (auth.uid() = user_id);

create policy "Propietario puede actualizar sus enlaces" 
    on public.links for update using (auth.uid() = user_id);

create policy "Propietario puede eliminar sus enlaces" 
    on public.links for delete using (auth.uid() = user_id);

-- 3. TABLA DE DISPONIBILIDAD (Horarios laborables)
create table public.schedules (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Domingo, 1=Lunes, ...
    start_time time not null, -- ej. '09:00:00'
    end_time time not null,   -- ej. '17:00:00'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint schedule_time_range_check check (start_time < end_time)
);

-- RLS para schedules
alter table public.schedules enable row level security;

create policy "Disponibilidad es legible por cualquiera" 
    on public.schedules for select using (true);

create policy "Propietario puede gestionar su disponibilidad" 
    on public.schedules for all using (auth.uid() = user_id);

-- 4. TABLA DE RESERVAS (Bookings)
create table public.bookings (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    client_name text not null,
    client_email text not null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    google_event_id text,
    status text default 'pending'::text not null check (status in ('pending', 'confirmed', 'cancelled')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint booking_time_range_check check (start_time < end_time)
);

-- RLS para bookings
alter table public.bookings enable row level security;

create policy "Propietario puede ver y gestionar todas sus reservas" 
    on public.bookings for all using (auth.uid() = user_id);

create policy "Cualquiera puede crear una reserva" 
    on public.bookings for insert with check (true);

create policy "Clientes pueden ver su propia reserva por ID" 
    on public.bookings for select using (true); -- Habilitamos la lectura de la reserva creada

-- 5. TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFIL AL REGISTRARSE EN AUTH.USERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'Nuevo Usuario'),
    new.raw_user_meta_data->>'avatar_url',
    'Hola! Este es mi Link in Bio con reservas.'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ====================================================================
-- MIGRACIONES DE ACTUALIZACIÓN (Ejecutar en Supabase si ya creaste la BD)
-- ====================================================================
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb;
-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
-- ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status in ('pending', 'confirmed', 'cancelled'));
-- ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';

