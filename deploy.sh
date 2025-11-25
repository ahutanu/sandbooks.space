#!/bin/bash
# Sandbooks deployment helper (backend + frontend)
# - Builds backend locally (no Azure build) and deploys via zip
# - Builds frontend with correct API URL and deploys static files

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}▸${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# ----------------------------------------------------------------------------------------------
# Config (override with env vars if needed)
# ----------------------------------------------------------------------------------------------
RESOURCE_GROUP="${RESOURCE_GROUP:-sandbooks-rg}"
LOCATION="${AZ_LOCATION:-germanywestcentral}"

BACKEND_NAME="${BACKEND_NAME:-sandbooks-backend}"
BACKEND_PLAN="${BACKEND_PLAN:-sandbooks-backend-plan}" # Linux plan
BACKEND_URL="https://${BACKEND_NAME}.azurewebsites.net"

FRONTEND_NAME="${FRONTEND_NAME:-sandbooks-frontend}"
FRONTEND_PLAN="${FRONTEND_PLAN:-sandbooks-frontend-plan}" # Linux B1 plan for static site
FRONTEND_URL="https://sandbooks.space"   # hardcoded custom domain

API_URL="${VITE_API_URL:-$BACKEND_URL}"
STARTUP_CMD="${STARTUP_CMD:-npm start}"
FRONTEND_CUSTOM_DOMAIN="sandbooks.space"
API_ACCESS_TOKEN="${API_ACCESS_TOKEN:-}"
GOOGLE_TAG_MANAGER_TAG="${GOOGLE_TAG_MANAGER_TAG:-}"
RATE_LIMIT_WINDOW_MS="${RATE_LIMIT_WINDOW_MS:-600000}"
RATE_LIMIT_MAX_REQUESTS="${RATE_LIMIT_MAX_REQUESTS:-5000}"

# GitHub OAuth (for sync feature)
GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:-}"
GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-}"
GITHUB_OAUTH_CALLBACK_URL="${GITHUB_OAUTH_CALLBACK_URL:-https://sandbooks.space/github/callback}"

# ----------------------------------------------------------------------------------------------
# Pre-flight checks
# ----------------------------------------------------------------------------------------------
[ -z "${HOPX_API_KEY:-}" ] && fail "HOPX_API_KEY is not set"
command -v az >/dev/null 2>&1 || fail "Azure CLI not installed"
az account show >/dev/null 2>&1 || fail "Not logged in to Azure (run: az login)"
command -v zip >/dev/null 2>&1 || fail "zip is not installed"

# Generate API token if not provided (rotated each deploy by default)
if [ -z "$API_ACCESS_TOKEN" ]; then
  API_ACCESS_TOKEN="$(openssl rand -hex 32)"
  GENERATED_API_TOKEN=1
else
  GENERATED_API_TOKEN=0
fi
# ----------------------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Sandbooks Azure Deploy          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# ----------------------------------------------------------------------------------------------
# Resource group
# ----------------------------------------------------------------------------------------------
log "Ensuring resource group ${RESOURCE_GROUP}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
success "Resource group ready"

if [ "$GENERATED_API_TOKEN" = "1" ]; then
  log "Generated new API_ACCESS_TOKEN for this deployment"
fi

# ----------------------------------------------------------------------------------------------
# Backend
# ----------------------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[1/2] Backend (${BACKEND_NAME})${NC}"
pushd backend >/dev/null

log "npm ci (backend)"
npm ci --silent

log "Building backend"
npm run build --silent

log "Pruning devDependencies"
npm prune --omit=dev --silent

TMP_PATH="$(mktemp -t sandbooks-backend-XXXXXX)"
ARTIFACT="${TMP_PATH}.zip"
log "Packing backend -> ${ARTIFACT}"
zip -qr "$ARTIFACT" . -x "*.git*" -x "test-results/*" -x "playwright-report/*" -x "dist/**/*.map"

log "Ensuring Linux plan ${BACKEND_PLAN}"
if ! az appservice plan show --name "$BACKEND_PLAN" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az appservice plan create --name "$BACKEND_PLAN" --resource-group "$RESOURCE_GROUP" --is-linux --sku B1 --location "$LOCATION" --output none
fi

log "Ensuring backend app ${BACKEND_NAME}"
if ! az webapp show --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az webapp create --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" --plan "$BACKEND_PLAN" --runtime "NODE:20-lts" --output none
fi

log "Enforcing HTTPS (backend)"
az webapp update --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" --set httpsOnly=true --output none

log "Configuring backend app settings"
BACKEND_SETTINGS=(
  NODE_ENV=production
  PORT=8080
  FRONTEND_URL="$FRONTEND_URL"
  LOG_LEVEL=info
  HOPX_API_KEY="$HOPX_API_KEY"
  SCM_DO_BUILD_DURING_DEPLOYMENT=false
  RATE_LIMIT_WINDOW_MS="$RATE_LIMIT_WINDOW_MS"
  RATE_LIMIT_MAX_REQUESTS="$RATE_LIMIT_MAX_REQUESTS"
)
if [ -n "$API_ACCESS_TOKEN" ]; then
  BACKEND_SETTINGS+=("API_ACCESS_TOKEN=$API_ACCESS_TOKEN")
fi
if [ -n "$GITHUB_CLIENT_ID" ]; then
  BACKEND_SETTINGS+=("GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID")
  BACKEND_SETTINGS+=("GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET")
  BACKEND_SETTINGS+=("GITHUB_OAUTH_CALLBACK_URL=$GITHUB_OAUTH_CALLBACK_URL")
