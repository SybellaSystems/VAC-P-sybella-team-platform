
-- ============================================================
-- SYBELLA SYSTEMS: COMPANY RESOURCES
-- Migration: 20261116000000_company_resources.sql
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PERMISSION HELPERS
-- ------------------------------------------------------------

-- Directors and admins can manage the company-wide resources.
-- Also preserves the existing executive department exception.
create or replace function public.is_resource_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        lower(coalesce(p.role, '')) in ('admin', 'director')
        or (
          lower(coalesce(p.role, '')) = 'executive'
          and lower(coalesce(p.department, ''))
              in ('executive', 'executive department')
        )
      )
  );
$$;

-- Employees other than partners may register resources.
create or replace function public.can_add_company_resources()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) <> 'partner'
  );
$$;

-- Returns the authenticated employee's department.
create or replace function public.current_resource_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.department_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;


-- ------------------------------------------------------------
-- 2. PLATFORMS
-- ------------------------------------------------------------

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  purpose text not null,
  description text,

  login_url text not null,

  created_by uuid not null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platforms_name_not_empty
    check (length(trim(name)) > 0),

  constraint platforms_purpose_not_empty
    check (length(trim(purpose)) > 0),

  constraint platforms_login_url_valid
    check (login_url ~* '^https?://')
);

create index if not exists platforms_name_idx
  on public.platforms(name);

create index if not exists platforms_created_by_idx
  on public.platforms(created_by);


-- ------------------------------------------------------------
-- 3. PLATFORM-DEPARTMENT ASSIGNMENTS
-- Many-to-many relationship:
-- One platform can belong to many departments.
-- One department can use many platforms.
-- ------------------------------------------------------------

create table if not exists public.platform_departments (
  id uuid primary key default gen_random_uuid(),

  platform_id uuid not null
    references public.platforms(id)
    on delete cascade,

  department_id uuid not null
    references public.departments(id)
    on delete cascade,

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint platform_department_unique
    unique (platform_id, department_id)
);

create index if not exists platform_departments_platform_idx
  on public.platform_departments(platform_id);

create index if not exists platform_departments_department_idx
  on public.platform_departments(department_id);


-- ------------------------------------------------------------
-- 4. GOOGLE DRIVE FOLDER STRUCTURE
-- Stores folder names and their hierarchy only.
-- Actual folders and files remain in Google Drive.
-- ------------------------------------------------------------

create table if not exists public.drive_folders (
  id uuid primary key default gen_random_uuid(),

  department_id uuid not null
    references public.departments(id)
    on delete cascade,

  parent_id uuid,

  name text not null,
  description text,

  created_by uuid not null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Allows a composite foreign key to ensure that a
  -- subfolder's parent belongs to the same department.
  constraint drive_folders_id_department_unique
    unique (id, department_id),

  constraint drive_folders_name_not_empty
    check (length(trim(name)) > 0),

  constraint drive_folders_parent_same_department
    foreign key (parent_id, department_id)
    references public.drive_folders(id, department_id)
    on delete cascade
);

create index if not exists drive_folders_department_idx
  on public.drive_folders(department_id);

create index if not exists drive_folders_parent_idx
  on public.drive_folders(parent_id);


-- ------------------------------------------------------------
-- 5. GOOGLE DRIVE FILE REFERENCES
-- These are links to files stored in Google Drive.
-- ------------------------------------------------------------

create table if not exists public.drive_documents (
  id uuid primary key default gen_random_uuid(),

  folder_id uuid not null
    references public.drive_folders(id)
    on delete cascade,

  title text not null,
  drive_url text not null,

  description text,
  mime_type text,

  created_by uuid not null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint drive_documents_title_not_empty
    check (length(trim(title)) > 0),

  constraint drive_documents_url_valid
    check (drive_url ~* '^https?://')
);

create index if not exists drive_documents_folder_idx
  on public.drive_documents(folder_id);

create index if not exists drive_documents_created_by_idx
  on public.drive_documents(created_by);


-- ------------------------------------------------------------
-- 6. UPDATED_AT TRIGGER
-- ------------------------------------------------------------

create or replace function public.set_resource_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platforms_updated_at
  on public.platforms;

create trigger platforms_updated_at
before update on public.platforms
for each row
execute function public.set_resource_updated_at();


drop trigger if exists drive_folders_updated_at
  on public.drive_folders;

create trigger drive_folders_updated_at
before update on public.drive_folders
for each row
execute function public.set_resource_updated_at();


drop trigger if exists drive_documents_updated_at
  on public.drive_documents;

create trigger drive_documents_updated_at
before update on public.drive_documents
for each row
execute function public.set_resource_updated_at();


-- ------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.platforms enable row level security;
alter table public.platform_departments enable row level security;
alter table public.drive_folders enable row level security;
alter table public.drive_documents enable row level security;


