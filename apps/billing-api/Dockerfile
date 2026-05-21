FROM php:8.2-cli
RUN apt-get update -y && apt-get install -y git unzip libzip-dev curl \
    && docker-php-ext-install zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html

COPY composer.json ./
RUN composer install --no-dev --no-scripts --optimize-autoloader

COPY . .
COPY .env.docker .env

RUN mkdir -p storage/logs bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache \
    && php artisan key:generate

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
