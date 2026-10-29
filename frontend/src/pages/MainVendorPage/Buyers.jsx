import React, { useState, useEffect } from "react";
import { Phone, Mail, Pencil, Trash2, Loader2 } from "lucide-react";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import ConfirmationModal from "../../components/Common/ConfirmationModal";
import SearchableSelect from "../../components/Common/SearchableSelect";
import VoiceSearch from "../../components/Common/VoiceSearch";
import BackButton from "../../components/Common/BackButton";
import { getMainVendorBuyers, getMainVendorBranches } from "../../api/mainVendorApi";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

function Buyers() {
  const { vendorId, vendorLoggedIn } = useSelector((state) => state.vendorAuth);
  // Re-check sessionStorage if Redux is lagging or after refresh
  const currentMainVendorId = vendorId || sessionStorage.getItem("vendorId");

  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [buyers, setBuyers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchBuyers();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    setFetchingBranches(true);
    try {
      const res = await getMainVendorBranches();
      if (res.status) {
        setBranches([{ _id: "all", name: "All Branches" }, ...(res.vendors || [])]);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setFetchingBranches(false);
    }
  };

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const res = await getMainVendorBuyers({ branchId: selectedBranch });
      if (res.status) {
        setBuyers(res.buyers || []);
      }
    } catch (error) {
      console.error("Error fetching buyers:", error);
      toast.error("Failed to load buyers");
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = branches.map((b) => ({ label: b.name, value: b._id || b.id }));

  const filteredBuyers = buyers.filter((buyer) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      buyer.name.toLowerCase().includes(q) ||
      (buyer.email || "").toLowerCase().includes(q) ||
      (buyer.phone || "").toLowerCase().includes(q)
    );
  });

  const [confirmInfo, setConfirmInfo] = useState({ isOpen: false, buyerId: null });

  const confirmDeleteBuyer = (id) => {
    setConfirmInfo({ isOpen: true, buyerId: id });
  };

  const handleConfirmClose = () => {
    setConfirmInfo({ isOpen: false, buyerId: null });
  };

  const handleConfirm = () => {
    toast.info("Delete functionality not implemented yet");
    handleConfirmClose();
  };

  return (
    <div className="buyers">
      <div className="content-header">
        <div className="header-top">
          <h1>Buyers Management</h1>
          <BackButton />
        </div>
        <div className="breadcrumb">
          <span>Vendor</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span>Buyers</span>
        </div>
      </div>

      <div className="content-body">
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label className="form-label">Select Branch</label>
          <SearchableSelect
            name="branch"
            options={branchOptions}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            placeholder={fetchingBranches ? "Loading branches..." : "All Branches"}
            disabled={fetchingBranches}
          />
        </div>
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search buyers by name, email or phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '40px' }}
            />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
              <VoiceSearch onSearch={(text) => setSearchTerm(text)} minimal={true} />
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching buyers..." />
        ) : (
          <>
            <div className="card-list">
              {filteredBuyers.map((buyer) => (
                <div key={buyer.id} className="data-card">
                  <div className="data-card-header">
                    <div>
                      <div className="data-card-title">{buyer.name}</div>
                      <div className="data-card-subtitle">{buyer.branch}</div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="icon-btn edit"
                        title="Edit Buyer"
                        disabled
                        style={{ opacity: 0.5, cursor: "not-allowed" }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn delete"
                        title="Delete Buyer"
                        onClick={() => confirmDeleteBuyer(buyer.id)}
                        disabled
                        style={{ opacity: 0.5, cursor: "not-allowed" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="data-card-body">
                    <div className="data-row">
                      <span className="data-label">Contact</span>
                      <span className="data-value">{buyer.phone || "N/A"}</span>
                    </div>
                    {buyer.email && (
                      <div className="data-row">
                        <span className="data-label">Email</span>
                        <span className="data-value">{buyer.email}</span>
                      </div>
                    )}
                    <div className="data-row">
                      <span className="data-label">Location</span>
                      <span className="data-value">
                        {[buyer.city, buyer.state]
                          .filter(Boolean)
                          .join(", ") || buyer.address || "N/A"}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="data-label">Status</span>
                      <span
                        className={`badge ${buyer.status === "inactive" ? "badge-error" : "badge-success"
                          }`}
                        style={{
                          marginLeft: "auto",
                          width: "fit-content",
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.75rem",
                          fontWeight: 600,
                          borderRadius: "9999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                      {buyer.status === "inactive" ? "Disabled" : "Enabled"}
                    </span>
                  </div>
                </div>
                </div>
              ))}
          </div>

        {filteredBuyers.length === 0 && (
          <div className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
            <div className="empty-state-icon" style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛒</div>
            <p>No buyers found.</p>
          </div>
        )}
      </>
        )}
      <ConfirmationModal
        isOpen={confirmInfo.isOpen}
        onClose={handleConfirmClose}
        title="Delete Buyer"
        message="Are you sure you want to delete this buyer?"
        onConfirm={handleConfirm}
      />
    </div>
    </div >
  );
}

export default Buyers;