fi
az webapp config appsettings set \
  --name "$BACKEND_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "${BACKEND_SETTINGS[@]}" \
  --output none

log "Setting startup command"
az webapp config set \
  --name "$BACKEND_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "$STARTUP_CMD" \
  --output none

log "Locking CORS to frontend (${FRONTEND_URL})"
az webapp cors remove --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" --allowed-origins '*' >/dev/null 2>&1 || true
az webapp cors add --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" --allowed-origins "$FRONTEND_URL" --output none

log "Deploying backend via zip"
az webapp deploy \
  --name "$BACKEND_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --src-path "$ARTIFACT" \
  --type zip \
  --restart true \
  --output none

log "Restarting backend"
az webapp restart --name "$BACKEND_NAME" --resource-group "$RESOURCE_GROUP" --output none

log "Health check"
if curl -sf -H "x-sandbooks-token: $API_ACCESS_TOKEN" "$BACKEND_URL/api/health" >/dev/null; then
  success "Backend healthy at $BACKEND_URL"
else
  fail "Backend health check failed at $BACKEND_URL/api/health"
fi

rm -f "$ARTIFACT"
popd >/dev/null

# ----------------------------------------------------------------------------------------------
# Frontend
# ----------------------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[2/2] Frontend (${FRONTEND_NAME})${NC}"

log "Writing .env with API_URL=$API_URL"
{
  echo "VITE_API_URL=$API_URL"
  echo "VITE_API_TOKEN=$API_ACCESS_TOKEN"
  if [ -n "$GOOGLE_TAG_MANAGER_TAG" ]; then
    echo "VITE_GOOGLE_TAG_MANAGER_TAG=$GOOGLE_TAG_MANAGER_TAG"
  fi
} > .env

log "npm ci (frontend)"
npm ci --silent

log "Building frontend"
npm run build --silent

log "Ensuring Linux plan ${FRONTEND_PLAN}"
if ! az appservice plan show --name "$FRONTEND_PLAN" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az appservice plan create --name "$FRONTEND_PLAN" --resource-group "$RESOURCE_GROUP" --sku B1 --is-linux --location "$LOCATION" --output none
fi

log "Ensuring frontend app ${FRONTEND_NAME}"
if ! az webapp show --name "$FRONTEND_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az webapp create --name "$FRONTEND_NAME" --resource-group "$RESOURCE_GROUP" --plan "$FRONTEND_PLAN" --runtime "NODE:20-lts" --output none
else
  IS_LINUX=$(az webapp show --name "$FRONTEND_NAME" --resource-group "$RESOURCE_GROUP" --query "reserved" -o tsv)
  if [ "$IS_LINUX" != "true" ]; then
    fail "Frontend app ${FRONTEND_NAME} exists on Windows plan. Delete/recreate it or set FRONTEND_NAME/FRONTEND_PLAN to a Linux App Service."
  fi
fi

log "Enforcing HTTPS (frontend)"
az webapp update --name "$FRONTEND_NAME" --resource-group "$RESOURCE_GROUP" --set httpsOnly=true --output none

log "Setting frontend startup command (static SPA)"
az webapp config set \
  --name "$FRONTEND_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa" \
  --output none

log "Deploying frontend static files (zip deploy)"
FRONT_ZIP="$(mktemp -t sandbooks-frontend-XXXXXX).zip"
(cd dist && zip -qr "$FRONT_ZIP" .)
az webapp deploy \
  --name "$FRONTEND_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --type zip \
  --src-path "$FRONT_ZIP" \
  --restart true \
  --output none
rm -f "$FRONT_ZIP"

if [ -n "$FRONTEND_CUSTOM_DOMAIN" ]; then
  log "Adding custom domain binding for ${FRONTEND_CUSTOM_DOMAIN}"
  az webapp config hostname add --webapp-name "$FRONTEND_NAME" --resource-group "$RESOURCE_GROUP" --hostname "$FRONTEND_CUSTOM_DOMAIN" --output none || true

  log "Checking existing cert"
  CERT_MAIN=$(az webapp config ssl list --resource-group "$RESOURCE_GROUP" --query "[?subjectName=='$FRONTEND_CUSTOM_DOMAIN'].thumbprint" -o tsv | head -n1)

  if [ -z "$CERT_MAIN" ]; then
    log "Issuing managed cert for $FRONTEND_CUSTOM_DOMAIN"
    CERT_MAIN=$(az webapp config ssl create --resource-group "$RESOURCE_GROUP" --name "$FRONTEND_NAME" --hostname "$FRONTEND_CUSTOM_DOMAIN" --query thumbprint -o tsv)
  fi

  log "Binding certificate"
  [ -n "$CERT_MAIN" ] && az webapp config ssl bind --resource-group "$RESOURCE_GROUP" --name "$FRONTEND_NAME" --certificate-thumbprint "$CERT_MAIN" --ssl-type SNI --output none
fi

success "Frontend deployed to ${FRONTEND_URL:-https://${FRONTEND_NAME}.azurewebsites.net}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deployment finished              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Frontend: ${FRONTEND_URL:-https://${FRONTEND_NAME}.azurewebsites.net}"
echo "Backend:  $BACKEND_URL"
echo ""
echo "Check: curl $BACKEND_URL/api/health"
echo ""
