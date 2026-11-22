import { bearer, deviceAuthorization } from 'better-auth/plugins';

export const COFFEE_IOS_CLIENT = 'coffee-lab-ios-preview';

export function clearDeviceRequests(db) {
  return async user => {
    db.prepare('DELETE FROM deviceCode WHERE userId = ?').run(user.id);
  };
}

export function deviceAccessPlugins(origin) {
  return [
    bearer(),
    deviceAuthorization({
      expiresIn: '5m',
      interval: '5s',
      validateClient: clientId => clientId === COFFEE_IOS_CLIENT,
      verificationUri: origin + '/coffee-lab/?connect_device=1',
    }),
  ];
}
