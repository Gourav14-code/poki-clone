import React, { useState, useEffect } from 'react';
import { 
  Table as TableIcon, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  RotateCcw, 
  X, 
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import TestHint from '../components/TestHint';

export default function TableLab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'QA Engineer', department: 'Engineering', status: 'Active' });

  // Fetch initial users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sort Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter & Search Logic
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'All' || user.department === selectedDept;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // CRUD Handlers
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (editingUser) {
      // PUT
      await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      // POST
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    setIsAddModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'QA Engineer', department: 'Engineering', status: 'Active' });
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    await fetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
    setDeletingUser(null);
    fetchUsers();
  };

  const handleResetTable = async () => {
    await fetch('/api/users/reset', { method: 'POST' });
    fetchUsers();
  };

  const exportCSV = () => {
    const headers = ['ID,Name,Email,Role,Department,Status'];
    const rows = filteredUsers.map((u) => `${u.id},"${u.name}","${u.email}","${u.role}","${u.department}","${u.status}"`);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'exported_users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Data Grid & Inline CRUD Actions Lab</h1>
          <TestHint
            testId="table-lab-header"
            tip="Test table sorting (assert order change), multi-parameter search/filters, pagination traversal, modal CRUD, and row assertions."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Full data table testing: sort columns, filter rows, paginate, add/edit/delete records, and export to CSV.
        </p>
      </div>

      {/* Action Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="table-search-input"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="dept-filter" className="text-xs font-semibold text-slate-600 shrink-0">
            Department:
          </label>
          <select
            id="dept-filter"
            data-testid="table-filter-dept"
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Quality Assurance">Quality Assurance</option>
            <option value="Product">Product</option>
            <option value="Infrastructure">Infrastructure</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            data-testid="export-csv-btn"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            data-testid="reset-table-btn"
            onClick={handleResetTable}
            title="Reset to default dataset"
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="add-user-btn"
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'QA Engineer', department: 'Engineering', status: 'Active' });
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="users-table" className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    data-testid="sort-id"
                    onClick={() => handleSort('id')}
                    className="flex items-center gap-1 hover:text-indigo-600"
                  >
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    data-testid="sort-name"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-indigo-600"
                  >
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    data-testid="sort-email"
                    onClick={() => handleSort('email')}
                    className="flex items-center gap-1 hover:text-indigo-600"
                  >
                    <span>Email</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} data-testid="table-empty-notice" className="py-8 text-center text-slate-400">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    data-testid={`user-row-${user.id}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">#{user.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900" data-testid={`user-name-${user.id}`}>
                      {user.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono" data-testid={`user-email-${user.id}`}>
                      {user.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{user.role}</td>
                    <td className="py-3.5 px-4 text-slate-600">{user.department}</td>
                    <td className="py-3.5 px-4">
                      <span
                        data-testid={`user-status-${user.id}`}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : user.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        type="button"
                        data-testid={`edit-user-btn-${user.id}`}
                        onClick={() => {
                          setEditingUser(user);
                          setFormData({ ...user });
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-user-btn-${user.id}`}
                        onClick={() => setDeletingUser(user)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span data-testid="table-pagination-info">
            Showing Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({filteredUsers.length} total)
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="pagination-prev-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="pagination-next-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div
          data-testid="user-form-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingUser ? `Edit User #${editingUser.id}` : 'Add New Record'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  data-testid="modal-input-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  data-testid="modal-input-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Department</label>
                  <select
                    data-testid="modal-select-dept"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Product">Product</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    data-testid="modal-select-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="modal-save-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div
          data-testid="delete-confirm-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Delete User Record?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingUser.name}</span>? This action tests automated deletion confirmation.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="cancel-delete-btn"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-btn"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

