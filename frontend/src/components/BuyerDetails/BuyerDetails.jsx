import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  getBuyers,
  getBuyerSummary,
  addBuyer,
  updateBuyer,
  deleteBuyer,
  addBuyerPayment,
} from "../../api/buyerApi";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import ConfirmationModal from "../Common/ConfirmationModal";
import jsPDF from "jspdf";
import { getBillingData } from "../../api/billingApi";
import "./BuyerDetails.css";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ShoppingCart,
  Search,
  Eye,
  Download,
  Loader,
} from "lucide-react";
import SearchableSelect from "../Common/SearchableSelect";
import LoadingSpinner from "../Common/LoadingSpinner";
import BackButton from "../Common/BackButton";
import VoiceSearch from "../Common/VoiceSearch";
import { toast } from "react-toastify";

function BuyerDetails() {
  const vendorIdFromRedux = useSelector((state) => state.vendorAuth?.vendorId);
  const vendorId = vendorIdFromRedux || sessionStorage.getItem("vendorId");
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    name: "",
    contact: "",
    address: "",
    state: "",
    city: "",
    email: "",
  });

  // ── Edit Buyer modal ─────────────────────────────────
  const [showEditBuyerModal, setShowEditBuyerModal] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [editBuyerCities, setEditBuyerCities] = useState([]);
  const [loadingEditBuyerCities, setLoadingEditBuyerCities] = useState(false);

  // State / City for Add Buyer form
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [activeTab, setActiveTab] = useState("purchases");

  // Payment Modal State
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Transaction View Modal State
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // -- Date Filter --
  const [dateFilter, setDateFilter] = useState("all"); // today, selected, range, all
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fetchingPdf, setFetchingPdf] = useState(false);

  const handleViewTransaction = (transaction) => {
    const product = transaction.productId;
    if (product) {
      const variant = (product.variants || []).find(
        (v) =>
          v._id === transaction.variantId || v.id === transaction.variantId,
      );
      setViewingTransaction({
        ...transaction,
        productImage: product.image,
        productName: product.name,
        productDate: product.date,
        variantDetails: variant,
        price: transaction.rate,
        quantity: transaction.quantity,
      });
      setShowTransactionModal(true);
    }
  };

  useEffect(() => {
    if (vendorId) {
      loadBuyers();
      fetchStates();
    }
  }, [vendorId]);

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
    if (!stateName) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      setCities(data.error ? [] : data.data.map((c) => ({ name: c })));
    } catch (err) {
      console.error("Error fetching cities:", err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadBuyers = async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const response = await getBuyers(vendorId);
      const buyersData = response.data || [];
      setBuyers(buyersData);
      if (selectedBuyer) {
        handleViewBuyer(selectedBuyer);
      }
    } catch (error) {
      console.error("Error loading buyers:", error);
      toast.error("Failed to load buyers");
    } finally {
      setLoading(false);
    }
  };

  const handleViewBuyer = async (buyer) => {
    const bid = buyer._id || buyer.id;
    try {
      const response = await getBuyerSummary(bid);
      if (response.success) {
        const summaryData = response.data;
        setSelectedBuyer({
          ...summaryData.buyer,
          enrichedProducts: summaryData.products || [],
          transactions: summaryData.transactions || [],
          payments: summaryData.payments || [],
        });
        setLedger(summaryData.ledger || []);
      }
    } catch (error) {
      console.error("Error fetching buyer summary:", error);
      toast.error("Failed to load buyer details");
    }
  };

  const handleBackToBuyers = () => {
    setSelectedBuyer(null);
  };

  const handleToggleStatus = async (id) => {
    const buyer = buyers.find((b) => b._id === id);
    if (!buyer) return;
    try {
      const newStatus = buyer.status === "inactive" ? "active" : "inactive";
      await updateBuyer(id, { status: newStatus });
      toast.success(`Buyer ${newStatus === "active" ? "enabled" : "disabled"}`);
      loadBuyers();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleAddBuyer = async (e) => {
    e.preventDefault();
    const errors = validateBuyerForm(newBuyer);
    if (Object.keys(errors).length > 0) {
      setBuyerFormErrors(errors);
      return;
    }
    setBuyerFormErrors({});
    try {
      await addBuyer({ vendorId, ...newBuyer, status: "active" });
      setNewBuyer({
        name: "",
        contact: "",
        address: "",
        state: "",
        city: "",
        email: "",
      });
      setCities([]);
      setShowAddModal(false);
      toast.success("Buyer added successfully");
      loadBuyers();
    } catch (error) {
      toast.error(error.message || "Failed to add buyer");
    }
  };

  const [buyerFormErrors, setBuyerFormErrors] = useState({});
  const validateBuyerForm = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.contact?.trim()) errors.contact = "Contact number is required";
    else if (!/^\d{10}$/.test(data.contact.trim()))
      errors.contact = "Contact must be exactly 10 digits";
    if (data.email?.trim() && !/^[^@]+@gmail\.com$/i.test(data.email.trim()))
      errors.email = "Email must end with @gmail.com";
    return errors;
  };

  const openEditBuyerModal = (buyer) => {
    setEditingBuyer({ ...buyer });
    setEditBuyerCities([]);
    if (buyer.state) fetchEditBuyerCities(buyer.state);
    setShowEditBuyerModal(true);
  };

  const fetchEditBuyerCities = async (stateName) => {
    if (!stateName) {
      setEditBuyerCities([]);
      return;
    }
    setLoadingEditBuyerCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      setEditBuyerCities(data.error ? [] : data.data.map((c) => ({ name: c })));
    } catch (err) {
      console.error("Error fetching edit cities:", err);
    } finally {
      setLoadingEditBuyerCities(false);
    }
  };

  const handleEditBuyer = async (e) => {
    e.preventDefault();
    if (!editingBuyer) return;
    const errors = validateBuyerForm(editingBuyer);
    if (Object.keys(errors).length > 0) {
      setBuyerFormErrors(errors);
      return;
    }
    setBuyerFormErrors({});
    try {
      await updateBuyer(editingBuyer._id || editingBuyer.id, {
        name: editingBuyer.name,
        contact: editingBuyer.contact,
        email: editingBuyer.email,
        state: editingBuyer.state,
        city: editingBuyer.city,
        address: editingBuyer.address,
      });
      toast.success("Buyer updated successfully!");
      setShowEditBuyerModal(false);
      setEditingBuyer(null);
      if (
        selectedBuyer &&
        (selectedBuyer._id || selectedBuyer.id) ===
          (editingBuyer._id || editingBuyer.id)
      ) {
        setSelectedBuyer((prev) => ({ ...prev, ...editingBuyer }));
      }
      loadBuyers();
    } catch (err) {
      toast.error(err?.message || "Failed to update buyer");
    }
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState(null);

  const handleDeleteClick = (id) => {
    setBuyerToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteBuyer = async () => {
    if (buyerToDelete) {
      try {
        await deleteBuyer(buyerToDelete);
        toast.success("Buyer deleted successfully");
        loadBuyers();
        setIsDeleteConfirmOpen(false);
        setBuyerToDelete(null);
      } catch (error) {
        toast.error("Failed to delete buyer");
      }
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      await addBuyerPayment({
        vendorId,
        buyerId: selectedBuyer._id || selectedBuyer.id,
        productId: paymentConfig.productId || null,
        isGlobalPay: paymentConfig.isGlobalPay || false,
        date: paymentDate,
        amount: amount,
        method: paymentMethod,
        note:
          paymentNote ||
          (paymentConfig.isGlobalPay ? "Global Payment" : "Product Payment"),
        reference: `PAY-${Date.now()}`,
      });
      loadBuyers();
      // Also need to refresh selected buyer details
      handleViewBuyer(selectedBuyer);
      setShowRecordPaymentModal(false);
      setPaymentAmount("");
      setPaymentNote("");
      toast.success(
        `Payment of ₹${amount.toLocaleString()} recorded successfully.`,
      );
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const openPaymentModal = () => {
    setPaymentConfig({
      targetName: selectedBuyer.name,
      maxAmount: selectedBuyer.balance,
      isGlobalPay: true,
      type: "general",
    });
    setPaymentAmount(selectedBuyer.balance?.toString() || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setPaymentNote("");
    setShowRecordPaymentModal(true);
  };

  const handlePayProduct = (product) => {
    setPaymentConfig({
      targetName: product.name,
      maxAmount: product.totalBalance,
      productId: product.id,
      isGlobalPay: false,
      type: "product",
    });
    setPaymentAmount(product.totalBalance?.toString() || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setPaymentNote(`Payment for ${product.name}`);
    setShowRecordPaymentModal(true);
  };

  // Product View modal state
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showProductViewModal, setShowProductViewModal] = useState(false);

  const handleViewProduct = (productId) => {
    const product = selectedBuyer.enrichedProducts.find(
      (p) => p.id === productId,
    );
    if (!product) return;

    setViewingProduct({
      ...product,
      stats: {
        amount: product.totalGross || 0,
        paid: product.totalPaid || 0,
        balance: product.totalBalance || 0,
      },
      relatedTransactions: (selectedBuyer.transactions || []).filter((t) => {
        const tid = t.productId?._id?.toString() || t.productId?.toString();
        return tid === productId;
      }),
    });
    setShowProductViewModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!selectedBuyer) return;
    setFetchingPdf(true);
    try {
      let finalStart = startDate;
      let finalEnd = endDate;

      if (dateFilter === "today") {
        finalStart = new Date().toISOString().split("T")[0];
        finalEnd = finalStart;
      } else if (dateFilter === "selected") {
        finalEnd = startDate;
      } else if (dateFilter === "all") {
        finalStart = "";
        finalEnd = "";
      }

      const params = {
        type: "buyer",
        subType:
          activeTab === "purchases" ? "purchase_history" : "payments_history",
        id: selectedBuyer._id || selectedBuyer.id,
        startDate: finalStart,
        endDate: finalEnd,
        vendorId: vendorId,
      };

      const response = await getBillingData(params);
      if (response.success) {
        generatePDF({
          ...response,
          finalStart,
          finalEnd,
          subOption: params.subType,
        });
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch PDF data");
    } finally {
      setFetchingPdf(false);
    }
  };

  const generatePDF = (response) => {
    const { vendor, data, finalStart, finalEnd, subOption } = response;
    const doc = new jsPDF();
    const formatDateStr = (d) => {
      if (!d) return "All Time";
      return formatDate(d);
    };

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 52);
    doc.text("AUCTION BILLING SYSTEM", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Buyer Report", 105, 26, { align: "center" });
    doc.line(10, 32, 200, 32);

    // --- Vendor Details ---
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("VENDOR DETAILS", 10, 42);
    doc.setFontSize(10);
    doc.text(`Name: ${vendor.name}`, 10, 48);
    doc.text(`Contact: ${vendor.phone || "N/A"}`, 10, 53);
    doc.text(`Address: ${vendor.address || "N/A"}`, 10, 58);

    // --- Buyer Details ---
    let yPos = 75;
    doc.setFontSize(14);
    doc.text("BUYER DETAILS", 10, yPos);
    doc.setFontSize(10);
    doc.text(`Name: ${data.buyer.name}`, 10, yPos + 6);
    doc.text(`Contact: ${data.buyer.contact}`, 10, yPos + 11);
    doc.text(`Address: ${data.buyer.address || "N/A"}`, 10, yPos + 16);
    yPos += 25;

    doc.text(
      `Report Period: ${formatDateStr(finalStart)} to ${formatDateStr(finalEnd)}`,
      10,
      yPos,
    );
    yPos += 10;

    const records = data.records || [];
    const headers =
      subOption === "purchase_history"
        ? ["Date", "Product", "Qty", "Rate", "Total Amount"]
        : ["Date", "Description", "Debit", "Credit", "Balance"];

    doc.setFont("helvetica", "bold");
    let xOffsets =
      subOption === "purchase_history"
        ? [10, 35, 80, 110, 150]
        : [10, 40, 90, 130, 170];

    headers.forEach((h, i) => doc.text(h, xOffsets[i], yPos));
    yPos += 5;
    doc.line(10, yPos, 200, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    records.forEach((rec) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      let row = [];
      if (subOption === "purchase_history") {
        row = [
          formatDate(rec.date),
          rec.productId?.name || "N/A",
          rec.quantity?.toString() || "0",
          `Rs. ${rec.rate || 0}`,
          `Rs. ${rec.finalAmount || 0}`,
        ];
      } else {
        row = [
          formatDate(rec.date),
          rec.description || "N/A",
          `Rs. ${rec.debit || 0}`,
          `Rs. ${rec.credit || 0}`,
          `Rs. ${rec.balance || 0}`,
        ];
      }
      row.forEach((cell, i) => doc.text(String(cell), xOffsets[i], yPos));
      yPos += 8;
    });

    // Totals
    doc.line(10, yPos, 200, yPos);
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text(data.totalLabel || "TOTAL", xOffsets[0], yPos);
    doc.text(
      `Rs. ${data.totalValue || 0}`,
      xOffsets[xOffsets.length - 1],
      yPos,
    );

    doc.save(`Buyer_Report_${data.buyer.name}_${Date.now()}.pdf`);
    toast.success("PDF Downloaded successfully");
  };

  const isMatchDate = (date) => {
    if (dateFilter === "all") return true;
    const dStr = date ? new Date(date).toISOString().split("T")[0] : "";
    if (dateFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      return dStr === today;
    }
    if (dateFilter === "selected") {
      return dStr === startDate;
    }
    if (dateFilter === "range") {
      return dStr >= startDate && dStr <= endDate;
    }
    return true;
  };

  const filteredProducts =
    selectedBuyer?.enrichedProducts?.filter((p) => isMatchDate(p.date)) || [];
  const filteredLedger =
    ledger?.filter((entry) => isMatchDate(entry.date)) || [];

  const totalBills = filteredProducts.reduce(
    (sum, p) => sum + (p.totalGross || 0),
    0,
  );
  const totalPaid = filteredProducts.reduce(
    (sum, p) => sum + (p.totalPaid || 0),
    0,
  );
  const totalBalance = filteredProducts.reduce(
    (sum, p) => sum + (p.totalBalance || 0),
    0,
  );

  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteBuyer}
        title="Delete Buyer"
        message="Are you sure you want to delete this buyer?"
        subMessage="This action will remove the buyer and their entire purchase history."
        confirmText="Yes, Delete Buyer"
        cancelText="Cancel"
        variant="danger"
      />
      <div className="content-header">
        <div className="header-top">
          <h1>{selectedBuyer ? "Buyer Details" : "Buyers"}</h1>
          <BackButton />
        </div>
        <div className="breadcrumb-row">
          <div className="breadcrumb">
            <span>Home</span>
            <span className="breadcrumb-separator">/</span>
            <span
              onClick={selectedBuyer ? handleBackToBuyers : undefined}
              style={{
                cursor: selectedBuyer ? "pointer" : "default",
                textDecoration: selectedBuyer ? "underline" : "none",
              }}
            >
              Buyers
            </span>
            {selectedBuyer && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span>{selectedBuyer.name}</span>
              </>
            )}
          </div>
          {selectedBuyer ? (
            <button
              className="btn btn-secondary"
              onClick={handleBackToBuyers}
            >
              <span>←</span> Back to List
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              <span>Add Buyer</span>
            </button>
          )}
        </div>
      </div>
      <div className="content-body">
        {!selectedBuyer ? (
          <>
            <div className="section-header">
              <h3 className="section-title">All Buyers ({buyers.length})</h3>
            </div>

            <div className="card fade-in buyer-search-card">
              <div className="form-group buyer-search-form-group">
                <div style={{ position: "relative", width: "100%" }}>
                  <Search
                    size={20}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search buyer by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="buyer-search-input"
                    style={{ paddingLeft: "40px", paddingRight: "40px", width: "100%" }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                    <VoiceSearch onSearch={(text) => setSearchQuery(text)} minimal={true} />
                  </div>
                </div>
              </div>
            </div>
            <div className="card-list fade-in">
              {loading ? (
                <LoadingSpinner message="Loading buyers..." />
              ) : buyers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <ShoppingCart />
                  </div>
                  <p>No buyers registered yet</p>
                </div>
              ) : (
                buyers
                  .filter((buyer) =>
                    (buyer.name || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                  .map((buyer) => (
                    <div
                      key={buyer._id || buyer.id}
                      className="data-card buyer-clickable-card"
                      onClick={() => handleViewBuyer(buyer)}
                    >
                      <div className="data-card-header">
                        <div>
                          <div className="data-card-title">{buyer.name}</div>
                          <div className="data-card-subtitle">
                            {buyer.contact}
                          </div>
                        </div>
                        <div
                          style={{ display: "flex", gap: "6px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="icon-btn edit"
                            onClick={() => openEditBuyerModal(buyer)}
                            title="Edit Buyer"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() =>
                              handleDeleteClick(buyer._id || buyer.id)
                            }
                            title="Delete Buyer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="data-card-body">
                        <div className="data-row">
                          <span className="data-label">Location</span>
                          <span className="data-value">
                            {[buyer.city, buyer.state]
                              .filter(Boolean)
                              .join(", ") ||
                              buyer.address ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Login Access</span>
                          <span
                            className={`data-value badge ${buyer.status === "inactive" ? "badge-error" : "badge-success"}`}
                          >
                            {buyer.status === "inactive"
                              ? "Disabled"
                              : "Enabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        ) : (
          /* Detailed View */
          <div className="fade-in">
            <div
              className="card buyer-profile-container"
              style={{ marginBottom: "2rem" }}
            >
              <div className="buyer-profile-layout">
                <div className="buyer-profile-info">
                  <div className="data-row" style={{ marginBottom: "0.25rem" }}>
                    <span className="data-label"></span>
                    <span
                      className="data-value"
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button
                        className="icon-btn edit"
                        onClick={() => openEditBuyerModal(selectedBuyer)}
                        title="Edit Buyer"
                        style={{ width: "28px", height: "28px" }}
                      >
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Contact</span>
                    <span className="data-value">{selectedBuyer.contact}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Email</span>
                    <span className="data-value">
                      {selectedBuyer.email || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">State</span>
                    <span className="data-value">
                      {selectedBuyer.state || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">City</span>
                    <span className="data-value">
                      {selectedBuyer.city || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Address</span>
                    <span className="data-value">
                      {selectedBuyer.address || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Total Outstanding</span>
                    <span
                      className={`data-value ${selectedBuyer.balance > 0 ? "text-error" : "text-success"}`}
                      style={{ fontWeight: "bold" }}
                    >
                      {selectedBuyer.balance <= 0
                        ? "Rs. 0"
                        : `₹${(selectedBuyer.balance || 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Advance / Excess</span>
                    <span
                      className="data-value text-success"
                      style={{ fontWeight: "bold" }}
                    >
                      ₹{(selectedBuyer.advanceAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Login Access</span>
                    <span
                      onClick={() =>
                        handleToggleStatus(
                          selectedBuyer._id || selectedBuyer.id,
                        )
                      }
                      className={`cursor-pointer badge btn ${selectedBuyer.status === "inactive" ? "btn-success" : "btn-error"} buyer-status-toggle-btn`}
                    >
                      {selectedBuyer.status === "inactive"
                        ? "Enable Login"
                        : "Disable Login"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-actions-bar">
              <div className="filter-controls">
                <select
                  className="form-control filter-select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">All Date</option>
                  <option value="today">Today</option>
                  <option value="selected">Selected Date</option>
                  <option value="range">Date Range</option>
                </select>

                {dateFilter !== "all" && dateFilter !== "today" && (
                  <div className="filter-date-inputs fade-in">
                    <input
                      type="date"
                      className="form-control filter-date-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    {dateFilter === "range" && (
                      <input
                        type="date"
                        className="form-control filter-date-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="action-buttons buyer-detail-actions">
                <button
                  className="btn btn-primary action-btn-responsive"
                  onClick={openPaymentModal}
                >
                  <Plus size={16} />
                  <span>Pay In</span>
                </button>
              </div>
            </div>

            <div className="buyer-history-tabs">
              <button
                className={`buyer-tab-button ${activeTab === "purchases" ? "active" : ""}`}
                onClick={() => setActiveTab("purchases")}
              >
                Buying Products
              </button>
              <button
                className={`buyer-tab-button ${activeTab === "payments" ? "active" : ""}`}
                onClick={() => setActiveTab("payments")}
              >
                Payment History
              </button>
            </div>

            {activeTab === "purchases" ? (
              <div className="table-wrapper buyer-history-table-wrapper">
                <table className="buyer-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Total Bill</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-td">
                          No purchases found for this date
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.date)}</td>
                          <td className="bold-product">
                            {p.name || "Unknown"}
                          </td>
                          <td>₹{(p.totalGross || 0).toLocaleString()}</td>
                          <td className="text-success">
                            ₹{(p.totalPaid || 0).toLocaleString()}
                          </td>
                          <td
                            className={`text-error ${p.totalBalance > 0 ? "font-bold" : ""}`}
                          >
                            ₹{Math.max(0, p.totalBalance || 0).toLocaleString()}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <button
                                className="btn btn-sm btn-info"
                                onClick={() => handleViewProduct(p.id)}
                                title="View"
                              >
                                <Eye size={16} />
                              </button>
                              {p.totalBalance > 0 && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handlePayProduct(p)}
                                  title="Pay"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredProducts.length > 0 && (
                    <tfoot
                      style={{ background: "#f8f9fa", fontWeight: "bold" }}
                    >
                      <tr>
                        <td colSpan="2">TOTAL</td>
                        <td>₹{totalBills.toLocaleString()}</td>
                        <td className="text-success">
                          ₹{totalPaid.toLocaleString()}
                        </td>
                        <td className="text-error">
                          ₹{totalBalance.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="table-wrapper buyer-history-table-wrapper">
                <table className="buyer-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Debit (Buy)</th>
                      <th>Credit (Pay)</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-td">
                          No transactions found for this date
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry, index) => (
                        <tr key={entry.id || index}>
                          <td>
                            {formatDateTime(entry.createdAt || entry.date)}
                          </td>
                          <td>{entry.description}</td>
                          <td className="text-amber">
                            {entry.debit > 0
                              ? `₹${entry.debit.toLocaleString()}`
                              : "-"}
                          </td>
                          <td className="text-success">
                            {entry.credit > 0
                              ? `₹${entry.credit.toLocaleString()}`
                              : "-"}
                          </td>
                          <td style={{ fontWeight: "bold", color: "black" }}>
                            {entry.balance < 0
                              ? `Adv: ₹${Math.abs(entry.balance).toLocaleString()}`
                              : `₹${entry.balance.toLocaleString()}`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredLedger.length > 0 && (
                    <tfoot
                      style={{ background: "#f8f9fa", fontWeight: "bold" }}
                    >
                      <tr>
                        <td colSpan="4">CLOSING BALANCE</td>
                        <td>
                          {filteredLedger[filteredLedger.length - 1].balance < 0
                            ? `Adv: ₹${Math.abs(filteredLedger[filteredLedger.length - 1].balance).toLocaleString()}`
                            : `₹${filteredLedger[filteredLedger.length - 1].balance.toLocaleString()}`}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showRecordPaymentModal && selectedBuyer && (
        <div
          className="modal-overlay"
          onClick={() => setShowRecordPaymentModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Pay In</h3>
              <button
                className="modal-close"
                onClick={() => setShowRecordPaymentModal(false)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="data-row payment-modal-row">
                  <span className="data-label">Buyer Name</span>
                  <span className="data-value">{selectedBuyer.name}</span>
                </div>
                <div className="data-row payment-modal-row">
                  <span className="data-label">Outstanding Balance</span>
                  <span className="data-value text-error">
                    ₹{selectedBuyer.balance.toLocaleString()}
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Received via..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Gpay">Gpay</option>
                    <option value="UPI">UPI</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="1"
                    placeholder="Enter amount"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRecordPaymentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction View Modal */}
      {showTransactionModal && viewingTransaction && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setShowTransactionModal(false)}
        >
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Purchase Details</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransactionModal(false)}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div
                className="product-view-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div className="product-view-summary">
                  <div className="product-info-details">
                    <div className="stats-grid product-stats-grid">
                      <div className="product-stat-box">
                        <span className="product-stat-label">Product Name</span>
                        <b className="product-stat-val">{viewingTransaction.productName}</b>
                      </div>
                      <div className="product-stat-box">
                        <span className="product-stat-label">Date</span>
                        <b className="product-stat-val">{formatDate(viewingTransaction.date)}</b>
                      </div>
                      <div className="product-stat-box">
                        <span className="product-stat-label">Bill Amount</span>
                        <b className="product-stat-val">
                          ₹{viewingTransaction.finalAmount?.toLocaleString()}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 style={{ margin: "0 0 10px 0" }}>Item Details</h4>
                <div className="table-wrapper">
                  <table className="buyer-history-table">
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingTransaction.variantDetails ? (
                        <tr>
                          <td>{viewingTransaction.variantDetails.variety}</td>
                          <td>
                            {viewingTransaction.quantity}{" "}
                            {viewingTransaction.variantDetails.unit}
                          </td>
                          <td>
                            ₹{viewingTransaction.price}/
                            {viewingTransaction.variantDetails.unit}
                          </td>
                          <td>
                            ₹{viewingTransaction.finalAmount?.toLocaleString()}
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="4">
                            {viewingTransaction.details ? (
                              <span>{viewingTransaction.details}</span>
                            ) : (
                              <span>
                                Variant details not found (Legacy Record)
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTransactionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Buyer Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setBuyerFormErrors({});
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Buyer</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setBuyerFormErrors({});
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleAddBuyer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={newBuyer.name}
                    onChange={(e) => {
                      setNewBuyer({ ...newBuyer, name: e.target.value });
                      setBuyerFormErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Full Name"
                    className={buyerFormErrors.name ? "input-error" : ""}
                  />
                  {buyerFormErrors.name && (
                    <small className="field-error">
                      {buyerFormErrors.name}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    value={newBuyer.contact}
                    onChange={(e) => {
                      setNewBuyer({ ...newBuyer, contact: e.target.value });
                      setBuyerFormErrors((p) => ({ ...p, contact: "" }));
                    }}
                    placeholder="10-digit Mobile Number"
                    maxLength={10}
                    className={buyerFormErrors.contact ? "input-error" : ""}
                  />
                  {buyerFormErrors.contact && (
                    <small className="field-error">
                      {buyerFormErrors.contact}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Mail Id (Email){" "}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newBuyer.email}
                    onChange={(e) => {
                      setNewBuyer({ ...newBuyer, email: e.target.value });
                      setBuyerFormErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="example@gmail.com"
                    className={buyerFormErrors.email ? "input-error" : ""}
                  />
                  {buyerFormErrors.email && (
                    <small className="field-error">
                      {buyerFormErrors.email}
                    </small>
                  )}
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <SearchableSelect
                      name="state"
                      value={newBuyer.state}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewBuyer((prev) => ({
                          ...prev,
                          state: val,
                          city: "",
                        }));
                        fetchCities(val);
                      }}
                      placeholder={
                        loadingStates ? "Loading..." : "Select State"
                      }
                      options={states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      }))}
                      disabled={loadingStates}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <SearchableSelect
                      name="city"
                      value={newBuyer.city}
                      onChange={(e) =>
                        setNewBuyer((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder={
                        loadingCities
                          ? "Loading cities..."
                          : !newBuyer.state
                            ? "Select state first"
                            : "Select City"
                      }
                      options={cities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!newBuyer.state || loadingCities}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    value={newBuyer.address}
                    onChange={(e) =>
                      setNewBuyer({ ...newBuyer, address: e.target.value })
                    }
                    rows="2"
                    placeholder="Street / Shop / Office details"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Buyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Buyer Modal ── */}
      {showEditBuyerModal && editingBuyer && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditBuyerModal(false);
            setBuyerFormErrors({});
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Buyer</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditBuyerModal(false);
                  setBuyerFormErrors({});
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleEditBuyer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={editingBuyer.name}
                    onChange={(e) => {
                      setEditingBuyer({
                        ...editingBuyer,
                        name: e.target.value,
                      });
                      setBuyerFormErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Full Name"
                    className={buyerFormErrors.name ? "input-error" : ""}
                  />
                  {buyerFormErrors.name && (
                    <small className="field-error">
                      {buyerFormErrors.name}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="tel"
                    value={editingBuyer.contact}
                    onChange={(e) => {
                      setEditingBuyer({
                        ...editingBuyer,
                        contact: e.target.value,
                      });
                      setBuyerFormErrors((p) => ({ ...p, contact: "" }));
                    }}
                    placeholder="10-digit Mobile Number"
                    maxLength={10}
                    className={buyerFormErrors.contact ? "input-error" : ""}
                  />
                  {buyerFormErrors.contact && (
                    <small className="field-error">
                      {buyerFormErrors.contact}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Email{" "}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingBuyer.email || ""}
                    onChange={(e) => {
                      setEditingBuyer({
                        ...editingBuyer,
                        email: e.target.value,
                      });
                      setBuyerFormErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="example@gmail.com"
                    className={buyerFormErrors.email ? "input-error" : ""}
                  />
                  {buyerFormErrors.email && (
                    <small className="field-error">
                      {buyerFormErrors.email}
                    </small>
                  )}
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <SearchableSelect
                      name="state"
                      value={editingBuyer.state || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingBuyer((prev) => ({
                          ...prev,
                          state: val,
                          city: "",
                        }));
                        fetchEditBuyerCities(val);
                      }}
                      placeholder={
                        loadingStates ? "Loading..." : "Select State"
                      }
                      options={states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      }))}
                      disabled={loadingStates}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <SearchableSelect
                      name="city"
                      value={editingBuyer.city || ""}
                      onChange={(e) =>
                        setEditingBuyer((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder={
                        loadingEditBuyerCities
                          ? "Loading cities..."
                          : !editingBuyer.state
                            ? "Select state first"
                            : "Select City"
                      }
                      options={editBuyerCities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!editingBuyer.state || loadingEditBuyerCities}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    value={editingBuyer.address || ""}
                    onChange={(e) =>
                      setEditingBuyer({
                        ...editingBuyer,
                        address: e.target.value,
                      })
                    }
                    rows="2"
                    placeholder="Street / Shop / Office details"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditBuyerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Product View Modal ── */}
      {showProductViewModal && viewingProduct && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setShowProductViewModal(false)}
        >
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Product Details</h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  className="modal-close"
                  onClick={() => setShowProductViewModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div
                className="product-view-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  <div className="product-info-details" style={{ flex: 1 }}>
                    <div
                      className="stats-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginBottom: "20px",
                        background: "#f8f9fa",
                        padding: "15px",
                        borderRadius: "8px",
                      }}
                    >
                      <div>
                        Product Name: <b>{viewingProduct.name}</b>
                      </div>
                      <div>
                        Total Bill:{" "}
                        <b>
                          ₹
                          {(viewingProduct.stats?.amount || 0).toLocaleString()}
                        </b>
                      </div>
                      <div className="text-success">
                        Total Paid:{" "}
                        <b>
                          ₹{(viewingProduct.stats?.paid || 0).toLocaleString()}
                        </b>
                      </div>
                      <div className="text-error">
                        Total Balance:{" "}
                        <b>
                          ₹
                          {(
                            viewingProduct.stats?.balance || 0
                          ).toLocaleString()}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 style={{ margin: "0 0 10px 0" }}>Variety Details</h4>
                <div className="table-wrapper">
                  <table className="buyer-history-table">
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Qty Purchased</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProduct.variants
                        .filter((v) => v.purchaseQuantity > 0)
                        .map((v, idx) => (
                          <tr key={idx}>
                            <td>{v.variety}</td>
                            <td>
                              {v.purchaseQuantity || 0} {v.unit}
                            </td>
                            <td>₹{(v.stats?.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      {viewingProduct.variants.filter(
                        (v) => v.purchaseQuantity > 0,
                      ).length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center">
                            No purchased variants found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowProductViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BuyerDetails;