-- ------------------------------------------------------------
-- 8. PLATFORM POLICIES
-- ------------------------------------------------------------

drop policy if exists "Authenticated users can view platforms"
  on public.platforms;

create policy "Authenticated users can view platforms"
on public.platforms
for select
to authenticated
using (true);


drop policy if exists "Employees can add platforms"
  on public.platforms;

create policy "Employees can add platforms"
on public.platforms
for insert
to authenticated
with check (
  public.can_add_company_resources()
  and created_by = auth.uid()
);


drop policy if exists "Admins can update platforms"
  on public.platforms;

create policy "Admins can update platforms"
on public.platforms
for update
to authenticated
using (public.is_resource_admin())
with check (public.is_resource_admin());


drop policy if exists "Admins can delete platforms"
  on public.platforms;

create policy "Admins can delete platforms"
on public.platforms
for delete
to authenticated
using (public.is_resource_admin());


-- ------------------------------------------------------------
-- 9. PLATFORM-DEPARTMENT POLICIES
-- ------------------------------------------------------------

drop policy if exists "Authenticated users can view platform assignments"
  on public.platform_departments;

create policy "Authenticated users can view platform assignments"
on public.platform_departments
for select
to authenticated
using (true);


-- Employees can associate a platform with their own department.
-- Directors and admins can associate platforms with any department.
drop policy if exists "Employees can assign platforms to departments"
  on public.platform_departments;

create policy "Employees can assign platforms to departments"
on public.platform_departments
for insert
to authenticated
with check (
  public.is_resource_admin()
  or (
    public.can_add_company_resources()
    and department_id = public.current_resource_department_id()
    and exists (
      select 1
      from public.platforms p
      where p.id = platform_id
        and p.created_by = auth.uid()
    )
  )
);


drop policy if exists "Admins can update platform assignments"
  on public.platform_departments;

create policy "Admins can update platform assignments"
on public.platform_departments
for update
to authenticated
using (public.is_resource_admin())
with check (public.is_resource_admin());


drop policy if exists "Admins can delete platform assignments"
  on public.platform_departments;

create policy "Admins can delete platform assignments"
on public.platform_departments
for delete
to authenticated
using (public.is_resource_admin());


-- ------------------------------------------------------------
-- 10. DRIVE FOLDER POLICIES
-- Everyone can view the folder hierarchy.
-- Only directors/admins can create, edit or delete folders.
-- ------------------------------------------------------------

drop policy if exists "Authenticated users can view drive folders"
  on public.drive_folders;

create policy "Authenticated users can view drive folders"
on public.drive_folders
for select
to authenticated
using (true);


drop policy if exists "Admins can create drive folders"
  on public.drive_folders;

create policy "Admins can create drive folders"
on public.drive_folders
for insert
to authenticated
with check (
  public.is_resource_admin()
  and created_by = auth.uid()
);


drop policy if exists "Admins can update drive folders"
  on public.drive_folders;

create policy "Admins can update drive folders"
on public.drive_folders
for update
to authenticated
using (public.is_resource_admin())
with check (public.is_resource_admin());


drop policy if exists "Admins can delete drive folders"
  on public.drive_folders;

create policy "Admins can delete drive folders"
on public.drive_folders
for delete
to authenticated
using (public.is_resource_admin());


-- ------------------------------------------------------------
-- 11. DRIVE DOCUMENT POLICIES
-- Everyone can view registered file links.
-- Non-partner employees can register file links.
-- Authors can edit/delete their own links.
-- Directors/admins can manage all links.
-- ------------------------------------------------------------

drop policy if exists "Authenticated users can view drive documents"
  on public.drive_documents;

create policy "Authenticated users can view drive documents"
on public.drive_documents
for select
to authenticated
using (true);


drop policy if exists "Employees can register drive documents"
  on public.drive_documents;

create policy "Employees can register drive documents"
on public.drive_documents
for insert
to authenticated
with check (
  public.can_add_company_resources()
  and created_by = auth.uid()
);


drop policy if exists "Authors and admins can update drive documents"
  on public.drive_documents;

create policy "Authors and admins can update drive documents"
on public.drive_documents
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_resource_admin()
)
with check (
  created_by = auth.uid()
  or public.is_resource_admin()
);


drop policy if exists "Authors and admins can delete drive documents"
  on public.drive_documents;

create policy "Authors and admins can delete drive documents"
on public.drive_documents
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_resource_admin()
);


-- ------------------------------------------------------------
-- 12. GRANT TABLE ACCESS
-- RLS still controls which rows each user can access.
-- ------------------------------------------------------------

grant select, insert, update, delete
on public.platforms
to authenticated;

grant select, insert, update, delete
on public.platform_departments
to authenticated;

grant select, insert, update, delete
on public.drive_folders
to authenticated;

grant select, insert, update, delete
on public.drive_documents
to authenticated;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
