import { createClient, type Session } from '@supabase/supabase-js';
import { hasNativeCloudAccount, nativeAccount } from './native-account';
import { parseRecipeLibrary, parseRecipeLibraryWrite } from './recipe-library';
import type { SavedRecipe } from './domain';

const projectUrl = import.meta.env.VITE_COFFEE_SUPABASE_URL || '';
const publicKey = import.meta.env.VITE_COFFEE_SUPABASE_PUBLISHABLE_KEY || '';
const cloudConfigured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(projectUrl)
  && /^sb_publishable_[\w-]+$/.test(publicKey);

export const hasCloudAccount = () => cloudConfigured;
const redirect = 'better-mood-coffee-lab://auth/callback';
const providerStorageKey = 'coffee-lab-supabase';
type CloudDatabase = {
  public: {
    Tables: {coffee_recipe_libraries: {
      Row: {owner: string; revision: string; recipes: SavedRecipe[]};
      Insert: {owner: string; revision: string; recipes: SavedRecipe[]};
      Update: {revision?: string; recipes?: SavedRecipe[]};
      Relationships: [];
    }};
    Views: Record<never, never>;
    Functions: {coffee_save_library: {
      Args: {expected_revision: string | null; change_id: string; selected_recipes: SavedRecipe[]};
      Returns: {revision?: string; code?: string};
    }};
  };
};
let client: ReturnType<typeof createClient<CloudDatabase>> | undefined;

function cloud() {
  if (!cloudConfigured) throw new Error('Coffee Lab aún no tiene una cuenta en la nube configurada.');
  return client ??= createClient<CloudDatabase>(projectUrl, publicKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: false,
      autoRefreshToken: !hasNativeCloudAccount(),
      storageKey: providerStorageKey,
      storage: {
        getItem: async key => hasNativeCloudAccount()
          ? (await nativeAccount.cloudStorage({projectUrl, key, action: 'read'}))?.value ?? null
          : localStorage.getItem(projectUrl + ':' + key),
        setItem: async (key, value) => {
          if (key === providerStorageKey) {
            const session = JSON.parse(value);
            delete session.provider_token;
            delete session.provider_refresh_token;
            value = JSON.stringify(session);
          }
          if (hasNativeCloudAccount()) await nativeAccount.cloudStorage({projectUrl, key, action: 'write', value});
          else localStorage.setItem(projectUrl + ':' + key, value);
        },
        removeItem: async key => {
          if (hasNativeCloudAccount()) await nativeAccount.cloudStorage({projectUrl, key, action: 'remove'});
          else localStorage.removeItem(projectUrl + ':' + key);
        },
      },
    },
  });
}

function check(error: {message: string} | null) {
  if (error) throw new Error('No se pudo conectar con tu cuenta. Intenta de nuevo.');
}

async function finish(code: string) {
  const service = cloud();
  const {data, error} = await service.auth.exchangeCodeForSession(code);
  check(error);
  if (!data.session) throw new Error('No se pudo abrir la sesión.');
  const session = data.session;
  if (session.user.app_metadata.provider === 'apple') {
    const {error: grantError} = await service.functions.invoke('coffee-account', {
      body: {action: 'save-apple', refreshToken: session.provider_refresh_token ?? null},
    });
    if (grantError) {
      await service.auth.signOut({scope: 'local'});
      throw new Error('No se pudo confirmar el permiso de Apple. Intenta de nuevo.');
    }
  }
  return profile(session);
}

function profile(session: Session) {
  const {user} = session;
  const name = user.user_metadata.full_name ?? user.user_metadata.name;
  return {id: user.id, name: typeof name === 'string' ? name : 'Mi cuenta', email: user.email ?? ''};
}

let pendingReturn: Promise<ReturnType<typeof profile>> | undefined;

export async function cloudStatus() {
  if (!hasNativeCloudAccount()) {
    const url = new URL(location.href);
    const code = url.searchParams.get('code');
    if (url.searchParams.get('coffee_oauth') === '1') {
      if (code) pendingReturn ??= finish(code).finally(() => { pendingReturn = undefined; });
      for (const key of ['code', 'coffee_oauth', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (!code && !pendingReturn) throw new Error('Se canceló el acceso. Puedes volver a intentarlo.');
    }
  }
  if (pendingReturn) await pendingReturn;
  const [status, {data, error}] = await Promise.all([
    fetch(projectUrl + '/auth/v1/settings', {headers: {apikey: publicKey}, signal: AbortSignal.timeout(8000)}),
    cloud().auth.getSession(),
  ]);
  check(error);
  if (!status.ok) throw new Error('No se pudo comprobar qué accesos están disponibles.');
  const {external} = await status.json();
  const providers = ['google', 'apple'].filter(name => external?.[name] === true);
  return {configured: true, local: false, providers,
    user: data.session ? profile(data.session) : undefined};
}

export async function cloudLogin(provider: 'google' | 'apple') {
  const native = hasNativeCloudAccount();
  const redirectTo = native ? redirect : new URL('/coffee-lab/?coffee_oauth=1', location.origin).href;
  const {data, error} = await cloud().auth.signInWithOAuth({
    provider, options: {redirectTo, skipBrowserRedirect: native},
  });
  check(error);
  if (!native) return;
  if (!data.url) throw new Error('No se pudo iniciar el acceso.');
  const {code} = await nativeAccount.cloudSignIn({url: data.url, projectUrl});
  return await finish(code);
}

export async function cloudRequest(path: string, body: unknown, owner?: string) {
  const service = cloud();
  const {data, error} = await service.auth.getSession();
  check(error);
  if (!data.session) throw new Error('Inicia sesión para sincronizar.');
  const user = profile(data.session);
  if (path === 'auth/get-session') return {user};
  if (!owner || owner !== user.id) throw new Error('La cuenta cambió. Revisa la sincronización.');
  if (path === 'auth/sign-out') {
    check((await service.auth.signOut({scope: 'local'})).error);
    return {success: true};
  }
  if (path === 'auth/delete-user') {
    const result = await service.functions.invoke('coffee-account', {body: {action: 'delete', owner}});
    check(result.error);
    if (!result.data?.success) throw new Error('No se confirmó la eliminación.');
    await service.auth.signOut({scope: 'local'});
    return {success: true, message: 'User deleted'};
  }
  if (path !== 'recipe-library') throw new Error('Operación de cuenta no disponible.');
  if (body === undefined) {
    const {data: row, error: readError} = await service.from('coffee_recipe_libraries')
      .select('revision, recipes').eq('owner', owner).maybeSingle();
    check(readError);
    return parseRecipeLibrary(row ?? {revision: null, recipes: []});
  }
  const value = parseRecipeLibraryWrite(body);
  const {data: receipt, error: writeError} = await service.rpc('coffee_save_library', {
    expected_revision: value.revision, change_id: value.mutationId, selected_recipes: value.recipes,
  });
  check(writeError);
  if (receipt?.code) throw Object.assign(new Error('Vuelve a revisar la biblioteca.'), {code: receipt.code});
  return {revision: parseRecipeLibrary({...receipt, recipes: []}).revision};
}
