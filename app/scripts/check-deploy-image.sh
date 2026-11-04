#!/usr/bin/env bash
# Chequeo de la imagen de Railway (#15). Lo comparten el job deploy-image de la CI y el ensayo local, para que los
# dos caminos (sin y con contracts/deployments/testnet.json) se prueben con el mismo código.
#
# Uso:     bash app/scripts/check-deploy-image.sh <contexto> <puerto>
#          <contexto>  raíz del contexto de build (tiene Dockerfile, .dockerignore y app/Caddyfile)
#          <puerto>    entero 1024..65535: se publica en 127.0.0.1:<puerto> y es el PORT del contenedor
# Entorno: CHECK_KEEP_TAG  (opcional) en modo positivo, etiqueta extra que NO se borra al salir
#          GITHUB_ACTIONS, GITHUB_STEP_SUMMARY  (si existen) anotaciones y una línea de resumen
# Modo:    positivo si existe <contexto>/contracts/deployments/testnet.json; si no, negativo
# Salida:  0 = el modo detectado pasó todos sus chequeos; 1 = un chequeo falló; 2 = uso inválido
set -euo pipefail

usage() {
  echo "Uso: bash app/scripts/check-deploy-image.sh <contexto> <puerto>" >&2
  [ "$#" -eq 0 ] || echo "Uso inválido: $*" >&2
  exit 2
}

