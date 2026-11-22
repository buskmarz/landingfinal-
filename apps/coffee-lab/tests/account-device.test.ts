import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountCallback, deviceConnectionCode } from '../lib/coffee/account-device.ts';

test('device links accept one eight-character code and retain only a local callback', () => {
  assert.equal(deviceConnectionCode('?connect_device=1&user_code=abcd2345'), 'ABCD2345');
  for (const query of ['', '?user_code=ABCD2345', '?connect_device=0&user_code=ABCD2345',
    '?connect_device=1&user_code=ABC', '?connect_device=1&user_code=ABCD2340',
    '?connect_device=1&user_code=ABCD2345&user_code=EFGH2345',
    '?connect_device=1&connect_device=1&user_code=ABCD2345']) {
    assert.equal(deviceConnectionCode(query), null);
  }
  const query = '?connect_device=1&user_code=ABCD2345&callbackURL=https://foreign.example';
  assert.equal(accountCallback('https://coffee.example', deviceConnectionCode(query)),
    'https://coffee.example/coffee-lab/?connect_device=1&user_code=ABCD2345');
  assert.equal(accountCallback('https://coffee.example', null), 'https://coffee.example/coffee-lab/');
});
