const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (id, role, name, email) => {
  return jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { name, email, password, role, department, photo, dob, phone, blood_group, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please add all fields' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userExists = await db.query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (name, email, password, role, department, photo, dob, phone, blood_group, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, normalizedEmail, hashedPassword, role || 'student', department, photo, dob, phone, blood_group, address]
    );

    const userId = result.lastID;
    const newUser = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = newUser.rows[0];

    // Automatically Generate ID Card
    const { v4: uuidv4 } = require('uuid');
    const id_uuid = uuidv4();
    const id_number = Math.floor(100000 + Math.random() * 900000).toString();
    const issue_date = new Date().toISOString();
    const expiry_date = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    await db.run(
      'INSERT INTO idcards (id_uuid, user_id, id_number, issue_date, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id_uuid, userId, id_number, issue_date, expiry_date, 'active']
    );

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      photo: user.photo,
      dob: user.dob,
      phone: user.phone,
      blood_group: user.blood_group,
      address: user.address,
      token: generateToken(user.id, user.role, user.name, user.email),
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userResult = await db.query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    const user = userResult.rows[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        photo: user.photo,
        dob: user.dob,
        phone: user.phone,
        blood_group: user.blood_group,
        address: user.address,
        token: generateToken(user.id, user.role, user.name, user.email),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.status(200).json(userResult.rows[0]);
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  const { name, department, photo, dob, phone, blood_group, address } = req.body;
  const userId = req.user.id;

  console.log(`Updating user ${userId} with:`, { name, department, phone });

  try {
    const result = await db.run(
      'UPDATE users SET name = ?, department = ?, photo = ?, dob = ?, phone = ?, blood_group = ?, address = ? WHERE id = ?',
      [name, department, photo, dob, phone, blood_group, address, userId]
    );

    if (result.changes === 0) {
        console.warn('No rows updated in database');
        return res.status(404).json({ message: 'User not found or no changes made' });
    }

    console.log('Database update successful');
    const updatedUserResult = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(200).json(updatedUserResult.rows[0]);
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = { registerUser, loginUser, getMe, updateUser };
