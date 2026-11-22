import { Capacitor, registerPlugin } from '@capacitor/core';

export interface CoffeeAccountUser { id: string; name: string; email: string }

export const nativeAccount = registerPlugin<{
  cloudStorage(options: {projectUrl: string; key: string; action: 'read' | 'write' | 'remove'; value?: string}): Promise<{value?: string | null} | undefined>;
  cloudSignIn(options: {projectUrl: string; url: string}): Promise<{code: string}>;
  status(): Promise<{configured: boolean; providers: string[]; nativeApple?: boolean; local?: boolean; user?: CoffeeAccountUser}>;
  prepare(): Promise<{code: string; approveOnMac?: boolean}>;
  connect(): Promise<{user: CoffeeAccountUser}>;
  cancelConnection(): Promise<void>;
  signInWithApple(): Promise<{user: CoffeeAccountUser}>;
  request(options: {path: string; owner?: string; body?: unknown}): Promise<{
    recipes?: unknown; success?: boolean; message?: string;
  }>;
}>('CoffeeAccount');

export const hasNativeAccount = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('CoffeeAccount');

// The Android bridge implements cloud sessions. The local Mac connection is iOS-only.
export const hasNativeCloudAccount = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('CoffeeAccount');
