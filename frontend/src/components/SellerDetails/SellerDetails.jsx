import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import ConfirmationModal from "../Common/ConfirmationModal";
import "./SellerDetails.css";
import {
  Plus,
  Trash2,
  X,
  Eye,
  Search,
  Loader,
  Pencil,
  Download,
  Edit2,
} from "lucide-react";
import SearchableSelect from "../Common/SearchableSelect";
import LoadingSpinner from "../Common/LoadingSpinner";
import BackButton from "../Common/BackButton";
import VoiceSearch from "../Common/VoiceSearch";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { getBillingData } from "../../api/billingApi";
import {
  getSellers,
  createSeller,
  updateSeller,
  deleteSeller,
  toggleSellerStatus,
  recordSellerPayment,
  getSellerPayments,
  getSellerSummary,
} from "../../api/sellerApi";

function SellerDetails() {
  // ── Auth ─────────────────────────────────────────────
  const { vendorId } = useSelector((state) => state.vendorAuth);
  const currentVendorId = vendorId || sessionStorage.getItem("vendorId");

  // ── Sellers list ──────────────────────────────────────
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allSellerPayments, setAllSellerPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("products");

  // ── Add Seller modal ──────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [newSeller, setNewSeller] = useState({
    name: "",
    contact: "",
    address: "",
    state: "",
    city: "",
    email: "",
  });

  // ── Validation helper ────────────────────────────────
  const validateSellerForm = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.contact?.trim()) errors.contact = "Contact number is required";
    else if (!/^\d{10}$/.test(data.contact.trim()))
      errors.contact = "Contact must be exactly 10 digits";
    if (data.email?.trim() && !/^[^@]+@gmail\.com$/i.test(data.email.trim()))
      errors.email = "Email must end with @gmail.com";
    return errors;
  };

  // ── Edit Seller modal ─────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [editCities, setEditCities] = useState([]);
  const [loadingEditCities, setLoadingEditCities] = useState(false);

  // ── State / City (countriesnow) ───────────────────────
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // ── Delete confirm ───────────────────────────────────
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Payment modal ─────────────────────────────────────
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);

  // ── Product view modal ────────────────────────────────
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showProductViewModal, setShowProductViewModal] = useState(false);

  // -- Date Filter --
  const [dateFilter, setDateFilter] = useState("all"); // today, selected, range, all
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fetchingPdf, setFetchingPdf] = useState(false);

  // ── Custom Commission Modal ────────────────────────────
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionData, setCommissionData] = useState({
    customCommission: false,
    commissionPercent: "",
    commissionStartDate: "",
    commissionEndDate: "",
    forever: true,
  });
  const [isCommissionSaving, setIsCommissionSaving] = useState(false);

  // ─────────────────────────────────────────────────────
  //  Init
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (currentVendorId) loadSellers();
    fetchStates();
  }, [currentVendorId]);

  // ─────────────────────────────────────────────────────
  //  State / City API
  // ─────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────
  //  Load Sellers from DB
  // ─────────────────────────────────────────────────────
  const loadSellers = async () => {
    setLoading(true);
    try {
      const res = await getSellers(currentVendorId);
      setSellers(res.data || []);
    } catch (err) {
      console.error("Error loading sellers:", err);
      toast.error(err?.message || "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────
  //  Open seller detail view – fetch summary from API
  // ─────────────────────────────────────────────────────
  const openDetailsModal = async (seller) => {
    setActiveTab("products");
    const sid = seller._id?.toString() || seller.id;
    try {
      const res = await getSellerSummary(sid);
      if (res.success) {
        const {
          seller: profile,
          products,
          ledger,
          transactions,
          payments,
        } = res.data;
        setSelectedSeller({
          ...profile,
          products,
          transactions,
          payments,
        });
        setLedger(ledger);
      }
    } catch (err) {
      console.error("Failed to load seller summary:", err);
      toast.error("Failed to load seller details");
      setSelectedSeller({
        ...seller,
        id: sid,
        products: [],
        payments: [],
        balance: seller.balance,
      });
      setLedger([]);
    }
  };

  const handleBackToSellers = () => setSelectedSeller(null);

  // ─────────────────────────────────────────────────────
  //  Add Seller
  // ─────────────────────────────────────────────────────
  const handleAddSeller = async (e) => {
    e.preventDefault();
    if (!currentVendorId) {
      toast.error("Vendor not authenticated");
      return;
    }
    const errors = validateSellerForm(newSeller);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSaving(true);
    try {
      const payload = { ...newSeller, vendorId: currentVendorId };
      await createSeller(payload);
      toast.success("Seller added successfully!");
      setNewSeller({
        name: "",
        contact: "",
        address: "",
        state: "",
        city: "",
        email: "",
      });
      setCities([]);
      setShowAddModal(false);
      loadSellers();
    } catch (err) {
      toast.error(err?.message || "Failed to add seller");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────
  //  Edit Seller
  // ─────────────────────────────────────────────────────
  const openEditModal = (seller) => {
    setEditingSeller({ ...seller });
    setEditCities([]);
    if (seller.state) fetchEditCities(seller.state);
    setShowEditModal(true);
  };

  const fetchEditCities = async (stateName) => {
    if (!stateName) {
      setEditCities([]);
      return;
    }
    setLoadingEditCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      setEditCities(data.error ? [] : data.data.map((c) => ({ name: c })));
    } catch (err) {
      console.error("Error fetching edit cities:", err);
    } finally {
      setLoadingEditCities(false);
    }
  };

  const handleEditSeller = async (e) => {
    e.preventDefault();
    if (!editingSeller) return;
    const errors = validateSellerForm(editingSeller);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSaving(true);
    try {
      await updateSeller(editingSeller._id || editingSeller.id, {
        name: editingSeller.name,
        contact: editingSeller.contact,
        email: editingSeller.email,
        state: editingSeller.state,
        city: editingSeller.city,
        address: editingSeller.address,
      });
      toast.success("Seller updated successfully!");
      setShowEditModal(false);
      setEditingSeller(null);
      if (
        selectedSeller &&
        (selectedSeller._id || selectedSeller.id) ===
          (editingSeller._id || editingSeller.id)
      ) {
        setSelectedSeller((prev) => ({ ...prev, ...editingSeller }));
      }
      loadSellers();
    } catch (err) {
      toast.error(err?.message || "Failed to update seller");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────
  //  Delete Seller
  // ─────────────────────────────────────────────────────
  const handleDeleteClick = (seller) => {
    setSellerToDelete(seller);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteSeller = async () => {
    if (!sellerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSeller(sellerToDelete._id || sellerToDelete.id);
      toast.success("Seller deleted successfully");
      setIsDeleteConfirmOpen(false);
      setSellerToDelete(null);
      loadSellers();
    } catch (err) {
      toast.error(err?.message || "Failed to delete seller");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────
  //  Toggle Status
  // ─────────────────────────────────────────────────────
  const handleToggleStatus = async (id) => {
    const seller = sellers.find((s) => s.id === id) || selectedSeller;
    if (!seller) return;
    const newStatus = seller.status === "inactive" ? "active" : "inactive";
    try {
      await toggleSellerStatus(id, newStatus);
      toast.success(`Login ${newStatus === "active" ? "enabled" : "disabled"}`);
      if (selectedSeller?.id === id) {
        setSelectedSeller((prev) => ({ ...prev, status: newStatus }));
      }
      loadSellers();
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  // ─────────────────────────────────────────────────────
  //  Payment modal helpers
  // ─────────────────────────────────────────────────────
  const openGlobalPaymentModal = () => {
    setPaymentConfig({
      type: "global",
      targetName: "Global Account",
      isGlobalPay: true,
    });
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setPaymentNote("");
    setShowRecordPaymentModal(true);
  };

  const openProductPaymentModal = (product) => {
    setPaymentConfig({
      type: "product",
      targetId: product.id,
      targetName: product.name,
      maxAmount: Math.max(0, product.totalBalance || 0),
      isGlobalPay: false,
    });
    setPaymentAmount(Math.max(0, product.totalBalance || 0).toString());
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setPaymentNote(`Payment for ${product.name}`);
    setShowRecordPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (
      paymentConfig?.type === "product" &&
      paymentConfig.maxAmount !== undefined &&
      amount > paymentConfig.maxAmount
    ) {
      toast.error(
        `Payment cannot exceed ₹${paymentConfig.maxAmount.toLocaleString()}`,
      );
      return;
    }

    setIsPaymentSaving(true);
    try {
      const payload = {
        vendorId: currentVendorId,
        sellerId: selectedSeller._id || selectedSeller.id,
        productId:
          paymentConfig.type === "product" ? paymentConfig.targetId : null,
        isGlobalPay: paymentConfig.isGlobalPay || false,
        date: paymentDate,
        amount,
        method: paymentMethod,
        type: paymentConfig.type === "product" ? "Sale" : "Payment",
        note:
          paymentNote ||
          (paymentConfig.type === "product"
            ? `Payment for ${paymentConfig.targetName}`
            : "Global Payment"),
        reference: `PAY-${Date.now()}`,
      };

      await recordSellerPayment(payload);
      toast.success(
        `Payment of ₹${amount.toLocaleString()} recorded successfully.`,
      );
      setShowRecordPaymentModal(false);
      setPaymentAmount("");
      setPaymentNote("");
      setPaymentConfig(null);
      // Refresh seller list then re-open detail view
      await loadSellers();
      // Re-fetch payments and rebuild ledger for the currently selected seller
      await openDetailsModal(selectedSeller);
    } catch (err) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedSeller) return;
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
        type: "seller",
        subType:
          activeTab === "products" ? "selling_product" : "payments_history",
        id: selectedSeller._id || selectedSeller.id,
        startDate: finalStart,
        endDate: finalEnd,
        vendorId: currentVendorId,
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

  // ─────────────────────────────────────────────────────
  //  Custom Commission
  // ─────────────────────────────────────────────────────
  const openCommissionModal = () => {
    if (!selectedSeller) return;
    setCommissionData({
      commissionPercent: selectedSeller.customCommission ? (selectedSeller.commissionPercent || "") : "",
      commissionStartDate: selectedSeller.commissionStartDate ? new Date(selectedSeller.commissionStartDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      commissionEndDate: selectedSeller.commissionEndDate ? new Date(selectedSeller.commissionEndDate).toISOString().split("T")[0] : "",
      forever: !selectedSeller.commissionEndDate,
    });
    setShowCommissionModal(true);
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!selectedSeller) return;

    const isCustom = commissionData.commissionPercent !== "" && commissionData.commissionPercent !== null && commissionData.commissionPercent !== undefined;

    if (isCustom && !commissionData.commissionStartDate) {
        toast.error("Please provide a start date.");
        return;
    }

    if (isCustom && !commissionData.forever && !commissionData.commissionEndDate) {
        toast.error("Please provide an end date, or check 'Forever'.");
        return;
    }

    setIsCommissionSaving(true);
    try {
      const payload = {
        customCommission: isCustom,
        commissionPercent: isCustom ? Number(commissionData.commissionPercent) : 0,
        commissionStartDate: isCustom && commissionData.commissionStartDate ? new Date(commissionData.commissionStartDate).toISOString() : null,
        commissionEndDate: isCustom && !commissionData.forever && commissionData.commissionEndDate ? new Date(commissionData.commissionEndDate).toISOString() : null,
      };
      
      await updateSeller(selectedSeller._id || selectedSeller.id, payload);
      toast.success(isCustom ? "Commission configured successfully" : "Custom commission removed, tracking global commission");
      setShowCommissionModal(false);
      
      // Update local state
      setSelectedSeller((prev) => ({
        ...prev,
        ...payload
      }));
      setSellers((prev) => prev.map(s => 
        (s._id || s.id) === (selectedSeller._id || selectedSeller.id) ? { ...s, ...payload } : s
      ));
    } catch (err) {
      toast.error(err?.message || "Failed to update commission configuration");
    } finally {
      setIsCommissionSaving(false);
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
    doc.text("Seller Report", 105, 26, { align: "center" });
    doc.line(10, 32, 200, 32);

    // --- Vendor Details ---
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("VENDOR DETAILS", 10, 42);
    doc.setFontSize(10);
    doc.text(`Name: ${vendor.name}`, 10, 48);
    doc.text(`Contact: ${vendor.phone || "N/A"}`, 10, 53);
    doc.text(`Address: ${vendor.address || "N/A"}`, 10, 58);

    // --- Seller Details ---
    let yPos = 75;
    doc.setFontSize(14);
    doc.text("SELLER DETAILS", 10, yPos);
    doc.setFontSize(10);
    doc.text(`Name: ${data.seller.name}`, 10, yPos + 6);
    doc.text(`Contact: ${data.seller.contact}`, 10, yPos + 11);
    doc.text(`Address: ${data.seller.address || "N/A"}`, 10, yPos + 16);
    yPos += 25;

    doc.text(
      `Report Period: ${formatDateStr(finalStart)} to ${formatDateStr(finalEnd)}`,
      10,
      yPos,
    );
    yPos += 10;

    const records = data.records || [];
    const headers =
      subOption === "selling_product"
        ? ["Date", "Product", "Qty", "Rate", "Total", "Comm", "Net"]
        : ["Date", "Description", "Credit", "Debit", "Balance"];

    doc.setFont("helvetica", "bold");
    let xOffsets =
      subOption === "selling_product"
        ? [10, 35, 75, 95, 120, 145, 170]
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
      if (subOption === "selling_product") {
        row = [
          formatDate(rec.date),
          rec.productId?.name || "N/A",
          rec.quantity?.toString() || "0",
          `Rs. ${rec.rate || 0}`,
          `Rs. ${rec.finalAmount || 0}`,
          `Rs. ${rec.commissionAmount || 0}`,
          `Rs. ${rec.netAmount || 0}`,
        ];
      } else {
        row = [
          formatDate(rec.date),
          rec.description || "N/A",
          `Rs. ${rec.credit || 0}`,
          `Rs. ${rec.debit || 0}`,
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

    doc.save(`Seller_Report_${data.seller.name}_${Date.now()}.pdf`);
    toast.success("PDF Downloaded successfully");
  };

  // ─────────────────────────────────────────────────────
  //  Product View
  // ─────────────────────────────────────────────────────
  const handleViewProduct = (productId) => {
    const product = selectedSeller.products.find((p) => p.id === productId);
    if (!product) return;

    setViewingProduct({
      ...product,
      stats: {
        price: (product.totalNet || 0) + (product.totalCommission || 0),
        commission: product.totalCommission || 0,
        net: product.totalNet || 0,
        paid: product.totalPaid || 0,
        balance: product.totalBalance || 0,
      },
      relatedTransactions: (selectedSeller.transactions || []).filter((t) => {
        const tid = t.productId?._id?.toString() || t.productId?.toString();
        return tid === productId;
      }),
    });
    setShowProductViewModal(true);
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
    selectedSeller?.products?.filter((p) => isMatchDate(p.date)) || [];
  const filteredLedger =
    ledger?.filter((entry) => isMatchDate(entry.date)) || [];

  const totalSales = filteredProducts.reduce(
    (sum, p) => sum + (p.totalNet || 0),
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

  // ─────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────
  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteSeller}
        title="Delete Seller"
        message="Are you sure you want to delete this seller?"
        subMessage="This action will remove the seller and their history."
        confirmText="Yes, Delete Seller"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* ── Page Header ── */}
      <div className="content-header">
        <div className="header-top">
          <h1>{selectedSeller ? "Seller Details" : "Sellers"}</h1>
          <BackButton />
        </div>
        <div className="breadcrumb-row">
          <div className="breadcrumb">
            <span>Home</span>
            <span className="breadcrumb-separator">/</span>
            <span
              onClick={selectedSeller ? handleBackToSellers : undefined}
              style={{
                cursor: selectedSeller ? "pointer" : "default",
                textDecoration: selectedSeller ? "underline" : "none",
              }}
            >
              Sellers
            </span>
            {selectedSeller && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span>{selectedSeller.name}</span>
              </>
            )}
          </div>
        {!selectedSeller && (
  <button
    className="btn btn-primary"
    onClick={() => setShowAddModal(true)}
  >
    <Plus size={16} />
    <span>Add Seller</span>
  </button>
)}
        </div>
      </div>

      <div className="content-body">
        {!selectedSeller ? (
          <>
            <div className="section-header">
              <h3 className="section-title">All Sellers ({sellers.length})</h3>
            </div>

            {/* Search */}
            <div className="card fade-in search-card">
              <div className="form-group search-form-group">
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
                    placeholder="Search seller by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: "40px", paddingRight: "40px", width: "100%" }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                    <VoiceSearch onSearch={(text) => setSearchQuery(text)} minimal={true} />
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Cards */}
            <div className="card-list fade-in">
              {loading ? (
                <LoadingSpinner message="Loading sellers..." />
              ) : sellers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👤</div>
                  <p>No sellers registered yet</p>
                </div>
              ) : (
                sellers
                  .filter((s) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((seller) => (
                    <div
                      key={seller.id}
                      className="data-card clickable-card"
                      onClick={() => openDetailsModal(seller)}
                    >
                      <div className="data-card-header">
                        <div>
                          <div className="data-card-title">{seller.name}</div>
                          <div className="data-card-subtitle">
                            {seller.contact}
                          </div>
                        </div>
                        <div
                          style={{ display: "flex", gap: "6px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="icon-btn edit"
                            onClick={() => openEditModal(seller)}
                            title="Edit Seller"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn delete"
                            onClick={() => handleDeleteClick(seller)}
                            title="Delete Seller"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="data-card-body">
                        <div className="data-row">
                          <span className="data-label">Location</span>
                          <span className="data-value">
                            {[seller.city, seller.state]
                              .filter(Boolean)
                              .join(", ") ||
                              seller.address ||
                              "N/A"}
                          </span>
                        </div>

                        <div className="data-row">
                          <span className="data-label">Login Access</span>
                          <span
                            className={`data-value badge ${seller.status === "inactive" ? "badge-error" : "badge-success"}`}
                          >
                            {seller.status === "inactive"
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
          /* Detail View */
          <div className="fade-in">
            <div
              className="card profile-container"
              style={{ marginBottom: "2rem" }}
            >
              <div className="profile-layout">
                <div className="profile-info">
                  <div className="data-row" style={{ marginBottom: "0.25rem" }}>
                    <span className="data-label"></span>
                    <span className="data-value" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="icon-btn edit"
                        onClick={() => openEditModal(selectedSeller)}
                        title="Edit Seller"
                        style={{ width: "28px", height: "28px" }}
                      >
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Contact</span>
                    <span className="data-value">{selectedSeller.contact}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Mail Id</span>
                    <span className="data-value">
                      {selectedSeller.email || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">State</span>
                    <span className="data-value">
                      {selectedSeller.state || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">City</span>
                    <span className="data-value">
                      {selectedSeller.city || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Address</span>
                    <span className="data-value">
                      {selectedSeller.address || "N/A"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Advance Amount</span>
                    <span className="data-value text-success">
                      ₹{(selectedSeller.advanceAmount || 0).toLocaleString()}
                    </span>
                  </div>
                   <div className="data-row">
                    <span className="data-label">Commission Rate</span>
                    <span className="data-value text-success">
                      {selectedSeller.customCommission ? `${selectedSeller.commissionPercent}% (Custom)` : "Global Default"}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Login Access</span>
                    <span
                      onClick={() =>
                        handleToggleStatus(
                          selectedSeller._id || selectedSeller.id,
                        )
                      }
                      className={`cursor-pointer badge btn ${selectedSeller.status === "inactive" ? "btn-success" : "btn-error"} status-toggle-btn`}
                    >
                      {selectedSeller.status === "inactive"
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

              <div className="action-buttons seller-detail-actions">
                <button
                  className="btn btn-secondary action-btn-responsive"
                  onClick={openCommissionModal}
                >
                  <Edit2 size={16} />
                  <span>Customize Commission</span>
                </button>

                <button
                  className="btn btn-primary action-btn-responsive"
                  onClick={openGlobalPaymentModal}
                >
                  <Plus size={16} />
                  <span>Pay Out</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="history-tabs">
              <button
                className={`tab-button ${activeTab === "products" ? "active" : ""}`}
                onClick={() => setActiveTab("products")}
              >
                Selling Products
              </button>
              <button
                className={`tab-button ${activeTab === "payments" ? "active" : ""}`}
                onClick={() => setActiveTab("payments")}
              >
                Payments History
              </button>
            </div>

            {activeTab === "products" ? (
              <div className="table-wrapper history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Sales (Net)</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-td">
                          No items submitted for this date
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.date)}</td>
                          <td className="product-name-bold">{p.name}</td>
                          <td>₹{(p.totalNet || 0).toLocaleString()}</td>
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
                                  onClick={() => openProductPaymentModal(p)}
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
                        <td>₹{totalSales.toLocaleString()}</td>
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
              <div className="payment-history-section">
                <div className="table-wrapper history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Credit (Sale)</th>
                        <th>Debit (Pay)</th>
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
                        filteredLedger.map((entry, idx) => (
                          <tr key={entry.id || idx}>
                            <td>
                              {formatDateTime(entry.createdAt || entry.date)}
                            </td>
                            <td>{entry.description}</td>
                            <td className="text-success">
                              {entry.credit > 0
                                ? `₹${entry.credit.toLocaleString()}`
                                : "-"}
                            </td>
                            <td className="text-error">
                              {entry.debit > 0
                                ? `₹${entry.debit.toLocaleString()}`
                                : "-"}
                            </td>
                            <td style={{ fontWeight: "bold", color: "black" }}>
                              {entry.balance < 0
                                ? `Advance ₹${Math.abs(entry.balance).toLocaleString()}`
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
                            {filteredLedger[filteredLedger.length - 1].balance <
                            0
                              ? `Advance ₹${Math.abs(filteredLedger[filteredLedger.length - 1].balance).toLocaleString()}`
                              : `₹${filteredLedger[filteredLedger.length - 1].balance.toLocaleString()}`}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Seller Modal ── */}
      {showEditModal && editingSeller && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditModal(false);
            setFormErrors({});
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Seller</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setFormErrors({});
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleEditSeller}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={editingSeller.name}
                    onChange={(e) => {
                      setEditingSeller({
                        ...editingSeller,
                        name: e.target.value,
                      });
                      setFormErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Full Name"
                    className={formErrors.name ? "input-error" : ""}
                  />
                  {formErrors.name && (
                    <small className="field-error">{formErrors.name}</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="tel"
                    value={editingSeller.contact}
                    onChange={(e) => {
                      setEditingSeller({
                        ...editingSeller,
                        contact: e.target.value,
                      });
                      setFormErrors((p) => ({ ...p, contact: "" }));
                    }}
                    placeholder="10-digit Mobile Number"
                    maxLength={10}
                    className={formErrors.contact ? "input-error" : ""}
                  />
                  {formErrors.contact && (
                    <small className="field-error">{formErrors.contact}</small>
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
                    value={editingSeller.email || ""}
                    onChange={(e) => {
                      setEditingSeller({
                        ...editingSeller,
                        email: e.target.value,
                      });
                      setFormErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="example@gmail.com"
                    className={formErrors.email ? "input-error" : ""}
                  />
                  {formErrors.email && (
                    <small className="field-error">{formErrors.email}</small>
                  )}
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <SearchableSelect
                      name="state"
                      value={editingSeller.state || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingSeller((prev) => ({
                          ...prev,
                          state: val,
                          city: "",
                        }));
                        fetchEditCities(val);
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
                      value={editingSeller.city || ""}
                      onChange={(e) =>
                        setEditingSeller((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder={
                        loadingEditCities
                          ? "Loading cities..."
                          : !editingSeller.state
                            ? "Select state first"
                            : "Select City"
                      }
                      options={editCities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!editingSeller.state || loadingEditCities}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    value={editingSeller.address || ""}
                    onChange={(e) =>
                      setEditingSeller({
                        ...editingSeller,
                        address: e.target.value,
                      })
                    }
                    rows="2"
                    placeholder="Street / Village / District details"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader size={14} className="spin" /> Saving...
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

      {/* ── Product View Modal ── */}
      {showProductViewModal && viewingProduct && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setShowProductViewModal(false)}
        >
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Product Details </h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                
                <button
                  className="modal-close"
                  onClick={() => setShowProductViewModal(false)}
                >
                  <X />
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
                <div className="product-view-summary">
                  <div className="product-info-details">
                    <div className="stats-grid product-stats-grid">
                      <div className="product-stat-box">
                        <span className="product-stat-label">Product Name</span>
                        <b className="product-stat-val">{viewingProduct.name}</b>
                      </div>
                      <div className="product-stat-box">
                        <span className="product-stat-label">Total Sales</span>
                        <b className="product-stat-val">
                          ₹{(viewingProduct.stats?.price || 0).toLocaleString()}
                        </b>
                      </div>
                      <div className="product-stat-box">
                        <span className="product-stat-label">Commission</span>
                        <b className="product-stat-val">
                          ₹
                          {(
                            viewingProduct.stats?.commission || 0
                          ).toLocaleString()}
                        </b>
                      </div>
                      <div className="product-stat-box">
                        <span className="product-stat-label">Total To Amount</span>
                        <b className="product-stat-val">
                          ₹{(viewingProduct.stats?.net || 0).toLocaleString()}
                        </b>
                      </div>
                      <div className="product-stat-box text-success">
                        <span className="product-stat-label">Total Paid</span>
                        <b className="product-stat-val">
                          ₹{(viewingProduct.stats?.paid || 0).toLocaleString()}
                        </b>
                      </div>
                      <div className="product-stat-box text-error">
                        <span className="product-stat-label">Total Balance</span>
                        <b className="product-stat-val">
                          ₹
                          {(
                            viewingProduct.stats?.balance || 0
                          ).toLocaleString()}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 style={{ margin: "0 0 10px 0" }}>Variant Details</h4>
                <div className="table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Qty</th>
                        <th>Sold Qty</th>
                        <th>Sales</th>
                       
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProduct.variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.variety}</td>
                          <td>
                            {v.quantity} {v.unit}
                          </td>
                          <td>
                            {v.sellQuantity || 0} {v.unit}
                          </td>
                          <td>₹{(v.stats?.price || 0).toLocaleString()}</td>
                          
                        </tr>
                      ))}
                      {viewingProduct.variants.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center">
                            No variants found
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

      {/* ── Commission Modal ── */}
      {showCommissionModal && selectedSeller && (
        <div
          className="modal-overlay"
          onClick={() => setShowCommissionModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Customize Seller Commission</h3>
              <button
                className="modal-close"
                onClick={() => setShowCommissionModal(false)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleSaveCommission}>
              <div className="modal-body">
                <div className="fade-in" style={{ padding: '0 5px' }}>
                    <div className="form-group">
                        <label className="form-label">Commission Percentage (%)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={commissionData.commissionPercent}
                            onChange={(e) => setCommissionData({...commissionData, commissionPercent: e.target.value})}
                            min="0"
                            max="100"
                            step="any"
                            placeholder="e.g. 5 (Leave empty to use Global Commission)"
                        />
                    </div>
                    
                    <div className="commission-date-row">
                        <div className="form-group flex-1">
                            <label className="form-label">Valid From</label>
                            <input
                                type="date"
                                className="form-control"
                                value={commissionData.commissionStartDate}
                                onChange={(e) => setCommissionData({...commissionData, commissionStartDate: e.target.value})}
                                disabled={commissionData.commissionPercent === ""}
                            />
                        </div>

                        <div className="form-group flex-1">
                            <div className="commission-valid-until-header">
                                <label className="form-label">Valid Until</label>
                                <div className="forever-toggle-wrap">
                                    <input
                                        type="checkbox"
                                        id="foreverToggle"
                                        checked={commissionData.forever}
                                        onChange={(e) => setCommissionData({...commissionData, forever: e.target.checked})}
                                        disabled={commissionData.commissionPercent === ""}
                                    />
                                    <label htmlFor="foreverToggle">Forever</label>
                                </div>
                            </div>
                            <input
                                type="date"
                                className="form-control"
                                value={commissionData.commissionEndDate}
                                onChange={(e) => setCommissionData({...commissionData, commissionEndDate: e.target.value})}
                                disabled={commissionData.forever || commissionData.commissionPercent === ""}
                                title={commissionData.forever ? "Disable 'Forever' to set an end date" : ""}
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                        Tip: To remove a seller's custom commission and fallback to the global rate, simply clear the percentage field.
                    </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCommissionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCommissionSaving}
                >
                  {isCommissionSaving ? (
                    <>
                      <Loader size={14} className="spin" /> Saving...
                    </>
                  ) : (
                    "Save Commission"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showRecordPaymentModal && selectedSeller && (
        <div
          className="modal-overlay"
          onClick={() => setShowRecordPaymentModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Pay Out</h3>
              <button
                className="modal-close"
                onClick={() => setShowRecordPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                {paymentConfig?.type === "product" ? (
                  <>
                    <div className="data-row payment-modal-row">
                      <span className="data-label">Product Name</span>
                      <span className="data-value">
                        {paymentConfig.targetName}
                      </span>
                    </div>
                    <div className="data-row payment-modal-row">
                      <span className="data-label">Pending Balance</span>
                      <span className="data-value text-error">
                        ₹{paymentConfig?.maxAmount?.toLocaleString() || 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="data-row payment-modal-row">
                      <span className="data-label">Seller Name</span>
                      <span className="data-value">{selectedSeller.name}</span>
                    </div>
                    <div className="data-row payment-modal-row">
                      <span className="data-label">Pay Amount To</span>
                      <span className="data-value text-error">
                        ₹{selectedSeller.balance?.toLocaleString() || 0}
                      </span>
                    </div>
                  </>
                )}
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
                    placeholder="e.g. Note"
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPaymentSaving}
                >
                  {isPaymentSaving ? (
                    <>
                      <Loader size={14} className="spin" /> Saving...
                    </>
                  ) : (
                    "Save Payment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Seller Modal ── */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setFormErrors({});
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Seller</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setFormErrors({});
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleAddSeller}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={newSeller.name}
                    onChange={(e) => {
                      setNewSeller({ ...newSeller, name: e.target.value });
                      setFormErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Full Name"
                    className={formErrors.name ? "input-error" : ""}
                  />
                  {formErrors.name && (
                    <small className="field-error">{formErrors.name}</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="tel"
                    value={newSeller.contact}
                    onChange={(e) => {
                      setNewSeller({ ...newSeller, contact: e.target.value });
                      setFormErrors((p) => ({ ...p, contact: "" }));
                    }}
                    placeholder="10-digit Mobile Number"
                    maxLength={10}
                    className={formErrors.contact ? "input-error" : ""}
                  />
                  {formErrors.contact && (
                    <small className="field-error">{formErrors.contact}</small>
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
                    value={newSeller.email}
                    onChange={(e) => {
                      setNewSeller({ ...newSeller, email: e.target.value });
                      setFormErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="example@gmail.com"
                    className={formErrors.email ? "input-error" : ""}
                  />
                  {formErrors.email && (
                    <small className="field-error">{formErrors.email}</small>
                  )}
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <SearchableSelect
                      name="state"
                      value={newSeller.state}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewSeller((prev) => ({
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
                      value={newSeller.city}
                      onChange={(e) =>
                        setNewSeller((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder={
                        loadingCities
                          ? "Loading cities..."
                          : !newSeller.state
                            ? "Select state first"
                            : "Select City"
                      }
                      options={cities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!newSeller.state || loadingCities}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    value={newSeller.address}
                    onChange={(e) =>
                      setNewSeller({ ...newSeller, address: e.target.value })
                    }
                    rows="2"
                    placeholder="Street / Village / District details"
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader size={14} className="spin" /> Adding...
                    </>
                  ) : (
                    "Add Seller"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default SellerDetails;