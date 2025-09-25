import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';
import { Search, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Define the Student type with the dynamic status field
interface Student {
  id: number;
  name: string;
  registrationNumber?: string | null;
  email: string;
  phone: string;
  address: string;
  branchId: number;
  membershipStart: string;
  membershipEnd: string;
  totalFee: number;
  amountPaid: number;
  status: string; // Can be 'active', 'expired', etc.
  createdAt: string;
}

// Utility function to format date to YYYY-MM-DD
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const ActiveStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [isCollapsed, setIsCollapsed] = useState(false); // Added for Sidebar
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.getActiveStudents();
        if (!response || !Array.isArray(response.students)) {
          throw new Error('Invalid data received for active students');
        }
        setStudents(response.students);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch active students:', error.message);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredStudents = students.filter((student: Student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(id);
        setStudents(students.filter((student) => student.id !== id));
        toast.success('Student deleted successfully');
      } catch (error: any) {
        console.error('Failed to delete student:', error.message);
        toast.error('Failed to delete student');
      }
    }
  };

  const handleViewDetails = (id: number) => {
    navigate(`/students/${id}`);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-green-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-transparent bg-clip-text mb-4 flex items-center gap-3">
                ✅ Active Students
              </h1>
              <p className="text-gray-600 text-lg">✨ Manage and monitor all your active students</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden transform hover:shadow-xl transition-all duration-300">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                      <Search className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 text-transparent bg-clip-text">
                        📚 Active Students Directory
                      </h3>
                      <p className="text-sm text-gray-600">Currently enrolled students</p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="🔍 Search active students..."
                      className="w-full pl-12 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center p-8">Loading active students...</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Timing</TableHead>
                          <TableHead className="hidden md:table-cell">Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Membership End</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentStudents.length > 0 ? (
                          currentStudents.map((student: Student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                              <TableCell className="hidden md:table-cell">{student.phone}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {student.status === 'active' ? 'Active' : 'Expired'}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{formatDate(student.membershipEnd)}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => handleViewDetails(student.id)}
                                  className="mr-2 text-blue-600 hover:text-blue-800 p-2"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(student.id)}
                                  className="text-red-600 hover:text-red-800 p-2"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              {filteredStudents.length === 0
                                ? 'No active students found matching your search.'
                                : 'No active students on this page.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              {!loading && filteredStudents.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 px-6 py-3 space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <select
                      value={studentsPerPage}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setStudentsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-sm border rounded py-2 px-3"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-500">students per page</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveStudents;