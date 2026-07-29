#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Container entrypoint must start as root so it can prepare the private upload volume." >&2
  exit 1
fi

upload_directory="${UPLOAD_DIR:-/app/uploads}"
if [ "$upload_directory" != "/app/uploads" ]; then
  echo "UPLOAD_DIR must be exactly /app/uploads in the supplied Docker image." >&2
  exit 1
fi

mkdir -p "$upload_directory"
if [ -L "$upload_directory" ]; then
  echo "UPLOAD_DIR must be a real directory, not a symbolic link." >&2
  exit 1
fi
chown node:node "$upload_directory"
chmod 0700 "$upload_directory"

gosu node pnpm env:check

case "${RUN_MIGRATIONS:-true}" in
  true)
    gosu node pnpm db:deploy
    ;;
  false)
    ;;
  *)
    echo "RUN_MIGRATIONS must be true or false." >&2
    exit 1
    ;;
esac

exec gosu node "$@"
