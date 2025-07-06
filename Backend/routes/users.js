const { checkAdmin } = require('./auth');

module.exports = (pool) => {
  const router = require('express').Router();

  router.get('/profile', async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await pool.query(
        'SELECT id, username, full_name, email, role FROM users WHERE id = $1',
        [req.session.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/profile', async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { full_name, email, current_password, new_password } = req.body;

      if (email) {
        const emailCheck = await pool.query(
          'SELECT * FROM users WHERE email = $1 AND id != $2',
          [email, req.session.user.id]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another user' });
        }
      }

      if (current_password && new_password) {
        const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.session.user.id]);
        const isPasswordValid = (current_password === userResult.rows[0].password);

        if (!isPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const result = await pool.query(
          `UPDATE users SET 
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           password = $3
           WHERE id = $4 RETURNING id, username, full_name, email, role`,
          [full_name, email, new_password, req.session.user.id]
        );

        return res.json({
          message: 'Profile updated successfully',
          user: result.rows[0]
        });
      } else {
        const result = await pool.query(
          `UPDATE users SET 
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email)
           WHERE id = $3 RETURNING id, username, full_name, email, role`,
          [full_name, email, req.session.user.id]
        );

        return res.json({
          message: 'Profile updated successfully',
          user: result.rows[0]
        });
      }
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', checkAdmin, async (req, res) => {
    try {
      const { username, password, role, full_name, email, permissions } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required' });
      }
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be "admin" or "staff"' });
      }

      const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const result = await pool.query(
        `INSERT INTO users (username, password, role, full_name, email, permissions) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, username, role, permissions`,
        [username, password, role, full_name || '', email || '', permissions || []]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: result.rows[0]
      });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/', checkAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, username, role, permissions FROM users');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', checkAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userToDelete = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (userToDelete.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (userToDelete.rows[0].role === 'admin') {
        const adminCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = \'admin\'');
        if (parseInt(adminCount.rows[0].count) <= 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin' });
        }
      }
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ✅ Update user permissions
  router.put('/:id/permissions', checkAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions must be an array of strings.' });
      }

      const result = await pool.query(
        'UPDATE users SET permissions = $1 WHERE id = $2 RETURNING id, username, role, permissions',
        [permissions, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // ✅ If the user being edited is currently logged in, update session
      if (req.session.user.id === parseInt(id)) {
        req.session.user.permissions = permissions;
        console.log('[users.js] Updated permissions in session:', permissions);
      }

      res.json({
        message: 'User permissions updated successfully.',
        user: result.rows[0],
      });
    } catch (err) {
      console.error('Error updating user permissions:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};
