// routes/branches.js
module.exports = (pool) => {
  const express = require('express');
  const router = express.Router();
  // No longer need checkAdmin, as permission is checked in server.js
  // const { checkAdmin } = require('./auth'); 

  // The checkAdmin middleware has been removed from this route.
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM branches ORDER BY name');
      res.json({ branches: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // The checkAdmin middleware has been removed from this route.
  router.post('/', async (req, res) => {
    try {
      const { name, code } = req.body;
      if (!name) return res.status(400).json({ message: 'Branch name is required' });
      const result = await pool.query(
        'INSERT INTO branches (name, code) VALUES ($1, $2) RETURNING *',
        [name, code || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // The checkAdmin middleware has been removed from this route.
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code } = req.body;
      const result = await pool.query(
        'UPDATE branches SET name = $1, code = $2 WHERE id = $3 RETURNING *',
        [name, code || null, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // The checkAdmin middleware has been removed from this route.
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM branches WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
      res.json({ message: 'Branch deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};