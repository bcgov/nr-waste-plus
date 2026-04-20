create table if not exists hrs.user_identity (
    sub              varchar(128)    not null,
    email            varchar(255),
    name             varchar(255),
    given_name       varchar(128),
    family_name      varchar(128),
    idp_name         varchar(64),
    idp_user_id      varchar(128),
    idp_username     varchar(128),
    idp_display_name varchar(255),
    idp_business_id  varchar(128),
    raw_attributes   jsonb           not null default '{}'::jsonb,
    last_synced_at   timestamptz     not null default current_timestamp,
    constraint user_identity_pk primary key (sub)
);

comment on table hrs.user_identity is 'Cached Cognito user identity attributes, used to avoid repeated userInfo calls';
comment on column hrs.user_identity.sub is 'Cognito subject identifier — unique, immutable UUID for the user';
comment on column hrs.user_identity.email is 'User email address as returned by Cognito userInfo';
comment on column hrs.user_identity.name is 'User full display name as returned by Cognito userInfo';
comment on column hrs.user_identity.given_name is 'User given (first) name as returned by Cognito userInfo';
comment on column hrs.user_identity.family_name is 'User family (last) name as returned by Cognito userInfo';
comment on column hrs.user_identity.idp_name is 'Identity provider name from custom:idp_name (e.g. idir, bceidbusiness)';
comment on column hrs.user_identity.idp_user_id is 'User identifier within the identity provider from custom:idp_user_id';
comment on column hrs.user_identity.idp_username is 'Username within the identity provider from custom:idp_username';
comment on column hrs.user_identity.idp_display_name is 'Display name from the identity provider from custom:idp_display_name';
comment on column hrs.user_identity.idp_business_id is 'BCeID business identifier from custom:idp_business_id; null for IDIR users';
comment on column hrs.user_identity.raw_attributes is 'Full raw attribute map returned by Cognito userInfo, stored for future use';
comment on column hrs.user_identity.last_synced_at is 'Timestamp of the last successful sync with Cognito; used for staleness checks';

