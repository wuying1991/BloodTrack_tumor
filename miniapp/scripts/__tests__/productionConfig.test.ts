import { describe, expect, test } from 'vitest';
import { validateProductionEnv } from '../validate-production-env.mjs';
import { finalizeProjectConfig } from '../finalize-weixin-build.mjs';

describe('production miniapp configuration', () => {
  test.each([
    [{}, 'VITE_API_BASE_URL'],
    [
      {
        VITE_API_BASE_URL: 'http://127.0.0.1:5001/api',
        VITE_WEIXIN_APP_ID: 'wx1234567890abcdef',
      },
      'VITE_API_BASE_URL',
    ],
    [
      {
        VITE_API_BASE_URL: 'https://api.example.com/api',
        VITE_WEIXIN_APP_ID: '',
      },
      'VITE_WEIXIN_APP_ID',
    ],
  ])('rejects unsafe values without echoing secrets', (env, expectedName) => {
    expect(() => validateProductionEnv(env)).toThrow(expectedName);
  });

  test('accepts an HTTPS API and a valid Weixin AppID', () => {
    expect(() =>
      validateProductionEnv({
        VITE_API_BASE_URL: 'https://api.example.com/api',
        VITE_WEIXIN_APP_ID: 'wx1234567890abcdef',
      })
    ).not.toThrow();
  });

  test('injects the AppID and enables Weixin URL checks', () => {
    expect(
      finalizeProjectConfig(
        { appid: 'touristappid', setting: { urlCheck: false, es6: true } },
        'wx1234567890abcdef'
      )
    ).toEqual({
      appid: 'wx1234567890abcdef',
      setting: { urlCheck: true, es6: true },
    });
  });
});
