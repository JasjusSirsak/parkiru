const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Generate unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PKR-${timestamp}-${random}`;
};

// Save base64 image to file and return path
const saveBase64Image = (base64Data, filename) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Image = base64Data.split(';base64,').pop();
    if (!base64Image) {
      throw new Error('Invalid base64 image format');
    }

    // Create file path
    const filePath = path.join(uploadsDir, filename);
    
    // Save file
    fs.writeFileSync(filePath, base64Image, 'base64');
    
    // Return relative path for database storage
    return `uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

// Generate unique filename
const generateFilename = (plateNumber) => {
  const timestamp = Date.now();
  const cleanPlate = plateNumber.replace(/[^a-zA-Z0-9]/g, '_');
  return `entry_${cleanPlate}_${timestamp}.jpg`;
};

// Generate auto-increment MTR-XXXXXX plate number
const generateMTRNumber = async () => {
  try {
    const lastSession = await pool.query(
      'SELECT plate_number FROM parking_sessions WHERE plate_number LIKE \'MTR-%\' ORDER BY id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    if (lastSession.rows.length > 0) {
      const lastNum = parseInt(lastSession.rows[0].plate_number.replace('MTR-', ''));
      nextNumber = lastNum + 1;
    }
    
    return `MTR-${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating MTR number:', error);
    // Fallback to timestamp-based number if query fails
    return `MTR-${String(Date.now()).slice(-6)}`;
  }
};

// 1. CREATE - Entry Motor (Masuk)
exports.createSession = async (req, res, next) => {
  try {
    const { plate_number, entry_photo_url } = req.body;

    // Generate auto-increment MTR-XXXXXX plate number if plate_number is 'AUTO' or not provided
    let finalPlateNumber;
    if (plate_number === 'AUTO' || !plate_number) {
      finalPlateNumber = await generateMTRNumber();
    } else {
      finalPlateNumber = plate_number;
    }
    
    const transaction_id = generateTransactionId();
    const entry_time = new Date();
    let photoPath = null;

    // Process photo if provided
    if (entry_photo_url) {
      try {
        const filename = generateFilename(finalPlateNumber);
        photoPath = saveBase64Image(entry_photo_url, filename);
        console.log(`✅ Photo saved: ${photoPath}`);
      } catch (photoError) {
        console.error('❌ Failed to save photo:', photoError);
        // Continue without photo but log the error
      }
    }

    const query = `
      INSERT INTO parking_sessions 
        (transaction_id, plate_number, entry_time, status, entry_photo_url, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', $4, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [transaction_id, finalPlateNumber, entry_time, photoPath]);

    console.log(`✅ Session created: ${transaction_id} with plate ${finalPlateNumber}`);

    res.status(201).json({
      success: true,
      message: 'Motor berhasil dicatat masuk',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error in createSession:', {
      message: err.message,
      stack: err.stack,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Gagal mencatat motor masuk',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 2. GET ACTIVE - Live Monitor (Semua motor yang masih aktif)
exports.getActiveSessions = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        id,
        transaction_id,
        plate_number,
        entry_time,
        entry_photo_url,
        status,
        EXTRACT(EPOCH FROM (NOW() - entry_time))::INTEGER AS duration_seconds
      FROM parking_sessions
      WHERE exit_time IS NULL
      ORDER BY entry_time ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Error in getActiveSessions:', err);
    res.status(500).json({ error: 'Gagal mengambil data sesi aktif' });
  }
};

exports.getLiveMonitorData = async (req, res, next) => {
  try {
    const sessionsQuery = `
      SELECT
        id,
        transaction_id,
        plate_number,
        entry_time,
        entry_photo_url,
        status
      FROM parking_sessions
      WHERE exit_time IS NULL
      ORDER BY entry_time ASC
    `;

    const sessionsResult = await pool.query(sessionsQuery);

    const statsQuery = `
      WITH active AS (
        SELECT entry_time, plate_number
        FROM parking_sessions
        WHERE exit_time IS NULL
      )
      SELECT
        (SELECT COUNT(*)::INTEGER FROM active) AS total_active,
        COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (NOW() - entry_time)))::INTEGER FROM active), 0) AS avg_duration_seconds,
        (SELECT COUNT(*)::INTEGER FROM active WHERE EXTRACT(EPOCH FROM (NOW() - entry_time)) >= 7200) AS high_duration_count,
        (SELECT entry_time FROM active ORDER BY entry_time ASC LIMIT 1) AS oldest_entry_time,
        (SELECT plate_number FROM active ORDER BY entry_time ASC LIMIT 1) AS oldest_plate_number
    `;

    const statsResult = await pool.query(statsQuery);
    const statsRow = statsResult.rows[0] || {};

    res.json({
      success: true,
      stats: {
        totalActive: parseInt(statsRow.total_active ?? 0, 10),
        avgDuration: parseInt(statsRow.avg_duration_seconds ?? 0, 10),
        highDuration: parseInt(statsRow.high_duration_count ?? 0, 10),
        oldest: {
          idMotor: statsRow.oldest_plate_number || null,
          entryTime: statsRow.oldest_entry_time || null
        }
      },
      entries: sessionsResult.rows
    });
  } catch (err) {
    console.error('Error in getLiveMonitorData:', err);
    res.status(500).json({ error: 'Gagal mengambil data live monitor' });
  }
};

// 3. GET BY PLATE - Cari motor berdasarkan plat (untuk Exit/Checker)
exports.getSessionByPlate = async (req, res, next) => {
  try {
    const { plate_number } = req.params;

    const query = `
      SELECT 
        *,
        EXTRACT(EPOCH FROM (NOW() - entry_time))::INTEGER AS duration_seconds
      FROM parking_sessions
      WHERE plate_number = $1 AND status = 'active'
      LIMIT 1
    `;

    const result = await pool.query(query, [plate_number.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Motor tidak ditemukan atau sudah keluar' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getSessionByPlate:', err);
    res.status(500).json({ error: 'Gagal mencari data motor' });
  }
};

// 3.1. GET BY TRANSACTION ID - Cari motor berdasarkan transaction_id (untuk QR Code Scanner)
exports.getSessionByTransactionId = async (req, res, next) => {
  try {
    const { transaction_id } = req.params;

    const query = `
      SELECT 
        *,
        EXTRACT(EPOCH FROM (NOW() - entry_time))::INTEGER AS duration_seconds
      FROM parking_sessions
      WHERE transaction_id = $1 AND status = 'active'
      LIMIT 1
    `;

    const result = await pool.query(query, [transaction_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan atau sudah selesai' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getSessionByTransactionId:', err);
    res.status(500).json({ error: 'Gagal mencari data transaksi' });
  }
};

// 4. UPDATE - Exit Motor (Keluar & Ubah Status) with Atomic Transaction
exports.completeSession = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      exit_photo_url, 
      notes, 
      payment_method_id, 
      payment_method,
      hourly_rate: frontend_hourly_rate,
      base_amount: frontend_base_amount,
      ppn_amount: frontend_ppn_amount,
      ppn_percentage: frontend_ppn_percentage,
      total_amount: frontend_total_amount,
      duration_minutes: frontend_duration_minutes,
      chargeable_minutes: frontend_chargeable_minutes,
      billable_hours: frontend_billable_hours
    } = req.body;

    // Get current session
    const sessionQuery = `
      SELECT * FROM parking_sessions WHERE id = $1 AND status = 'active'
    `;
    const sessionResult = await client.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sesi parkir tidak ditemukan atau sudah selesai' });
    }

    const session = sessionResult.rows[0];
    const exit_time = new Date();
    const entry_time = new Date(session.entry_time);
    
    // Calculate duration
    const durationMs = exit_time - entry_time;
    const duration_minutes = Math.round(durationMs / (1000 * 60));

    // Get parking settings for calculations
    const settingsQuery = `
      SELECT hourly_rate, max_daily_rate, grace_period_hours, ppn_percentage 
      FROM parking_settings 
      WHERE is_active = true 
      LIMIT 1
    `;
    const settingsResult = await client.query(settingsQuery);
    
    let hourly_rate = 3000;
    let max_daily_rate = 20000;
    let grace_period_hours = 1;
    let ppn_percentage = 11;
    let base_amount = 0;
    let ppn_amount = 0;
    let calculated_total = 0;
    
    if (settingsResult.rows.length > 0) {
      const settings = settingsResult.rows[0];
      hourly_rate = settings.hourly_rate;
      max_daily_rate = settings.max_daily_rate;
      grace_period_hours = settings.grace_period_hours;
      ppn_percentage = settings.ppn_percentage;
      
      // Calculate fee
      const billableMinutes = Math.max(0, duration_minutes - (grace_period_hours * 60));
      const billableHours = Math.ceil(billableMinutes / 60);
      base_amount = billableHours * hourly_rate;
      
      // Apply max daily rate
      if (base_amount > max_daily_rate) {
        base_amount = max_daily_rate;
      }
      
      // Calculate PPN
      ppn_amount = (base_amount * ppn_percentage) / 100;
      calculated_total = base_amount + ppn_amount;
    }

    // Update session status to completed (only if still active)
    const updateQuery = `
      UPDATE parking_sessions
      SET status = 'completed', 
          exit_time = $2, 
          exit_photo_url = $3, 
          notes = $4, 
          updated_at = NOW()
      WHERE id = $1 AND status = 'active'
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [
      id, 
      exit_time, 
      exit_photo_url || null, 
      notes || null
    ]);

    // Check if update was successful
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Sesi parkir sudah selesai atau tidak ditemukan',
        message: 'Transaksi mungkin sudah diproses sebelumnya'
      });
    }

    // Use frontend values if provided, otherwise use backend calculations
    const final_duration_minutes = frontend_duration_minutes || duration_minutes;
    const final_chargeable_minutes = frontend_chargeable_minutes || Math.max(0, duration_minutes - grace_period_minutes);
    const final_billable_hours = frontend_billable_hours || Math.ceil(final_chargeable_minutes / 60);
    const final_hourly_rate = frontend_hourly_rate || hourly_rate;
    const final_base_amount = frontend_base_amount || base_amount;
    const final_ppn_percentage = frontend_ppn_percentage || ppn_percentage;
    const final_ppn_amount = frontend_ppn_amount || ppn_amount;
    const final_total_amount = frontend_total_amount || calculated_total;
    const final_payment_method_id = payment_method_id || (payment_method === 'qris' ? 1 : 2);

    // Insert transaction record (hanya kolom yang ada di database)
    const transactionQuery = `
      INSERT INTO transactions 
        (parking_session_id,
         transaction_id,
         plate_number,
         entry_time,
         exit_time,
         payment_method_id,
         hourly_rate,
         duration_minutes,
         base_amount,
         ppn_amount,
         total_amount,
         payment_time,
         cashier_id,
         created_at,
         updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', NOW(), $12, NOW(), NOW())
      RETURNING *
    `;

    const transactionValues = [
      id,                                         // $1: parking_session_id
      session.transaction_id || `PKR-${Date.now()}`, // $2: transaction_id
      session.plate_number,                       // $3: plate_number
      session.entry_time,                         // $4: entry_time
      exit_time,                                  // $5: exit_time
      final_payment_method_id,                    // $6: payment_method_id
      final_hourly_rate,                          // $7: hourly_rate
      final_duration_minutes,                     // $8: duration_minutes
      parseFloat(final_base_amount),              // $9: base_amount
      parseFloat(final_ppn_amount),               // $10: ppn_amount
      parseFloat(final_total_amount),             // $11: total_amount
      req.user.id                                 // $12: cashier_id
    ];

    const transactionResult = await client.query(transactionQuery, transactionValues);

    await client.query('COMMIT');

    console.log(`✅ Atomic transaction completed: Session ${id} + Transaction ${transactionResult.rows[0].id}`);

    res.json({
      success: true,
      message: 'Pembayaran berhasil dan sesi parkir selesai',
      data: {
        session: updateResult.rows[0],
        transaction: transactionResult.rows[0]
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error in atomic completeSession:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan sesi parkir' });
  } finally {
    client.release();
  }
};

exports.getPeakHoursToday = async (req, res, next) => {
  try {
    const query = `
      SELECT
        TO_CHAR(date_trunc('hour', timezone('Asia/Jakarta', entry_time)), 'HH24:00') AS time,
        COUNT(*)::INTEGER AS count
      FROM parking_sessions
      WHERE timezone('Asia/Jakarta', entry_time)::DATE = timezone('Asia/Jakarta', NOW())::DATE
      GROUP BY 1
      ORDER BY 1
    `;

    const result = await pool.query(query);

    const map = new Map();
    for (const row of result.rows) {
      map.set(String(row.time).slice(0, 5), parseInt(row.count, 10));
    }

    const data = [];
    for (let h = 7; h <= 22; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      data.push({ time, count: map.get(time) ?? 0 });
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error in getPeakHoursToday:', err);
    res.status(500).json({ error: 'Gagal mengambil data jam puncak' });
  }
};

// 5. GET ALL - Semua sesi (completed & active)
exports.getAllSessions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM parking_sessions';
    let countQuery = 'SELECT COUNT(*) FROM parking_sessions';
    const params = [];

    if (status) {
      query += ` WHERE status = $1`;
      countQuery += ` WHERE status = $1`;
      params.push(status);
    }

    query += ` ORDER BY entry_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

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
    console.error('Error in getAllSessions:', err);
    res.status(500).json({ error: 'Gagal mengambil data sesi' });
  }
};

// 6. GET HISTORY - Sesi yang sudah selesai (completed)
exports.getHistorySessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, start_date, end_date, plate_number } = req.query;
    const offset = (page - 1) * limit;

    const settingsQuery = `
      SELECT hourly_rate, max_daily_rate, grace_period_hours, ppn_percentage
      FROM parking_settings
      WHERE is_active = true
      LIMIT 1
    `;
    const settingsResult = await pool.query(settingsQuery);
    const settings = settingsResult.rows[0] || {
      hourly_rate: 5000,
      max_daily_rate: 50000,
      grace_period_hours: 1,
      ppn_percentage: 0
    };

    let query = `
      SELECT
        id,
        transaction_id,
        plate_number,
        entry_time,
        exit_time,
        duration_minutes,
        entry_photo_url,
        exit_photo_url,
        status,
        notes,
        created_at,
        updated_at
      FROM parking_sessions
      WHERE exit_time IS NOT NULL AND status = 'completed'
    `;
    let countQuery = "SELECT COUNT(*) FROM parking_sessions WHERE exit_time IS NOT NULL AND status = 'completed'";
    const params = [];
    const countParams = [];

    if (start_date && end_date) {
      query += ` AND DATE(exit_time) BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      countQuery += ` AND DATE(exit_time) BETWEEN $${countParams.length + 1} AND $${countParams.length + 2}`;
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    if (plate_number) {
      query += ` AND plate_number ILIKE $${params.length + 1}`;
      countQuery += ` AND plate_number ILIKE $${countParams.length + 1}`;
      params.push(`%${plate_number}%`);
      countParams.push(`%${plate_number}%`);
    }

    query += ` ORDER BY exit_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const dataResult = await pool.query(query, [...params, limit, offset]);
    const countResult = await pool.query(countQuery, countParams);

    const rows = dataResult.rows.map((row) => {
      const entryTime = new Date(row.entry_time);
      const exitTime = new Date(row.exit_time);
      const rawDurationMinutes = Math.max(0, Math.round((exitTime - entryTime) / (1000 * 60)));
      const chargeableMinutes = Math.max(0, rawDurationMinutes - ((settings.grace_period_hours || 1) * 60));
      const billableHours = Math.ceil(chargeableMinutes / 60) || 0;
      let totalAmount = billableHours * settings.hourly_rate;

      if (settings.max_daily_rate && totalAmount > settings.max_daily_rate) {
        totalAmount = settings.max_daily_rate;
      }

      const ppnAmount = (totalAmount * (settings.ppn_percentage || 0)) / 100;
      return {
        ...row,
        duration_minutes: rawDurationMinutes,
        total_payment: Math.round(totalAmount + ppnAmount)
      };
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit)
      }
    });
  } catch (err) {
    console.error('Error in getHistorySessions:', err);
    res.status(500).json({ error: 'Gagal mengambil data riwayat' });
  }
};