# Las anotaciones de Actions cortan en % y en saltos de línea: se escapan.
annotate() {
  local level=$1 msg=$2
  msg=${msg//'%'/'%25'}
  msg=${msg//$'\r'/'%0D'}
  msg=${msg//$'\n'/'%0A'}
  echo "::${level}::${msg}"
}

summary() {
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    echo "- check-deploy-image: $1" >>"$GITHUB_STEP_SUMMARY"
  fi
}

fail() {
  echo "FALLO: $1" >&2
  if [ -n "${GITHUB_ACTIONS:-}" ]; then annotate error "$1"; fi
  summary "FALLO: $1"
  exit 1
}

ok() {
  echo "$1"
  if [ -n "${GITHUB_ACTIONS:-}" ]; then annotate notice "$1"; fi
  summary "$1"
}

# Todo se valida antes de tocar Docker.
[ "$#" -eq 2 ] || usage "se esperan 2 argumentos y llegaron $#"
ctx=$1
port=$2
[ -d "$ctx" ] || usage "el contexto no es un directorio: $ctx"
for f in Dockerfile .dockerignore app/Caddyfile; do
  [ -f "$ctx/$f" ] || usage "falta $f en el contexto"
done
if ! [[ "$port" =~ ^[1-9][0-9]{3,4}$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
  usage "puerto fuera de 1024..65535: $port"
fi

tag="battleship-app:check-$$"
name="deploy-image-$$"
tmp=$(mktemp -d)
log="$tmp/build.log"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker rmi "$tag" >/dev/null 2>&1 || true
  rm -rf "$tmp" >/dev/null 2>&1 || true
}
trap cleanup EXIT

build=(build -t "$tag" -f "$ctx/Dockerfile")
if docker buildx version >/dev/null 2>&1; then
  build+=(--progress=plain)
else
  # Builder clásico: sin --force-rm, un RUN fallido deja su contenedor intermedio con datos del contexto.
  build+=(--force-rm)
fi
build+=("$ctx")

tail_log() {
  echo "--- últimas 30 líneas de $1 ---" >&2
  tail -n 30 "$2" >&2 || true
}

if [ ! -f "$ctx/contracts/deployments/testnet.json" ]; then
  echo "Modo negativo: el contexto no tiene contracts/deployments/testnet.json"
  # El fallo es el resultado esperado: se captura en el if para que set -e no aborte.
  if docker "${build[@]}" >"$log" 2>&1; then
    fail "N1: sin testnet.json la imagen no debe construirse, y el build terminó en verde"
  fi
  # N2a: la línea de salida del echo de la guarda, no la línea "Step n/m : RUN …" que también tiene la subcadena.
  # El builder clásico la pinta con códigos ANSI y BuildKit le antepone "#<n> <segundos> ". En dos pasos con un
  # archivo: con pipefail, un grep -q que corta temprano puede matar a sed con SIGPIPE y dar un falso fallo.
  sed 's/\x1b\[[0-9;]*m//g' "$log" >"$log.plain"
  if ! grep -qE '^(#[0-9]+ [0-9]+\.[0-9]+ )?ERROR \(#15\): falta contracts/deployments/testnet\.json' "$log.plain"; then
    tail_log "docker build" "$log"
    fail "N2a: el build falló, pero no por la guarda de testnet.json (no está la línea de salida 'ERROR (#15): falta contracts/deployments/testnet.json')"
  fi
  # N2b: el build tiene que cortarse en la guarda, sin llegar a npm ci. Se busca la cabecera del paso y no el extracto
  # del Dockerfile que BuildKit imprime alrededor del RUN que falla. BuildKit: "#<n> [build <k>/<m>] RUN npm ci", con
  # <k> alineado con espacios; clásico: "Step <k>/<m> : RUN npm ci".
  if grep -qE '^(#[0-9]+ \[build +[0-9]+/[0-9]+\] |Step [0-9]+/[0-9]+ : )RUN npm ci' "$log.plain"; then
    tail_log "docker build" "$log"
    fail "N2b: el build pasó la guarda y llegó a 'RUN npm ci' (la guarda no corta el build)"
  fi
  ok "OK (negativo): sin contracts/deployments/testnet.json (#8) la imagen se niega a construirse"
  exit 0
fi

echo "Modo positivo: el contexto tiene contracts/deployments/testnet.json"

# P1
if ! docker "${build[@]}" >"$log" 2>&1; then
  tail_log "docker build" "$log"
  fail "P1: el build de la imagen falló"
fi
if [ -n "${CHECK_KEEP_TAG:-}" ]; then
  docker tag "$tag" "$CHECK_KEEP_TAG" >/dev/null || fail "P1: no se pudo etiquetar la imagen como $CHECK_KEEP_TAG"
fi
echo "P1 ok: imagen construida"

# P2
base="http://127.0.0.1:$port"
docker run -d --name "$name" --cap-drop=ALL -e "PORT=$port" -p "127.0.0.1:$port:$port" "$tag" >/dev/null ||
  fail "P2: docker run falló"
code=""
for _ in {1..30}; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$base/" 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "$code" != "200" ]; then
  echo "--- últimas 30 líneas de docker logs ---" >&2
  docker logs --tail 30 "$name" 2>&1 | sed 's/^/  /' >&2 || true
  fail "P2: se esperaba 200 en / en 30 s y llegó '${code}'"
fi
echo "P2 ok: el contenedor responde en $base/"

# P3
uid=$(docker exec "$name" id -u | sed 's/\r$//') || fail "P3: docker exec id -u falló"
[ "$uid" = "65534" ] || fail "P3: se esperaba uid 65534 (nobody) y llegó '$uid'"
echo "P3 ok: corre como 65534 con --cap-drop=ALL"

# Pide con GET (nunca HEAD: el encode de Caddy 2.11.7 falla con HEAD) y deja cabeceras sin \r y cuerpo.
fetch() {
  local key=$1 path=$2
  shift 2
  curl -sS -D "$tmp/$key.raw" -o "$tmp/$key.body" --max-time 10 "$@" "$base$path" ||
    fail "no se pudo pedir $path"
  sed 's/\r$//' "$tmp/$key.raw" >"$tmp/$key.h"
}

status_of() {
  sed -n '1s/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$tmp/$1.h"
}

# Valor de la cabecera, comparando el nombre sin distinguir mayúsculas.
header_of() {
  { grep -i -m1 "^$2:" "$tmp/$1.h" || true; } | sed 's/^[^:]*:[[:space:]]*//; s/[[:space:]]*$//'
}

has_header() {
  grep -qi "^$2:" "$tmp/$1.h"
}

expect_status() {
  local key=$1 want=$2 check=$3 got
  got=$(status_of "$key")
  [ "$got" = "$want" ] || fail "$check: se esperaba status $want y llegó '$got'"
}

expect_header() {
  local key=$1 hname=$2 want=$3 check=$4 got
  got=$(header_of "$key" "$hname")
  [ "$got" = "$want" ] || fail "$check: se esperaba '$hname: $want' y llegó '$got'"
}

# P4
fetch root /
expect_status root 200 P4
csp_want=$(sed -n 's/^[[:space:]]*Content-Security-Policy "\(.*\)"[[:space:]]*$/\1/p' "$ctx/app/Caddyfile")
[ -n "$csp_want" ] || fail "P4: no se encontró la línea Content-Security-Policy en $ctx/app/Caddyfile"
csp_got=$(header_of root Content-Security-Policy)
[ "$csp_got" = "$csp_want" ] || fail "P4: la CSP servida no es la del Caddyfile (llegó '$csp_got')"
for d in "script-src 'self'" "frame-ancestors 'none'"; do
  [[ "$csp_got" == *"$d"* ]] || fail "P4: la CSP no contiene $d"
done
echo "P4 ok: / 200 y CSP idéntica a la del Caddyfile"

# P5
expect_header root X-Content-Type-Options "nosniff" P5
expect_header root X-Frame-Options "DENY" P5
expect_header root Referrer-Policy "no-referrer" P5
expect_header root Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" P5
expect_header root Strict-Transport-Security "max-age=31536000" P5
expect_header root Cache-Control "no-cache" P5
echo "P5 ok: cabeceras de seguridad y Cache-Control de / exactas"

# P6
! has_header root Cross-Origin-Opener-Policy || fail "P6: / no debe llevar Cross-Origin-Opener-Policy (D3)"
! has_header root Server || fail "P6: / no debe llevar Server (llegó '$(header_of root Server)')"
echo "P6 ok: sin Cross-Origin-Opener-Policy ni Server"

# P7
asset=$(grep -o 'src="/assets/[^"]*\.js"' "$tmp/root.body" | sed -n '1s/^src="\(.*\)"$/\1/p' || true)
[ -n "$asset" ] || fail "P7: el index.html servido no referencia ningún src=\"/assets/….js\""
fetch asset "$asset"
expect_status asset 200 P7
ctype=$(header_of asset Content-Type)
[[ "$ctype" == text/javascript* ]] || fail "P7: $asset: se esperaba Content-Type text/javascript… y llegó '$ctype'"
cache=$(header_of asset Cache-Control)
[[ "$cache" == *immutable* ]] || fail "P7: $asset: se esperaba Cache-Control con immutable y llegó '$cache'"
echo "P7 ok: $asset 200, $ctype, $cache"

# P8
fetch assetz "$asset" -H 'Accept-Encoding: zstd, gzip'
enc=$(header_of assetz Content-Encoding)
[ "$enc" = "zstd" ] || [ "$enc" = "gzip" ] || fail "P8: $asset: se esperaba Content-Encoding zstd o gzip y llegó '$enc'"
echo "P8 ok: $asset comprimido ($enc)"

# P9
fetch favicon /favicon.svg
expect_status favicon 200 P9
ctype=$(header_of favicon Content-Type)
[ "$ctype" = "image/svg+xml" ] || [[ "$ctype" == "image/svg+xml;"* ]] ||
  fail "P9: /favicon.svg: se esperaba Content-Type image/svg+xml y llegó '$ctype'"
echo "P9 ok: /favicon.svg 200, $ctype"

# P10 y P11: sin fallback SPA, una ruta desconocida es 404.
fetch missing /no-existe
expect_status missing 404 P10
echo "P10 ok: /no-existe 404"
fetch spa /game/0x1
expect_status spa 404 P11
echo "P11 ok: /game/0x1 404"

# P12: immutable solo para assets que existen.
fetch missingasset /assets/no-existe.js
expect_status missingasset 404 P12
cache=$(header_of missingasset Cache-Control)
[[ "$cache" != *immutable* ]] || fail "P12: /assets/no-existe.js no debe llevar immutable (llegó '$cache')"
echo "P12 ok: /assets/no-existe.js 404 sin immutable"

# P13
ok "OK (positivo): la imagen se construye y sirve el build como nobody con --cap-drop=ALL; CSP, cabeceras, caché, compresión, favicon y 404 verificados (P1-P12)"
