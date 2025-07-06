import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import Select from 'react-select';
import { Trash2, Edit, Save, X, Plus } from 'lucide-react';

interface Locker {
  id: number;
  lockerNumber: string;
  isAssigned: boolean;
  studentId?: number;
  studentName?: string;
}

interface Student {
  id: number;
  name: string;
}

interface SelectOption {
  value: number | null;
  label: string;
}

const LockerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [assignStudentId, setAssignStudentId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lockersData, studentsData] = await Promise.all([
          api.getLockers(),
          api.getStudents(),
        ]);
        setLockers(lockersData.lockers);
        setStudents(studentsData.students);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load lockers or students');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateLocker = async () => {
    if (!newLockerNumber) {
      toast.error('Locker number is required');
      return;
    }
    try {
      const response = await api.createLocker({ lockerNumber: newLockerNumber });
      setLockers([...lockers, response.locker]);
      setNewLockerNumber('');
      toast.success('Locker created successfully');
    } catch (error: any) {
      console.error('Failed to create locker:', error);
      toast.error(error.message || 'Failed to create locker');
    }
  };

  const handleUpdateLocker = async () => {
    if (!editingLocker || !newLockerNumber) {
      toast.error('Locker number is required');
      return;
    }
    try {
      const updatedLockerData = { lockerNumber: newLockerNumber, studentId: editingLocker.studentId };
      const response = await api.updateLocker(editingLocker.id, updatedLockerData);
      setLockers(lockers.map(locker => locker.id === editingLocker.id ? response.locker : locker));
      setEditingLocker(null);
      setNewLockerNumber('');
      toast.success('Locker updated successfully');
    } catch (error: any) {
      console.error('Failed to update locker:', error);
      toast.error(error.message || 'Failed to update locker');
    }
  };

  const handleDeleteLocker = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this locker?')) return;
    try {
      await api.deleteLocker(id);
      setLockers(lockers.filter(locker => locker.id !== id));
      toast.success('Locker deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete locker:', error);
      toast.error(error.message || 'Failed to delete locker');
    }
  };

  const handleAssignLocker = async (lockerId: number, studentId: number | null) => {
    try {
      const lockerToUpdate = lockers.find(locker => locker.id === lockerId);
      if (!lockerToUpdate) return;

      const updatedLockerData = { 
        lockerNumber: lockerToUpdate.lockerNumber, 
        studentId: studentId 
      };
      const response = await api.updateLocker(lockerId, updatedLockerData);
      setLockers(lockers.map(locker => locker.id === lockerId ? response.locker : locker));
      toast.success(studentId ? 'Locker assigned to student' : 'Locker unassigned');
    } catch (error: any) {
      console.error('Failed to assign/unassign locker:', error);
      toast.error(error.message || 'Failed to assign/unassign locker');
    }
  };

  const studentOptions: SelectOption[] = [
    { value: null, label: 'None' },
    ...students.map(student => ({
      value: student.id,
      label: student.name,
    })),
  ];

  if (loading) return <div>Loading lockers...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Locker Management</h1>

      {/* Create New Locker */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-medium mb-4">{editingLocker ? 'Edit Locker' : 'Add New Locker'}</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={newLockerNumber}
            onChange={(e) => setNewLockerNumber(e.target.value)}
            placeholder="Enter locker number"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          {editingLocker ? (
            <>
              <button
                onClick={handleUpdateLocker}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditingLocker(null);
                  setNewLockerNumber('');
                }}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleCreateLocker}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={16} className="mr-2" />
              Add Locker
            </button>
          )}
        </div>
      </div>

      {/* Locker List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Locker Number</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              {/* <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Assigned Student</th> */}
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lockers.map(locker => (
              <tr key={locker.id} className="border-t">
                <td className="px-6 py-4">{locker.lockerNumber}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${locker.isAssigned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {locker.isAssigned ? 'Assigned' : 'Available'}
                  </span>
                </td>
                <td className="px-6 py-4 flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingLocker(locker);
                      setNewLockerNumber(locker.lockerNumber);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteLocker(locker.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LockerManagement;