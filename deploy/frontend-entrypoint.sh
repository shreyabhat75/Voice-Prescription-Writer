#!/bin/sh
set -e

# Local compose leaves PORT / BACKEND_UPSTREAM unset and uses nginx.conf as-is.
# Render sets PORT=10000 and BACKEND_UPSTREAM to the public backend URL.
if [ -n "${PORT}" ] || [ -n "${BACKEND_UPSTREAM}" ]; then
  LISTEN_PORT="${PORT:-80}"
  BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-http://backend:8000}"
  BACKEND_UPSTREAM="${BACKEND_UPSTREAM%/}"
  if [ -z "${BACKEND_HOST_HEADER}" ]; then
    BACKEND_HOST_HEADER="$(printf '%s' "${BACKEND_UPSTREAM}" | sed 's|^https://||; s|^http://||; s|/.*||')"
  fi
  export LISTEN_PORT BACKEND_UPSTREAM BACKEND_HOST_HEADER
  envsubst '${LISTEN_PORT} ${BACKEND_UPSTREAM} ${BACKEND_HOST_HEADER}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