// 7. LOST TICKET - Process lost ticket with fine & admin auth
exports.processLostTicket = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { 
      admin_id, 
      stnk_number, 
      reason, 
      payment_method_id 
    } = req.body;

    if (!admin_id || !stnk_number || !reason) {
      return res.status(400).json({ error: 'Data tidak lengkap (Admin ID, STNK, dan Alasan wajib)' });
    }

    await client.query('BEGIN');

    // 1. Verify Admin
    const adminQuery = 'SELECT id, role FROM users WHERE id = $1 AND role = \'admin\'';
    const adminResult = await client.query(adminQuery, [admin_id]);
    
    if (adminResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Otorisasi gagal: Hanya admin yang dapat melegitimasi karcis hilang' });
    }

    // 2. Get Session
    const sessionQuery = 'SELECT * FROM parking_sessions WHERE id = $1 AND status = \'active\'';
    const sessionResult = await client.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sesi parkir tidak ditemukan atau sudah selesai' });
    }

    const session = sessionResult.rows[0];
    const exit_time = new Date();
    const entry_time = new Date(session.entry_time);
    const duration_minutes = Math.round((exit_time - entry_time) / (1000 * 60));

    // 3. Get Settings (Fine + Rates)
    const settingsQuery = 'SELECT hourly_rate, max_daily_rate, grace_period_hours, ppn_percentage, lost_ticket_fine FROM parking_settings WHERE is_active = true LIMIT 1';
    const settingsResult = await client.query(settingsQuery);
    const settings = settingsResult.rows[0] || { hourly_rate: 3000, max_daily_rate: 30000, grace_period_hours: 1, ppn_percentage: 11, lost_ticket_fine: 20000 };

    // 4. Calculate Parking Fee
    const billableMinutes = Math.max(0, duration_minutes - (settings.grace_period_hours * 60));
    const billableHours = Math.ceil(billableMinutes / 60);
    let parking_fee = billableHours * settings.hourly_rate;
    if (parking_fee > settings.max_daily_rate) parking_fee = settings.max_daily_rate;

    const lost_ticket_fine = settings.lost_ticket_fine || 0;
    const base_amount = parking_fee + lost_ticket_fine;
    const ppn_amount = (base_amount * settings.ppn_percentage) / 100;
    const total_amount = base_amount + ppn_amount;

    // 5. Update Session
    const updateQuery = `
      UPDATE parking_sessions
      SET status = 'completed', 
          exit_time = $2, 
          notes = $3, 
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const notes = `KARCIS HILANG | STNK: ${stnk_number} | Alasan: ${reason} | Otorisasi: Admin ID ${admin_id}`;
    const updateResult = await client.query(updateQuery, [id, exit_time, notes]);

    // 6. Insert Transaction
    const transactionQuery = `
      INSERT INTO transactions 
        (parking_session_id, transaction_id, plate_number, entry_time, exit_time, 
         payment_method_id, hourly_rate, duration_minutes, base_amount, ppn_amount, 
         total_amount, payment_status, payment_time, cashier_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', NOW(), $12, NOW(), NOW())
      RETURNING *
    `;
    
    const transactionValues = [
      id, 
      session.transaction_id || `LOST-${Date.now()}`,
      session.plate_number,
      session.entry_time,
      exit_time,
      payment_method_id || 1, // Default to cash if not provided
      settings.hourly_rate,
      duration_minutes,
      base_amount,
      ppn_amount,
      total_amount,
      req.user.id
    ];

    const transactionResult = await client.query(transactionQuery, transactionValues);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Karcis hilang berhasil diproses',
      data: {
        session: updateResult.rows[0],
        transaction: transactionResult.rows[0],
        breakdown: {
          parking_fee,
          lost_ticket_fine,
          total_amount
        }
      }
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error in processLostTicket:', err);
    res.status(500).json({ error: 'Gagal memproses karcis hilang' });
  } finally {
    if (client) client.release();
  }
};
