# syntax=docker/dockerfile:1.7
#
# Clean TenXPros production image.

# -----------------------------------------------------------------------------
# Stage 1 — install dependencies (cached layer)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 1b — narration toolchain (cached layer, independent of app source)
#
# Piper TTS synthesizes the Partner Academy lesson narration inside the app
# container. The binary release (MIT, final 2023.11.14-2 build, runs on plain
# bookworm with zero extra packages) and the three curated voice models (all
# with public domain model cards; see src/lib/academy/voices.ts before ever
# changing this list) are pinned by URL AND sha256.
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS tts
RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL -o /tmp/piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
 && echo "a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992  /tmp/piper.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/piper.tar.gz -C /opt \
 && rm /tmp/piper.tar.gz \
 && mkdir -p /opt/piper/voices
RUN BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main \
 && curl -fsSL -o /opt/piper/voices/en_US-bryce-medium.onnx "$BASE/en/en_US/bryce/medium/en_US-bryce-medium.onnx" \
 && curl -fsSL -o /opt/piper/voices/en_US-bryce-medium.onnx.json "$BASE/en/en_US/bryce/medium/en_US-bryce-medium.onnx.json" \
 && curl -fsSL -o /opt/piper/voices/en_US-ljspeech-high.onnx "$BASE/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx" \
 && curl -fsSL -o /opt/piper/voices/en_US-ljspeech-high.onnx.json "$BASE/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx.json" \
 && curl -fsSL -o /opt/piper/voices/en_GB-cori-high.onnx "$BASE/en/en_GB/cori/high/en_GB-cori-high.onnx" \
 && curl -fsSL -o /opt/piper/voices/en_GB-cori-high.onnx.json "$BASE/en/en_GB/cori/high/en_GB-cori-high.onnx.json" \
 && printf '%s  %s\n' \
    dc9caa6c313199ffb5ac698b6e542fa6cba388aeaf2731e25262e33b9810aef1 /opt/piper/voices/en_US-bryce-medium.onnx \
    7ceb1bc4af6d4e41b6d1edbb86c67e91e01eaa71f66db4cd0ae92ac704d415be /opt/piper/voices/en_US-bryce-medium.onnx.json \
    5d4f08ba6a2a48c44592eed3ce56bf85e9de3dd4e20df90541ae68a8310c029a /opt/piper/voices/en_US-ljspeech-high.onnx \
    7e1f4634af596d83cca997fb7a931ba80b70f8a316a2655ee69c55365e0ace14 /opt/piper/voices/en_US-ljspeech-high.onnx.json \
    470b4dd634c98f8a4850d7626ffc3dfc90774628eeef6605a6dd8f88f30a5903 /opt/piper/voices/en_GB-cori-high.onnx \
    9e7fb5b5671612c22f3c81cbe46c1ae87b031a4632bcb509e499dad6f1e2adec /opt/piper/voices/en_GB-cori-high.onnx.json \
  | sha256sum -c -

# -----------------------------------------------------------------------------
# Stage 2 — build
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
 && apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate \
 && pnpm build

# -----------------------------------------------------------------------------
# Stage 3 — runtime
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
 && apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends openssl ca-certificates curl lame \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=tts /opt/piper /opt/piper
COPY --from=build /app /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

# Migrations remain deploy-safe; narration generation is never a container or
# web-process startup side effect. Releases are generated only by the explicit
# isolated administrative CLI.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
