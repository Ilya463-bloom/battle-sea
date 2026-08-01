/**
 * Thin bridge to the native shell.
 *
 * Every function here is a no-op in a plain browser, so the same build runs on
 * a web server and inside the Capacitor WebView without any branching in the UI.
 */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { ShotResult } from '../game/types';

export const isNative = (): boolean => Capacitor.isNativePlatform();

const ignore = () => undefined;

/**
 * @param onBack Handles the Android hardware back button. Return `false` to let
 *               the system close the app.
 */
export async function initNativeShell(onBack: () => boolean): Promise<void> {
  if (!isNative()) return;

  // Dark glyphs on our light paper background.
  await StatusBar.setStyle({ style: Style.Light }).catch(ignore);
  await StatusBar.setBackgroundColor({ color: '#fdfbf2' }).catch(ignore);

  await App.addListener('backButton', () => {
    if (!onBack()) void App.exitApp();
  }).catch(ignore);

  await SplashScreen.hide().catch(ignore);
}

/** A short buzz that matches what just happened on the board. */
export function shotFeedback(result: ShotResult): void {
  if (!isNative()) return;

  const buzz =
    result === 'miss'
      ? Haptics.impact({ style: ImpactStyle.Light })
      : result === 'hit'
        ? Haptics.impact({ style: ImpactStyle.Medium })
        : Haptics.notification({ type: NotificationType.Success });

  void buzz.catch(ignore);
}
