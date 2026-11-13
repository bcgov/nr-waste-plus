#!/bin/bash
set -e

NEW_PGDATA="${PGDATA:-/var/lib/postgresql/18/docker}"
SUPERUSER="${POSTGRES_USER:-postgres}"

# On OpenShift, containers run under arbitrary UIDs without an /etc/passwd entry.
# Configure nss_wrapper so initdb, pg_ctl, psql, and pg_upgrade can resolve the user.
NSS_WRAPPER_ACTIVE=0
if ! getent passwd "$(id -u)" >/dev/null 2>&1; then
    for wrapper in /usr/lib/x86_64-linux-gnu/libnss_wrapper.so /usr/lib/libnss_wrapper.so /lib/libnss_wrapper.so; do
        if [ -s "$wrapper" ]; then
            NSS_WRAPPER_PASSWD="$(mktemp)"
            NSS_WRAPPER_GROUP="$(mktemp)"
            export LD_PRELOAD="$wrapper" NSS_WRAPPER_PASSWD NSS_WRAPPER_GROUP
            printf 'postgres:x:%s:%s:PostgreSQL:%s:/bin/false\n' "$(id -u)" "$(id -g)" "$NEW_PGDATA" > "$NSS_WRAPPER_PASSWD"
            printf 'postgres:x:%s:\n' "$(id -g)" > "$NSS_WRAPPER_GROUP"
            NSS_WRAPPER_ACTIVE=1
            break
        fi
    done
fi

OLD_CLUSTER_DIR=""
OLD_VERSION=""

# Check if PG_VERSION exists directly in /var/lib/postgresql
if [ -s "/var/lib/postgresql/PG_VERSION" ]; then
    V=$(cat "/var/lib/postgresql/PG_VERSION")
    if [ "$V" != "18" ]; then
        echo "Detected PostgreSQL $V directly in /var/lib/postgresql."
        # Relocate all files into a subfolder except PG_VERSION first, so an interrupted
        # relocation can safely resume through this root-directory branch on next startup
        OLD_DIR="/var/lib/postgresql/data.v${V}"
        mkdir -p "$OLD_DIR"
        find /var/lib/postgresql -maxdepth 1 -mindepth 1 \
            ! -name "data.v*" \
            ! -name "18" \
            ! -name "lost+found" \
            ! -name "PG_VERSION" \
            -exec mv -t "$OLD_DIR" {} +
        # Move PG_VERSION last only after all other entries have moved successfully
        mv /var/lib/postgresql/PG_VERSION "$OLD_DIR/PG_VERSION"
        OLD_CLUSTER_DIR="$OLD_DIR"
        OLD_VERSION="$V"
    fi
