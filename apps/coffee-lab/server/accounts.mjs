// Local by default. Hosted mode requires explicit configuration and its own data directory.
import { isIP } from 'node:net';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync, realpathSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { betterAuth } from 'better-auth';
import { createAccountServer } from './account-server.mjs';
import { requireConfirmedAccount, revokeAppleBeforeDeletion } from './account-deletion.mjs';
import { clearDeviceRequests, deviceAccessPlugins } from './device-access.mjs';
import { appleNativeAccess, appleNativeConfig, appleNativeGrantStore } from './apple-native.mjs';
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';
const hosted = process.env.COFFEE_ACCOUNT_MODE === 'hosted';
const localOrigin = 'http://127.0.0.1:5198';
const address = new URL(process.env.COFFEE_ACCOUNT_ORIGIN || localOrigin);
const origin = address.origin;
const registeredHttps = address.protocol === 'https:' && address.hostname.includes('.') &&
  !isIP(address.hostname) && !address.hostname.endsWith('.localhost');
const publicHttps = registeredHttps && !address.port && !/\.(local|internal)$/i.test(address.hostname);
if (address.href !== origin + '/' || address.username || address.password ||
    (hosted ? !publicHttps : origin !== localOrigin && !registeredHttps)) {
  throw new Error('Configura un dominio HTTPS válido, sin ruta ni puerto. En local se admite el origen de prueba.');
}
const localRoot = join(homedir(),'Library','Application Support','Better Mood Coffee Lab','local-accounts');
const root = hosted ? process.env.COFFEE_ACCOUNT_DATA_DIR : localRoot;
if (!root || !isAbsolute(root) || (hosted && root === localRoot)) {
  throw new Error('Indica un directorio persistente exclusivo para las cuentas alojadas.');
}
process.umask(0o077);
mkdirSync(root,{recursive:true,mode:0o700});
if (hosted && existsSync(localRoot) && realpathSync(root) === realpathSync(localRoot)) {
  throw new Error('El modo alojado no puede usar la base de pruebas de la Mac.');
}
chmodSync(root,0o700);
const secretPath = join(root, 'secret');
const providerPath=join(root,'providers.env');
if(existsSync(providerPath)){
  chmodSync(providerPath,0o600);
  process.loadEnvFile(providerPath);
}
if(!existsSync(secretPath))writeFileSync(secretPath,randomBytes(48).toString('hex'),{mode:0o600,flag:'wx'});
chmodSync(secretPath,0o600);
const port = hosted ? Number(process.env.COFFEE_ACCOUNT_PORT || '5199') : 5199;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto de cuentas inválido.');
const providers={};
for(const name of ['google','apple']){
 // Apple's web callback requires a registered HTTPS origin; never pretend loopback is ready.
 if(name==='apple'&&!origin.startsWith('https://'))continue;
 const prefix='COFFEE_'+name.toUpperCase();
 if(process.env[prefix+'_CLIENT_ID']&&process.env[prefix+'_CLIENT_SECRET'])providers[name]={clientId:process.env[prefix+'_CLIENT_ID'],clientSecret:process.env[prefix+'_CLIENT_SECRET']};
}
const nativeAppleKey = join(root, 'apple-native.p8');
let nativeApple;
try {
  const clientId = process.env.COFFEE_APPLE_NATIVE_CLIENT_ID;
  const clientSecret = process.env.COFFEE_APPLE_NATIVE_CLIENT_SECRET;
  let privateKey;
  if (clientId && !clientSecret && existsSync(nativeAppleKey)) {
    chmodSync(nativeAppleKey, 0o600);
    privateKey = readFileSync(nativeAppleKey);
  }
  nativeApple = appleNativeConfig({ clientId, clientSecret, privateKey,
    teamId: process.env.COFFEE_APPLE_NATIVE_TEAM_ID, keyId: process.env.COFFEE_APPLE_NATIVE_KEY_ID });
} catch {
  if (hosted) throw new Error('La configuración de Sign in with Apple no es válida.');
  console.warn('Coffee Lab cuentas: revisa la configuración de la clave de Apple para iPhone.');
}
if (hosted && (!providers.google || !nativeApple)) {
  throw new Error('El servicio alojado requiere Google y Sign in with Apple configurados.');
}
const db = new Database(join(root,'accounts.sqlite'));
chmodSync(join(root,'accounts.sqlite'),0o600);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const nativeGrants = appleNativeGrantStore(db);
const plugins = deviceAccessPlugins(origin);
if (nativeApple) plugins.push(appleNativeAccess(nativeApple, nativeGrants));
const options={appName:'Better Mood Coffee Lab',baseURL:origin,basePath:'/coffee-lab/api/auth',secret:readFileSync(secretPath,'utf8'),database:db,socialProviders:providers, trustedOrigins:providers.apple?[origin,'https://appleid.apple.com']:[origin],account:{accountLinking:{enabled:false}},rateLimit:{enabled:true,...(hosted?{storage:'database'}:{})},
  ...(hosted?{advanced:{useSecureCookies:true,ipAddress:{ipAddressHeaders:['x-coffee-client-ip']}}}:{}),
  plugins,
  hooks:{before:requireConfirmedAccount(origin,headers=>auth.api.getSession({headers,query:{disableCookieCache:true}}))},
  user:{deleteUser:{enabled:true,beforeDelete:revokeAppleBeforeDeletion(db,providers.apple,fetch,{config:nativeApple,grants:nativeGrants}),afterDelete:clearDeviceRequests(db)}}};
await (await getMigrations(options)).runMigrations();
export const auth=betterAuth(options);
const server = createAccountServer({auth, db, origin, providers: Object.keys(providers), nativeAppleClientId: nativeApple?.clientId, local: !hosted});
server.listen(port, '127.0.0.1', () => {
  console.log('Coffee Lab cuentas: ' + (hosted ? 'alojado' : 'local') + ' en 127.0.0.1:' + port +
    '. Proveedores configurados: ' + (Object.keys(providers).join(', ') || 'ninguno'));
});
server.requestTimeout = 20_000;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => db.close()));
}
