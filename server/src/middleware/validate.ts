import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          success: false,
          message: 'Validation failed for request parameters',
          code: 'VALIDATION_ERROR',
          errors: errorDetails,
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        code: 'BAD_REQUEST',
      });
    }
  };
};
