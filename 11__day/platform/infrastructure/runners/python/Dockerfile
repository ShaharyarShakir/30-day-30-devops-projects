FROM python:3.12-slim

WORKDIR /app

RUN useradd -m runner

USER runner

COPY --chown=runner:runner entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
