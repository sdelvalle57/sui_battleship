# Imagen de la app para Railway (#15): build estático de testnet + Caddy. Contexto acotado por .dockerignore.
# Sin --mount, heredocs ni "# syntax=": sirve con BuildKit (Railway, CI) y con el builder clásico (DL-9).
# Node 26.13.0: la misma versión que el gate local y la CI; fijada por digest con la regla de 7 días (DL-8).
FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
WORKDIR /repo
# .nvmrc antes del check: la guarda de Node de publish.mjs (#8) lo exige en todos los subcomandos (MAJOR-1).
COPY .nvmrc ./
COPY contracts/ contracts/
RUN test -f contracts/deployments/testnet.json || { echo "ERROR (#15): falta contracts/deployments/testnet.json. Lo commitea #8 tras la publicación del owner en testnet; sin él no se construye la app (nunca IDs a mano)." >&2; exit 1; }
RUN node contracts/scripts/publish.mjs check
COPY package.json package-lock.json .npmrc ./
COPY app/package.json app/
RUN npm ci
COPY app/ app/
ENV VITE_SUI_NETWORK=testnet
RUN npm run build -w app
RUN set -eu; \
    for f in packageId originalPackageId houseId publishTxDigest; do \
      v="$(node -p "require('./contracts/deployments/testnet.json').$f")"; \
      grep -rqF "$v" app/dist/assets || { echo "ERROR (#15): $f de testnet.json no está en el bundle" >&2; exit 1; }; \
    done; \
    if grep -rqE 'network"?:[^[:alnum:]]localnet[^[:alnum:]]' app/dist/assets; then echo "ERROR (#15): localnet en el bundle" >&2; exit 1; fi; \
    grep -rqF 'https://fullnode.testnet.sui.io' app/dist/assets

FROM caddy:2.11.7-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5
COPY app/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/app/dist /srv
# Sin cap_net_bind_service (MINOR-2): PORT >= 1024; así arranca también con --cap-drop=ALL.
RUN setcap -r /usr/bin/caddy \
    && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
    && grep -qF 'https://fullnode.testnet.sui.io' /etc/caddy/Caddyfile
USER nobody
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
