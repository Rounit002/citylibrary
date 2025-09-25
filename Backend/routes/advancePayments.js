module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdminOrStaff } = require('./auth');

  // GET all advance payments with optional filtering
  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const { month, branchId } = req.query;
      
      let query = `
        SELECT 
          ap.id,
          ap.student_id,
          ap.amount,
          TO_CHAR(ap.payment_date, 'YYYY-MM-DD') AS payment_date,
          ap.notes,
          TO_CHAR(ap.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
          s.name AS student_name,
          s.phone AS student_phone,
          s.registration_number AS student_registration_number,
          TO_CHAR(s.membership_end, 'YYYY-MM-DD') AS membership_end,
          b.name AS branch_name,
          s.branch_id
        FROM advance_payments_city ap
        JOIN students s ON ap.student_id = s.id
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramCount = 0;
      
      // Add month filter if provided
      if (month) {
        paramCount++;
        query += ` AND TO_CHAR(ap.payment_date, 'YYYY-MM') = $${paramCount}`;
        queryParams.push(month);
      }
      
      // Add branch filter if provided
      if (branchId) {
        paramCount++;
        query += ` AND s.branch_id = $${paramCount}`;
        queryParams.push(branchId);
      }
      
      query += ` ORDER BY ap.created_at DESC`;
      
      const result = await pool.query(query, queryParams);
      res.json({ payments: result.rows });
    } catch (err) {
      console.error('Error fetching advance payments:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // POST create new advance payment
  router.post('/', checkAdminOrStaff, async (req, res) => {
    try {
      const { student_id, amount, payment_date, notes } = req.body;

      // Validate required fields
      if (!student_id || !amount) {
        return res.status(400).json({ message: 'Student ID and amount are required' });
      }

      // Validate amount is positive
      if (amount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }

      // Check if student exists
      const studentCheck = await pool.query('SELECT id, name FROM students WHERE id = $1', [student_id]);
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Insert advance payment
      const insertQuery = `
        INSERT INTO advance_payments_city (student_id, amount, payment_date, notes, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
      `;
      
      // Use provided payment_date or default to current date
      const finalPaymentDate = payment_date || new Date().toISOString().split('T')[0];
      const result = await pool.query(insertQuery, [student_id, amount, finalPaymentDate, notes || null]);
      
      res.status(201).json({
        message: 'Advance payment added successfully',
        payment: {
          id: result.rows[0].id,
          student_id,
          amount,
          payment_date: result.rows[0].payment_date,
          notes,
          created_at: result.rows[0].created_at
        }
      });
    } catch (err) {
      console.error('Error creating advance payment:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET advance payments for a specific student
  router.get('/student/:studentId', checkAdminOrStaff, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      const query = `
        SELECT 
          ap.id,
          ap.amount,
          TO_CHAR(ap.payment_date, 'YYYY-MM-DD') AS payment_date,
          ap.notes,
          TO_CHAR(ap.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM advance_payments_city ap
        WHERE ap.student_id = $1
        ORDER BY ap.created_at DESC
      `;
      
      const result = await pool.query(query, [studentId]);
      res.json({ payments: result.rows });
    } catch (err) {
      console.error('Error fetching student advance payments:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // DELETE advance payment
  router.delete('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if advance payment exists
      const checkQuery = 'SELECT id FROM advance_payments_city WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: 'Advance payment not found' });
      }
      
      // Delete advance payment
      await pool.query('DELETE FROM advance_payments_city WHERE id = $1', [id]);
      
      res.json({ message: 'Advance payment deleted successfully' });
    } catch (err) {
      console.error('Error deleting advance payment:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // GET advance payment statistics
  router.get('/stats', checkAdminOrStaff, async (req, res) => {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          COUNT(DISTINCT student_id) as unique_students
        FROM advance_payments_city
        WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      
      const result = await pool.query(statsQuery);
      res.json({ stats: result.rows[0] });
    } catch (err) {
      console.error('Error fetching advance payment stats:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};
