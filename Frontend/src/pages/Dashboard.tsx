import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Users, UserCheck, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Home, Grid3X3, List, Eye, ArrowUpRight, UserPlus, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import StudentList from '../components/StudentList';
import AddStudentForm from '../components/AddStudentForm';
import ExpiringMemberships from '../components/ExpiringMemberships';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Define the StatCardProps interface to match usage in StatCard component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgColor: string;
  arrowIcon: React.ReactNode;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Safely handle useAuth to avoid errors if context is not provided
  let user = null;
  try {
    const authContext = useAuth();
    if (!authContext) {
      throw new Error('Auth context is not available');
    }
    user = authContext.user;
  } catch (error) {
    console.error('Auth context error:', error);
    toast.error('Authentication error. Please log in again.');
    navigate('/login');
    return null; // Prevent rendering if auth fails
  }

  const [updateTrigger, setUpdateTrigger] = useState(0); // Use a counter instead of boolean for more reliable updates
  const [studentStats, setStudentStats] = useState({ totalStudents: 0, activeStudents: 0, expiredMemberships: 0 });
  const [financialStats, setFinancialStats] = useState({ totalCollection: 0, totalDue: 0, totalExpense: 0, profitLoss: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'cards'>('detailed');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Re-introducing collection and due to the state
  const [hostelStats, setHostelStats] = useState<{
    totalStudents: number;
    branches: { id: number; name: string; studentCount: number }[];
    expiredCount: number;
    totalCollection: number;
    totalDue: number;
  }>({ totalStudents: 0, branches: [], expiredCount: 0, totalCollection: 0, totalDue: 0 });
  const [hostelLoading, setHostelLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const branchesData = await api.getBranches();
      if (!Array.isArray(branchesData)) {
        throw new Error('Invalid branches data');
      }
      setBranches(branchesData);
    } catch (error: any) {
      toast.error('Failed to load branches');
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const fetchStats = async () => {
    try {
      const [totalStudentsResp, activeStudentsResp, expiredMembershipsResp] = await Promise.all([
        api.getTotalStudentsCount(selectedBranchId ?? undefined).catch(() => 0),
        api.getActiveStudentsCount(selectedBranchId ?? undefined).catch(() => 0),
        api.getExpiredMembershipsCount(selectedBranchId ?? undefined).catch(() => 0),
      ]);

      setStudentStats({
        totalStudents: Number(totalStudentsResp) || 0,
        activeStudents: Number(activeStudentsResp) || 0,
        expiredMemberships: Number(expiredMembershipsResp) || 0,
      });

      const financialResponse = await api.getDashboardStats(
        selectedBranchId ? { branchId: selectedBranchId } : undefined
      ).catch(() => ({
        totalCollection: 0,
        totalDue: 0,
        totalExpense: 0,
        profitLoss: 0,
      }));

      setFinancialStats({
        totalCollection: Number(financialResponse.totalCollection) || 0,
        totalDue: Number(financialResponse.totalDue) || 0,
        totalExpense: Number(financialResponse.totalExpense) || 0,
        profitLoss: Number(financialResponse.profitLoss) || 0,
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error('Failed to load dashboard stats');
        console.error('Error fetching stats:', error);
        setStudentStats({ totalStudents: 0, activeStudents: 0, expiredMemberships: 0 });
        setFinancialStats({ totalCollection: 0, totalDue: 0, totalExpense: 0, profitLoss: 0 });
      }
    }
  };

  const fetchHostelStats = async () => {
    setHostelLoading(true);
    try {
      const [branches, allStudents, expiredData, collectionsData] = await Promise.all([
        api.getHostelBranches(),
        api.getHostelStudents(),
        api.getExpiredHostelStudents(),
        api.getHostelCollections(),
      ]);
      
      const studentCountByBranch = (allStudents ?? []).reduce((acc, student) => {
          const branchId = student.branchId;
          if (branchId) {
              acc[branchId] = (acc[branchId] || 0) + 1;
          }
          return acc;
      }, {});
      
      const branchesWithCount = (Array.isArray(branches) ? branches : []).map(branch => ({
          ...branch,
          studentCount: studentCountByBranch[branch.id] || 0,
      }));

      const expiredCount = expiredData?.expiredStudents?.length ?? 0;
      
      const collections = collectionsData?.collections ?? [];

      // FIX: Ensure values are treated as numbers before summing them up
      const totalCollection = collections.reduce((sum, c) => {
          const cash = parseFloat(String(c.cashPaid || 0));
          const online = parseFloat(String(c.onlinePaid || 0));
          return sum + cash + online;
      }, 0);

      const totalDue = collections.reduce((sum, c) => {
          const due = parseFloat(String(c.dueAmount || 0));
          return sum + due;
      }, 0);

      setHostelStats({
        totalStudents: Array.isArray(allStudents) ? allStudents.length : 0,
        branches: branchesWithCount,
        expiredCount,
        totalCollection,
        totalDue,
      });
    } catch (error: any) {
      toast.error('Failed to load hostel statistics');
      console.error('Error fetching hostel stats:', error);
    } finally {
      setHostelLoading(false);
    }
  };


  useEffect(() => {
    fetchBranches();
    fetchStats();
    fetchHostelStats();
  }, [updateTrigger, selectedBranchId]);

  const canManageStudents = user && (user.role === 'admin' || user.role === 'staff');

  const handleRefresh = () => {
    setUpdateTrigger(prev => prev + 1);
    setShowAddForm(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-transparent bg-clip-text">
                Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border">
                  <button
                    onClick={() => setViewMode('detailed')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      viewMode === 'detailed'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <List size={16} />
                    Detailed View
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      viewMode === 'cards'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Grid3X3 size={16} />
                    Card View
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                    Branch Filter
                  </h3>
                </div>
                <select
                  id="branch-select"
                  value={selectedBranchId ?? 'all'}
                  onChange={(e) => setSelectedBranchId(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="all">🏢 All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id.toString()}>
                      📍 {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {viewMode === 'detailed' ? (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Library Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Link to="/students" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Total Students"
                      value={studentStats.totalStudents}
                      icon={<Users className="h-6 w-6 text-purple-500" />}
                      iconBgColor="bg-purple-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-purple-400" />}
                    />
                  </Link>
                  <Link to="/active-students" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Active Students"
                      value={studentStats.activeStudents}
                      icon={<UserCheck className="h-6 w-6 text-blue-500" />}
                      iconBgColor="bg-blue-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-blue-400" />}
                    />
                  </Link>
                  <Link to="/expired-memberships" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Expired Memberships"
                      value={studentStats.expiredMemberships}
                      icon={<AlertTriangle className="h-6 w-6 text-orange-500" />}
                      iconBgColor="bg-orange-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-orange-400" />}
                    />
                  </Link>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
                {/* Student Statistics Cards */}
                <Link to="/students" className="group">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <Users className="h-8 w-8 mb-3 text-blue-100" />
                      <p className="text-blue-100 text-sm font-medium mb-1">Total Students</p>
                      <p className="text-2xl font-bold">{studentStats.totalStudents}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>

                <Link to="/active-students" className="group">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <UserCheck className="h-8 w-8 mb-3 text-emerald-100" />
                      <p className="text-emerald-100 text-sm font-medium mb-1">Active Students</p>
                      <p className="text-2xl font-bold">{studentStats.activeStudents}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>

                <Link to="/expired-memberships" className="group">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <AlertTriangle className="h-8 w-8 mb-3 text-orange-100" />
                      <p className="text-orange-100 text-sm font-medium mb-1">Expired Members</p>
                      <p className="text-2xl font-bold">{studentStats.expiredMemberships}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>

                <Link to="/collections" className="group">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <DollarSign className="h-8 w-8 mb-3 text-green-100" />
                      <p className="text-green-100 text-sm font-medium mb-1">Total Collection</p>
                      <p className="text-2xl font-bold">₹{financialStats.totalCollection.toLocaleString()}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>

                <Link to="/collections" className="group">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <AlertTriangle className="h-8 w-8 mb-3 text-red-100" />
                      <p className="text-red-100 text-sm font-medium mb-1">Total Due</p>
                      <p className="text-2xl font-bold">₹{financialStats.totalDue.toLocaleString()}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>

                <Link to="/expenses" className="group">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <TrendingDown className="h-8 w-8 mb-3 text-purple-100" />
                      <p className="text-purple-100 text-sm font-medium mb-1">Total Expense</p>
                      <p className="text-2xl font-bold">₹{financialStats.totalExpense.toLocaleString()}</p>
                      <ArrowUpRight className="h-4 w-4 mt-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              </div>
            )}
            
            {viewMode === 'detailed' && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Financial Overview (This Month)</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <Link to="/collections" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Total Collection"
                      value={financialStats.totalCollection}
                      icon={<DollarSign className="h-6 w-6 text-green-500" />}
                      iconBgColor="bg-green-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-green-400" />}
                    />
                  </Link>
                  <Link to="/collections" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Total Due"
                      value={financialStats.totalDue}
                      icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
                      iconBgColor="bg-red-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-red-400" />}
                    />
                  </Link>
                  <Link to="/expenses" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title="Total Expense"
                      value={financialStats.totalExpense}
                      icon={<TrendingDown className="h-6 w-6 text-yellow-500" />}
                      iconBgColor="bg-yellow-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-yellow-400" />}
                    />
                  </Link>
                  <Link to="/profit-loss" className="block transform hover:scale-105 transition-all duration-200">
                    <StatCard
                      title={financialStats.profitLoss >= 0 ? "Profit" : "Loss"}
                      value={Math.abs(financialStats.profitLoss)}
                      icon={
                        financialStats.profitLoss >= 0 ? (
                          <TrendingUp className="h-6 w-6 text-teal-500" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-500" />
                        )
                      }
                      iconBgColor={financialStats.profitLoss >= 0 ? "bg-teal-100" : "bg-red-100"}
                      arrowIcon={
                        <ChevronRight
                          className={`h-5 w-5 ${financialStats.profitLoss >= 0 ? "text-teal-400" : "text-red-400"}`}
                        />
                      }
                    />
                  </Link>
                </div>
              </>
            )}
            
            {/* <div className="my-8">
              <h2 className="text-xl font-semibold mb-4">Hostel Overview</h2>
              {hostelLoading ? (
                <div className="text-center p-4 bg-white rounded-lg shadow">Loading hostel stats...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard
                      title="Total Hostel Students"
                      value={hostelStats.totalStudents}
                      icon={<Users className="h-6 w-6 text-cyan-500" />}
                      iconBgColor="bg-cyan-100"
                      arrowIcon={<ChevronRight className="h-5 w-5 text-cyan-400" />}
                    />
                    <Link to="/hostel/collections" className="block">
                      <StatCard
                        title="Total Hostel Collection"
                        value={hostelStats.totalCollection}
                        icon={<DollarSign className="h-6 w-6 text-green-500" />}
                        iconBgColor="bg-green-100"
                        arrowIcon={<ChevronRight className="h-5 w-5 text-green-400" />}
                      />
                    </Link>
                    <Link to="/hostel/collections" className="block">
                      <StatCard
                        title="Total Hostel Due"
                        value={hostelStats.totalDue}
                        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
                        iconBgColor="bg-red-100"
                        arrowIcon={<ChevronRight className="h-5 w-5 text-red-400" />}
                      />
                    </Link>
                    <Link to="/hostel/expired" className="block">
                      <StatCard
                        title="Expired Students"
                        value={hostelStats.expiredCount}
                        icon={<UserCheck className="h-6 w-6 text-orange-500" />}
                        iconBgColor="bg-orange-100"
                        arrowIcon={<ChevronRight className="h-5 w-5 text-orange-400" />}
                      />
                    </Link>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Branch Details</h3>
                    {hostelStats.branches.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {hostelStats.branches.map((branch) => (
                                <Link key={branch.id} to={`/hostel/branches/${branch.id}/students`} className="block p-4 bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-lg text-gray-800 truncate">{branch.name}</h4>
                                        <div className="p-2 bg-indigo-100 rounded-full">
                                            <Home className="h-5 w-5 text-indigo-500" />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center text-sm text-gray-600">
                                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{branch.studentCount} Students</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                            No hostel branches have been added yet.
                        </div>
                    )}
                  </div>
                </>
              )}
            </div> */}

            {canManageStudents && (
              <div className="mb-8">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:scale-[1.01] transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                        Manage Library Students
                      </h2>
                    </div>
                    {!showAddForm ? (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                      >
                        <UserPlus className="h-5 w-5" />
                        Add Student
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          handleRefresh();
                        }}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                      >
                        <X className="h-5 w-5" />
                        Cancel
                      </button>
                    )}
                  </div>
                  {showAddForm && (
                    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <AddStudentForm />
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4">
                    <StudentList key={updateTrigger.toString()} selectedBranchId={selectedBranchId} />
                  </div>
                </div>
              </div>
            )}
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transform hover:scale-[1.01] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 text-transparent bg-clip-text">
                    Expiring Soon (Library)
                  </h2>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                  <ExpiringMemberships selectedBranchId={selectedBranchId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;