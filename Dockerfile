FROM node:24-bookworm-slim AS frontend
WORKDIR /build
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
COPY public ./public
COPY index.html tsconfig.json vite.config.ts vitest.config.ts ./
RUN pnpm build

FROM php:8.4-apache-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libonig-dev unzip curl \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring opcache \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress
COPY backend .
RUN composer dump-autoload --no-dev --optimize --no-scripts \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache
COPY --from=frontend /build/backend/public/build ./public/build
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/slotwise-entrypoint
RUN chmod +x /usr/local/bin/slotwise-entrypoint
EXPOSE 80
ENTRYPOINT ["slotwise-entrypoint"]
CMD ["apache2-foreground"]