# Check if PG_VERSION exists in /var/lib/postgresql/data (default in PostgreSQL 13 container)
elif [ -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    V=$(cat "/var/lib/postgresql/data/PG_VERSION")
    if [ "$V" != "18" ]; then
        echo "Detected PostgreSQL $V in /var/lib/postgresql/data."
        OLD_CLUSTER_DIR="/var/lib/postgresql/data"
        OLD_VERSION="$V"
    fi
# Check if an earlier migration relocated old cluster to /var/lib/postgresql/data.v* (ignoring .bak)
else
    for d in /var/lib/postgresql/data.v*; do
        if [ -d "$d" ] && [[ "$d" != *.bak* ]] && [ -s "$d/PG_VERSION" ]; then
            V=$(cat "$d/PG_VERSION")
            if [ "$V" != "18" ]; then
                echo "Detected PostgreSQL $V in $d."
                OLD_CLUSTER_DIR="$d"
                OLD_VERSION="$V"
                break
            fi
        fi
    done
fi

if [ -n "$OLD_CLUSTER_DIR" ] && [ -n "$OLD_VERSION" ]; then
    echo "=========================================================="
    echo "Initiating automated upgrade from PostgreSQL $OLD_VERSION to 18..."
    echo "Source: $OLD_CLUSTER_DIR"
    echo "Target: $NEW_PGDATA"
    echo "Superuser: $SUPERUSER"
    echo "=========================================================="

    OLD_BIN="/usr/lib/postgresql/${OLD_VERSION}/bin"
    NEW_BIN="/usr/lib/postgresql/18/bin"

    if [ ! -x "$OLD_BIN/postgres" ]; then
        echo "ERROR: PostgreSQL $OLD_VERSION binaries not found at $OLD_BIN!" >&2
        exit 1
    fi

    # Ensure source and target directories do not overlap to prevent data loss
    SRC_CANON="$(realpath -m "$OLD_CLUSTER_DIR")"
    TGT_CANON="$(realpath -m "$NEW_PGDATA")"
    if [ "$SRC_CANON" = "$TGT_CANON" ] || [[ "$TGT_CANON" == "$SRC_CANON"/* ]] || [[ "$SRC_CANON" == "$TGT_CANON"/* ]]; then
        echo "ERROR: Target PGDATA ($NEW_PGDATA) overlaps with source cluster ($OLD_CLUSTER_DIR)!" >&2
        exit 1
    fi

    chmod 700 "$OLD_CLUSTER_DIR" 2>/dev/null || true

    # Determine checksum settings of old cluster
    CHECKSUM_VAL=$("$OLD_BIN/pg_controldata" "$OLD_CLUSTER_DIR" | grep "Data page checksum version" | awk '{print $NF}')
    INITDB_CHECKSUM_ARG="--no-data-checksums"
    if [ "$CHECKSUM_VAL" = "1" ]; then
        INITDB_CHECKSUM_ARG="--data-checksums"
    fi
    echo "Preserving checksum setting: $INITDB_CHECKSUM_ARG"

    # Start and stop the old cluster to guarantee a clean shutdown (runs crash recovery)
    # and read its encoding/locale so the new cluster matches (pg_upgrade requires it).
    echo "Starting old cluster for clean shutdown and settings discovery..."
    "$OLD_BIN/pg_ctl" -D "$OLD_CLUSTER_DIR" \
        -o "-c listen_addresses= -c unix_socket_directories=/tmp" -w -t 600 start
    DB_INFO=$("$OLD_BIN/psql" -h /tmp -U "$SUPERUSER" -d postgres -AtF '|' \
        -c "SELECT pg_encoding_to_char(encoding), datcollate, datctype FROM pg_database WHERE datname='template0'")
    "$OLD_BIN/pg_ctl" -D "$OLD_CLUSTER_DIR" -m fast -w -t 600 stop
    IFS='|' read -r OLD_ENCODING OLD_COLLATE OLD_CTYPE <<< "$DB_INFO"
    if [ -z "$OLD_ENCODING" ] || [ -z "$OLD_COLLATE" ] || [ -z "$OLD_CTYPE" ]; then
        echo "ERROR: could not determine encoding/locale of old cluster" >&2
        exit 1
    fi
    echo "Preserving encoding=$OLD_ENCODING lc_collate=$OLD_COLLATE lc_ctype=$OLD_CTYPE"

    # Old cluster is still present and untouched (no --link), so any content in the
    # new data dir can only be leftovers of a failed attempt; remove those only.
    mkdir -p "$NEW_PGDATA"
    find "$NEW_PGDATA" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    chmod 700 "$NEW_PGDATA" 2>/dev/null || true

    # Initialize PostgreSQL 18 cluster with matching superuser, checksums, encoding and locale
    "$NEW_BIN/initdb" -D "$NEW_PGDATA" "$INITDB_CHECKSUM_ARG" -U "$SUPERUSER" \
        -E "$OLD_ENCODING" --lc-collate="$OLD_COLLATE" --lc-ctype="$OLD_CTYPE"

    # Run pg_upgrade
    echo "Executing pg_upgrade..."
    cd /tmp
    "$NEW_BIN/pg_upgrade" \
        -d "$OLD_CLUSTER_DIR" \
        -D "$NEW_PGDATA" \
        -b "$OLD_BIN" \
        -B "$NEW_BIN" \
        -U "$SUPERUSER"

    echo "pg_upgrade completed successfully!"

    # Restore authentication configuration from old cluster so external pod connections are accepted
    if [ -f "$OLD_CLUSTER_DIR/pg_hba.conf" ]; then
        echo "Restoring authentication configuration (pg_hba.conf, pg_ident.conf) from old cluster..."
        cp -p "$OLD_CLUSTER_DIR/pg_hba.conf" "$NEW_PGDATA/pg_hba.conf"
        [ -f "$OLD_CLUSTER_DIR/pg_ident.conf" ] && cp -p "$OLD_CLUSTER_DIR/pg_ident.conf" "$NEW_PGDATA/pg_ident.conf"
    fi

    # Reindex databases and refresh collation versions under new libc to ensure complete index validity
    echo "Reindexing databases and refreshing collation versions under new libc..."
    "$NEW_BIN/pg_ctl" -D "$NEW_PGDATA" \
        -o "-c listen_addresses= -c unix_socket_directories=/tmp" -w -t 600 start
    "$NEW_BIN/reindexdb" -h /tmp -U "$SUPERUSER" --all || echo "WARNING: reindexdb returned non-zero, continuing..."
    for db in $("$NEW_BIN/psql" -h /tmp -U "$SUPERUSER" -d postgres -At -c "SELECT datname FROM pg_database WHERE datistemplate = false;"); do
        "$NEW_BIN/psql" -h /tmp -U "$SUPERUSER" -d "$db" -c "ALTER DATABASE \"$db\" REFRESH COLLATION VERSION;" 2>/dev/null || true
    done
    "$NEW_BIN/pg_ctl" -D "$NEW_PGDATA" -m fast -w -t 600 stop

    # Preserve old data cluster as backup so NO DATA IS EVER DELETED
    BACKUP_PATH="/var/lib/postgresql/data.v${OLD_VERSION}.bak"
    if [ "$OLD_CLUSTER_DIR" != "$BACKUP_PATH" ]; then
        echo "Safely retaining old cluster at $BACKUP_PATH..."
        mv "$OLD_CLUSTER_DIR" "$BACKUP_PATH"
    fi
    echo "Upgrade to PostgreSQL 18 complete. Proceeding to startup."
    echo "=========================================================="
fi

# Clean up nss_wrapper temporary files if created
if [ "$NSS_WRAPPER_ACTIVE" = "1" ] && [[ "${LD_PRELOAD:-}" == */libnss_wrapper.so ]]; then
    rm -f "$NSS_WRAPPER_PASSWD" "$NSS_WRAPPER_GROUP"
    unset LD_PRELOAD NSS_WRAPPER_PASSWD NSS_WRAPPER_GROUP
fi

# Hand off execution to official docker-entrypoint
exec docker-entrypoint.sh postgres "$@"
