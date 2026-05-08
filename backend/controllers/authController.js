const pool = require('../config/db');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const query = `
      SELECT id, username, full_name, email, role, is_active, password
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Akun tidak aktif' });
    }

    const passwordOk = typeof user.password === 'string' && password === user.password;

    if (!passwordOk) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = Buffer.from(JSON.stringify({ 
      id: user.id, 
      username: user.username,
      role: user.role 
    })).toString('base64');

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        token: token,
      },
    });
  } catch (err) {
    console.error('Error in login:', err);
    return res.status(500).json({ error: 'Gagal login' });
  }
};
