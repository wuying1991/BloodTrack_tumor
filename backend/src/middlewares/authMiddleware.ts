import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'fallback_secret_key';
      
      const decoded = jwt.verify(token, secret) as { id: string };

      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        res.status(401).json({ message: '未授权，用户不存在 (Not authorized, user not found)' });
        return;
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: '未授权，token失效 (Not authorized, token failed)' });
    }
  } else {
    res.status(401).json({ message: '未授权，无token (Not authorized, no token)' });
  }
};
