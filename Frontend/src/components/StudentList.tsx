// File: StudentList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import { Search, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  // Assuming dateString is already in 'YYYY-MM-DD' format from the backend
  return dateString;
};

// Define the Student interface based on the expected API response
interface Student {
  id: number;
  name: string;
  registrationNumber?: string | null;
  seatNumber?: string | null;
  phone: string;
  status: string;
  membershipEnd: string;
}

interface StudentListProps {
  limit?: number;
  selectedBranchId?: number | null;
}

const StudentList: React.FC<StudentListProps> = ({ limit, selectedBranchId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // Fetch students from the API. The status is now correctly calculated by the backend.
        const response = await api.getStudents(undefined, undefined, selectedBranchId ?? undefined);
        if (!response || !Array.isArray(response.students)) {
          throw new Error('Invalid students data');
        }

        // NO MORE CLIENT-SIDE LOGIC NEEDED. The status from the backend is the source of truth.
        setStudents(response.students);

      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
        } else {
          console.error('Failed to fetch students:', error.message);
          toast.error('Failed to fetch students');
        }
        setStudents([]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [navigate, selectedBranchId]);

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

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.seatNumber && student.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastStudent = limit ? limit : currentPage * studentsPerPage;
  const indexOfFirstStudent = limit ? 0 : indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = limit ? 1 : Math.ceil(filteredStudents.length / studentsPerPage);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform hover:shadow-xl transition-all duration-300">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
            Students List
          </h3>
        </div>
        {!limit && (
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder=" Search students by name, phone, or registration..."
              className="w-full pl-12 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">Loading students...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50 text-left">
                  <th className="px-6 py-4 text-gray-700 font-semibold">👤 Name</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">🎫 Registration</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">💺 Seat</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">📞 Phone</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold">📊 Status</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">📅 Membership End</th>
                  <th className="px-6 py-4 text-gray-700 font-semibold">⚡ Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                    <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-200">{student.name}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-gray-600">{student.registrationNumber || '—'}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-gray-600">{student.seatNumber || '—'}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-gray-600">{student.phone}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          student.status === 'active' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                            : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {student.status === 'active' ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">{formatDate(student.membershipEnd)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(student.id)}
                          className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transform hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No students found matching your search.
            </div>
          )}
        </>
      )}

      {!limit && filteredStudents.length > 0 && (
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-2">
            <select
              value={studentsPerPage}
              onChange={(e) => {
                setStudentsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm border rounded py-2 px-3"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">students per page</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of{' '}
            {filteredStudents.length} students
          </div>
        </div>
      )}

      {limit && filteredStudents.length > limit && (
        <div className="flex justify-center border-t border-gray-100 p-4">
          <button
            onClick={() => navigate('/students')}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center p-2"
          >
            View all students <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentList;