import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Store } from '../lib/coffee/domain';
import { repository } from '../lib/coffee/storage';

export type LibrarySyncStatus = { label: string; detail?: string; busy?: boolean };
const LOCAL: LibrarySyncStatus = {label: 'Guardado aquí'};
const PENDING: LibrarySyncStatus = {label: 'Pendiente de sincronizar'};

export function useRecipeLibrary(state: Store, onRefresh: (state: Store) => void) {
  const owner = state.recipeLibrarySync?.owner;
  const [status, setStatus] = useState<LibrarySyncStatus>(LOCAL);
  const kick = useRef<() => void>(() => {});
  const recipeSnapshot = useMemo(() => owner ? JSON.stringify(state.recipes || []) : '', [owner, state.recipes]);
  const linkSnapshot = useMemo(() => JSON.stringify(state.recipeLibrarySync?.links), [state.recipeLibrarySync?.links]);

  useEffect(() => {
    if (!owner) {
      setStatus(LOCAL);
      return;
    }
    let disposed = false;
    let running = false;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function run() {
      if (disposed) return;
      if (document.hidden) return;
      if (!navigator.onLine) {
        setStatus(PENDING);
        return;
      }
      running = true;
      setStatus({label: 'Sincronizando…', busy: true});
      try {
        const [{accountRequest}, {syncRecipeLibrary}] = await Promise.all([
          import('../lib/coffee/account-transport'), import('../lib/coffee/recipe-library-run'),
        ]);
        if (disposed) return;
        const result = await syncRecipeLibrary(repository, accountRequest, owner!);
        if (disposed || !result) return;
        if (result.state) onRefresh(result.state);
        if (result.conflicts) toast.info('Se conservaron las recetas con cambios en conflicto.');
        const pending = queued || result.state?.recipeLibrarySync?.links.some(link => link.digest === null);
        setStatus({
          label: pending ? PENDING.label : 'Sincronizado',
          detail: result.conflicts ? 'Se conservaron los cambios en conflicto.' : undefined,
        });
      } catch (error) {
        if (!disposed) setStatus({
          ...PENDING,
          detail: error instanceof Error && !(error instanceof TypeError)
            ? error.message : 'No se pudo conectar. Intenta de nuevo.',
        });
      } finally {
        running = false;
        if (queued && !disposed) {
          queued = false;
          schedule();
        }
      }
    }
    function schedule() {
      if (disposed) return;
      if (running) {
        queued = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 450);
    }
    kick.current = schedule;
    const offline = () => setStatus(PENDING);
    window.addEventListener('online', schedule);
    window.addEventListener('offline', offline);
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      disposed = true;
      kick.current = () => {};
      clearTimeout(timer);
      window.removeEventListener('online', schedule);
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [owner, onRefresh]);

  useEffect(() => { kick.current(); }, [owner, recipeSnapshot, linkSnapshot]);
  return {status: owner ? status : LOCAL, retry: () => kick.current()};
}
