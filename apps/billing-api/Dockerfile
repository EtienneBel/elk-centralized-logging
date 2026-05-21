FROM php:8.2-cli
RUN apt-get update -y && apt-get install -y git unzip libzip-dev curl \
    && docker-php-ext-install zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html

# Install Laravel base (cached layer)
RUN composer create-project --prefer-dist laravel/laravel:^10 . --quiet

# Overlay our custom files (app/ includes Http/, Logging/, Providers/)
COPY app/ app/
COPY config/logging.php config/logging.php
COPY routes/api.php routes/api.php
COPY .env.docker .env

RUN php artisan key:generate \
    && mkdir -p storage/logs bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
