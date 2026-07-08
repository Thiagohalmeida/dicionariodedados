# See https://aka.ms/vscode-remote/devcontainer.json for format details.
FROM mcr.microsoft.com/devcontainers/javascript-node:0-24

# Install git and other tooling if not already present.
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
