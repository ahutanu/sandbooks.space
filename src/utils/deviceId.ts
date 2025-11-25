import { nanoid } from 'nanoid';

const DEVICE_ID_KEY = 'sandbooks-device-id';

/**
 * Get the device ID from localStorage, creating one if it doesn't exist.
 * The device ID is a stable anonymous identifier for this browser/device.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a 32-character alphanumeric ID
    deviceId = nanoid(32);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Clear the device ID (used for testing or reset scenarios)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}
