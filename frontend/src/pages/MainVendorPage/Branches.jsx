import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import axios from "axios";
import SearchableSelect from "../../components/Common/SearchableSelect";
import ConfirmationModal from "../../components/Common/ConfirmationModal";
import BackButton from "../../components/Common/BackButton";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  createVendor,
  updateVendor,
  deleteVendor,
} from "../../api/adminApi";
import { getMainVendorBranches } from "../../api/mainVendorApi";

function Branches() {
  const { vendorId, branchCount } = useSelector((state) => state.vendorAuth);
  const currentMainVendorId = vendorId || sessionStorage.getItem("vendorId");

  const [branches, setBranches] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    city: "",
    status: "Active",
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [confirmInfo, setConfirmInfo] = useState({
    isOpen: false,
    dbId: null,
  });

  useEffect(() => {
    loadData();
    fetchStates();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const vendorsRes = await getMainVendorBranches();

      if (vendorsRes.status) {
        setBranches(vendorsRes.vendors || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load branches data");
    } finally {
      setLoading(false);
    }
  };


  const handleAdd = () => {
    if (branches.length >= branchCount) {
      toast.warning(
        `Your limit is ${branchCount} branches and you have already added ${branches.length}.`,
      );
      return;
    }
    setEditingBranch(null);
    setFormData({
      name: "",
      state: "",
      city: "",
      status: "Active",
    });
    setCities([]);
    setShowModal(true);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      state: branch.state || "",
      city: branch.city || "",
      status: branch.status || "Active",
    });
    // load cities for that state
    if (branch.state) fetchCities(branch.state);
    setShowModal(true);
  };

  const toggleStatus = async (branch) => {
    try {
      const branchId = branch._id || branch.id;
      const newStatus = branch.status === "Active" ? "Inactive" : "Active";

      const res = await updateVendor(branchId, {
        status: newStatus,
      });

      if (res.status) {
        setBranches((prev) =>
          prev.map((b) =>
            (b._id || b.id) === branchId
              ? { ...b, status: newStatus }
              : b
          )
        );

        toast.success(`Branch ${newStatus} successfully`);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(error.message || "Failed to update branch status");
    }
  };

  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/states",
        { country: "India" },
      );
      if (!data.error) setStates(data.data.states);
    } catch (err) {
      console.error("Error fetching states:", err);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateName) => {
    setLoadingCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      if (!data.error) {
        setCities(data.data.map((city) => ({ name: city })));
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error("Error fetching cities:", err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteVendor(id);
      if (res.status) {
        setBranches(branches.filter((b) => b._id !== id && b.id !== id));
        toast.success("Branch deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error(error.message || "Failed to delete branch");
    }
  };

  const confirmDelete = (id) => {
    setConfirmInfo({ isOpen: true, dbId: id });
  };

  const handleConfirmClose = () => {
    setConfirmInfo({ isOpen: false, dbId: null });
  };

  const handleConfirm = () => {
    if (confirmInfo.dbId != null) {
      handleDelete(confirmInfo.dbId);
    }
    handleConfirmClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBranch) {
        const res = await updateVendor(editingBranch._id || editingBranch.id, {
          ...formData,
          mainVendorId: currentMainVendorId,
        });
        if (res.status) {
          toast.success("Branch updated successfully");
          loadData();
        }
      } else {
        const payload = {
          ...formData,
          mainVendorId: currentMainVendorId,
        };
        const res = await createVendor(payload);
        if (res.status) {
          toast.success("Branch created successfully");
          loadData();
        }
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error(error.message || "Failed to save branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vendors">
      <div className="content-header">
        <div className="header-top">
          <h1>Branch Management</h1>
          <BackButton />
        </div>
        <div className="breadcrumb-row">
          <div className="breadcrumb">
            <span>Vendor</span>
            <span className="breadcrumb-separator">&gt;</span>
            <span>Branches</span>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="table-responsive custom-table-wrapper">
          {loading && !branches.length ? (
            <LoadingSpinner message="Fetching branches..." />
          ) : (
            <table className="data-table custom-data-table branch-table">
              <thead>
                <tr>
                  <th className="custom-th">Name</th>
                  <th className="custom-th">Branch ID</th>
                  <th className="custom-th">State / City</th>
                  <th className="custom-th">Status</th>
                  <th className="custom-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch._id || branch.id} className="custom-tr">
                    <td className="custom-td" data-label="Name">{branch.name}</td>
                    <td className="custom-td" data-label="Branch ID">
                      <span className="badge badge-outline-primary">
                        {branch.branchId}
                      </span>
                    </td>
                    <td className="custom-td" data-label="State / City">
                      {branch.state}, {branch.city}
                    </td>
                    <td className="custom-td" data-label="Status">
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                        <label className="toggle-switch" style={{ marginRight: 0 }}>
                          <input
                            type="checkbox"
                            checked={branch.status === "Active"}
                            onChange={() => toggleStatus(branch)}
                            disabled={loading}
                          />
                          <span className="slider"></span>
                          <span className="toggle-label">{branch.status}</span>
                        </label>
                      </div>
                    </td>
                    <td
                      className="custom-td custom-td-center"
                      data-label="Actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                        <button
                          className="icon-btn edit"
                          onClick={() => handleEdit(branch)}
                          title="Edit Branch"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => confirmDelete(branch._id || branch.id)}
                          title="Delete Branch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
            </tr>
          ))}
          {!branches.length && (
            <tr>
              <td colSpan="6" className="text-center p-4">
                No branches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
          )}
    </div>

        {
    showModal && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </h3>
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control "
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group form-col">
                  <label className="form-label">State</label>
                  <SearchableSelect
                    name="state"
                    value={formData.state}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, state: val, city: "" }));
                      fetchCities(val);
                    }}
                    placeholder={loadingStates ? "Loading..." : "Select state"}
                    options={states.map((s) => ({ label: s.name, value: s.name }))}
                    required
                  />
                </div>
                <div className="form-group form-col">
                  <label className="form-label">City</label>
                  <SearchableSelect
                    name="city"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    disabled={!formData.state || loadingCities}
                    placeholder={loadingCities ? "Loading..." : "Select city"}
                    options={cities.map((c) => ({ label: c.name, value: c.name }))}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Saving..." : editingBranch ? "Update" : "Add"}{" "}
                Branch
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  <ConfirmationModal
    isOpen={confirmInfo.isOpen}
    onClose={handleConfirmClose}
    title="Delete Branch"
    message="Are you sure you want to delete this branch?"
    onConfirm={handleConfirm}
  />
      </div >
    </div >
  );
}

export default Branches;
