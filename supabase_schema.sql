-- Run this in Supabase SQL Editor if you want tables ready before app.py's
-- db.create_all() runs. (db.create_all() will also create these automatically
-- on first run, so this file is optional / a backup.)

create table if not exists users (
    id serial primary key,
    name varchar(120) not null,
    email varchar(120) unique not null,
    password_hash varchar(255) not null,
    role varchar(20) not null check (role in ('admin', 'agent', 'customer')),
    created_at timestamptz default now()
);

create table if not exists customers (
    id serial primary key,
    user_id integer references users(id),
    name varchar(120) not null,
    dob date,
    phone varchar(20),
    address varchar(255),
    email varchar(120)
);

create table if not exists policies (
    id serial primary key,
    customer_id integer not null references customers(id),
    policy_type varchar(50) not null,
    policy_number varchar(50) unique not null,
    premium_amount numeric(10,2) not null,
    start_date date not null,
    end_date date not null,
    status varchar(20) default 'active'
);

create table if not exists claims (
    id serial primary key,
    policy_id integer not null references policies(id),
    claim_amount numeric(10,2) not null,
    reason varchar(255) not null,
    status varchar(20) default 'pending',
    submission_date timestamptz default now(),
    risk_level varchar(10),
    risk_reason varchar(255)
);

create table if not exists premium_payments (
    id serial primary key,
    policy_id integer not null references policies(id),
    payment_date date not null,
    amount numeric(10,2) not null,
    payment_status varchar(20) default 'paid'
);

create table if not exists documents (
    id serial primary key,
    customer_id integer not null references customers(id),
    file_name varchar(255) not null,
    file_path varchar(500) not null,
    uploaded_at timestamptz default now()
);

-- After running this, go to Storage in the Supabase dashboard and create
-- a bucket named "documents" (used by the Document Management module).
