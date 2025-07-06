module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkAdminOrStaff } = require('./auth');

  // GET all lockers
  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT l.id, l.locker_number, l.is_assigned, l.student_id, s.name as student_name
        FROM locker l
        LEFT JOIN students s ON l.student_id = s.id
        ORDER BY l.locker_number
     `);
      res.json({ lockers: result.rows });
    } catch (err) {
      console.error('Error fetching lockers:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // POST create a new locker
  router.post('/', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { locker_number } = req.body;

      if (!locker_number) {
        return res.status(400).json({ message: 'Locker number is required' });
      }

      const checkLocker = await client.query('SELECT 1 FROM locker WHERE locker_number = $1', [locker_number]);
      if (checkLocker.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Locker with number ${locker_number} already exists` });
      }

      const result = await client.query(
        'INSERT INTO locker (locker_number, is_assigned) VALUES ($1, false) RETURNING *',
        [locker_number]
      );

      await client.query('COMMIT');
      res.status(201).json({ locker: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating locker:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  // PUT update a locker
  router.put('/:id', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = parseInt(req.params.id, 10);
      const { locker_number } = req.body;

      if (!locker_number) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Locker number is required' });
      }

      const checkLocker = await client.query('SELECT 1 FROM locker WHERE locker_number = $1 AND id != $2', [locker_number, id]);
      if (checkLocker.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Locker with number ${locker_number} already exists` });
      }

      const result = await client.query(
        'UPDATE locker SET locker_number = $1 WHERE id = $2 RETURNING *',
        [locker_number, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Locker not found' });
      }

      await client.query('COMMIT');
      res.json({ locker: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating locker:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  // DELETE a locker
  router.delete('/:id', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = parseInt(req.params.id, 10);

      const lockerCheck = await client.query('SELECT is_assigned, student_id FROM locker WHERE id = $1', [id]);
      if (lockerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Locker not found' });
      }

      if (lockerCheck.rows[0].is_assigned) {
        const studentId = lockerCheck.rows[0].student_id;
        await client.query('UPDATE students SET locker_id = NULL WHERE id = $1', [studentId]);
      }

      const result = await client.query('DELETE FROM locker WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Locker not found' });
      }

      await client.query('COMMIT');
      res.json({ message: 'Locker deleted', locker: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting locker:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  return router;
};