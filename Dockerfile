# Hephaestus — Newman Runner  v3.6.0
#
# Запускает Newman тесты в контейнере.
# Не требует локальной установки Node.js / Newman.
#
# Быстрый старт:
#   docker build -t hephaestus-runner .
#   docker run --rm -v $(pwd):/data hephaestus-runner \
#     run /data/collection.json \
#     -e /data/environment.json \
#     --reporter-json-export /data/results.json -r json
#
# Или через docker-compose:
#   docker-compose run --rm newman

FROM node:20-alpine

LABEL org.opencontainers.image.title="Hephaestus Newman Runner"
LABEL org.opencontainers.image.description="Hephaestus API testing framework with Newman"
LABEL org.opencontainers.image.version="3.6.0"
LABEL org.opencontainers.image.source="https://github.com/bogdanov-igor/hephaestus-postman-framework"

# Install Newman + HTML reporter
RUN npm install -g newman@latest newman-reporter-htmlextra@latest \
    && newman --version

# Copy Hephaestus tooling scripts
COPY scripts/ /hephaestus/scripts/
COPY setup/   /hephaestus/setup/

WORKDIR /data

# Default entrypoint — users pass newman subcommand + args
ENTRYPOINT ["newman"]
CMD ["--help"]
