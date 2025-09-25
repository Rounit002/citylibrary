import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Collection {
  historyId: number;
  studentId: number;
  name: string;
  fatherName?: string | null;
  shiftTitle: string | null;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  remark: string;
  createdAt: string | null;
  branchId?: number;
  branchName?: string;
}

interface Branch {
  id: number;
  name: string;
}

const CollectionDue: React.FC = () => {
  const navigate = useNavigate();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- New and Updated State Variables ---
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string>(''); // New state for single date filter
  const [showOnlyDue, setShowOnlyDue] = useState<boolean>(false); // New state for due filter
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Modal State ---
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchesData = await api.getBranches();
        setBranches(branchesData);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        toast.error('Failed to load branches');
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        // We fetch collections based on month/branch and then filter by date client-side
        const params: { month?: string; branchId?: number } = {};
        if (selectedMonth) params.month = selectedMonth;
        if (selectedBranchId) params.branchId = selectedBranchId;
        
        const data = await api.getCollections(params);

        if (!data || !Array.isArray(data.collections)) {
          throw new Error('Invalid data structure received');
        }


        const mapped = data.collections.map((c: any) => ({
          historyId: c.historyId,
          studentId: c.studentId,
          name: c.name,
          fatherName: c.fatherName || null,
          shiftTitle: c.shiftTitle,
          totalFee: typeof c.totalFee === 'number' ? c.totalFee : 0,
          amountPaid: typeof c.amountPaid === 'number' ? c.amountPaid : 0,
          dueAmount: typeof c.dueAmount === 'number' ? c.dueAmount : 0,
          cash: typeof c.cash === 'number' ? c.cash : 0,
          online: typeof c.online === 'number' ? c.online : 0,
          securityMoney: typeof c.securityMoney === 'number' ? c.securityMoney : 0,
          remark: c.remark || '',
          createdAt: c.createdAt,
          branchId: c.branchId,
          branchName: c.branchName
        }));

        setCollections(mapped);
      } catch (err: any) {
        console.error('Failed to fetch collections:', err);
        toast.error(err.message || 'Failed to load collection data');
        setCollections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [selectedMonth, selectedBranchId]);

  // Combined filtering logic
  useEffect(() => {
    let processedCollections = collections;

    // Filter by search term
    if (searchTerm) {
      processedCollections = processedCollections.filter(col =>
        col.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected date
    if (selectedDate) {
      processedCollections = processedCollections.filter(col =>
        col.createdAt && col.createdAt.startsWith(selectedDate)
      );
    } else if (selectedMonth) {
      // Filter by selected month if no specific date is chosen
      processedCollections = processedCollections.filter(col =>
        col.createdAt && col.createdAt.startsWith(selectedMonth)
      );
    }

    // Filter by students with due amounts
    if (showOnlyDue) {
      processedCollections = processedCollections.filter(col => col.dueAmount > 0);
    }

    setFilteredCollections(processedCollections);
    setCurrentPage(1); // Reset to first page whenever filters change
  }, [collections, searchTerm, selectedMonth, selectedDate, showOnlyDue]);

  // --- Totals Calculation (based on all filtered items, not just the current page) ---
  const totalStudents = filteredCollections.length;
  const totalCollected = filteredCollections.reduce((sum, c) => sum + c.amountPaid, 0);
  const totalDue = filteredCollections.reduce((sum, c) => sum + c.dueAmount, 0);
  const totalCash = filteredCollections.reduce((sum, c) => sum + c.cash, 0);
  const totalOnline = filteredCollections.reduce((sum, c) => sum + c.online, 0);
  const totalSecurityMoney = filteredCollections.reduce((sum, c) => sum + c.securityMoney, 0);
  
  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCollections = filteredCollections.slice(indexOfFirstItem, indexOfLastItem);

  const handlePayDue = (collection: Collection) => {
    setSelectedCollection(collection);
    setPaymentAmount('');
    setPaymentMethod(null);
    setIsPayModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedCollection || !paymentMethod || !paymentAmount) {
      toast.error('Please select a payment method and enter a payment amount');
      return;
    }
    const payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment <= 0 || payment > selectedCollection.dueAmount) {
      toast.error('Invalid payment amount');
      return;
    }
    try {
      await api.updateCollectionPayment(selectedCollection.historyId, {
        amount: payment,
        method: paymentMethod,
      });
      toast.success('Payment updated successfully');
      setIsPayModalOpen(false);
      // Re-fetch data to show updated values
      const params: { month?: string; branchId?: number } = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedBranchId) params.branchId = selectedBranchId;
      const data = await api.getCollections(params);
      const mapped = data.collections.map((c: any) => ({
        historyId: c.historyId, studentId: c.studentId, name: c.name, fatherName: c.fatherName || null, shiftTitle: c.shiftTitle,
        totalFee: typeof c.totalFee === 'number' ? c.totalFee : 0,
        amountPaid: typeof c.amountPaid === 'number' ? c.amountPaid : 0,
        dueAmount: typeof c.dueAmount === 'number' ? c.dueAmount : 0,
        cash: typeof c.cash === 'number' ? c.cash : 0,
        online: typeof c.online === 'number' ? c.online : 0,
        securityMoney: typeof c.securityMoney === 'number' ? c.securityMoney : 0,
        remark: c.remark || '', createdAt: c.createdAt, branchId: c.branchId, branchName: c.branchName
      }));
      setCollections(mapped);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment');
    }
  };

  const handleDeleteCollection = async (historyId: number) => {
    if (!window.confirm('Are you sure you want to delete this collection record? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteCollection(historyId);
      toast.success('Collection record deleted successfully');
      
      // Re-fetch data to show updated list
      const params: { month?: string; branchId?: number } = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedBranchId) params.branchId = selectedBranchId;
      const data = await api.getCollections(params);
      const mapped = data.collections.map((c: any) => ({
        historyId: c.historyId, studentId: c.studentId, name: c.name, fatherName: c.fatherName || null, shiftTitle: c.shiftTitle,
        totalFee: typeof c.totalFee === 'number' ? c.totalFee : 0,
        amountPaid: typeof c.amountPaid === 'number' ? c.amountPaid : 0,
        dueAmount: typeof c.dueAmount === 'number' ? c.dueAmount : 0,
        cash: typeof c.cash === 'number' ? c.cash : 0,
        online: typeof c.online === 'number' ? c.online : 0,
        securityMoney: typeof c.securityMoney === 'number' ? c.securityMoney : 0,
        remark: c.remark || '', createdAt: c.createdAt, branchId: c.branchId, branchName: c.branchName
      }));
      setCollections(mapped);
    } catch (err: any) {
      console.error('Failed to delete collection:', err);
      toast.error(err.message || 'Failed to delete collection record');
    }
  };

  const handleRowClick = (studentId: number) => {
    navigate(`/students/${studentId}`);
  };

  // --- Event handlers for new filters ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    if (e.target.value) {
      setSelectedMonth(''); // Clear month filter when a specific date is chosen
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
    if (e.target.value) {
      setSelectedDate(''); // Clear date filter when a month is chosen
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <motion.div
            className="max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <motion.h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-transparent bg-clip-text mb-4 flex items-center gap-3"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                💰 Collection & Due Management
              </motion.h1>
              <p className="text-gray-600 text-lg">
                ✨ View and manage student payment details with advanced filtering
              </p>
            </div>

            <motion.div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:shadow-xl transition-all duration-300"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 text-transparent bg-clip-text">
                  🔍 Advanced Filters
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <input type="text" placeholder="🔍 Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="col-span-1 lg:col-span-2 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"/>
                <input type="month" value={selectedMonth} onChange={handleMonthChange}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"/>
                <input type="date" value={selectedDate} onChange={handleDateChange}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"/>
                <select value={selectedBranchId || ''} onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200">
                  <option value="">🏢 All Branches</option>
                  {branches.map((branch) => (<option key={branch.id} value={branch.id}>📍 {branch.name}</option>))}
                </select>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-100 hover:shadow-sm transition-all duration-200">
                  <input type="checkbox" checked={showOnlyDue} onChange={(e) => setShowOnlyDue(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                  <span className="text-sm font-medium text-red-700">⚠️ Show Due Only</span>
                </label>
              </div>
            </motion.div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-blue-100 text-sm font-medium mb-1">👥 Total Students</h3>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-green-100 text-sm font-medium mb-1">💰 Total Collected</h3>
                  <p className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-red-100 text-sm font-medium mb-1">⚠️ Total Due</h3>
                  <p className="text-2xl font-bold">₹{totalDue.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-emerald-100 text-sm font-medium mb-1">💵 Total Cash</h3>
                  <p className="text-2xl font-bold">₹{totalCash.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-purple-100 text-sm font-medium mb-1">💳 Total Online</h3>
                  <p className="text-2xl font-bold">₹{totalOnline.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <h3 className="text-cyan-100 text-sm font-medium mb-1">🔒 Total Security</h3>
                  <p className="text-2xl font-bold">₹{totalSecurityMoney.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 font-medium">
                💡 Click on any row to view student details
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father's Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remark</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCollections.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-4 text-center text-gray-500">No collections found for the selected filters.</td></tr>
                  ) : (
                    currentCollections.map((collection) => (
                      <motion.tr 
                        key={collection.historyId} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ duration: 0.3 }}
                        onClick={() => handleRowClick(collection.studentId)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.fatherName || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.shiftTitle || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.totalFee.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.cash.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.online.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.securityMoney.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600">₹{collection.amountPaid.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">₹{collection.dueAmount.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.remark || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {collection.dueAmount > 0 && (<button onClick={() => handlePayDue(collection)} className="text-purple-600 hover:text-purple-800 font-medium">Pay Due</button>)}
                            <button onClick={() => handleDeleteCollection(collection.historyId)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* --- Pagination Controls --- */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center gap-2 mb-4 md:mb-0">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1 border rounded-md text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}


            {isPayModalOpen && selectedCollection && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">Pay Due for {selectedCollection.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">Due Amount: ₹{selectedCollection.dueAmount.toFixed(2)}</p>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Select Payment Method:</p>
                    <div className="flex space-x-4">
                      <label className="flex items-center"><input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="mr-2"/>Cash</label>
                      <label className="flex items-center"><input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mr-2"/>Online</label>
                    </div>
                  </div>
                  <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount" className="w-full p-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    step="0.01" min="0" max={selectedCollection.dueAmount.toString()} />
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => setIsPayModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button onClick={handlePaymentSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Submit Payment</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CollectionDue;