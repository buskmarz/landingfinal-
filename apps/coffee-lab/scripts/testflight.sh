#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

mode=${1:-check}
case "$mode" in
  check|sign-check|export) ;;
  *) echo 'Uso: testflight.sh check|sign-check|export' >&2; exit 2 ;;
esac
version=${COFFEE_VERSION:-1.1.0}
number=${COFFEE_BUILD:-2}
origin=${COFFEE_ACCOUNT_ORIGIN:-}
backend=${COFFEE_ACCOUNT_BACKEND:-legacy}
[[ "$backend" == legacy || "$backend" == supabase ]] || { echo 'Backend de cuentas inválido.' >&2; exit 2; }
build_args=()
if [[ "$backend" == supabase ]]; then
  build_args=(-- --mode supabase)
  origin=
fi
team=${COFFEE_APPLE_TEAM:-}

[[ "$version" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ && "$number" =~ ^[1-9][0-9]*$ ]] || {
  echo 'Indica una versión y un número de compilación válidos.' >&2; exit 2;
}
args=(CODE_SIGNING_ALLOWED=NO)
if [[ "$mode" != check ]]; then
  [[ "$team" =~ ^[A-Z0-9]{10}$ ]] || { echo 'Falta el equipo de distribución de Apple.' >&2; exit 2; }
  args=(DEVELOPMENT_TEAM="$team")
  if [[ -n "${COFFEE_APP_PROFILE:-}" ]]; then
    args+=(COFFEE_RELEASE_SIGNING_STYLE=Manual COFFEE_RELEASE_APP_PROFILE="$COFFEE_APP_PROFILE")
  fi
  if [[ -n "${COFFEE_WIDGET_PROFILE:-}" ]]; then
    args+=(COFFEE_RELEASE_WIDGET_SIGNING_STYLE=Manual COFFEE_RELEASE_WIDGET_PROFILE="$COFFEE_WIDGET_PROFILE")
  fi
  if [[ "${COFFEE_ALLOW_APPLE_PROVISIONING:-0}" == 1 ]]; then
    args=(-allowProvisioningUpdates "${args[@]}")
  fi
fi
if [[ "$mode" == export ]]; then
  : "${COFFEE_VERSION:?Confirma la versión disponible en App Store Connect}"
  : "${COFFEE_BUILD:?Confirma el número de build disponible en App Store Connect}"
  if [[ -n "${COFFEE_APP_PROFILE:-}${COFFEE_WIDGET_PROFILE:-}" ]] &&
      [[ -z "${COFFEE_APP_PROFILE:-}" || -z "${COFFEE_WIDGET_PROFILE:-}" ]]; then
    echo 'Para exportar con firma manual, indica el perfil de App Store de la app y el de los widgets.' >&2
    exit 2
  fi
  if [[ "$backend" == supabase ]]; then
    node --env-file=.env.supabase.local scripts/check-cloud-auth.mjs
  else
  node --input-type=module - "$origin" <<'JS'
import { isIP } from 'node:net';
try {
  const u = new URL(process.argv[2]);
  if (u.protocol !== 'https:' || u.href !== u.origin + '/' || !u.hostname.includes('.') ||
      u.port || isIP(u.hostname) || /\.(localhost|local|internal)$/i.test(u.hostname)) {
    throw new Error('Configura el origen HTTPS de cuentas.');
  }
  const response = await fetch(u.origin + '/coffee-lab/api/capabilities',
    { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('El servidor de cuentas respondió HTTP ' + response.status + '.');
  const data = await response.json();
  if (data.local !== false || !data.recipeLibrary || !data.providers?.includes('google') ||
      data.nativeAppleClientId !== 'com.bmoodcoffee.lab.preview') {
    throw new Error('El servidor debe anunciar Google, Apple para Coffee Lab y sincronización.');
  }
} catch (error) {
  console.error('Cuentas: ' + error.message);
  process.exitCode = 3;
}
JS
  fi
  if [[ "${COFFEE_ALLOW_APPLE_PROVISIONING:-0}" != 1 ]] &&
      ! security find-identity -v -p codesigning | grep -F 'Apple Distribution:' >/dev/null; then
    echo 'Falta un certificado Apple Distribution con su clave privada. Con autorización, Xcode puede gestionar la firma.' >&2
    exit 2
  fi
fi

output=$(mktemp -d "${TMPDIR:-/tmp}/coffee-testflight.XXXXXX")
work="$output/source"
mkdir "$work"
rsync -a --exclude=node_modules --exclude=dist --exclude=native-www --exclude='*.sqlite*' --exclude='.env*' --exclude='.git' --exclude='.local-accounts' --exclude='*.p8' --exclude='xcuserdata' --exclude='public/' ios/ "$work/ios/"
# Build only the app; never package private files or the landing.
/usr/libexec/PlistBuddy -c 'Delete :NSLocalNetworkUsageDescription' "$work/ios/App/App/Info.plist"
npm run build ${build_args[@]+"${build_args[@]}"}
mkdir -p "$work/ios/App/App/public/coffee-lab"
rsync -a dist/ "$work/ios/App/App/public/coffee-lab/"
cp dist/index.html "$work/ios/App/App/public/index.html"
cp capacitor.config.json "$work/ios/App/App/capacitor.config.json"

xcodebuild archive -project "$work/ios/App/App.xcodeproj" -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath "$output/DerivedData" -archivePath "$output/CoffeeLab.xcarchive" \
  COFFEE_DISTRIBUTION_VERSION="$version" COFFEE_DISTRIBUTION_BUILD="$number" \
  COFFEE_ACCOUNTS_ORIGIN="$origin" COFFEE_ACCOUNTS_TLS_PIN= "${args[@]}"

if [[ "$mode" != check ]]; then
  codesign --verify --deep --strict "$output/CoffeeLab.xcarchive/Products/Applications/App.app"
fi

if [[ "$mode" == export ]]; then
  /usr/bin/plutil -create xml1 "$output/ExportOptions.plist"
  /usr/bin/plutil -insert method -string app-store-connect "$output/ExportOptions.plist"
  /usr/bin/plutil -insert destination -string export "$output/ExportOptions.plist"
  /usr/bin/plutil -insert teamID -string "$team" "$output/ExportOptions.plist"
  /usr/bin/plutil -insert manageAppVersionAndBuildNumber -bool NO "$output/ExportOptions.plist"
  if [[ -n "${COFFEE_APP_PROFILE:-}" ]]; then
    /usr/bin/plutil -insert signingStyle -string manual "$output/ExportOptions.plist"
    /usr/bin/plutil -insert signingCertificate -string 'Apple Distribution' "$output/ExportOptions.plist"
    python3 - "$output/ExportOptions.plist" "$COFFEE_APP_PROFILE" "$COFFEE_WIDGET_PROFILE" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
options = plistlib.loads(path.read_bytes())
options['provisioningProfiles'] = {
    'com.bmoodcoffee.lab.preview': sys.argv[2],
    'com.bmoodcoffee.lab.preview.widgets': sys.argv[3],
}
path.write_bytes(plistlib.dumps(options))
PY
  fi
  provisioning=()
  if [[ "${COFFEE_ALLOW_APPLE_PROVISIONING:-0}" == 1 ]]; then
    provisioning=(-allowProvisioningUpdates)
  fi
  xcodebuild ${provisioning[@]+"${provisioning[@]}"} -exportArchive -archivePath "$output/CoffeeLab.xcarchive" \
    -exportOptionsPlist "$output/ExportOptions.plist" -exportPath "$output/export"
fi
printf 'Artefactos locales: %s\n' "$output"
