import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, CreditCard, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Simple type definitions
type StudentForPayment = {
  id: number;
  name: string;
  phone: string;
  registrationNumber: string;
  membershipEnd: string;
  status: string;
};

// CORRECTED: Type definition updated to use camelCase to match API interceptor's transformation.
type AdvancePayment = {
  id: number;
  studentId: number;
  studentName: string;
  studentPhone: string;
  studentRegistrationNumber: string;
  amount: number;
  paymentDate: string;
  membershipEnd: string;
  branchName: string;
  branchId: number;
  notes?: string;
  createdAt: string;
};

const AdvancePayments: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [students, setStudents] = useState<StudentForPayment[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [submitting, setSubmitting] = useState(false);

  const loadAdvancePayments = async () => {
    try {
      const filters: any = {};
      if (selectedMonth) filters.month = selectedMonth;
      if (selectedBranch) filters.branchId = selectedBranch;
      
      const paymentsData = await api.getAdvancePayments(filters);
      setAdvancePayments(paymentsData.payments || []);
    } catch (error) {
      console.error('Error loading advance payments:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch branches
        const branchesData = await api.getBranches();
        setBranches(branchesData || []);
        
        // Fetch students
        const studentsData = await api.getStudents();
        const mappedStudents = (studentsData.students || []).map((student: any) => ({
          id: student.id,
          name: student.name,
          phone: student.phone,
          registrationNumber: student.registrationNumber || '',
          membershipEnd: student.membershipEnd,
          status: student.status
        }));
        setStudents(mappedStudents);
        
        // Fetch advance payments
        await loadAdvancePayments();
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading]);

  // Reload payments when filters change
  useEffect(() => {
    if (!loading && !authLoading) {
      loadAdvancePayments();
    }
  }, [selectedMonth, selectedBranch]);

  const resetForm = () => {
    setSelectedStudent(null);
    setAmount('');
    setNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount) {
      toast.error('Please select a student and enter amount');
      return;
    }

    setSubmitting(true);
    try {
      // The api.ts interceptor will correctly convert student_id to snake_case for the request
      await api.addAdvancePayment({
        student_id: selectedStudent,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        notes
      });

      toast.success('Advance payment added successfully');
      resetForm();
      
      // Reload data with current filters
      await loadAdvancePayments();
    } catch (error) {
      console.error('Error adding advance payment:', error);
      toast.error('Failed to add advance payment');
    } finally {
      setSubmitting(false);
    }
  };

  // CORRECTED: Filtering logic updated to use camelCase properties.
  const filteredPayments = advancePayments.filter(payment =>
    payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.studentPhone.includes(searchTerm) ||
    payment.studentRegistrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (membershipEnd: string) => {
    const endDate = new Date(membershipEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  // Early return for auth loading
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Page</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-lg border-b px-6 py-6 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-transparent bg-clip-text flex items-center gap-3">
                💳 Advance Payments
              </h1>
              <p className="text-gray-600 mt-2 text-lg">✨ Manage student advance payments and track membership expiry</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
            >
              <Plus size={20} />
              Add Advance Payment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Enhanced Filters */}
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                <Search className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-transparent bg-clip-text">
                🔍 Advanced Filters
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Filter by Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Filter by Branch
                </label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="">🏢 All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      📍 {branch.name}
                    </option>
                  ))}
              </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedMonth('');
                    setSelectedBranch(null);
                  }}
                  className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  🗑️ Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Search className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                🔍 Search Payments
              </h3>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="🔍 Search by student name, phone, or registration number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200 text-lg"
              />
            </div>
          </div>

          {/* Advance Payments List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Membership Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium">No advance payments found</p>
                          <p className="text-sm">Add your first advance payment to get started</p>
                        </td>
                      </tr>
                    ) : (
                      // CORRECTED: JSX rendering updated to use camelCase properties.
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <User className="h-5 w-5 text-purple-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{payment.studentName}</div>
                                <div className="text-sm text-gray-500">{payment.studentPhone}</div>
                                <div className="text-xs text-gray-400">Reg: {payment.studentRegistrationNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.branchName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              {formatDate(payment.paymentDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.membershipEnd)}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(payment.membershipEnd)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {payment.notes || '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Advance Payment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Advance Payment</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <select
                  value={selectedStudent || ''}
                  onChange={(e) => setSelectedStudent(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.phone} ({student.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePayments;