import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const { subtle } = crypto.webcrypto;

/**
 * Generates a cryptographically secure 256-bit challenge nonce.
 */
export const generateChallengeNonce = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Computes a SHA-256 fingerprint for a public key JWK or raw string.
 */
export const computeKeyFingerprint = (keyData: string): string => {
  return crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
};

/**
 * Verifies a device-bound ECDSA P-256 signature using WebCrypto.
 * @param publicKeyJwkJson Stringified JWK of the registered public key
 * @param message The exact string that was signed
 * @param signatureBase64 Base64-encoded signature from client
 */
export const verifyDeviceSignature = async (
  publicKeyJwkJson: string | object,
  message: string,
  signatureBase64: string
): Promise<boolean> => {
  try {
    const rawJwk =
      typeof publicKeyJwkJson === 'string'
        ? JSON.parse(publicKeyJwkJson)
        : publicKeyJwkJson;

    // Sanitize key_ops so keys registered previously with empty or missing 'verify' key_ops import cleanly
    const jwk = { ...rawJwk };
    delete jwk.key_ops;

    const publicKey = await subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['verify']
    );

    const messageBuffer = Buffer.from(message, 'utf-8');
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    const isValid = await subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signatureBuffer,
      messageBuffer
    );

    if (!isValid) {
      console.warn('verifyDeviceSignature: Signature did not match expected payload', {
        messageLength: message.length,
        sigLength: signatureBuffer.length,
      });
    }

    return isValid;
  } catch (error) {
    console.error('Cryptographic signature verification failed with error:', error);
    return false;
  }
};

/**
 * Detects whether an incoming HTTP request originated from a mobile or tablet client.
 */
export const isMobileClient = (userAgent?: string, secChUaMobile?: string): boolean => {
  if (secChUaMobile === '?1') {
    return true;
  }

  if (!userAgent) return false;

  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle|CriOS|FxiOS/i;

  return mobileRegex.test(userAgent);
};

/**
 * Express middleware to prevent attendance operations from mobile API requests.
 */
export const restrictMobileAttendance = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ua = req.headers['user-agent'] || '';
  const secChMobile = req.headers['sec-ch-ua-mobile'] as string | undefined;

  if (isMobileClient(ua, secChMobile)) {
    res.status(403).json({
      success: false,
      message:
        'Attendance check-in and check-out is restricted exclusively to authorized office desktop and laptop devices. Mobile access is prohibited.',
      code: 'DEVICE_MOBILE_NOT_ALLOWED',
    });
    return;
  }

  next();
};

