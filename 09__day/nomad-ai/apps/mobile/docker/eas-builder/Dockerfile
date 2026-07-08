FROM node:18-bullseye-slim

# Install curl and jq for JSON parsing inside the container if needed
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git && rm -rf /var/lib/apt/lists/*

# Install eas-cli globally
RUN npm install -g eas-cli@>=3.0.0

WORKDIR /work

# Allow running arbitrary commands via docker run
ENTRYPOINT ["/bin/sh", "-c"]
