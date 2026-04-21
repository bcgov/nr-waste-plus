CREATE TABLE IF NOT EXISTS hrs.user_bookmarks (
    user_id    VARCHAR(70) NOT NULL,
    reporting_unit_id BIGINT NOT NULL,
    CONSTRAINT user_bookmarks_pk primary key(user_id, reporting_unit_id)
);

comment on table hrs.user_bookmarks is '
Table to store user bookmarked reporting units.
Users can bookmark multiple reporting units.
Each reporting unit can be bookmarked by multiple users.
Bookmarked reporting units are also used as reference for the offline mode.';
comment on column hrs.user_bookmarks.user_id is 'Unique identifier for the user';
comment on column hrs.user_bookmarks.reporting_unit_id is '
Unique identifier for the reporting unit that the user has bookmarked.
This is a foreign key referencing the reporting unit in the oracle database.';
