// File: ExpiringMemberships.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import { AlertCircle, ChevronRight, Trash2, Eye, ChevronLeft, MessageSquare } from 'lucide-react';

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  // The date is already formatted as YYYY-MM-DD from the backend
  return dateString;
};

// FIX: Simplified interface now that the backend sends seatNumber directly.
interface Student {
  id: number;
  name: string;
  seatNumber?: string | null;
  phone: string;
  status: string;
  membershipEnd: string;
}

interface ExpiringMembershipsProps {
  limit?: number;
  selectedBranchId?: number | null;
}

const ExpiringMemberships: React.FC<ExpiringMembershipsProps> = ({ limit, selectedBranchId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // This API call will now return the seatNumber directly.
        const response = await api.getExpiringSoon(selectedBranchId ?? undefined);
        if (!response || !Array.isArray(response.students)) {
          throw new Error('Invalid data received for expiring students');
        }
        
        // FIX: No complex client-side processing is needed anymore.
        // The backend now provides the correct data directly.
        setStudents(response.students);

      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
        } else {
          console.error('Failed to fetch expiring memberships:', error.message);
          toast.error('Failed to fetch expiring memberships');
        }
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [navigate, selectedBranchId]);

  const handleWhatsAppClick = (phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('No phone number available for this student.');
      return;
    }
    let cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length === 10) {
      cleanedNumber = `91${cleanedNumber}`;
    }
    const whatsappUrl = `https://wa.me/${cleanedNumber}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

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

  if (loading) {
    return <div className="flex justify-center p-4">Loading expiring memberships...</div>;
  }

  const indexOfLastStudent = limit ?? currentPage * studentsPerPage;
  const indexOfFirstStudent = limit ? 0 : indexOfLastStudent - studentsPerPage;
  const currentStudents = students.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = limit ? 1 : Math.ceil(students.length / studentsPerPage);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden transform hover:shadow-xl transition-all duration-300">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm">
            <AlertCircle size={20} className="text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 text-transparent bg-clip-text">
            ⚠️ Expiring Memberships
          </h3>
        </div>
      </div>

      {currentStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-orange-50 to-red-50 text-left">
                <th className="px-6 py-4 text-gray-700 font-semibold">👤 Name</th>
                <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">💺 Seat</th>
                <th className="px-6 py-4 text-gray-700 font-semibold hidden md:table-cell">📞 Phone</th>
                <th className="px-6 py-4 text-gray-700 font-semibold">📊 Status</th>
                <th className="px-6 py-4 text-gray-700 font-semibold">⏰ Expiry Date</th>
                <th className="px-6 py-4 text-gray-700 font-semibold">⚡ Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 group">
                  <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-orange-700 transition-colors duration-200">{student.name}</td>
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
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 shadow-sm">
                      📅 {formatDate(student.membershipEnd)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(student.id)}
                        className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="View student details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transform hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Delete student"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleWhatsAppClick(student.phone)}
                        className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transform hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={`Send WhatsApp message to ${student.name}`}
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          No memberships expiring soon.
        </div>
      )}

      {!limit && students.length > 0 && (
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
            Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, students.length)} of{' '}
            {students.length} students
          </div>
        </div>
      )}

      {limit && students.length > limit && (
        <div className="flex justify-center border-t border-gray-100 p-4">
          <button
            onClick={() => navigate('/expiring-memberships')}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center p-2"
          >
            View all expiring memberships <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpiringMemberships;