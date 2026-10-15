import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import { formatDate } from "../../utils/dateUtils";
import "./SaaSAdmin.css";
import ConfirmationModal from "../../components/Common/ConfirmationModal.jsx";
import { useSelector } from "react-redux";
import {
  Trash2,
  X,
  Search,
  Plus,
  Edit,
  Loader,
  Filter,
  Download,
} from "lucide-react";
import axios from "axios";
import {
  getSubscriptions,
  getMainVendors,
  createMainVendor,
  updateMainVendor,
  deleteMainVendor,
  exportMainVendors,
} from "../../api/adminApi";
import SearchableSelect from "../../components/Common/SearchableSelect.jsx";
import VoiceSearch from "../../components/Common/VoiceSearch.jsx";

const VendorManagement = () => {
  const role = localStorage.getItem("saas_role");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const { saasRole, saasPermissions } = useSelector((state) => state.saasAuth);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 550);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 550);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isSubAdmin = saasRole === "sub-admin" || saasRole === "subadmin";
  const canManageVendors =
    !isSubAdmin ||
    saasPermissions?.vendorAdd === true ||
    String(saasPermissions?.vendorAdd).toLowerCase() === "true";

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportParams, setExportParams] = useState({
    startDate: null,
    endDate: null,
    state: "",
    city: "",
    status: "",
    plan: "",
  });
  const [exportCities, setExportCities] = useState([]);
  const [loadingExportCities, setLoadingExportCities] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [upgradeConfirmConfig, setUpgradeConfirmConfig] = useState({
    isOpen: false,
    type: null,
  });
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingFilterCities, setLoadingFilterCities] = useState(false);

  const [filters, setFilters] = useState({
    state: "",
    city: "",
    status: "",
    plan: "",
  });

  const [filterCities, setFilterCities] = useState([]);

  const initialNewVendor = {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    plan: "",
    status: "Active",
  };

  const [newVendor, setNewVendor] = useState(initialNewVendor);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetAddForm = () => {
    setNewVendor(initialNewVendor);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSavingAdd(true);
    try {
      const formData = new FormData();
      Object.keys(newVendor).forEach((key) => {
        formData.append(key, newVendor[key]);
      });
      await createMainVendor(formData);
      setIsAddModalOpen(false);
      resetAddForm();
      loadData();
      toast.success("Vendor added successfully");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Error adding vendor");
    } finally {
      setIsSavingAdd(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchStates();
  }, []);

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

  const fetchFilterCities = async (stateName) => {
    if (!stateName) {
      setFilterCities([]);
      return;
    }
    setLoadingFilterCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      if (!data.error) {
        setFilterCities(data.data.map((city) => ({ name: city })));
      } else {
        setFilterCities([]);
      }
    } catch (err) {
      console.error("Error fetching filter cities:", err);
      setFilterCities([]);
    } finally {
      setLoadingFilterCities(false);
    }
  };

  const fetchExportCities = async (stateName) => {
    if (!stateName) {
      setExportCities([]);
      return;
    }
    setLoadingExportCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      if (!data.error) {
        setExportCities(data.data.map((city) => ({ name: city })));
      } else {
        setExportCities([]);
      }
    } catch (err) {
      console.error("Error fetching export cities:", err);
      setExportCities([]);
    } finally {
      setLoadingExportCities(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, vendorsRes] = await Promise.all([
        getSubscriptions(),
        getMainVendors(),
      ]);
      if (plansRes.status && plansRes.subscriptions) {
        setPlans(plansRes.subscriptions);
        if (plansRes.subscriptions.length > 0) {
          setNewVendor((prev) => ({
            ...prev,
            plan: plansRes.subscriptions[0]._id,
          }));
        }
      }
      if (vendorsRes.status) {
        setVendors(vendorsRes.vendors || vendorsRes.mainVendors || []);
      }
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChangeSimple = (e) => {
    handleInputChange(e);

    const { name, value } = e.target;
    if (name === "state") {
      setNewVendor((prev) => ({ ...prev, city: "" }));
      fetchCities(value);
    }
  };

  const handleEditClick = (vendor) => {
    setEditingVendor({ ...vendor, plan: vendor.plan?._id || vendor.plan });
    if (vendor.state) {
      fetchCities(vendor.state);
    } else {
      setCities([]);
    }
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingVendor((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "state") {
      setEditingVendor((prev) => ({ ...prev, city: "" }));
      fetchCities(value);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.keys(editingVendor).forEach((key) => {
        // Exclude system fields or file objects when adding object properties to FormData
        if (
          key !== "_id" &&
          key !== "id" &&
          key !== "profilePic" &&
          key !== "planEndDate" &&
          key !== "joinedDate"
        ) {
          // If a property is an object, sending [object Object] would break the backend schema mapping
          let value = editingVendor[key];
          if (typeof value === "object" && value !== null && value._id) {
            value = value._id;
          }
          formData.append(key, value);
        }
      });

      await updateMainVendor(editingVendor._id || editingVendor.id, formData);
      setIsEditModalOpen(false);
      setEditingVendor(null);
      loadData();
      toast.success("Vendor updated successfully");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Error updating vendor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowClick = (vendor) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (vendorToDelete) {
      setIsDeleting(true);
      try {
        await deleteMainVendor(vendorToDelete._id || vendorToDelete.id);
        setVendorToDelete(null);
        setIsConfirmOpen(false);
        loadData();
        toast.success("Vendor deleted successfully");
      } catch (error) {
        console.error(error);
        toast.error(error?.message || "Error deleting vendor");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));

    if (name === "state") {
      setFilters((prev) => ({ ...prev, city: "" }));
      fetchFilterCities(value);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({
      state: "",
      city: "",
      status: "",
      plan: "",
    });
    setFilterCities([]);
  };

  const handleExportDownload = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        state: exportParams.state,
        city: exportParams.city,
        status: exportParams.status,
        plan: exportParams.plan,
        from: exportParams.startDate,
        to: exportParams.endDate,
        search: searchQuery,
      };

      const response = await exportMainVendors(exportData);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `main_vendors_report_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      setIsExportModalOpen(false);
      toast.success("Vendors exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting data. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      !searchQuery ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.phone.includes(searchQuery);

    const matchesState = !filters.state || vendor.state === filters.state;
    const matchesCity = !filters.city || vendor.city === filters.city;
    const matchesStatus = !filters.status || vendor.status === filters.status;
    const matchesPlan =
      !filters.plan || (vendor.plan?._id || vendor.plan) === filters.plan;

    return (
      matchesSearch &&
      matchesState &&
      matchesCity &&
      matchesStatus &&
      matchesPlan
    );
  });

  const handleUpgradeAction = async () => {
    if (!selectedVendor || !upgradeConfirmConfig.type) return;

    setIsProcessingUpgrade(true);
    const type = upgradeConfirmConfig.type;

    try {
      if (type === "approve") {
        await updateMainVendor(selectedVendor._id || selectedVendor.id, {
          plan: selectedVendor.requestedPlan._id,
          requestedPlan: null,
          upgradeType: null,
        });
        toast.success("Plan upgrade approved successfully");
      } else {
        await updateMainVendor(selectedVendor._id || selectedVendor.id, {
          requestedPlan: null,
          upgradeType: null,
        });
        toast.info("Plan upgrade rejected");
      }
      setUpgradeConfirmConfig({ isOpen: false, type: null });
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(
        `Error ${type === "approve" ? "approving" : "rejecting"} plan upgrade`,
      );
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  return (
    <div className="fade-in relative">
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Vendor Account"
        message={`Are you sure you want to delete ${vendorToDelete?.name}?`}
        subMessage="This action will permanently remove the vendor and all associated data."
        confirmText="Yes, Delete Vendor"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={upgradeConfirmConfig.isOpen}
        onClose={() => setUpgradeConfirmConfig({ isOpen: false, type: null })}
        onConfirm={handleUpgradeAction}
        title={
          upgradeConfirmConfig.type === "approve"
            ? "Approve Plan Upgrade"
            : "Reject Plan Upgrade"
        }
        message={`Are you sure you want to ${upgradeConfirmConfig.type} the upgrade to ${selectedVendor?.requestedPlan?.name}?`}
        subMessage={
          upgradeConfirmConfig.type === "approve"
            ? "This will update the vendor's billing plan and permissions."
            : "The vendor will remain on their current plan."
        }
        confirmText={
          upgradeConfirmConfig.type === "approve"
            ? "Yes, Approve Upgrade"
            : "Yes, Reject Upgrade"
        }
        cancelText="Cancel"
        variant={upgradeConfirmConfig.type === "approve" ? "success" : "danger"}
        isLoading={isProcessingUpgrade}
      />

      {/* Export Modal */}
      {isExportModalOpen && (
        <div
          className="saas-modal-overlay"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="saas-modal saas-export-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                Export Vendor Data
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="saas-modal-content">
              {/* <p className="saas-text-muted saas-mb-15">Configure report filters and date range for Excel export.</p> */}

              <div className="mb-1 full-width">
                <label className="saas-label">Date Range (Joined Date)</label>
                <DatePicker
                  selectsRange={true}
                  startDate={exportParams.startDate}
                  endDate={exportParams.endDate}
                  onChange={(update) => {
                    const [start, end] = update;
                    setExportParams((prev) => ({
                      ...prev,
                      startDate: start,
                      endDate: end,
                    }));
                  }}
                  isClearable={true}
                  placeholderText="Select range (From - To)"
                  className="saas-input"
                />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button
                className="saas-btn btn-secondary"
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="saas-btn btn-primary"
                onClick={handleExportDownload}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader className="saas-spinner" size={16} /> Exporting...
                  </>
                ) : (
                  "Download Excel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="saas-card saas-mb-15 subAdminCard">
        <h2 className="saas-text-2xl saas-font-bold subAdminCardTitle">
          Manage Vendors
        </h2>
        <p className="saas-text-muted saas-text-sm saas-mb-15">
          Manage and monitor all vendors in the system
        </p>
        <div className="saas-flex-between subAdminTopControls">
          <div className="saasSearchWrapperWide">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} className="saasSearchIconPosition" />
              <input
                type="text"
                className="saas-input saasSearchInputWide"
                placeholder="Search vendors..."
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
            <button
              className={`saas-btn ${showFilters ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} /> Filter
            </button>

            <button
              className="saas-btn btn-outline"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download size={18} /> Export
            </button>

            {showFilters && (
              <div className="saas-filter-popover">
                <div className="filter-header">
                  <h4 className="saas-font-semibold">Filters</h4>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="saas-text-muted"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="">
                  <label className="saas-label">State</label>
                  <SearchableSelect
                    name="state"
                    value={filters.state}
                    onChange={handleFilterChange}
                    placeholder="All States"
                    options={states.map((s) => ({
                      label: s.name,
                      value: s.name,
                    }))}
                  />
                </div>

                <div className="">
                  <label className="saas-label">City</label>
                  <SearchableSelect
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    disabled={!filters.state || loadingFilterCities}
                    placeholder={
                      loadingFilterCities ? "Loading..." : "All Cities"
                    }
                    options={filterCities.map((c) => ({
                      label: c.name,
                      value: c.name,
                    }))}
                  />
                </div>

                <div className="">
                  <label className="saas-label">Status</label>
                  <select
                    name="status"
                    className="saas-select"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="">
                  <label className="saas-label">Plan</label>
                  <select
                    name="plan"
                    className="saas-select"
                    value={filters.plan}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Plans</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="saas-flex saas-gap-05 saas-mt-05">
                  <button
                    className="saas-btn btn-primary btn-sm saas-w-full"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply Filters
                  </button>
                  <button
                    className="saas-btn btn-outline btn-sm saas-w-full"
                    onClick={() => {
                      resetFilters();
                      setShowFilters(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {canManageVendors && (
              <button
                className="saas-btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={18} /> Add Vendor
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={isMobile ? "subAdminTableCard" : "saas-card"}>
        <div className="saas-table-container">
          <table className="saas-table  subAdminTable saas-desktop-only">
            <thead className="subAdminTableHeader">
              <tr>
                <th>Vendor Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Phone</th>
                <th>Status</th>
                {canManageVendors && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="saas-text-center saas-py-4">
                    <Loader
                      className="saas-spinner saas-inline-block"
                      size={24}
                    />{" "}
                    Loading vendors...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="saas-text-center saas-py-4">
                    No vendors found.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr
                    key={vendor._id || vendor.id}
                    onClick={() => handleRowClick(vendor)}
                    className="vendor-row"
                  >
                    <td className="saas-font-medium">
                      <div className="saas-flex saas-align-center saas-gap-05">
                        {vendor.name}
                        {vendor.requestedPlan && (
                          <span
                            className="saas-badge badge-warning saas-badge-warning-req"
                            title="Plan Upgrade Requested"
                          >
                            Upgrade Req.
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{vendor.email}</td>
                    <td>
                      {vendor.city || "N/A"}, {vendor.state || "N/A"}
                    </td>
                    <td>
                      <a
                        href={`https://wa.me/91${vendor.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${vendor.name}, This is from AuctionBill Admin side.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="saas-whatsapp-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="wa-icon"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.552 4.197 1.598 6.02L0 24l6.125-1.606a11.81 11.81 0 005.923 1.586h.006c6.634 0 12.048-5.414 12.048-12.05a11.75 11.75 0 00-3.525-8.498z" />
                        </svg>
                        {vendor.phone}
                      </a>
                    </td>
                    <td>
                      <span
                        className={`saas-badge ${
                          vendor.status === "Active"
                            ? "badge-success"
                            : vendor.status === "Pending"
                              ? "badge-warning"
                              : "badge-danger"
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    {canManageVendors && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="saas-flex saas-gap-075">
                          <>
                            <button
                              className="icon-btn edit"
                              title="Edit Vendor"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(vendor);
                              }}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-btn delete"
                              title="Delete Vendor"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(vendor);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="saas-mobile-cards-view">
            {loading ? (
              <div className="saas-text-center saas-p-20">
                <Loader className="saas-spinner saas-inline-block" size={24} />{" "}
                Loading vendors...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="saas-text-center saas-p-20 saas-text-muted">
                No vendors found.
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <div
                  key={vendor._id || vendor.id}
                  className="saas-mobile-card"
                  onClick={() => handleRowClick(vendor)}
                >
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Name</span>
                    <div className="saas-mobile-card-value saas-font-bold">
                      <div
                        className="saas-flex saas-align-center saas-gap-05"
                        style={{ justifyContent: "flex-end" }}
                      >
                        {vendor.name}
                        {vendor.requestedPlan && (
                          <span
                            className="saas-badge badge-warning"
                            style={{ fontSize: "10px" }}
                            title="Plan Upgrade Requested"
                          >
                            Upgrade Req.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Email</span>
                    <span
                      className="saas-mobile-card-value"
                      style={{ wordBreak: "break-all" }}
                    >
                      {vendor.email}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Location</span>
                    <span className="saas-mobile-card-value">
                      {vendor.city || "N/A"}, {vendor.state || "N/A"}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Phone</span>
                    <span className="saas-mobile-card-value">
                      <a
                        href={`https://wa.me/91${vendor.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${vendor.name}, This is from AuctionBill Admin side.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="saas-whatsapp-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.phone}
                      </a>
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Status</span>
                    <span className="saas-mobile-card-value">
                      <span
                        className={`saas-badge ${
                          vendor.status === "Active"
                            ? "badge-success"
                            : vendor.status === "Pending"
                              ? "badge-warning"
                              : "badge-danger"
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </span>
                  </div>
                  {canManageVendors && (
                    <div
                      className="saas-mobile-card-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="saas-mobile-card-label">Actions</span>
                      <div className="saas-flex saas-gap-10px">
                        <button
                          className="icon-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(vendor);
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(vendor);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div
          className="saas-modal-overlay"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div className="saas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                Add New Vendor
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="saas-modal-content">
                <div className="inner-grid-2">
                  <div className="form-group">
                    <label className="saas-label">Vendor Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={newVendor.name}
                      onChange={handleInputChangeSimple}
                      className="saas-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="saas-label">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={newVendor.email}
                      onChange={handleInputChangeSimple}
                      className="saas-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="saas-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={newVendor.phone}
                      onChange={handleInputChangeSimple}
                      className="saas-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="saas-label">Plan</label>
                    <select
                      name="plan"
                      value={newVendor.plan}
                      onChange={handleInputChangeSimple}
                      className="saas-select"
                    >
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="saas-label">State *</label>
                    <SearchableSelect
                      name="state"
                      value={newVendor.state}
                      onChange={handleInputChangeSimple}
                      placeholder="Select State"
                      options={states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      }))}
                      disabled={loadingStates}
                    />
                  </div>

                  <div className="form-group">
                    <label className="saas-label">City *</label>
                    <SearchableSelect
                      name="city"
                      value={newVendor.city}
                      onChange={handleInputChangeSimple}
                      placeholder="Select City"
                      options={cities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!newVendor.state || loadingCities}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="saas-label">Address</label>
                    <textarea
                      name="address"
                      value={newVendor.address}
                      onChange={handleInputChangeSimple}
                      className="saas-textarea"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn btn-primary"
                  disabled={isSaving}
                >
                  {isSavingAdd ? (
                    <>
                      <Loader className="saas-spinner" size={16} /> Saving...
                    </>
                  ) : (
                    "Add Vendor"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {isEditModalOpen && editingVendor && (
        <div
          className="saas-modal-overlay"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div className="saas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                Edit Vendor
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="saas-modal-content">
                <div className="inner-grid-2">
                  <div className="form-group">
                    <label className="saas-label">Vendor Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editingVendor.name}
                      onChange={handleEditChange}
                      className="saas-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="saas-label">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={editingVendor.email}
                      onChange={handleEditChange}
                      className="saas-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="saas-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editingVendor.phone}
                      onChange={handleEditChange}
                      className="saas-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="saas-label">Plan</label>
                    <select
                      name="plan"
                      value={editingVendor.plan}
                      onChange={handleEditChange}
                      className="saas-select"
                    >
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="saas-label">State *</label>
                    <SearchableSelect
                      name="state"
                      value={editingVendor.state}
                      onChange={handleEditChange}
                      placeholder="Select State"
                      options={states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      }))}
                      disabled={loadingStates}
                    />
                  </div>
                  <div className="form-group">
                    <label className="saas-label">City *</label>
                    <SearchableSelect
                      name="city"
                      value={editingVendor.city}
                      onChange={handleEditChange}
                      placeholder="Select City"
                      options={cities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!editingVendor.state || loadingCities}
                    />
                  </div>
                  <div className="form-group">
                    <label className="saas-label">Status</label>
                    <select
                      name="status"
                      value={editingVendor.status}
                      onChange={handleEditChange}
                      className="saas-select"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label className="saas-label">Address</label>
                    <textarea
                      name="address"
                      value={editingVendor.address}
                      onChange={handleEditChange}
                      className="saas-textarea"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader className="saas-spinner" size={16} /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Info Modal */}
      {isModalOpen && selectedVendor && (
        <div
          className="saas-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="saas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                Vendor Details: {selectedVendor.name}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="saas-modal-content">
              {/* Profile Section */}
              <div className="saas-mb-15">
                <h4 className="saas-profile-header">Business Profile</h4>
                <div className="inner-grid-2">
                  <div>
                    <label className="saas-label saas-text-muted">
                      Vendor Name
                    </label>
                    <div className="saas-font-medium">
                      {selectedVendor.name}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">
                      Email Address
                    </label>
                    <div className="saas-font-medium">
                      {selectedVendor.email}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">
                      Phone Number
                    </label>
                    <div className="saas-font-medium">
                      {selectedVendor.phone}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">
                      Address
                    </label>
                    <div className="saas-font-medium">
                      {selectedVendor.address}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">City</label>
                    <div className="saas-font-medium">
                      {selectedVendor.city}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">State</label>
                    <div className="saas-font-medium">
                      {selectedVendor.state}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="saas-mb-15">
                <h4 className="saas-profile-header">Account Status</h4>
                <div className="inner-grid-2">
                  <div>
                    <label className="saas-label saas-text-muted">
                      Current Plan
                    </label>
                    <span
                      className={`saas-badge ${(selectedVendor.plan?.name || selectedVendor.plan) === "Premium" ? "badge-info" : "badge-warning"}`}
                    >
                      {selectedVendor.plan?.name || selectedVendor.plan}
                    </span>
                  </div>
                  {selectedVendor.requestedPlan && (
                    <div className="saas-req-upgrade-box">
                      <label className="saas-label saas-text-muted">
                        Requested Plan Upgrade
                      </label>
                      <div className="saas-flex saas-flex-between">
                        <div className="saas-flex saas-flex-col saas-align-start">
                          <span className="saas-font-medium saas-text-warning">
                            {selectedVendor.requestedPlan?.name}
                          </span>
                          {selectedVendor.upgradeType && (
                            <span className="saas-text-xs saas-text-muted saas-req-upgrade-sub">
                              Activation:{" "}
                              {selectedVendor.upgradeType === "from_today"
                                ? "From Today (30 Days)"
                                : "After Current Plan"}
                            </span>
                          )}
                        </div>
                        <div className="saas-flex">
                          <button
                            className="saas-btn btn-primary btn-sm"
                            onClick={() =>
                              setUpgradeConfirmConfig({
                                isOpen: true,
                                type: "approve",
                              })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="saas-btn btn-outline btn-sm saas-ml-10px"
                            onClick={() =>
                              setUpgradeConfirmConfig({
                                isOpen: true,
                                type: "reject",
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="saas-label saas-text-muted">
                      Account Status
                    </label>
                    <span
                      className={`saas-badge ${
                        selectedVendor.status === "Active"
                          ? "badge-success"
                          : selectedVendor.status === "Pending"
                            ? "badge-warning"
                            : "badge-danger"
                      }`}
                    >
                      {selectedVendor.status}
                    </span>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">
                      Joined Date
                    </label>
                    <div className="saas-font-medium">
                      {formatDate(selectedVendor.joinedDate)}
                    </div>
                  </div>
                  <div>
                    <label className="saas-label saas-text-muted">
                      Plan End Date
                    </label>
                    <div className="saas-font-medium">
                      {formatDate(selectedVendor.planEndDate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="saas-modal-footer">
              <button
                className="saas-btn btn-primary"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
