import { useState, useEffect } from "react";
import { Plus, X, Loader } from "lucide-react";
import { toast } from "react-toastify";
import "./SaaSAdmin.css";
import ConfirmationModal from "../../components/Common/ConfirmationModal";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "../../api/adminApi";
import { useSelector } from "react-redux";

const SubscriptionManagement = () => {
  const { saasRole, saasPermissions } = useSelector((state) => state.saasAuth);

  console.log(saasRole, saasPermissions);

  const isSubAdmin = saasRole === "sub-admin" || saasRole === "subadmin";
  const canManageSubscriptions =
    !isSubAdmin ||
    saasPermissions?.subscriptionAccess === true ||
    String(saasPermissions?.subscriptionAccess).toLowerCase() === "true";
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const data = await getSubscriptions();
      setPlans(data.subscriptions || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch subscriptions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan({
      ...plan,
      price: plan.price?.toString() || "",
      durationValue: plan.durationValue || 1,
      durationType: plan.durationType || "month",
      status: plan.status || "Active",
      isPopular: plan.isPopular || false,
      branchCount: plan.branchCount || 0,
    });
    setIsModalOpen(true);
  };

  const handleAddPlan = () => {
    setEditingPlan({
      _id: null,
      name: "",
      price: "",
      durationValue: 1,
      durationType: "month",
      status: "Active",
      isPopular: false,
      branchCount: 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setPlanToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
      try {
        await deleteSubscription(planToDelete);
        toast.success("Plan deleted successfully");
        fetchPlans();
      } catch (error) {
        toast.error(error.message || "Failed to delete plan");
      } finally {
        setIsDeleteModalOpen(false);
        setPlanToDelete(null);
      }
    }
  };

  const handleSave = async () => {
    if (!editingPlan.name || !editingPlan.price || !editingPlan.durationValue) {
      return toast.error("Name, price, and duration are required");
    }

    const numericPrice = Number(
      editingPlan.price.toString().replace(/[^0-9]/g, ""),
    );
    const numericDuration = Number(editingPlan.durationValue);
    const numericBranchCount = Number(editingPlan.branchCount) || 0;

    if (numericBranchCount < 0) {
      return toast.error("Branch count cannot be negative");
    }

    const payload = {
      name: editingPlan.name,
      price: numericPrice,
      durationValue: numericDuration,
      durationType: editingPlan.durationType || "month",
      status: editingPlan.status || "Active",
      branchCount: numericBranchCount,
      isPopular: editingPlan.isPopular || false,
      slug: editingPlan.name.toLowerCase().replace(/\s+/g, "-"),
    };

    setIsSaving(true);
    try {
      if (editingPlan._id) {
        await updateSubscription(editingPlan._id, payload);
        toast.success("Plan updated successfully");
      } else {
        await createSubscription(payload);
        toast.success("Plan created successfully");
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error(error.message || "Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to format duration display
  const formatDurationDisplay = (val, type) => {
    if (!val || !type) return "/30 Days";
    if (type === "month") return `/${val * 30} Days`;
    return `/${val} ${type}${val > 1 ? "s" : ""}`;
  };

  return (
    <div className="fade-in">
      <div className="saas-flex-end saas-mb-15">
        {canManageSubscriptions && (
          <button
            className="saas-btn btn-primary"
            onClick={handleAddPlan}
            disabled={isLoading}
          >
            <span>
              <Plus />
            </span>{" "}
            Add New Plan
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="saas-loading">
          <Loader className="saas-spinner saas-inline-block" size={24} />{" "}
          Loading plans...
        </div>
      ) : (
        <div className="saas-grid-responsive">
          {plans.map((plan) => (
            <div
              key={plan._id || plan.planId}
              className="saas-card saas-flex-col"
            >
              <div className="saas-card-header saas-flex-col saas-align-start saas-gap-05">
                <div className="saas-flex-between saas-w-full">
                  <h3 className="saas-text-xl saas-font-bold">
                    {plan.name} Plan
                  </h3>
                  <span
                    className={`saas-badge ${!plan.status || plan.status === "Active" ? "badge-success" : "badge-danger"}`}
                  >
                    {plan.status || "Active"}
                  </span>
                </div>
                <div className="saas-align-baseline saas-gap-025">
                  <span className="saas-plan-price">
                    ₹{plan.price?.toLocaleString()}
                  </span>
                  <span className="saas-text-muted saas-text-sm">
                    {formatDurationDisplay(
                      plan.durationValue,
                      plan.durationType,
                    )}
                  </span>
                </div>
              </div>
              <div className="saas-content saas-flex-1">
                <ul className="saas-feature-list">
                  <li className="saas-feature-item">
                    <span className="saas-text-success">✓</span>{" "}
                    {plan.branchCount || 0} Branches Allowed
                  </li>
                </ul>
              </div>
              {canManageSubscriptions && (
                <div className="saas-card-footer-actions">
                  <button
                    className="saas-btn btn-outline saas-flex-1"
                    onClick={() => handleEdit(plan)}
                  >
                    Edit
                  </button>

                  <button
                    className="saas-btn btn-danger saas-flex-1"
                    onClick={() => handleDelete(plan._id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {plans.length === 0 && !isLoading && (
            <div className="saas-text-muted">
              No plans available. Add a new plan!
            </div>
          )}
        </div>
      )}

      {/* Edit/Add Plan Modal */}
      {isModalOpen && (
        <div className="saas-modal-overlay">
          <div className="saas-modal">
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                {editingPlan?._id
                  ? `Edit Plan: ${editingPlan.name}`
                  : "Add New Plan"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="saas-modal-content">
              <div className="inner-grid-2">
                <div className="saas-form-group">
                  <label className="saas-label">Plan Name</label>
                  <input
                    type="text"
                    className="saas-input"
                    value={editingPlan?.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                    placeholder="e.g. Enterprise"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-label">Status</label>
                  <select
                    className="saas-select"
                    value={editingPlan?.status}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, status: e.target.value })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="inner-grid-2">
                <div className="saas-form-group">
                  <label className="saas-label">Price</label>
                  <input
                    type="number"
                    className="saas-input"
                    value={editingPlan?.price}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, price: e.target.value })
                    }
                    placeholder="e.g. 4999"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-label">Duration</label>
                  <div className="saas-duration-group">
                    <input
                      type="number"
                      min="1"
                      className="saas-input saas-duration-number"
                      value={editingPlan?.durationValue}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          durationValue: e.target.value,
                        })
                      }
                      placeholder="e.g. 1"
                    />
                    <select
                      className="saas-select saas-duration-type"
                      value={editingPlan?.durationType}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          durationType: e.target.value,
                        })
                      }
                    >
                      <option value="month">Month (30 Days)</option>
                      <option value="year">Year(s)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="saas-form-group">
                <label className="saas-label">Branch Count</label>
                <input
                  type="number"
                  min="0"
                  className="saas-input"
                  value={editingPlan?.branchCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (Number(val) < 0) return;
                    setEditingPlan({ ...editingPlan, branchCount: val });
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "-" ||
                      e.key === "+" ||
                      e.key === "e" ||
                      e.key === "E"
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter branch count"
                />
              </div>

              <div className="saas-form-group" style={{ marginTop: "1rem" }}>
                <label className="saas-modern-toggle">
                  <div className="saas-modern-toggle-content">
                    <span className="saas-modern-toggle-title">
                      Mark as Popular Plan
                    </span>
                    <span className="saas-modern-toggle-desc">
                      Highlight this plan to make it stand out to customers
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className="saas-toggle-checkbox"
                    checked={editingPlan?.isPopular || false}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        isPopular: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="saas-modal-footer">
              <button
                className="saas-btn btn-outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="saas-btn btn-primary"
                onClick={handleSave}
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
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this plan?"
        subMessage="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
export default SubscriptionManagement;
