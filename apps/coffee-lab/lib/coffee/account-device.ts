export function deviceConnectionCode(search: string): string | null {
  const query = new URLSearchParams(search);
  if (query.getAll('connect_device').length !== 1 || query.get('connect_device') !== '1') return null;
  if (query.getAll('user_code').length !== 1) return null;
  const code = query.get('user_code')?.toUpperCase() || '';
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code) ? code : null;
}

export function accountCallback(origin: string, code: string | null): string {
  const url = new URL('/coffee-lab/', origin);
  if (code) {
    url.searchParams.set('connect_device', '1');
    url.searchParams.set('user_code', code);
  }
  return url.href;
}
