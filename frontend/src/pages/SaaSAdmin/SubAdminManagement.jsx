import { useState, useEffect } from 'react';
import './SaaSAdmin.css';
import ConfirmationModal from '../../components/Common/ConfirmationModal';
import { Plus, X, Download, Trash2, Search, Check, Edit, Loader } from 'lucide-react';
import { getSubAdmins, createSubAdmin, updateSubAdmin, deleteSubAdmin } from '../../api/adminApi';
import { toast } from 'react-toastify';
import VoiceSearch from '../../components/Common/VoiceSearch';

const SubAdminManagement = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 550);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 550);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setIsLoading(true);
      const data = await getSubAdmins();
      setSubAdmins(data.subAdmins || data.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch sub-admins.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubAdmin = () => {
    setEditingSubAdmin({
      _id: null,
      username: '',
      email: '',
      status: 'Active',
      permissions: {
        vendorAdd: false,
        subscriptionAccess: false,
        passwordChange: false
      }
    });
    setIsModalOpen(true);
  };

  const handleEdit = (subAdmin) => {
    setEditingSubAdmin({
      ...subAdmin
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setAdminToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (adminToDelete) {
      try {
        await deleteSubAdmin(adminToDelete);
        toast.success('Sub-admin deleted successfully');
        fetchSubAdmins();
      } catch (error) {
        toast.error(error.message || 'Failed to delete sub-admin');
      } finally {
        setIsDeleteModalOpen(false);
        setAdminToDelete(null);
      }
    }
  };

  const handleSave = async () => {
    if (!editingSubAdmin.username || !editingSubAdmin.email) {
      return toast.error('Name and email are required');
    }

    setIsSaving(true);
    try {
      if (editingSubAdmin._id) {
        // Handle update
        const payload = { ...editingSubAdmin };
        await updateSubAdmin(editingSubAdmin._id, payload);
        toast.success('Sub-admin updated successfully');
      } else {
        // Handle create
        await createSubAdmin(editingSubAdmin);
        toast.success('Sub-admin created successfully');
      }
      setIsModalOpen(false);
      fetchSubAdmins();
    } catch (error) {
      toast.error(error.message || 'Failed to save sub-admin');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionChange = async (field, checked, subAdminId) => {
    const subAdmin = subAdmins.find(sa => (sa._id || sa.id) === subAdminId);
    if (!subAdmin) return;

    // Optimistic update
    setSubAdmins(subAdmins.map(sa => {
      if ((sa._id || sa.id) === subAdminId) {
        return {
          ...sa,
          permissions: {
            ...sa.permissions,
            [field]: checked
          }
        };
      }
      return sa;
    }));

    try {
      const updatedPermissions = {
        ...subAdmin.permissions,
        [field]: checked
      };
      await updateSubAdmin(subAdminId, { permissions: updatedPermissions });
      toast.success('Permissions updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update permissions');
      fetchSubAdmins(); // Revert on fail
    }
  };

  const handleStatusToggle = async (subAdminId) => {
    const subAdmin = subAdmins.find(sa => (sa._id || sa.id) === subAdminId);
    if (!subAdmin) return;

    const newStatus = subAdmin.status === 'Active' ? 'Inactive' : 'Active';

    // Optimistic update
    setSubAdmins(subAdmins.map(sa => {
      if ((sa._id || sa.id) === subAdminId) {
        return { ...sa, status: newStatus };
      }
      return sa;
    }));

    try {
      await updateSubAdmin(subAdminId, { status: newStatus });
      toast.success('Status updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
      fetchSubAdmins(); // Revert on fail
    }
  };

  const filteredSubAdmins = subAdmins.filter(sa =>
    sa.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sa.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="saas-card saas-mb-15 subAdminCard">
        <h2 className="saas-text-2xl saas-font-bold subAdminCardTitle">Sub-Admin Management</h2>
        <p className="saas-text-muted saas-text-sm saas-mb-15">Manage and monitor all sub-admins in the system</p>
        <div className="saas-flex-between subAdminTopControls">
          <div className="saasSearchWrapperWide">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} className="saasSearchIconPosition" />
              <input
                type="text"
                className="saas-input saasSearchInputWide"
                placeholder="Search sub-admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                <VoiceSearch onSearch={(text) => setSearchQuery(text)} minimal={true} />
              </div>
            </div>
          </div>
          <div className="saas-flex saas-gap-10px">
             <button className="saas-btn btn-primary" onClick={handleAddSubAdmin}>
                <Plus size={18} /> Add Sub-Admin
             </button>
             {/* <button className="saas-btn btn-primary btnSubAdminDownload">
                <Download size={16} /> Download Sub-Admins List
             </button> */}
          </div>
        </div>
      </div>
      <div className={isMobile ? "subAdminTableCard" : "saas-card"}>
        {isLoading ? (
          <div className="saas-loading saas-loading-padded">
            <Loader
              className="saas-spinner saas-inline-block"
              size={24}
            />{" "}Loading sub-admins...</div>
        ) : (
          <div className="saas-table-container">
            <table className="saas-table subAdminTable saas-desktop-only-550">
              <thead className="subAdminTableHeader">
                <tr>
                  <th>S.NO</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Sub Admin Access</th>
                  <th className="saas-text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.length === 0 ? (
                  <tr><td colSpan="6" className="saas-text-center saas-p-20">No sub-admins found</td></tr>
                ) : (
                  filteredSubAdmins.map((subAdmin, index) => {
                    const id = subAdmin._id || subAdmin.id;
                    return (
                      <tr key={id} className="subAdminTableRow">
                        <td>{index + 1}</td>
                        <td className="saas-font-medium saas-text-main">{subAdmin.username}</td>
                        <td className="saas-text-muted">{subAdmin.email}</td>
                        <td>
                          <div className="saasStatusToggleContainer" onClick={() => handleStatusToggle(id)}>
                            <div className={`saasStatusToggleTrack ${subAdmin.status === 'Active' ? 'active' : 'inactive'}`}>
                              <div className={`saasStatusToggleThumb ${subAdmin.status === 'Active' ? 'active' : 'inactive'}`}>
                                {subAdmin.status === 'Active' && <Check size={12} color="#059669" />}
                                {subAdmin.status !== 'Active' && <X size={12} color="#f87171" />}
                              </div>
                            </div>
                            <span className="saasStatusLabel">
                              {subAdmin.status === 'Active' ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="subAdminPermissionsContainer">
                            <PermissionToggle
                              label="Vendor access"
                              isActive={subAdmin.permissions?.vendorAdd}
                              onToggle={() => handlePermissionChange('vendorAdd', !subAdmin.permissions?.vendorAdd, id)}
                            />
                            <PermissionToggle
                              label="Subscription Access"
                              isActive={subAdmin.permissions?.subscriptionAccess}
                              onToggle={() => handlePermissionChange('subscriptionAccess', !subAdmin.permissions?.subscriptionAccess, id)}
                            />
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="action-buttons">
                            <button
                              className="icon-btn"
                              title="Edit Sub-Admin"
                              onClick={() => handleEdit(subAdmin)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn delete"
                              title="Delete Sub-Admin"
                              onClick={() => handleDelete(id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="saas-mobile-cards-view-550">
              {filteredSubAdmins.length === 0 ? (
                <div className="saas-text-center saas-p-20 saas-text-muted">No sub-admins found</div>
              ) : (
                filteredSubAdmins.map((subAdmin, index) => {
                  const id = subAdmin._id || subAdmin.id;
                  return (
                    <div key={id} className="saas-mobile-card">
                      <div className="saas-mobile-card-row">
                        <span className="saas-mobile-card-label">S.NO</span>
                        <span className="saas-mobile-card-value saas-font-bold">#{index + 1}</span>
                      </div>
                      <div className="saas-mobile-card-row">
                        <span className="saas-mobile-card-label">Name</span>
                        <span className="saas-mobile-card-value saas-font-bold">{subAdmin.username}</span>
                      </div>
                      <div className="saas-mobile-card-row">
                        <span className="saas-mobile-card-label">Email</span>
                        <span className="saas-mobile-card-value">{subAdmin.email}</span>
                      </div>
                      <div className="saas-mobile-card-row">
                        <span className="saas-mobile-card-label">Status</span>
                        <div className="saas-mobile-card-value">
                           <div className="saasStatusToggleContainer" onClick={() => handleStatusToggle(id)}>
                            <div className={`saasStatusToggleTrack ${subAdmin.status === 'Active' ? 'active' : 'inactive'}`}>
                              <div className={`saasStatusToggleThumb ${subAdmin.status === 'Active' ? 'active' : 'inactive'}`}>
                                {subAdmin.status === 'Active' && <Check size={12} color="#059669" />}
                                {subAdmin.status !== 'Active' && <X size={12} color="#f87171" />}
                              </div>
                            </div>
                            <span className="saasStatusLabel">
                              {subAdmin.status === 'Active' ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="saas-mobile-card-row saas-flex-col saas-align-start">
                        <span className="saas-mobile-card-label saas-mb-075">Sub Admin Access</span>
                        <div className="subAdminPermissionsContainer saas-w-full">
                          <PermissionToggle
                            label="Vendor access"
                            isActive={subAdmin.permissions?.vendorAdd}
                            onToggle={() => handlePermissionChange('vendorAdd', !subAdmin.permissions?.vendorAdd, id)}
                          />
                          <PermissionToggle
                            label="Subscription Access"
                            isActive={subAdmin.permissions?.subscriptionAccess}
                            onToggle={() => handlePermissionChange('subscriptionAccess', !subAdmin.permissions?.subscriptionAccess, id)}
                          />
                        </div>
                      </div>
                      <div className="saas-mobile-card-row">
                        <span className="saas-mobile-card-label">Actions</span>
                        <div className="saas-mobile-card-value">
                          <div className="action-buttons">
                            <button
                              className="icon-btn"
                              title="Edit Sub-Admin"
                              onClick={() => handleEdit(subAdmin)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn delete"
                              title="Delete Sub-Admin"
                              onClick={() => handleDelete(id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="saas-modal-overlay">
          <div className="saas-modal">
            <div className="saas-modal-header subAdminModalHeader">
              <h3 className="saas-text-xl saas-font-semibold subAdminModalTitle">
                {editingSubAdmin?._id ? `Edit Sub-Admin` : 'Add Sub-Admin'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="saas-modal-content">
                <div className="inner-grid-2">
                  <div className="saas-form-group">
                    <label className="saas-label">Name *</label>
                    <input
                      type="text"
                      className="saas-input"
                      value={editingSubAdmin?.username || ''}
                      onChange={(e) => setEditingSubAdmin({ ...editingSubAdmin, username: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div className="saas-form-group">
                    <label className="saas-label">Status</label>
                    <select
                      className="saas-select"
                      value={editingSubAdmin?.status || 'Active'}
                      onChange={(e) => setEditingSubAdmin({ ...editingSubAdmin, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="saas-form-group">
                  <label className="saas-label">Email *</label>
                  <input
                    type="email"
                    className="saas-input"
                    value={editingSubAdmin?.email || ''}
                    onChange={(e) => setEditingSubAdmin({ ...editingSubAdmin, email: e.target.value })}
                    placeholder="e.g. email@example.com"
                    required
                  />
                </div>

              </div>
              <div className="saas-modal-footer">
                <button type="button" className="saas-btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</button>
                <button type="submit" className="saas-btn btn-primary btnSubAdminModalSave" disabled={isSaving}>
                  {isSaving ? <><Loader className="saas-spinner" size={16} /> Saving...</> : 'Save Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this sub-admin?"
        subMessage="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

const PermissionToggle = ({ label, isActive, onToggle }) => (
  <div className="permissionToggleWrapper">
    <span>{label}</span>
    <div className={`saasStatusToggleTrack ${isActive ? 'active' : 'inactive'}`} onClick={onToggle}>
      <div className={`saasStatusToggleThumb ${isActive ? 'active' : 'inactive'}`}>
        {isActive && <Check size={12} color="#059669" />}
        {!isActive && <X size={12} color="#f87171" />}
      </div>
    </div>
  </div>
);

export default SubAdminManagement;
