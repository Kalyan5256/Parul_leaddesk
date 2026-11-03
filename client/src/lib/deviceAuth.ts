import { api, ApiResponse } from './api';
import { EmployeeDevice } from '../types/attendance';

const DB_NAME = 'ParulLeadDeskAuthDB';
const DB_VERSION = 1;
const STORE_NAME = 'device_credentials';
const DEVICE_KEY_ID = 'office_laptop_key';
const DEVICE_META_ID = 'office_laptop_meta';

interface StoredDeviceMeta {
  deviceId: string;
  deviceName: string;
  publicKeyJwk: JsonWebKey;
  registeredAt: string;
}

/**
 * Open or initialize IndexedDB object store for non-extractable cryptographic keys.
 */
function openAuthDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save key or metadata to IndexedDB
 */
async function idbSet(key: string, value: any): Promise<void> {
  const db = await openAuthDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get key or metadata from IndexedDB
 */
async function idbGet<T = any>(key: string): Promise<T | null> {
  const db = await openAuthDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Check if the current browser environment is a mobile device or tablet.
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle/i;

  const isTouchDevice =
    navigator.maxTouchPoints > 1 &&
    (window.innerWidth < 768 || window.screen.width < 768);

  return mobileRegex.test(ua) || isTouchDevice;
}

export class DeviceAuthManager {
  /**
   * Check if this browser has an existing registered key and metadata.
   */
  static async getLocalDeviceMeta(): Promise<StoredDeviceMeta | null> {
    try {
      return await idbGet<StoredDeviceMeta>(DEVICE_META_ID);
    } catch (e) {
      console.warn('Failed to retrieve local device metadata:', e);
      return null;
    }
  }

  /**
   * Retrieves the current device registration status from the server.
   */
  static async getRemoteDeviceStatus(): Promise<EmployeeDevice | null> {
    const local = await this.getLocalDeviceMeta();
    if (!local || !local.deviceId) return null;

    try {
      const res = await api.get('/attendance/devices/my');
      if (res.success && Array.isArray(res.data)) {
        const matching = res.data.find((d: EmployeeDevice) => d.id === local.deviceId);
        return matching || null;
      }
    } catch (e) {
      console.warn('Failed to fetch remote device status:', e);
    }
    return null;
  }

  /**
   * Generates a device-bound ECDSA P-256 key pair and registers it with the server.
   * Note: The private key is non-extractable (extractable: false) and locked into IndexedDB.
   */
  static async registerCurrentLaptop(
    deviceName: string
  ): Promise<{ local: StoredDeviceMeta; serverDevice: EmployeeDevice }> {
    if (isMobileBrowser()) {
      throw new Error(
        'Attendance registration is restricted exclusively to office desktop or laptop computers.'
      );
    }

    if (!window.crypto || !window.crypto.subtle) {
      throw new Error(
        'WebCrypto API is not supported in this browser. Please use a modern browser (Chrome, Edge, Firefox).'
      );
    }

    // Generate hardware/browser bound asymmetric key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false, // non-extractable private key
      ['sign']
    );

    // Export public key as JWK to send to server
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

    // Register with server
    const res = await api.post('/attendance/devices/register', {
      deviceName: deviceName.trim(),
      publicKey: JSON.stringify(publicKeyJwk),
      keyAlgorithm: 'ECDSA-P256',
      metadata: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      },
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || 'Server rejected device registration');
    }

    const serverDevice: EmployeeDevice = res.data;

    // Store private key and metadata in browser's local IndexedDB
    const meta: StoredDeviceMeta = {
      deviceId: serverDevice.id,
      deviceName: serverDevice.device_name,
      publicKeyJwk,
      registeredAt: serverDevice.registered_at,
    };

    await idbSet(DEVICE_KEY_ID, keyPair.privateKey);
    await idbSet(DEVICE_META_ID, meta);

    return { local: meta, serverDevice };
  }

  /**
   * Signs a challenge issued by the server using the device-bound private key.
   */
  static async signChallenge(
    employeeId: string,
    deviceId: string,
    nonce: string
  ): Promise<string> {
    const privateKey = await idbGet<CryptoKey>(DEVICE_KEY_ID);
    if (!privateKey) {
      throw new Error('Device private key not found. Please register this office laptop first.');
    }

    const message = `ParulAttendance:${employeeId}:${deviceId}:${nonce}`;
    const enc = new TextEncoder();
    const data = enc.encode(message);

    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      privateKey,
      data
    );

    // Convert signature ArrayBuffer to base64
    const bytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Complete check-in operation with challenge-response signature.
   */
  static async performCheckIn(
    employeeId: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    if (isMobileBrowser()) {
      throw new Error('Attendance check-in is prohibited on mobile devices.');
    }

    const local = await this.getLocalDeviceMeta();
    if (!local || !local.deviceId) {
      throw new Error('This laptop has not been registered. Please register this office laptop.');
    }

    // Step 1: Request single-use cryptographic challenge from server
    const challengeRes = await api.post('/attendance/challenge', {
      deviceId: local.deviceId,
    });

    if (!challengeRes.success || !challengeRes.nonce) {
      throw new Error(challengeRes.message || 'Failed to obtain challenge from server');
    }

    // Step 2: Sign the challenge with non-extractable private key
    const signature = await this.signChallenge(employeeId, local.deviceId, challengeRes.nonce);

    // Step 3: Send check-in payload with proof of possession
    const checkInRes = await api.post('/attendance/check-in', {
      deviceId: local.deviceId,
      nonce: challengeRes.nonce,
      signature,
      notes,
    });

    return checkInRes;
  }

  /**
   * Complete check-out operation with challenge-response signature.
   */
  static async performCheckOut(
    employeeId: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    if (isMobileBrowser()) {
      throw new Error('Attendance check-out is prohibited on mobile devices.');
    }

    const local = await this.getLocalDeviceMeta();
    if (!local || !local.deviceId) {
      throw new Error('This laptop has not been registered. Please register this office laptop.');
    }

    // Step 1: Request challenge
    const challengeRes = await api.post('/attendance/challenge', {
      deviceId: local.deviceId,
    });

    if (!challengeRes.success || !challengeRes.nonce) {
      throw new Error(challengeRes.message || 'Failed to obtain challenge from server');
    }

    // Step 2: Sign challenge
    const signature = await this.signChallenge(employeeId, local.deviceId, challengeRes.nonce);

    // Step 3: Send check-out payload
    const checkOutRes = await api.post('/attendance/check-out', {
      deviceId: local.deviceId,
      nonce: challengeRes.nonce,
      signature,
      notes,
    });

    return checkOutRes;
  }
}
