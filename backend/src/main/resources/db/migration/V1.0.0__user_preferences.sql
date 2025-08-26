create schema if not exists hrs;

create table if not exists hrs.user_preferences (
    user_id       varchar(60)     not null,
    preferences   jsonb           not null default '{}'::jsonb,
    constraint user_preferences_pk primary key (user_id)
);

comment on table hrs.user_preferences is 'Table to store user preferences in JSON format';
comment on column hrs.user_preferences.user_id is 'Unique identifier for the user';
comment on column hrs.user_preferences.preferences is 'User preferences stored in JSON format';