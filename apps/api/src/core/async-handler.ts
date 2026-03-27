import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler = <Req extends Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return (req, res, next) => {
    void handler(req as Req, res, next).catch(next);
  };
};
