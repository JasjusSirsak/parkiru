const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const token = authHeader.substring(7);
    const user = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

    if (!user || !user.id || !user.role) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // VERIFIKASI KE DATABASE!
    // Jangan percaya token begitu saja, cek ke database
    const result = await pool.query(
      'SELECT id, username, full_name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const dbUser = result.rows[0];

    if (!dbUser.is_active) {
      return res.status(403).json({ error: 'Forbidden: Account is disabled' });
    }

    // Gunakan data dari database, BUKAN dari token!
    req.user = dbUser;

    // Update last seen in background
    pool.query('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = $1', [dbUser.id]).catch(err => {
      console.error('Failed to update last_activity:', err);
    });

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }
};

module.exports = authMiddleware;