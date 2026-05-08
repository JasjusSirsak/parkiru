const pool = require('../config/db');

// PARKING SETTINGS CONTROLLERS

// Get parking settings
exports.getParkingSettings = async (req, res, next) => {
  try {
    const query = `
      SELECT * FROM parking_settings 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          hourly_rate: 3000,
          max_daily_rate: 20000,
          operating_hours_open: '07:00',
          operating_hours_close: '22:00',
          grace_period_hours: 1,
          ppn_percentage: 11,
          max_capacity: 150,
          is_active: true
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getParkingSettings:', err);
    res.status(500).json({ error: 'Gagal mengambil pengaturan parkir' });
  }
};

// Update parking settings
exports.updateParkingSettings = async (req, res, next) => {
  try {
    const {
      hourly_rate,
      max_daily_rate,
      operating_hours_open,
      operating_hours_close,
      grace_period_hours,
      ppn_percentage,
      max_capacity
    } = req.body;

    // Validate required fields
    if (!hourly_rate || !max_daily_rate || !operating_hours_open || !operating_hours_close) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Check if settings exist
    const checkQuery = `SELECT id FROM parking_settings WHERE is_active = true LIMIT 1`;
    const checkResult = await pool.query(checkQuery);

    let query;
    let values;

    if (checkResult.rows.length > 0) {
      // Update existing settings
      query = `
        UPDATE parking_settings 
        SET hourly_rate = $1, max_daily_rate = $2, operating_hours_open = $3, 
            operating_hours_close = $4, grace_period_hours = $5, ppn_percentage = $6,
            max_capacity = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND is_active = true
        RETURNING *
      `;
      values = [
        hourly_rate,
        max_daily_rate,
        operating_hours_open,
        operating_hours_close,
        grace_period_hours || 1,
        ppn_percentage || 11,
        max_capacity || 150,
        checkResult.rows[0].id
      ];
    } else {
      // Insert new settings
      query = `
        INSERT INTO parking_settings 
        (hourly_rate, max_daily_rate, operating_hours_open, operating_hours_close, 
         grace_period_hours, ppn_percentage, max_capacity, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      values = [
        hourly_rate,
        max_daily_rate,
        operating_hours_open,
        operating_hours_close,
        grace_period_hours || 1,
        ppn_percentage || 11,
        max_capacity || 150
      ];
    }

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Pengaturan parkir berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in updateParkingSettings:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengaturan parkir' });
  }
};

// CAFE PROFILE CONTROLLERS

// Get cafe profile
exports.getCafeProfile = async (req, res, next) => {
  try {
    const query = `
      SELECT * FROM cafe_profile 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Return default profile if none exist
      return res.json({
        success: true,
        data: {
          name: 'Café Parkiru',
          address: '',
          city: '',
          phone: '',
          email: '',
          operating_hours_open: '07:00',
          operating_hours_close: '22:00',
          description: '',
          logo_url: ''
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in getCafeProfile:', err);
    res.status(500).json({ error: 'Gagal mengambil profil café' });
  }
};

// Update cafe profile
exports.updateCafeProfile = async (req, res, next) => {
  try {
    const {
      name,
      address,
      city,
      phone,
      email,
      operating_hours_open,
      operating_hours_close,
      description,
      logo_url
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nama café wajib diisi' });
    }

    // Check if profile exists
    const checkQuery = `SELECT id FROM cafe_profile LIMIT 1`;
    const checkResult = await pool.query(checkQuery);

    let query;
    let values;

    if (checkResult.rows.length > 0) {
      // Update existing profile
      query = `
        UPDATE cafe_profile 
        SET name = $1, address = $2, city = $3, phone = $4, email = $5,
            operating_hours_open = $6, operating_hours_close = $7, 
            description = $8, logo_url = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `;
      values = [
        name,
        address || '',
        city || '',
        phone || '',
        email || '',
        operating_hours_open || '07:00',
        operating_hours_close || '22:00',
        description || '',
        logo_url || '',
        checkResult.rows[0].id
      ];
    } else {
      // Insert new profile
      query = `
        INSERT INTO cafe_profile 
        (name, address, city, phone, email, operating_hours_open, operating_hours_close, 
         description, logo_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      values = [
        name,
        address || '',
        city || '',
        phone || '',
        email || '',
        operating_hours_open || '07:00',
        operating_hours_close || '22:00',
        description || '',
        logo_url || ''
      ];
    }

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Profil café berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error in updateCafeProfile:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil café' });
  }
};
