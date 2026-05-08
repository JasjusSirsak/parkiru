const pool = require('../config/db');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT id, username, full_name, email, phone, role, is_active, last_activity, master_key, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    res.status(500).json({ error: 'Gagal mengambil data users' });
  }
};

// Get user by ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT id, username, full_name, email, phone, role, is_active, last_activity, master_key, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getUserById:', err);
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
};

// Create new user (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { username, full_name, email, phone, role, password } = req.body;

    if (!username || !full_name || !email || !role || !password) {
      return res.status(400).json({ error: 'Username, full_name, email, role, dan password wajib diisi' });
    }

    if (!['admin', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Role harus admin atau operator' });
    }

    let masterKey = null;
    if (role === 'admin') {
      masterKey = 'PKR-ADMIN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    const query = `
      INSERT INTO users (username, full_name, email, phone, role, password_hash, is_active, master_key)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING id, username, full_name, email, phone, role, is_active, master_key, created_at
    `;

    const result = await pool.query(query, [username, full_name, email, phone, role, password, masterKey]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in createUser:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username atau email sudah digunakan' });
    }
    res.status(500).json({ error: 'Gagal membuat user baru' });
  }
};

// Update user (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, email, phone, role, is_active } = req.body;

    if (!['admin', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Role harus admin atau operator' });
    }

    const query = `
      UPDATE users
      SET username = $1, full_name = $2, email = $3, phone = $4, role = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, username, full_name, email, phone, role, is_active, updated_at
    `;

    const result = await pool.query(query, [username, full_name, email, phone, role, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in updateUser:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username atau email sudah digunakan' });
    }
    res.status(500).json({ error: 'Gagal mengupdate user' });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ error: 'Gagal menghapus user' });
  }
};

// Verify Master Key (Validasi scanning kartu admin)
exports.verifyMasterKey = async (req, res) => {
  try {
    const { master_key } = req.body;
    console.log(`[VerifyKey] Attempt by user: ${req.user?.username} (${req.user?.role})`);
    console.log(`[VerifyKey] Master Key received: "${master_key}"`);

    if (!master_key) {
      return res.status(400).json({ error: 'Master key wajib disertakan' });
    }

    const trimmedKey = master_key.trim();

    const query = `
      SELECT id, full_name, role, is_active
      FROM users
      WHERE master_key = $1 AND role = 'admin' AND is_active = true
      LIMIT 1
    `;

    const result = await pool.query(query, [trimmedKey]);

    if (result.rows.length === 0) {
      console.log(`[VerifyKey] Failed: No match found for "${trimmedKey}"`);
      return res.status(403).json({ error: 'Otorisasi Gagal: QR tidak valid atau Admin tidak aktif' });
    }

    console.log(`[VerifyKey] Success: Matched admin ${result.rows[0].full_name}`);
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in verifyMasterKey:', err);
    res.status(500).json({ error: 'Gagal verifikasi master key' });
  }
};

// Get Operator Work Report
exports.getOperatorReport = async (req, res) => {
  try {
    const operatorId = req.user.id;
    const { start_date, end_date } = req.query;
    
    // Default to today in Asia/Jakarta if no date provided
    const dateFilter = (start_date && end_date) 
      ? `AND t.created_at::DATE BETWEEN $2 AND $3` 
      : `AND t.created_at::DATE = CURRENT_DATE`;
    
    const params = [operatorId];
    if (start_date && end_date) params.push(start_date, end_date);

    // 1. Get Summary Stats
    const statsQuery = `
      SELECT 
        COUNT(*)::INTEGER AS total_transactions,
        SUM(CASE WHEN t.payment_method_id = 1 THEN t.total_amount ELSE 0 END) AS total_cash,
        SUM(CASE WHEN t.payment_method_id = 2 THEN t.total_amount ELSE 0 END) AS total_qris,
        SUM(t.total_amount) AS total_revenue,
        SUM(t.ppn_amount) AS total_ppn,
        COUNT(CASE WHEN s.notes LIKE '%KARCIS HILANG%' THEN 1 END)::INTEGER AS lost_ticket_count
      FROM transactions t
      JOIN parking_sessions s ON t.parking_session_id = s.id
      WHERE t.cashier_id = $1 ${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // 2. Get Transaction List
    const listQuery = `
      SELECT 
        t.transaction_id,
        t.plate_number,
        t.entry_time,
        t.exit_time,
        t.duration_minutes,
        t.total_amount,
        pm.name AS payment_method,
        s.notes
      FROM transactions t
      JOIN payment_methods pm ON t.payment_method_id = pm.id
      JOIN parking_sessions s ON t.parking_session_id = s.id
      WHERE t.cashier_id = $1 ${dateFilter}
      ORDER BY t.created_at DESC
    `;

    const listResult = await pool.query(listQuery, params);

    res.json({
      success: true,
      data: {
        summary: stats,
        transactions: listResult.rows
      }
    });
  } catch (err) {
    console.error('Error in getOperatorReport:', err);
    res.status(500).json({ error: 'Gagal mengambil laporan kerja' });
  }
};
