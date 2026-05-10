-- Create a table for public profiles to store tokens
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  tokens_balance integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies so users can only view and edit their own profiles
create policy "Users can view own profile" 
  on profiles for select 
  using ( auth.uid() = id );

create policy "Users can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );

-- Create a trigger function to create a profile automatically when a user signs up
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, tokens_balance)
  values (new.id, new.email, 0); -- 0 free tokens
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- JOBS TABLE (History of processed files)
-- ==========================================
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  filename text not null,
  language text,
  duration text,
  tokens integer not null,
  status text not null check (status in ('done', 'failed', 'processing')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.jobs enable row level security;

-- Policies for jobs
create policy "Users can view own jobs" 
  on jobs for select 
  using ( auth.uid() = user_id );

create policy "Users can insert own jobs" 
  on jobs for insert 
  with check ( auth.uid() = user_id );
