import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Store pending link codes: code -> { userId, expiresAt }
const pendingLinkCodes = new Map<string, { userId: string; expiresAt: Date }>();

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
        return;
      }

      // Check if username exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existing.rows.length > 0) {
        res.status(400).json({ error: '이미 사용 중인 사용자명입니다.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await pool.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, is_admin, created_at`,
        [username, passwordHash]
      );

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.status(201).json({
        message: '회원가입이 완료되었습니다.',
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin,
        },
        token,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요.' });
        return;
      }

      const result = await pool.query(
        'SELECT id, username, password_hash, is_admin FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
        return;
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
        return;
      }

      // Check if telegram is linked
      const telegramLink = await pool.query(
        'SELECT telegram_id, telegram_username FROM telegram_links WHERE user_id = $1',
        [user.id]
      );

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.json({
        message: '로그인 성공',
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          telegramLinked: telegramLink.rows.length > 0,
          telegramUsername: telegramLink.rows[0]?.telegram_username || null,
        },
        token,
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
  },

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      const result = await pool.query(
        'SELECT id, username, is_admin, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        return;
      }

      const user = result.rows[0];

      // Check telegram link
      const telegramLink = await pool.query(
        'SELECT telegram_id, telegram_username FROM telegram_links WHERE user_id = $1',
        [userId]
      );

      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        telegramLinked: telegramLink.rows.length > 0,
        telegramUsername: telegramLink.rows[0]?.telegram_username || null,
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  },

  async generateLinkCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      // Generate a 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Clean up old codes for this user
      for (const [existingCode, data] of pendingLinkCodes.entries()) {
        if (data.userId === userId) {
          pendingLinkCodes.delete(existingCode);
        }
      }

      pendingLinkCodes.set(code, { userId, expiresAt });

      res.json({
        code,
        expiresAt,
        message: '텔레그램 봇에서 /link 명령어를 입력한 후 이 코드를 입력하세요.',
      });
    } catch (error) {
      console.error('Error generating link code:', error);
      res.status(500).json({ error: '연동 코드 생성 중 오류가 발생했습니다.' });
    }
  },

  async unlinkTelegram(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      await pool.query('DELETE FROM telegram_links WHERE user_id = $1', [userId]);

      res.json({ message: '텔레그램 연동이 해제되었습니다.' });
    } catch (error) {
      console.error('Error unlinking telegram:', error);
      res.status(500).json({ error: '텔레그램 연동 해제 중 오류가 발생했습니다.' });
    }
  },
};

// Export for use in telegram bot
export const verifyLinkCode = async (
  code: string,
  telegramId: number,
  telegramUsername?: string
): Promise<{ success: boolean; username?: string; error?: string }> => {
  const pending = pendingLinkCodes.get(code);

  if (!pending) {
    return { success: false, error: '유효하지 않은 코드입니다.' };
  }

  if (new Date() > pending.expiresAt) {
    pendingLinkCodes.delete(code);
    return { success: false, error: '코드가 만료되었습니다. 새 코드를 발급받으세요.' };
  }

  try {
    // Check if telegram is already linked to another account
    const existingLink = await pool.query(
      'SELECT user_id FROM telegram_links WHERE telegram_id = $1',
      [telegramId]
    );

    if (existingLink.rows.length > 0) {
      return { success: false, error: '이 텔레그램 계정은 이미 다른 계정에 연동되어 있습니다.' };
    }

    // Create the link
    await pool.query(
      `INSERT INTO telegram_links (user_id, telegram_id, telegram_username)
       VALUES ($1, $2, $3)`,
      [pending.userId, telegramId, telegramUsername || null]
    );

    // Get username
    const userResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [pending.userId]
    );

    pendingLinkCodes.delete(code);

    return { success: true, username: userResult.rows[0]?.username };
  } catch (error) {
    console.error('Error linking telegram:', error);
    return { success: false, error: '연동 중 오류가 발생했습니다.' };
  }
};

export const getUserByTelegramId = async (
  telegramId: number
): Promise<{ userId: string; username: string } | null> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username FROM users u
       JOIN telegram_links tl ON u.id = tl.user_id
       WHERE tl.telegram_id = $1`,
      [telegramId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return { userId: result.rows[0].id, username: result.rows[0].username };
  } catch (error) {
    console.error('Error getting user by telegram id:', error);
    return null;
  }
};

// JWT middleware (required auth)
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: () => void
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;

    next();
  } catch (error) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// Optional JWT middleware (doesn't require auth, but extracts user if token present)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: () => void
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      (req as any).userId = decoded.userId;
      (req as any).username = decoded.username;
    }

    next();
  } catch (error) {
    // Token invalid, but continue without auth
    next();
  }
};
