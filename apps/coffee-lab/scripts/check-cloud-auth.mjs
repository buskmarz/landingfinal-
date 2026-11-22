const url = process.env.VITE_COFFEE_SUPABASE_URL ?? '';
const key = process.env.VITE_COFFEE_SUPABASE_PUBLISHABLE_KEY ?? '';
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !/^sb_publishable_[\w-]+$/.test(key)) {
  throw new Error('Falta la configuración pública de Supabase para Coffee Lab.');
}
const settings = await fetch(url + '/auth/v1/settings', {headers: {apikey: key}, signal: AbortSignal.timeout(10000)});
if (!settings.ok) throw new Error('No se pudo comprobar la configuración de Supabase.');
const {external} = await settings.json();
if (!external?.google || !external?.apple) throw new Error('Google y Apple deben estar habilitados en Supabase.');
const deletion = await fetch(url + '/functions/v1/coffee-account', {
  method: 'POST', headers: {apikey: key, 'Content-Type': 'application/json'},
  body: '{}', signal: AbortSignal.timeout(10000),
});
if (deletion.status !== 401) throw new Error('No se comprobó la protección de la función de cuentas.');
console.log('Google y Apple habilitados. Función de cuentas protegida.');
