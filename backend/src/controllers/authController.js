const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, invalidateToken } = require('../utils/jwt');
const { setCache, delCache } = require('../config/redis');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// ─── Student Registration ─────────────────────────────────────────────────────
const registerStudent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { login_id, password, full_name, scholar_no, branch, section } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check duplicate login_id
    const [existing] = await conn.execute('SELECT id FROM users WHERE login_id = ?', [login_id]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Login ID already registered' });
    }

    // Check duplicate scholar_no
    const [existingScholar] = await conn.execute('SELECT id FROM students WHERE scholar_no = ?', [scholar_no]);
    if (existingScholar.length) {
      return res.status(409).json({ success: false, message: 'Scholar number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [userResult] = await conn.execute(
      'INSERT INTO users (login_id, password, role, full_name) VALUES (?, ?, "student", ?)',
      [login_id, hashedPassword, full_name]
    );

    await conn.execute(
      'INSERT INTO students (user_id, scholar_no, branch, section) VALUES (?, ?, ?, ?)',
      [userResult.insertId, scholar_no, branch, section]
    );

    await conn.commit();
    logger.info('Student registered', { login_id, scholar_no });

    res.status(201).json({ success: true, message: 'Registration successful. Please login.' });
  } catch (err) {
    await conn.rollback();
    logger.error('Registration error', { error: err.message });
    res.status(500).json({ success: false, message: 'Registration failed' });
  } finally {
    conn.release();
  }
};

// ─── Login (all roles) ────────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { login_id, password } = req.body;

  try {
    const [users] = await pool.execute(
      'SELECT id, login_id, password, role, full_name, is_active FROM users WHERE login_id = ?',
      [login_id]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If student, get face_registered status
    let extraData = {};
    if (user.role === 'student') {
      const [studentData] = await pool.execute(
        'SELECT scholar_no, branch, section, face_registered FROM students WHERE user_id = ?',
        [user.id]
      );
      if (studentData.length) extraData = studentData[0];
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    logger.info('User logged in', { login_id, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          login_id: user.login_id,
          role: user.role,
          full_name: user.full_name,
          ...extraData,
        },
      },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    // Blacklist the current access token in Redis
    await invalidateToken(req.token);

    // Delete refresh token from DB
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.execute('DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?', [
        refreshToken,
        req.user.id,
      ]);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Check DB for valid refresh token
    const [tokens] = await pool.execute(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = ? AND user_id = ?',
      [refreshToken, decoded.userId]
    );

    if (!tokens.length || new Date(tokens[0].expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = generateAccessToken({ userId: users[0].id, role: users[0].role });
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// ─── Get current user profile ─────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    let profile = { ...req.user };

    if (req.user.role === 'student') {
      const [studentData] = await pool.execute(
        'SELECT scholar_no, branch, section, face_registered FROM students WHERE user_id = ?',
        [req.user.id]
      );
      if (studentData.length) Object.assign(profile, studentData[0]);
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

module.exports = { registerStudent, login, logout, refreshAccessToken, getProfile };
