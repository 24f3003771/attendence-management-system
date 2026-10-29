import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { qrService } from './qr.service';

const validateQrSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const qrController = {
  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = validateQrSchema.parse(req.body);
      const result = await qrService.validateToken(token);
      res.json({
        success: true,
        data: {
          tokenId: result.id,
          officeId: result.officeId,
          officeName: result.office.name,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
