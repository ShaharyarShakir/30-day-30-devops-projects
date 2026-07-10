FROM mcr.microsoft.com/devcontainers/base:bookworm

# Install Tilt CLI system-wide
RUN curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# Install uv (Python Package Manager) system-wide
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh
