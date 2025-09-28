module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkAdminOrStaff } = require('./auth');

  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      let query = `
        SELECT 
          smh.id as history_id, 
          smh.student_id, 
          smh.name, 
          s.father_name,
          sch.title as shift_title, 
          smh.total_fee, 
          smh.amount_paid, 
          smh.due_amount,
          smh.cash,
          smh.online,
          smh.security_money,
          smh.remark,
          smh.changed_at as created_at,
          smh.branch_id,
          b.name as branch_name
        FROM student_membership_history smh
        LEFT JOIN students s ON smh.student_id = s.id
        LEFT JOIN schedules sch ON smh.shift_id = sch.id
        LEFT JOIN branches b ON smh.branch_id = b.id
      `;
      const params = [];
      let paramIndex = 1;

      if (req.query.month) {
        const monthParam = req.query.month;
        if (!/^\d{4}-\d{2}$/.test(monthParam)) {
          return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
        }
        const [year, month] = monthParam.split('-');
        query += ` WHERE EXTRACT(YEAR FROM smh.changed_at) = $${paramIndex} AND EXTRACT(MONTH FROM smh.changed_at) = $${paramIndex + 1}`;
        params.push(year, month);
        paramIndex += 2;
      }

      if (req.query.branchId) {
        const branchId = parseInt(req.query.branchId, 10);
        if (isNaN(branchId)) {
          return res.status(400).json({ message: 'Invalid branch ID' });
        }
        query += (paramIndex > 1 ? ' AND' : ' WHERE') + ` smh.branch_id = $${paramIndex}`;
        params.push(branchId);
        paramIndex++;
      }

      query += ` ORDER BY smh.name`;
      const result = await pool.query(query, params);
      const collections = result.rows.map(row => ({
        historyId: row.history_id,
        studentId: row.student_id,
        name: row.name,
        father_name: row.father_name,
        shiftTitle: row.shift_title,
        totalFee: row.total_fee !== null && row.total_fee !== undefined ? parseFloat(row.total_fee) : 0,
        amountPaid: row.amount_paid !== null && row.amount_paid !== undefined ? parseFloat(row.amount_paid) : 0,
        dueAmount: row.due_amount !== null && row.due_amount !== undefined ? parseFloat(row.due_amount) : 0,
        cash: row.cash !== null && row.cash !== undefined ? parseFloat(row.cash) : 0,
        online: row.online !== null && row.online !== undefined ? parseFloat(row.online) : 0,
        securityMoney: row.security_money !== null && row.security_money !== undefined ? parseFloat(row.security_money) : 0,
        remark: row.remark || '',
        createdAt: row.created_at,
        branchId: row.branch_id,
        branchName: row.branch_name
      }));
      res.json({ collections });
    } catch (err) {
      console.error('Error fetching collections:', err);
      res.status(500).json({ message: 'Server error fetching collections', error: err.message });
    }
  });

  // GET previous-month due paid summary/details for a given month
  router.get('/previous-due-paid', checkAdminOrStaff, async (req, res) => {
    try {
      const { month, branchId } = req.query;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
      }
      const params = [month];
      let query = `
        SELECT smh.id as history_id, smh.student_id, smh.name, smh.amount_paid, smh.cash, smh.online,
               smh.changed_at, smh.branch_id, b.name as branch_name, smh.source_month
        FROM student_membership_history smh
        LEFT JOIN branches b ON smh.branch_id = b.id
        WHERE TO_CHAR(smh.changed_at, 'YYYY-MM') = $1 AND smh.prev_due_paid = true
      `;
      if (branchId) {
        query += ' AND smh.branch_id = $2';
        params.push(parseInt(branchId, 10));
      }
      query += ' ORDER BY smh.changed_at DESC';

      const { rows } = await pool.query(query, params);
      const total = rows.reduce((acc, r) => acc + (parseFloat(r.amount_paid) || 0), 0);
      res.json({
        month,
        totalPreviousDuePaid: total,
        records: rows.map(r => ({
          historyId: r.history_id,
          studentId: r.student_id,
          name: r.name,
          amount: parseFloat(r.amount_paid) || 0,
          cash: parseFloat(r.cash) || 0,
          online: parseFloat(r.online) || 0,
          createdAt: r.changed_at,
          branchId: r.branch_id,
          branchName: r.branch_name,
          sourceMonth: r.source_month
        }))
      });
    } catch (err) {
      console.error('Error fetching previous-due-paid summary:', err);
      res.status(500).json({ message: 'Server error fetching previous-due-paid summary', error: err.message });
    }
  });

  router.put('/:historyId', checkAdmin, async (req, res) => {
    const client = await pool.connect(); // Use a transaction to ensure consistency
    try {
      await client.query('BEGIN'); // Start transaction

      const { historyId } = req.params;
      const { payment_amount, payment_method } = req.body;

      // Validate payment_amount
      if (typeof payment_amount !== 'number' || payment_amount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid payment_amount' });
      }

      // Validate payment_method
      if (!['cash', 'online'].includes(payment_method)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid payment_method' });
      }

      // Fetch the existing history record
      const historyRes = await client.query('SELECT * FROM student_membership_history WHERE id = $1', [historyId]);
      if (historyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'History record not found' });
      }
      const history = historyRes.rows[0];

      // Parse current values as floats, defaulting to 0 if null/undefined
      const current_cash = parseFloat(history.cash) || 0;
      const current_online = parseFloat(history.online) || 0;
      const current_total_fee = parseFloat(history.total_fee) || 0;
      const current_due_amount = parseFloat(history.due_amount) || 0;

      // Determine if the payment is for a previous-month record relative to current date
      const historyMonth = new Date(history.changed_at);
      const now = new Date();
      const isSameMonth = historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();

      // Fetch the student_id from the history record
      const studentId = history.student_id;

      // Verify the student exists in the students table
      const studentRes = await client.query('SELECT * FROM students WHERE id = $1', [studentId]);
      if (studentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Student not found for this history record' });
      }

      let updatedHistory;

      if (!isSameMonth) {
        // Previous-month due payment: decrease due on the old record only; do not add to its cash/online/amount_paid
        const prev_new_due_amount = current_due_amount - payment_amount;
        if (prev_new_due_amount < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Payment exceeds due amount' });
        }

        // Update only due_amount on the previous month history row
        await client.query(
          `UPDATE student_membership_history 
           SET due_amount = $1 
           WHERE id = $2`,
          [prev_new_due_amount, historyId]
        );

        // Update the students table to reflect overall payment collected now (current month)
        const student = studentRes.rows[0];
        const stu_cash = parseFloat(student.cash) || 0;
        const stu_online = parseFloat(student.online) || 0;
        const stu_amount_paid = parseFloat(student.amount_paid) || 0;
        const stu_due_amount = parseFloat(student.due_amount) || 0;

        const inc_cash = payment_method === 'cash' ? payment_amount : 0;
        const inc_online = payment_method === 'online' ? payment_amount : 0;
        const new_stu_cash = stu_cash + inc_cash;
        const new_stu_online = stu_online + inc_online;
        const new_stu_amount_paid = stu_amount_paid + payment_amount;
        const new_stu_due_amount = Math.max(stu_due_amount - payment_amount, 0);

        await client.query(
          `UPDATE students 
           SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
           WHERE id = $5`,
          [new_stu_cash, new_stu_online, new_stu_amount_paid, new_stu_due_amount, studentId]
        );

        // Insert a new current-month history row flagged as previous-month due paid
        const sourceMonth = history.changed_at ? new Date(history.changed_at).toISOString().slice(0,7) : null;
        const insertRes = await client.query(
          `INSERT INTO student_membership_history (
            student_id, name, email, phone, address,
            membership_start, membership_end, status,
            total_fee, amount_paid, due_amount,
            cash, online, security_money, remark,
            seat_id, shift_id, branch_id,
            registration_number, father_name, aadhar_number,
            profile_image_url, aadhaar_front_url, aadhaar_back_url,
            locker_id, changed_at, prev_due_paid, source_month
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,
            $9,$10,$11,
            $12,$13,$14,$15,
            $16,$17,$18,
            $19,$20,$21,
            $22,$23,$24,
            $25, NOW(), true, $26
          ) RETURNING *`,
          [
            history.student_id, history.name, history.email, history.phone, history.address,
            history.membership_start, history.membership_end, history.status,
            0, payment_amount, 0,
            inc_cash, inc_online, 0, 'Previous month due paid',
            history.seat_id, history.shift_id, history.branch_id,
            history.registration_number, history.father_name, history.aadhar_number,
            history.profile_image_url, history.aadhaar_front_url, history.aadhaar_back_url,
            history.locker_id, sourceMonth
          ]
        );
        updatedHistory = insertRes.rows[0];
      } else {
        // Same-month payment: behave as before, adding to this history row
        let new_cash = current_cash;
        let new_online = current_online;
        if (payment_method === 'cash') {
          new_cash += payment_amount;
        } else if (payment_method === 'online') {
          new_online += payment_amount;
        }

        const new_amount_paid = new_cash + new_online;
        const new_due_amount = current_total_fee - new_amount_paid;
        if (new_due_amount < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Payment exceeds due amount' });
        }

        await client.query(
          `UPDATE student_membership_history 
           SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
           WHERE id = $5`,
          [new_cash, new_online, new_amount_paid, new_due_amount, historyId]
        );

        // Update student snapshot as well
        await client.query(
          `UPDATE students 
           SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
           WHERE id = $5`,
          [new_cash, new_online, new_amount_paid, new_due_amount, studentId]
        );

        const updatedRes = await client.query(`
        SELECT 
          smh.id as history_id, 
          smh.student_id, 
          smh.name, 
          sch.title as shift_title, 
          smh.total_fee, 
          smh.amount_paid, 
          smh.due_amount,
          smh.cash,
          smh.online,
          smh.security_money,
          smh.remark,
          smh.changed_at as created_at,
          smh.branch_id,
          b.name as branch_name
        FROM student_membership_history smh
        LEFT JOIN schedules sch ON smh.shift_id = sch.id
        LEFT JOIN branches b ON smh.branch_id = b.id
        WHERE smh.id = $1
      `, [historyId]);
        updatedHistory = updatedRes.rows[0];
      }

      await client.query('COMMIT'); // Commit transaction

      // Return the updated collection data
      res.json({
        message: 'Payment updated successfully',
        collection: {
          historyId: updatedHistory.history_id || updatedHistory.id || historyId,
          studentId: updatedHistory.student_id,
          name: updatedHistory.name,
          shiftTitle: updatedHistory.shift_title || null,
          totalFee: parseFloat(updatedHistory.total_fee) || 0,
          amountPaid: parseFloat(updatedHistory.amount_paid) || 0,
          dueAmount: parseFloat(updatedHistory.due_amount) || 0,
          cash: parseFloat(updatedHistory.cash) || 0,
          online: parseFloat(updatedHistory.online) || 0,
          securityMoney: parseFloat(updatedHistory.security_money) || 0,
          remark: updatedHistory.remark || '',
          createdAt: updatedHistory.created_at || updatedHistory.changed_at,
          branchId: updatedHistory.branch_id,
          branchName: updatedHistory.branch_name || null
        }
      });
    } catch (err) {
      await client.query('ROLLBACK'); // Roll back transaction on error
      console.error('Error updating payment:', err);
      res.status(500).json({ message: 'Server error updating payment', error: err.message });
    } finally {
      client.release();
    }
  });

  // DELETE collection record from student_membership_history
  router.delete('/:historyId', checkAdminOrStaff, async (req, res) => {
    try {
      const historyId = parseInt(req.params.historyId, 10);
      
      if (isNaN(historyId)) {
        return res.status(400).json({ message: 'Invalid history ID' });
      }

      // Check if the record exists
      const checkQuery = 'SELECT id FROM student_membership_history WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [historyId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: 'Collection record not found' });
      }

      // Delete the record from student_membership_history only
      const deleteQuery = 'DELETE FROM student_membership_history WHERE id = $1';
      await pool.query(deleteQuery, [historyId]);

      res.json({ message: 'Collection record deleted successfully' });
    } catch (err) {
      console.error('Error deleting collection record:', err);
      res.status(500).json({ message: 'Server error deleting collection record', error: err.message });
    }
  });

  return router;
};