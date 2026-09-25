#!/bin/sh
set -eu
cd /var/www/html
# Persist a random key alongside the session data; never bake one into the image.
if [ -z "${APP_KEY:-}" ]; then
    if [ ! -s storage/app/slotwise.key ]; then
        (umask 077; php -r 'echo "base64:".base64_encode(random_bytes(32));' > storage/app/slotwise.key)
    fi
    APP_KEY="$(cat storage/app/slotwise.key)"
    export APP_KEY
fi
php artisan package:discover --quiet
php artisan migrate --force --no-interaction
php artisan demo:seed --no-interaction
chown -R www-data:www-data storage bootstrap/cache
exec "$@"
