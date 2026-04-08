const { pool } = require('../config/db');
const { setCache, getCache, delCachePattern } = require('../config/redis');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// ─── Create OA Session (TPO Admin) ────────────────────────────────────────────
const createOASession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { title, description, oa_date, start_time, end_time, branches, sections } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO oa_sessions (title, description, oa_date, start_time, end_time, branches, sections, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, oa_date, start_time, end_time, JSON.stringify(branches), JSON.stringify(sections), req.user.id]
    );

    await delCachePattern('oa_sessions:*');

    logger.info('OA session created', { sessionId: result.insertId, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'OA session created', data: { id: result.insertId } });
  } catch (err) {
    logger.error('Create OA error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to create OA session' });
  }
};

// ─── Get all OA Sessions with filters ─────────────────────────────────────────
const getOASessions = async (req, res) => {
  const { start_date, end_date, status, date } = req.query;
  const cacheKey = `oa_sessions:${JSON.stringify(req.query)}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    let query = `
      SELECT os.*, u.full_name as created_by_name,
        (SELECT COUNT(*) FROM attendance a WHERE a.oa_session_id = os.id) as attendance_count
      FROM oa_sessions os
      JOIN users u ON os.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND os.oa_date = ?';
      params.push(date);
    }
    if (start_date) { query += ' AND os.oa_date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND os.oa_date <= ?'; params.push(end_date); }
    if (status) { query += ' AND os.status = ?'; params.push(status); }

    query += ' ORDER BY os.oa_date DESC, os.start_time DESC';

    const [sessions] = await pool.execute(query, params);

    // Parse JSON fields
    const parsed = sessions.map(s => ({
      ...s,
      branches: typeof s.branches === 'string' ? JSON.parse(s.branches) : s.branches,
      sections: typeof s.sections === 'string' ? JSON.parse(s.sections) : s.sections,
    }));

    await setCache(cacheKey, parsed, 300); // cache 5 min
    res.json({ success: true, data: parsed });
  } catch (err) {
    logger.error('Get OA sessions error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch OA sessions' });
  }
};

// ─── Get single OA session ────────────────────────────────────────────────────
const getOASession = async (req, res) => {
  const { id } = req.params;
  try {
    const [sessions] = await pool.execute(
      `SELECT os.*, u.full_name as created_by_name FROM oa_sessions os
       JOIN users u ON os.created_by = u.id WHERE os.id = ?`,
      [id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'OA session not found' });

    const session = {
      ...sessions[0],
      branches: typeof sessions[0].branches === 'string' ? JSON.parse(sessions[0].branches) : sessions[0].branches,
      sections: typeof sessions[0].sections === 'string' ? JSON.parse(sessions[0].sections) : sessions[0].sections,
    };

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch session' });
  }
};

// ─── Update OA status (Admin) ─────────────────────────────────────────────────
const updateOAStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['upcoming', 'active', 'extended', 'closed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    await pool.execute('UPDATE oa_sessions SET status = ? WHERE id = ?', [status, id]);
    await delCachePattern('oa_sessions:*');
    res.json({ success: true, message: 'OA status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// ─── Extend OA attendance window (TPO Volunteer) ──────────────────────────────
const extendOASession = async (req, res) => {
  const { id } = req.params;
  const { duration } = req.body; // 30 or 60 minutes
  const maxHours = parseFloat(process.env.OA_MAX_EXTENSION_HOURS) || 10.5;

  // Validate duration
  const minutes = parseInt(duration) || 30;
  if (![30, 60].includes(minutes)) {
    return res.status(400).json({ success: false, message: 'Duration must be 30 or 60 minutes' });
  }

  try {
    const [sessions] = await pool.execute(
      'SELECT oa_date, start_time, end_time, status, extended_until FROM oa_sessions WHERE id = ?',
      [id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'OA not found' });

    const session = sessions[0];
    const oaStart = new Date(`${session.oa_date}T${session.start_time}`);
    const maxEnd = new Date(oaStart.getTime() + maxHours * 60 * 60 * 1000);

    // Calculate new extended_until from the current end time or existing extension
    const currentEnd = session.extended_until
      ? new Date(session.extended_until)
      : new Date(`${session.oa_date}T${session.end_time}`);
    const newEnd = new Date(currentEnd.getTime() + minutes * 60 * 1000);

    if (newEnd > maxEnd) {
      return res.status(400).json({
        success: false,
        message: `Cannot extend beyond ${maxHours} hours of OA start time`,
      });
    }

    await pool.execute(
      'UPDATE oa_sessions SET status = "extended", extended_until = ? WHERE id = ?',
      [newEnd, id]
    );

    await delCachePattern('oa_sessions:*');

    const timeStr = newEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    res.json({
      success: true,
      message: `OA extended by ${minutes} minutes (until ${timeStr})`,
      data: { extended_until: newEnd },
    });
  } catch (err) {
    logger.error('Extend OA error', { error: err.message });
    res.status(500).json({ success: false, message: 'Extension failed' });
  }
};



const getActiveOASessions = async (req, res) => {
  try {
    const now = new Date();

    const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const nowDatetime = now.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS

    const [sessions] = await pool.execute(
      `SELECT * FROM oa_sessions
       WHERE oa_date = ? AND status IN ('active', 'extended')
       AND (
         (status = 'active' AND start_time <= ? AND end_time >= ?)
         OR (status = 'extended' AND extended_until >= ?)
       )`,
      [today, currentTime, currentTime, nowDatetime]
    );

    
    console.log('Raw OA sessions from DB:', sessions);

    const parsed = sessions.map(s => ({
      ...s,
      branches: typeof s.branches === 'string' ? JSON.parse(s.branches) : s.branches,
      sections: typeof s.sections === 'string' ? JSON.parse(s.sections) : s.sections,
    }));

    console.log('Active OA sessions:', parsed);

    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active sessions' });
  }
};

module.exports = {
  createOASession,
  getOASessions,
  getOASession,
  updateOAStatus,
  extendOASession,
  getActiveOASessions,
};
