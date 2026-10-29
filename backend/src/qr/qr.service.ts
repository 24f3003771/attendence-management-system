import crypto from 'crypto';
import { prisma } from '../app';
import { config } from '../config/config';
import { createHttpError } from '../middleware/errorHandler';

/** Build the HMAC-SHA256 signed QR token string */
function buildToken(officeId: string, timestamp: number, nonce: string, secret: string): string {
  const payload = `${officeId}:${timestamp}:${nonce}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/** Verify an HMAC-signed QR token against a secret */
function verifyTokenSignature(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

export const qrService = {
  /**
   * Generate a fresh QR token for an office. Called by the display screen every ~25 seconds.
   * Persists the token to DB so it can be validated at scan time.
   */
  async generateForOffice(officeId: string) {
    const office = await prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw createHttpError(404, 'Office not found');

    const now = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const token = buildToken(officeId, now, nonce, office.qrSecret);
    const expiresAt = new Date(now + config.qrTokenExpirySeconds * 1000);

    const qrToken = await prisma.qrToken.create({
      data: { officeId, token, expiresAt },
    });

    return {
      token: qrToken.token,
      officeId,
      officeName: office.name,
      expiresAt: qrToken.expiresAt,
      expiresInSeconds: config.qrTokenExpirySeconds,
    };
  },

  /**
   * Validate a scanned QR token string.
   * Returns the QrToken DB record if valid.
   */
  async validateToken(tokenString: string) {
    const qrToken = await prisma.qrToken.findUnique({
      where: { token: tokenString },
      include: { office: true },
    });

    if (!qrToken) {
      throw createHttpError(400, 'Invalid QR token');
    }

    if (qrToken.expiresAt < new Date()) {
      throw createHttpError(400, 'QR token has expired');
    }

    // Verify HMAC signature
    if (!verifyTokenSignature(tokenString, qrToken.office.qrSecret)) {
      throw createHttpError(400, 'QR token signature invalid');
    }

    return qrToken;
  },

  /**
   * Mark a QR token as used (called after a successful attendance scan)
   */
  async markUsed(tokenId: string) {
    await prisma.qrToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },
};
