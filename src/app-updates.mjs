import { Capacitor, registerPlugin } from '@capacitor/core';
import { withDeadline } from './deadline.mjs';
const updates = registerPlugin('OnlyFachosUpdates');
export const updatesAvailable = () => Capacitor.getPlatform() === 'android';
export const checkUpdates = () =>
  withDeadline(updates.check(), 8000, 'No se pudo consultar Google Play.');
export const startUpdate = () => updates.start(); // Google owns the user confirmation dialog.
export const completeUpdate = () =>
  withDeadline(updates.complete(), 10000, 'No se pudo instalar la actualización.');
export const listenUpdates = (listener) => updates.addListener('updateState', listener);
export { updateState } from './update-state.mjs';
