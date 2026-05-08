const pool = require('../config/db');

// Helper: Calculate parking fee
const calculateFee = async (entry_time, exit_time) => {
  try {
    // Get parking settings
    const settingsQuery = 'SELECT hourly_rate, max_daily_rate, grace_period_minutes, ppn_percentage FROM parking_settings WHERE is_active = true LIMIT 1';
    const settingsResult = await pool.query(settingsQuery);
    
    if (settingsResult.rows.length === 0) {
      throw new Error('Parking settings tidak ditemukan');
    }

    const settings = settingsResult.rows[0];
    const durationMs = exit_time - entry_time;
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationMinutes = durationMs / (1000 * 60);

    // Apply grace period
    const gracePeriodMinutes = settings.grace_period_minutes || 15;
    let billableMinutes = durationMinutes - gracePeriodMinutes;
    if (billableMinutes < 0) billableMinutes = 0;

    // Calculate base amount (rounded up per hour)
    const billableHours = Math.ceil(billableMinutes / 60);
    let base_amount = billableHours * settings.hourly_rate;

    // Apply max daily rate
    if (base_amount > settings.max_daily_rate) {
      base_amount = settings.max_daily_rate;
    }

    // Calculate PPN
    const ppn_amount = (base_amount * settings.ppn_percentage) / 100;
    const total_amount = base_amount + ppn_amount;

    return {
      duration_minutes: Math.round(durationMinutes),
      hourly_rate: settings.hourly_rate,
      base_amount: parseFloat(base_amount.toFixed(2)),
      ppn_amount: parseFloat(ppn_amount.toFixed(2)),
      total_amount: parseFloat(total_amount.toFixed(2))
    };
  } catch (err) {
    console.error('Error in calculateFee:', err);
    throw err;
  }
};

// 1. CREATE - Buat transaksi saat exit
exports.createTransaction = async (req, res, next) => {
  try {
    const { parking_session_id, payment_method_id, cashier_id, notes } = req.body;

    // Get parking session
    const sessionQuery = 'SELECT * FROM parking_sessions WHERE id = $1';
    const sessionResult = await pool.query(sessionQuery, [parking_session_id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi parkir tidak ditemukan' });
    }

    const session = sessionResult.rows[0];
    
    if (!session.exit_time) {
      return res.status(400).json({ error: 'Motor belum di-exit' });
    }

    // Calculate fee
    const feeData = await calculateFee(session.entry_time, session.exit_time);

    // Generate transaction ID
    const transaction_id = session.transaction_id || `PKR-${Date.now()}`;

    // Create transaction
    const query = `
      INSERT INTO transactions 
        (transaction_id, parking_session_id, plate_number, entry_time, exit_time, 
         duration_minutes, hourly_rate, base_amount, ppn_amount, total_amount, 
         payment_method_id, payment_status, cashier_id, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      transaction_id,
      parking_session_id,
      session.plate_number,
      session.entry_time,
      session.exit_time,
      feeData.duration_minutes,
      feeData.hourly_rate,
      feeData.base_amount,
      feeData.ppn_amount,
      feeData.total_amount,
      payment_method_id || null,
      cashier_id || null,
      notes || null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil dibuat',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in createTransaction:', err);
    res.status(500).json({ error: 'Gagal membuat transaksi' });
  }
};

// 2. GET ALL - Daftar semua transaksi
exports.getAllTransactions = async (req, res, next) => {
  try {
    const { payment_status, plate_number, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, u.full_name as cashier_name, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN users u ON t.cashier_id = u.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
    `;
    let countQuery = 'SELECT COUNT(*) FROM transactions t';
    const params = [];

    const whereClauses = [];

    if (payment_status) {
      params.push(payment_status);
      whereClauses.push(`t.payment_status = $${params.length}`);
    }

    if (plate_number) {
      params.push(`%${plate_number}%`);
      whereClauses.push(`t.plate_number ILIKE $${params.length}`);
    }

    if (start_date) {
      params.push(start_date);
      whereClauses.push(`t.exit_time::date >= $${params.length}::date`);
    }

    if (end_date) {
      params.push(end_date);
      whereClauses.push(`t.exit_time::date <= $${params.length}::date`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY t.exit_time DESC NULLS LAST, t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const dataResult = await pool.query(query, [...params, limit, offset]);
    const countResult = await pool.query(countQuery, params);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (err) {
    console.error('Error in getAllTransactions:', err);
    res.status(500).json({ error: 'Gagal mengambil data transaksi' });
  }
};

// 3. GET BY ID
exports.getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT t.*, u.full_name as cashier_name, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN users u ON t.cashier_id = u.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getTransactionById:', err);
    res.status(500).json({ error: 'Gagal mengambil data transaksi' });
  }
};

// 4. UPDATE - Update payment status (untuk pembayaran)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const query = `
      UPDATE transactions
      SET payment_status = $2, payment_time = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, payment_status]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Status pembayaran diperbarui',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in updatePaymentStatus:', err);
    res.status(500).json({ error: 'Gagal memperbarui status pembayaran' });
  }
};
