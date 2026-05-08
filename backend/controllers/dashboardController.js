const pool = require('../config/db');

// Helper function for duration formatting
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  } else {
    return `${minutes} menit`;
  }
}

// 1. GET STATS - Dashboard statistics
exports.getStatistics = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date();
    if (!start_date) startDate.setHours(0, 0, 0, 0);
    if (!end_date) endDate.setHours(23, 59, 59, 999);

    // Total motor masuk dalam range
    const motorMasukQuery = `
      SELECT COALESCE(COUNT(*), 0) as total FROM parking_sessions
      WHERE (entry_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE BETWEEN $1 AND $2
    `;

    // Total motor masih aktif (total aktif saat ini, tidak difilter tanggal)
    const motorAktifQuery = `
      SELECT COALESCE(COUNT(*), 0) as total FROM parking_sessions
      WHERE status = 'active'
    `;

    // Pendapatan dalam range
    const pendapatanQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE BETWEEN $1 AND $2 AND payment_time IS NOT NULL
    `;

    // Transaksi dalam range
    const transaksiQuery = `
      SELECT COALESCE(COUNT(*), 0) as total FROM transactions
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE BETWEEN $1 AND $2
    `;

    const [motorMasuk, motorAktif, pendapatan, transaksi] = await Promise.all([
      pool.query(motorMasukQuery, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]),
      pool.query(motorAktifQuery),
      pool.query(pendapatanQuery, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]),
      pool.query(transaksiQuery, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])
    ]);

    res.json({
      success: true,
      data: {
        motor_masuk_hari_ini: parseInt(motorMasuk.rows[0].total),
        motor_aktif: parseInt(motorAktif.rows[0].total),
        pendapatan_hari_ini: parseFloat(pendapatan.rows[0].total),
        transaksi_hari_ini: parseInt(transaksi.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error in getStatistics:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
};

// 2. GET DASHBOARD DATA - Complete dashboard data
exports.getDashboardData = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date();
    if (!start_date) startDate.setHours(0, 0, 0, 0);
    if (!end_date) endDate.setHours(23, 59, 59, 999);

    // Peak Hours Data (07:00 - 21:00) within date range
    const peakHoursQuery = `
      WITH hours AS (
        SELECT generate_series(7, 22) AS hour
      ),
      counts AS (
        SELECT
          EXTRACT(HOUR FROM timezone('Asia/Jakarta', entry_time))::INTEGER AS hour,
          COUNT(*)::INTEGER AS count
        FROM parking_sessions
        WHERE timezone('Asia/Jakarta', entry_time)::DATE BETWEEN $1 AND $2
        GROUP BY EXTRACT(HOUR FROM timezone('Asia/Jakarta', entry_time))
      )
      SELECT
        h.hour,
        COALESCE(c.count, 0) AS count
      FROM hours h
      LEFT JOIN counts c ON h.hour = c.hour
      ORDER BY h.hour
    `;

    // Weekly Trend Data (7 hari terakhir, or based on range if provided)
    const weeklyTrendQuery = `
      WITH days AS (
        SELECT generate_series(
          $1::date,
          $2::date,
          INTERVAL '1 day'
        )::date as day
      ),
      masuk AS (
        SELECT (entry_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE as day, COUNT(*) as masuk
        FROM parking_sessions
        WHERE (entry_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE BETWEEN $1 AND $2
        GROUP BY (entry_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE
      ),
      keluar AS (
        SELECT (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE as day, COUNT(*) as keluar
        FROM transactions
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE BETWEEN $1 AND $2
        GROUP BY (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE
      )
      SELECT
        TO_CHAR(d.day, 'Dy') as day,
        COALESCE(m.masuk, 0) as masuk,
        COALESCE(k.keluar, 0) as keluar
      FROM days d
      LEFT JOIN masuk m ON d.day = m.day
      LEFT JOIN keluar k ON d.day = k.day
      ORDER BY d.day
    `;

    // Recent Entries (5 terbaru dari HARI INI, melintasi status aktif maupun selesai)
    const recentEntriesQuery = `
      SELECT
        plate_number,
        entry_time,
        CASE 
          WHEN exit_time IS NULL THEN EXTRACT(EPOCH FROM (NOW() - entry_time))::INTEGER 
          ELSE EXTRACT(EPOCH FROM (exit_time - entry_time))::INTEGER 
        END as duration_seconds,
        CASE WHEN exit_time IS NULL THEN 'Parkir' ELSE 'Selesai' END as status
      FROM parking_sessions
      WHERE timezone('Asia/Jakarta', entry_time)::DATE = timezone('Asia/Jakarta', NOW())::DATE
      ORDER BY entry_time DESC
      LIMIT 10
    `;

    // Statistics within date range + Comparison with yesterday
    const statsQuery = `
      WITH today_stats AS (
        SELECT
          COUNT(*)::INTEGER as motor_masuk_hari_ini,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::INTEGER as motor_aktif_today,
          COALESCE((SELECT SUM(total_amount) FROM transactions WHERE timezone('Asia/Jakarta', created_at)::DATE = $1), 0)::FLOAT as pendapatan_today
        FROM parking_sessions
        WHERE timezone('Asia/Jakarta', entry_time)::DATE = $1
      ),
      yesterday_stats AS (
        SELECT
          COUNT(*)::INTEGER as motor_masuk_kemarin,
          COALESCE((SELECT SUM(total_amount) FROM transactions WHERE timezone('Asia/Jakarta', created_at)::DATE = ($1::DATE - INTERVAL '1 day')::DATE), 0)::FLOAT as pendapatan_kemarin
        FROM parking_sessions
        WHERE timezone('Asia/Jakarta', entry_time)::DATE = ($1::DATE - INTERVAL '1 day')::DATE
      )
      SELECT 
        ts.motor_masuk_hari_ini,
        (SELECT COUNT(*)::INTEGER FROM parking_sessions WHERE status = 'active') as motor_aktif,
        ts.pendapatan_today as pendapatan_hari_ini,
        ys.motor_masuk_kemarin,
        ys.pendapatan_kemarin
      FROM today_stats ts, yesterday_stats ys
    `;

    const [peakHours, weeklyTrend, recentEntries, stats] = await Promise.all([
      pool.query(peakHoursQuery, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]),
      pool.query(weeklyTrendQuery, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]),
      pool.query(recentEntriesQuery), 
      pool.query(statsQuery, [startDate.toISOString().split('T')[0]])
    ]);

    // Format peak hours data (07:00 - 21:00)
    const peakHoursData = (peakHours.rows || []).map((row) => ({
      time: `${parseInt(row.hour, 10).toString().padStart(2, '0')}:00`,
      count: parseInt(row.count, 10)
    }));

    res.json({
      success: true,
      data: {
        peakHours: peakHoursData,
        weeklyTrend: weeklyTrend.rows,
        recentEntries: recentEntries.rows,
        stats: stats.rows[0]
      }
    });
  } catch (err) {
    console.error('Error in getDashboardData:', err);
    res.status(500).json({ error: 'Gagal mengambil data dashboard' });
  }
};

// 3. GET DAILY SUMMARY - For sidebar widget
exports.getDailySummary = async (req, res, next) => {
  try {
    // Total motor masuk hari ini (Jakarta Time)
    const motorMasukQuery = `
      SELECT COALESCE(COUNT(*), 0) as total FROM parking_sessions
      WHERE timezone('Asia/Jakarta', entry_time)::DATE = timezone('Asia/Jakarta', NOW())::DATE
    `;

    // Total motor masih aktif
    const motorAktifQuery = `
      SELECT COALESCE(COUNT(*), 0) as total FROM parking_sessions
      WHERE status = 'active'
    `;

    // Calculate percentage: (active / total capacity) * 100
    // Assuming capacity is 200 (you can adjust this based on your actual capacity)
    const totalCapacity = 200;

    const [motorMasuk, motorAktif] = await Promise.all([
      pool.query(motorMasukQuery),
      pool.query(motorAktifQuery)
    ]);

    const masukCount = parseInt(motorMasuk.rows[0].total);
    const aktifCount = parseInt(motorAktif.rows[0].total);
    const aktifPercentage = Math.round((aktifCount / totalCapacity) * 100);

    res.json({
      success: true,
      data: {
        masuk: masukCount,
        aktif: `${aktifPercentage}%`
      }
    });
  } catch (err) {
    console.error('Error in getDailySummary:', err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan harian' });
  }
};