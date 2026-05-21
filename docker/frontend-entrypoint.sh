#!/bin/sh
set -e

# Generate a small JS file that sets window.__API_URL for runtime-configurable frontend
API_VAL="${API_URL:-${VITE_API_URL:-http://localhost:8000}}"
echo "/* runtime config */" > /usr/share/nginx/html/env-config.js
echo "window.__API_URL = '${API_VAL}';" >> /usr/share/nginx/html/env-config.js

exec "$@"
