import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import ConfirmationModal from "../Common/ConfirmationModal";
import LoadingSpinner from "../Common/LoadingSpinner";
import BackButton from "../Common/BackButton";
import "./TodayAuction.css";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Eye,
  EyeOff,
  PackageSearch,
  Search,
  Check,
} from "lucide-react";
import VoiceSearch from "../Common/VoiceSearch";
import * as productApi from "../../api/vendorApi";
import { getCommission } from "../../api/commissionApi";
import { getSellers } from "../../api/sellerApi";
import * as auctionApi from "../../api/auctionApi";
import * as buyerApi from "../../api/buyerApi";
import { getSellerCommission } from "../../utils/commissionUtils";

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  required,
  label,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const skipBlurProcessing = useRef(false);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) {
          processBlur();
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, options, value, searchTerm]); // re-bind to latest state

  const processBlur = () => {
    if (skipBlurProcessing.current) {
      skipBlurProcessing.current = false;
      return;
    }
    const match = options.find(
      (o) => o.name.toLowerCase() === searchTerm.toLowerCase(),
    );
    if (match) {
      if (match.name !== value) onChange(match);
    } else {
      onChange({ _id: "", id: "", name: "" });
      setSearchTerm("");
    }
  };

  const handleSelect = (opt) => {
    skipBlurProcessing.current = true; // Tell onBlur to skip since we cleanly selected
    onChange(opt);
    setSearchTerm(opt.name);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`form-group form-group-relative ${isOpen ? 'searchable-select-z-open' : ''} ${className}`}
    >
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === "") onChange({ _id: "", id: "", name: "" });
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isOpen && options.length > 0) {
              e.preventDefault();
              const match =
                options.find(
                  (opt) => opt.name.toLowerCase() === searchTerm.toLowerCase(),
                ) ||
                options.filter((opt) =>
                  opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
                )[0];
              if (match) handleSelect(match);
            }
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        {/* <VoiceSearch onSearch={(text) => {
          setSearchTerm(text);
          setIsOpen(true);
          const match = options.find(o => o.name.toLowerCase() === text.toLowerCase());
          if (match) handleSelect(match);
        }} /> */}
      </div>
      {isOpen && (
        <ul className="dropdown-options">
          {options.filter((opt) =>
            opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ).length > 0 ? (
            options
              .filter((opt) =>
                opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((opt) => (
                <li
                  key={opt._id || opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // crucial to prevent focus loss before click completes
                    handleSelect(opt);
                  }}
                  className="dropdown-item"
                >
                  {opt.name}
                </li>
              ))
          ) : (
            <li className="dropdown-item text-muted">No options</li>
          )}
        </ul>
      )}
    </div>
  );
};

function TodayAuction() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [masterProducts, setMasterProducts] = useState([]);

  // Vendor ID from Redux or Session Storage
  const vendorId =
    useSelector((state) => state.vendorAuth.vendorId) ||
    sessionStorage.getItem("vendorId");

  const [newProduct, setNewProduct] = useState({
    name: "",
    sellerId: "",
    sellerName: "",
    date: new Date().toISOString().split("T")[0],
    variants: [],
    masterProduct: null, // Track selected master product
  });

  const [variantData, setVariantData] = useState({
    variety: "",
    quality: "quality1",
    quantity: "",
    sellQuantity: 0,
    unit: "kg",
    commission: "",
    commissionAmountForSellQuantity: 0,
    priceAmountForSellQuantity: 0,
    balance: 0,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [globalVendorCommission, setGlobalVendorCommission] = useState("");
  const [defaultCommission, setDefaultCommission] = useState("");
  const [editingGlobalComm, setEditingGlobalComm] = useState(false);
  const [editingVariantRowComm, setEditingVariantRowComm] = useState(false);
  const [editingCommVariantId, setEditingCommVariantId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: () => { },
    showCancel: false,
    confirmText: "OK",
  });

  const [saleData, setSaleData] = useState({
    buyerId: "",
    buyerName: "",
    variantId: "",
    finalPrice: "",
    qtyToSell: "",
    paymentStatus: "Paid",
    amountPaid: "",
    priceMode: "perQty", // 'perQty' | 'wholeProduct'
    buyerType: "regular", // 'regular' | 'temporary'
  });

  const resetVariantData = () => {
    setVariantData({
      variety: "",
      quality: "quality1",
      quantity: "",
      unit: "kg",
      commission: defaultCommission,
      commissionAmountForSellQuantity: 0,
      priceAmountForSellQuantity: 0,
    });
  };

  const resetProductForm = () => {
    setNewProduct({
      name: "",
      sellerId: "",
      sellerName: "",
      date: new Date().toISOString().split("T")[0],
      variants: [],
      image: "",
      masterProduct: null,
    });
    setImagePreview(null);
    resetVariantData();
  };

  const closeAddModal = () => {
    setShowAddProduct(false);
    resetProductForm();
  };

  const handleImageUpload = (e, target = "new") => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setConfirmModal({
          isOpen: true,
          title: "Large Image",
          message: "Image size should be less than 2MB",
          variant: "warning",
          onConfirm: () =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false })),
          showCancel: false,
          confirmText: "OK",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        if (target === "new") {
          setNewProduct({ ...newProduct, image: base64String });
        } else {
          setEditingProduct({ ...editingProduct, image: base64String });
        }
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleProductStatus = async (id) => {
    try {
      await auctionApi.toggleProductStatus(id);
      loadData();
    } catch (error) {
      toast.error(error.message || "Failed to toggle status");
    }
  };

  const handleAddVariant = () => {
    if (!variantData.variety || !variantData.quantity) {
      toast.error("Please add at least Variety and Quantity");
      return;
    }

    const newVariant = {
      id: Date.now(),
      ...variantData,
      quantity: parseFloat(variantData.quantity),
    };

    setNewProduct({
      ...newProduct,
      variants: [...newProduct.variants, newVariant],
    });

    toast.success("Variant added successfully");

    resetVariantData();
  };

  const handleDeleteVariant = (id) => {
    setNewProduct({
      ...newProduct,
      variants: newProduct.variants.filter((v) => v.id !== id),
    });
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const handleDeleteClick = (product) => {
    setProductToDelete(product._id || product.id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      try {
        await auctionApi.deleteAuctionProduct(productToDelete);
        loadData();
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error(error.message || "Failed to delete product");
      }
    }
  };

  const openEditModal = (product) => {
    // Find seller name from ID
    const seller = sellers.find((s) => (s._id || s.id) === product.sellerId);
    setEditingProduct({
      ...product,
      varieties: product.varieties || "",
      sellerName: seller ? seller.name : "",
    });
    setDefaultCommission(product.commissionPercent || "");
    setImagePreview(product.image);
    setShowEditProduct(true);
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        ...editingProduct,
        commissionPercent: parseFloat(defaultCommission) || 0,
      };
      await auctionApi.updateAuctionProduct(
        editingProduct._id || editingProduct.id,
        updateData,
      );
      setShowEditProduct(false);
      setEditingProduct(null);
      setImagePreview(null);
      loadData();
      toast.success("Product updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update product");
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!vendorId) return;
      setLoading(true);
      try {
        const masterData = await productApi.getProducts({ vendorId });
        setMasterProducts(masterData);

        const commData = await getCommission(vendorId);
        if (commData && commData.success) {
          const val = commData.data;
          setGlobalVendorCommission(val);
          setDefaultCommission(val);
          setVariantData((prev) => ({ ...prev, commission: val }));
        }

        // Fetch sellers and buyers from API
        const sellerResponse = await getSellers(vendorId);
        if (sellerResponse.success) {
          setSellers(sellerResponse.data.filter((s) => s.status === "active"));
        }

        const buyerResponse = await buyerApi.getBuyers(vendorId);
        if (buyerResponse.success) {
          setBuyers(buyerResponse.data.filter((b) => b.status === "active"));
        }

        await loadData();
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [vendorId]);

  const loadData = async () => {
    if (!vendorId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const productResponse = await auctionApi.getAuctionProducts(vendorId, {
        date: today,
      });

      if (productResponse.success) {
        const mappedProducts = productResponse.data.map((p) => {
          const isSoldOut =
            p.variants &&
            p.variants.length > 0 &&
            p.variants.every((v) => (v.sellQuantity || 0) >= (v.quantity || 0));
          return { ...p, status: isSoldOut ? "soldout" : p.status };
        });
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error("Failed to load auction data", error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!newProduct.name) {
      toast.error("Product name is required");
      return;
    }

    if (!newProduct.sellerId) {
      toast.error("Please select a seller");
      return;
    }

    if (!newProduct.variants || newProduct.variants.length === 0) {
      toast.error("Add at least one variant before saving product");
      return;
    }

    try {
      const productData = {
        vendorId: vendorId,
        sellerId: newProduct.sellerId,
        name: newProduct.name,
        date: newProduct.date || new Date().toISOString().split("T")[0],
        commissionPercent: parseFloat(defaultCommission) || 0,
        variants: newProduct.variants.map(({ id, ...rest }) => rest), // Remove local 'id'
        image: newProduct.image,
      };

      const response = await auctionApi.addAuctionProduct(productData);

      if (response.success) {
        toast.success("Product added successfully");
        resetProductForm();
        setShowAddProduct(false);
        loadData();
      }
    } catch (error) {
      toast.error(error.message || "Failed to add product");
    }
  };

  const handleSellProduct = async (e) => {
    e.preventDefault();

    // Find the variant to validate stock
    const product = products.find(
      (p) => p._id === selectedProduct._id || p.id === selectedProduct.id,
    );
    const variant = product.variants.find(
      (v) => (v._id || v.id) == saleData.variantId,
    );
    if (!variant) return;

    const sellQty = parseFloat(saleData.qtyToSell) || 0;
    const available = variant.quantity - (variant.sellQuantity || 0);

    if (sellQty > available) {
      toast.error(`Cannot sell more than available quantity (${available})`);
      return;
    }

    // ── Price mode calculation ────────────────────────
    let finalAmount, ratePerUnit;
    if (saleData.priceMode === "perQty") {
      // User entered price per unit (per kg / per piece)
      ratePerUnit = parseFloat(saleData.finalPrice) || 0;
      finalAmount = ratePerUnit * sellQty;
    } else {
      // User entered the whole / total amount directly
      finalAmount = parseFloat(saleData.finalPrice) || 0;
      ratePerUnit = sellQty > 0 ? finalAmount / sellQty : 0;
    }

    const totalCommission =
      (finalAmount * (product.commissionPercent || 0)) / 100;

    try {
      const transactionData = {
        vendorId: vendorId,
        sellerId: product.sellerId,
        buyerId: saleData.buyerId || undefined,
        buyerName: saleData.buyerName,
        productId: product._id || product.id,
        variantId: variant._id || variant.id,
        date: new Date().toISOString().split("T")[0],
        quantity: sellQty,
        rate: ratePerUnit,
        finalAmount: finalAmount,
        commissionPercent: product.commissionPercent || 0,
        commissionAmount: totalCommission,
        netAmount: finalAmount - totalCommission,
        paymentStatus: saleData.paymentStatus,
        amountPaid: parseFloat(saleData.amountPaid) || 0,
      };

      const response = await auctionApi.recordSale(transactionData);

      if (response.success) {
        setSaleData({
          buyerId: "",
          buyerName: "",
          variantId: "",
          finalPrice: "",
          qtyToSell: "",
          paymentStatus: "Paid",
          amountPaid: "",
          priceMode: "perQty",
          buyerType: "regular",
        });
        setShowSellModal(false);
        setSelectedProduct(null);
        loadData();
        toast.success("Sale recorded successfully");
      }
    } catch (error) {
      toast.error(error.message || "Failed to record sale");
    }
  };

  const openSellModal = (product) => {
    setSelectedProduct(product);
    setSaleData({
      buyerId: "",
      buyerName: "",
      variantId: "",
      finalPrice: "",
      qtyToSell: "",
      paymentStatus: "Paid",
      amountPaid: "",
      priceMode: "perQty",
      buyerType: "regular",
    });
    setShowSellModal(true);
  };

  const capitalizeFirst = (text) => {
    if (text == null) return "";
    const str = String(text);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case "quality1":
        return "Quality 1";
      case "quality2":
        return "Quality 2";
      case "quality3":
        return "Quality 3";
      default:
        return quality;
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        subMessage="This item will be removed from the auction list."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />
      <div className="content-header">
        <div className="header-top">
          <h1>Today Auction</h1>
          <BackButton />
        </div>
        <div className="breadcrumb-row">
          <div className="breadcrumb">
            <span>Home</span>
            <span className="breadcrumb-separator">/</span>
            <span>Today Auction</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddProduct(true)}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="section-header">
          <h3 className="section-title">
            Available Products ({products.length})
          </h3>
        </div>

        {/* Search Bar */}
        <div className="card fade-in search-card">
          <div className="form-group search-form-group">
            <div className="search-icon-container">
              <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
                <Search size={20} className="search-icon-absolute" style={{ left: '12px', right: 'auto' }} />
                <input
                  type="text"
                  placeholder="Search by product, seller "
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                  <VoiceSearch onSearch={(text) => setSearchQuery(text)} minimal={true} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="table-container-full fade-in">
          {loading ? (
            <LoadingSpinner message="Loading today's auction..." />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <PackageSearch />
              </div>
              <p>No products available for auction today</p>
            </div>
          ) : (
            <div className="table-responsive bg-card rounded-lg shadow-sm custom-table-wrapper">
              <table className="data-table custom-data-table today-auction-table">
                <thead className="bg-tertiary">
                  <tr>
                    <th className="custom-th">Product Details</th>
                    <th className="custom-th">Seller</th>
                    <th className="custom-th">Status</th>
                    <th className="custom-th custom-th-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((product) => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      const seller = sellers.find(
                        (s) => (s._id || s.id) === product.sellerId,
                      );
                      const sellerName = seller
                        ? seller.name.toLowerCase()
                        : "";
                      const productName = product.name.toLowerCase();
                      const hasMatchingVariant =
                        product.variants &&
                        product.variants.some((v) =>
                          v.variety.toLowerCase().includes(query),
                        );

                      return (
                        sellerName.includes(query) ||
                        productName.includes(query) ||
                        hasMatchingVariant
                      );
                    })
                    .map((product) => (
                      <tr
                        key={product._id || product.id}
                        className={`${product.isActive === false ? "product-disabled" : ""} custom-tr`}
                      >
                        <td className="custom-td custom-td-product" data-label="Product Details">
                          <div className="font-semibold text-primary table-product-name">
                            {capitalizeFirst(product.name)}
                          </div>
                          {product.variants && product.variants.length > 0 && (
                            <div className="product-variants-inline">
                              {product.variants.map((v) => {
                                const remaining =
                                  (v.quantity || 0) - (v.sellQuantity || 0);
                                return (
                                  <div
                                    key={v._id || v.id}
                                    className="variant-inline-chip"
                                  >
                                    <span className="variant-inline-name">
                                      {capitalizeFirst(v.variety)}
                                    </span>
                                    <span
                                      className={`badge badge-sm ${v.quality === "quality1" ? "badge-success" : v.quality === "quality2" ? "badge-warning" : "badge-error"}`}
                                    >
                                      {getQualityLabel(v.quality)}
                                    </span>
                                    <span className="variant-inline-qty">
                                      {remaining} {v.unit}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="custom-td custom-td-seller" data-label="Seller">
                          <strong>
                            {
                              sellers.find(
                                (s) => (s._id || s.id) === product.sellerId,
                              )?.name
                            }
                          </strong>
                        </td>
                        <td className="custom-td custom-td-status" data-label="Status">
                          {product.status === "soldout" ? (
                            <span className="badge badge-error">Sold Out</span>
                          ) : product.isActive === false ? (
                            <span className="badge badge-disabled">
                              Disabled
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="custom-td custom-td-center custom-td-actions" data-label="Actions">
                          <div className="action-stack">
                            <button
                              className="btn btn-success action-btn-wide"
                              onClick={() => {
                                if (product.isActive === false) {
                                  toast.warning(
                                    "This product is currently disabled",
                                  );
                                  return;
                                }
                                if (product.status === "soldout") {
                                  toast.info(
                                    "This product is completely sold out for today",
                                  );
                                  return;
                                }
                                openSellModal(product);
                              }}
                            >
                              Sell
                            </button>
                            <div className="action-icon-row">
                              <button
                                className="icon-btn action-icon-small"
                                onClick={() => {
                                  if (product.status === "soldout") {
                                    toast.info(
                                      "Cannot change status of a sold out product",
                                    );
                                    return;
                                  }
                                  toggleProductStatus(
                                    product._id || product.id,
                                  );
                                }}
                                title={
                                  product.isActive === false
                                    ? "Enable"
                                    : "Disable"
                                }
                              >
                                {product.isActive === false ? (
                                  <Eye size={16} />
                                ) : (
                                  <EyeOff size={16} />
                                )}
                              </button>
                              <button
                                className="icon-btn edit action-icon-small"
                                onClick={() => {
                                  if (product.status === "soldout") {
                                    toast.info(
                                      "Cannot edit a sold out product",
                                    );
                                    return;
                                  }
                                  if (product.isActive === false) {
                                    toast.warning(
                                      "Please enable the product before editing",
                                    );
                                    return;
                                  }
                                  openEditModal(product);
                                }}
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="icon-btn delete action-icon-small"
                                onClick={() => {
                                  if (product.status === "soldout") {
                                    toast.info(
                                      "Cannot delete a sold out product",
                                    );
                                    return;
                                  }
                                  handleDeleteClick(product);
                                }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Product</h3>
              <button className="modal-close" onClick={closeAddModal}>
                <X />
              </button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body">
                {/* <div className="form-group">
                                    <label className="form-label">Auction Date</label>
                                    <input
                                        type="date"
                                        value={newProduct.date}
                                        onChange={(e) => setNewProduct({ ...newProduct, date: e.target.value })}
                                        disabled
                                    />
                                </div> */}

                <SearchableSelect
                  label="Seller"
                  options={sellers}
                  value={newProduct.sellerName}
                  onChange={(seller) => {
                    const sellDate = newProduct.date || new Date().toISOString().split("T")[0];
                    let comm = globalVendorCommission;
                    if (seller && (seller._id || seller.id)) {
                      comm = getSellerCommission(seller, globalVendorCommission, sellDate);
                    }
                    setNewProduct({
                      ...newProduct,
                      sellerId: seller._id || seller.id,
                      sellerName: seller.name,
                    });
                    setDefaultCommission(comm);
                    setVariantData(prev => ({...prev, commission: comm}));
                  }}
                  placeholder="Type to search seller..."
                  required
                />

                <SearchableSelect
                  label="Product Name"
                  options={masterProducts.map((p) => ({
                    id: p._id || p.id,
                    name: p.name,
                  }))}
                  value={newProduct.name || ""}
                  onChange={(opt) => {
                    const selectedOpt =
                      opt && opt.name
                        ? masterProducts.find((p) => p.name === opt.name)
                        : null;
                    if (!selectedOpt) {
                      setNewProduct({
                        ...newProduct,
                        name: "",
                        masterProduct: null,
                      });
                      setVariantData((prev) => ({
                        ...prev,
                        variety: "",
                        unit: "",
                      }));
                      return;
                    }
                    const defaultUnit =
                      selectedOpt.units && selectedOpt.units.length > 0
                        ? selectedOpt.units[0]
                        : "";
                    const defaultVariety =
                      selectedOpt?.varieties && selectedOpt.varieties.length > 0
                        ? ""
                        : "";

                    setNewProduct((prev) => ({
                      ...prev,
                      name: selectedOpt.name,
                      masterProduct: selectedOpt,
                    }));
                    setVariantData((prev) => ({
                      ...prev,
                      variety: defaultVariety,
                      unit: defaultUnit,
                    }));
                  }}
                  placeholder="Click to search product..."
                  required
                />

                <div className="form-group form-group-mt-15">
                  <div className="variants-header-row">
                    <label className="form-label form-label-no-mb">
                      Variants
                    </label>
                    <div className="global-comm-wrapper">
                      <span className="global-comm-text">
                        Product Commission:
                      </span>
                      {editingGlobalComm ? (
                        <div className="global-comm-edit-row">
                          <input
                            type="number"
                            value={defaultCommission}
                            onChange={(e) => {
                              setDefaultCommission(e.target.value);
                              setVariantData((prev) => ({
                                ...prev,
                                commission: e.target.value,
                              }));
                            }}
                            className="variant-comm-input variant-comm-input-inline"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => setEditingGlobalComm(false)}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="global-comm-edit-row">
                          <strong className="text-primary-color">
                            {defaultCommission}%
                          </strong>
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => setEditingGlobalComm(true)}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="variant-row">
                    <SearchableSelect
                      options={
                        newProduct.masterProduct &&
                          newProduct.masterProduct.varieties &&
                          newProduct.masterProduct.varieties.length > 0
                          ? newProduct.masterProduct.varieties.map((v, i) => ({
                            id: `${i}-${v}`,
                            name: v,
                          }))
                          : []
                      }
                      value={variantData.variety || ""}
                      onChange={(opt) => {
                        setVariantData((prev) => ({
                          ...prev,
                          variety: opt && opt.name ? opt.name : "",
                        }));
                      }}
                      placeholder="Variety"
                      className="variant-searchable-select"
                    />

                    <select
                      value={variantData.quality}
                      onChange={(e) =>
                        setVariantData({
                          ...variantData,
                          quality: e.target.value,
                        })
                      }
                    >
                      <option value="quality1">Quality 1</option>
                      <option value="quality2">Quality 2</option>
                      <option value="quality3">Quality 3</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Qty"
                      value={variantData.quantity}
                      min={1}
                      onChange={(e) =>
                        setVariantData({
                          ...variantData,
                          quantity: e.target.value,
                        })
                      }
                    />

                    <select
                      value={variantData.unit}
                      onChange={(e) =>
                        setVariantData({ ...variantData, unit: e.target.value })
                      }
                      required
                      placeholder="Unit"
                    >
                      <option value="" disabled>
                        Select Unit
                      </option>
                      {newProduct.masterProduct &&
                        newProduct.masterProduct.units &&
                        newProduct.masterProduct.units.length > 0 ? (
                        newProduct.masterProduct.units.map((u, i) => (
                          <option key={i} value={u}>
                            {u}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No Units
                        </option>
                      )}
                    </select>

                    <button
                      type="button"
                      className="btn btn-primary add-variant-btn"
                      onClick={handleAddVariant}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {newProduct.variants && newProduct.variants.length > 0 && (
                  <div className="table-responsive table-responsive-variants">
                    <table className="variant-table">
                      <thead>
                        <tr className="variant-table-th">
                          <th className="variant-table-th">Variety</th>
                          <th className="variant-table-th">Quality</th>
                          <th className="variant-table-th">Qty</th>
                          <th className="variant-table-th">Unit</th>
                          <th className="variant-table-th">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newProduct.variants.map((v) => (
                          <tr key={v.id} className="variant-table-tr">
                            <td className="variant-table-td">{v.variety}</td>
                            <td className="variant-table-td">{v.quality}</td>
                            <td className="variant-table-td">{v.quantity}</td>
                            <td className="variant-table-td">{v.unit}</td>
                            <td className="variant-table-td">
                              <button
                                type="button"
                                className="icon-btn delete"
                                onClick={() => handleDeleteVariant(v.id)}
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* <div className="form-group">
                                    <label className="form-label">Product Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="image-upload-input"
                                    />
                                    {imagePreview && (
                                        <div className="image-preview-container">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="image-preview"
                                            />
                                        </div>
                                    )}
                                </div> */}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAddModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditProduct && editingProduct && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditProduct(false);
            setImagePreview(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Product</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditProduct(false);
                  setImagePreview(null);
                }}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleEditProduct}>
              <div className="modal-body">
                {/* <div className="form-group">
                                    <label className="form-label">Auction Date</label>
                                    <input
                                        type="date"
                                        value={editingProduct.date}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, date: e.target.value })}
                                        required
                                        disabled
                                    />
                                </div> */}

                <SearchableSelect
                  label="Product Name"
                  options={masterProducts.map((p) => ({
                    id: p._id || p.id,
                    name: p.name,
                  }))}
                  value={editingProduct.name || ""}
                  onChange={(opt) => {
                    setEditingProduct({
                      ...editingProduct,
                      name: opt ? opt.name : "",
                    });
                  }}
                  placeholder="Click to search product..."
                  required
                />
                <SearchableSelect
                  label="Seller"
                  options={sellers}
                  value={editingProduct.sellerName}
                  onChange={(seller) =>
                    setEditingProduct({
                      ...editingProduct,
                      sellerId: seller._id || seller.id,
                      sellerName: seller.name,
                    })
                  }
                  placeholder="Type to search seller..."
                  required
                />

                <div className="form-group form-group-mt-15">
                  <div className="variants-header-row">
                    <label className="form-label form-label-no-mb">
                      Variants (Read-only)
                    </label>
                    <div className="global-comm-wrapper">
                      <span className="global-comm-text">
                        Product Commission:
                      </span>
                      {editingGlobalComm ? (
                        <div className="global-comm-edit-row">
                          <input
                            type="number"
                            value={defaultCommission}
                            onChange={(e) => {
                              setDefaultCommission(e.target.value);
                              setVariantData((prev) => ({
                                ...prev,
                                commission: e.target.value,
                              }));
                            }}
                            className="variant-comm-input variant-comm-input-inline"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => setEditingGlobalComm(false)}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="global-comm-edit-row">
                          <strong className="text-primary-color">
                            {defaultCommission}%
                          </strong>
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => setEditingGlobalComm(true)}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="table-responsive-variants">
                    <table className="variant-table">
                      <thead>
                        <tr className="variant-table-tr-header">
                          <th className="variant-table-th">Variety</th>
                          <th className="variant-table-th">Quality</th>
                          <th className="variant-table-th">Qty</th>
                          <th className="variant-table-th">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingProduct.variants.map((v) => (
                          <tr key={v._id || v.id} className="variant-table-tr">
                            <td className="variant-table-td">{v.variety}</td>
                            <td className="variant-table-td">{v.quality}</td>
                            <td className="variant-table-td">{v.quantity}</td>
                            <td className="variant-table-td">{v.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditProduct(false);
                    setImagePreview(null);
                  }}
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

      {/* Sell Product Modal */}
      {showSellModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Sell Product: {selectedProduct.name}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowSellModal(false)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={handleSellProduct}>
              <div className="modal-body">
                {/* ── Buyer Type Selection ── */}
                <div className="form-group">
                  <label className="form-label">Buyer Type</label>
                  <div className="price-mode-radios">
                    <label
                      className={`price-mode-option${saleData.buyerType === "regular" ? " active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="buyerType"
                        value="regular"
                        checked={saleData.buyerType === "regular"}
                        onChange={() =>
                          setSaleData((prev) => ({
                            ...prev,
                            buyerType: "regular",
                            buyerId: "",
                            buyerName: "",
                          }))
                        }
                      />
                      <span className="price-mode-label">
                        <strong>Regular Buyer</strong>
                        <small>Existing registered buyer</small>
                      </span>
                    </label>
                    <label
                      className={`price-mode-option${saleData.buyerType === "temporary" ? " active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="buyerType"
                        value="temporary"
                        checked={saleData.buyerType === "temporary"}
                        onChange={() =>
                          setSaleData((prev) => ({
                            ...prev,
                            buyerType: "temporary",
                            buyerId: "",
                            buyerName: "",
                          }))
                        }
                      />
                      <span className="price-mode-label">
                        <strong>Temporary Buyer</strong>
                        <small>One-time/New buyer</small>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  {saleData.buyerType === "regular" ? (
                    <SearchableSelect
                      label="Buyer Name"
                      options={buyers}
                      value={saleData.buyerName}
                      onChange={(buyer) =>
                        setSaleData({
                          ...saleData,
                          buyerId: buyer._id || buyer.id,
                          buyerName: buyer.name,
                        })
                      }
                      placeholder="Type to search regular buyer..."
                      required
                    />
                  ) : (
                    <>
                      <label className="form-label">Buyer Name</label>
                      <input
                        type="text"
                        value={saleData.buyerName}
                        onChange={(e) =>
                          setSaleData({
                            ...saleData,
                            buyerName: e.target.value,
                            buyerId: "",
                          })
                        }
                        placeholder="Enter temporary buyer name..."
                        required
                        className="form-input temp-buyer-input"
                      />
                    </>
                  )}

                  <label className="form-label form-label-mt">
                    Select Variant
                  </label>
                  <select
                    value={saleData.variantId}
                    onChange={(e) =>
                      setSaleData({ ...saleData, variantId: e.target.value })
                    }
                    required
                    className="form-input"
                  >
                    <option value="">-- Select Variant --</option>
                    {selectedProduct.variants &&
                      selectedProduct.variants.map((v) => {
                        const sold = v.sellQuantity || 0;
                        const remaining = v.quantity - sold;
                        return (
                          <option
                            key={v._id || v.id}
                            value={v._id || v.id}
                            disabled={remaining <= 0}
                          >
                            {capitalizeFirst(v.variety)} -{" "}
                            {getQualityLabel(v.quality)} - {remaining} /{" "}
                            {v.quantity} {v.unit}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {saleData.variantId &&
                  (() => {
                    const v = selectedProduct.variants.find(
                      (val) => (val._id || val.id) == saleData.variantId,
                    );
                    if (!v) return null;
                    const sold = v.sellQuantity || 0;
                    const available = v.quantity - sold;

                    return (
                      <>
                        {/* ── Pricing Mode Radio Buttons ── */}
                        <div className="form-group">
                          <label className="form-label">Pricing Mode</label>
                          <div className="price-mode-radios">
                            <label
                              className={`price-mode-option${saleData.priceMode === "perQty" ? " active" : ""}`}
                            >
                              <input
                                type="radio"
                                name="priceMode"
                                value="perQty"
                                checked={saleData.priceMode === "perQty"}
                                onChange={() =>
                                  setSaleData((prev) => ({
                                    ...prev,
                                    priceMode: "perQty",
                                    finalPrice: "",
                                  }))
                                }
                              />
                              <span className="price-mode-label">
                                <strong>Per {v.unit}</strong>
                                <small>Enter rate per {v.unit}</small>
                              </span>
                            </label>
                            <label
                              className={`price-mode-option${saleData.priceMode === "wholeProduct" ? " active" : ""}`}
                            >
                              <input
                                type="radio"
                                name="priceMode"
                                value="wholeProduct"
                                checked={saleData.priceMode === "wholeProduct"}
                                onChange={() =>
                                  setSaleData((prev) => ({
                                    ...prev,
                                    priceMode: "wholeProduct",
                                    finalPrice: "",
                                  }))
                                }
                              />
                              <span className="price-mode-label">
                                <strong>Whole Amount</strong>
                                <small>Enter total for all qty</small>
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Quantity to Sell ({v.unit})
                          </label>

                          <input
                            type="number"
                            value={saleData.qtyToSell}
                            onChange={(e) => {
                              const val = e.target.value;

                              if (val === "") {
                                setSaleData({ ...saleData, qtyToSell: "" });
                              } else {
                                const numVal = Math.round(parseFloat(val)); // round value

                                if (numVal > available) {
                                  toast.error(
                                    `Quantity cannot exceed ${available} ${v.unit}`,
                                  );
                                  setSaleData({
                                    ...saleData,
                                    qtyToSell: available,
                                  });
                                } else {
                                  setSaleData({
                                    ...saleData,
                                    qtyToSell: numVal,
                                  });
                                }
                              }
                            }}
                            max={available}
                            min="1"
                            step="1"
                            placeholder={`Max: ${available}`}
                            required
                          />

                          <small className="form-hint">
                            Remaining:{" "}
                            {available - (parseInt(saleData.qtyToSell) || 0)}{" "}
                            {v.unit}
                          </small>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {saleData.priceMode === "perQty"
                              ? `Rate per ${v.unit} (₹)`
                              : "Total Amount (₹)"}
                          </label>

                          <input
                            type="number"
                            value={saleData.finalPrice}
                            onChange={(e) =>
                              setSaleData({
                                ...saleData,
                                finalPrice: Math.round(
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                            placeholder={
                              saleData.priceMode === "perQty"
                                ? `Price per ${v.unit}`
                                : `Total for ${saleData.qtyToSell || "?"} ${v.unit}`
                            }
                            min="0"
                            step="1"
                            required
                          />
                        </div>

                        {/* ── Live Calc Summary ── */}
                        {saleData.finalPrice &&
                          saleData.qtyToSell &&
                          (() => {
                            const qty = Math.round(
                              Number(saleData.qtyToSell) || 0,
                            );
                            const price = Math.round(
                              Number(saleData.finalPrice) || 0,
                            );

                            const total =
                              saleData.priceMode === "perQty"
                                ? Math.round(price * qty)
                                : price;

                            const rate =
                              saleData.priceMode === "perQty"
                                ? price
                                : qty > 0
                                  ? Math.round(price / qty)
                                  : 0;

                            const comm = Math.round(
                              (total *
                                (selectedProduct.commissionPercent || 0)) /
                              100,
                            );

                            const net = Math.round(total - comm);

                            return (
                              <div className="card calc-card">
                                {saleData.priceMode === "wholeProduct" && (
                                  <p className="calc-row">
                                    <strong>Rate per {v.unit}:</strong> ₹{rate}
                                  </p>
                                )}

                                <p className="calc-row">
                                  <strong>Total Amount:</strong> ₹
                                  {total.toLocaleString()}
                                </p>

                                <p className="calc-row">
                                  <strong>Commission:</strong> ₹{comm}
                                </p>

                                <p className="calc-row">
                                  <strong>Net Amount:</strong> ₹{net}
                                </p>
                              </div>
                            );
                          })()}
                      </>
                    );
                  })()}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSellModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Sell
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Datalists for Autocomplete */}
      <datalist id="seller-list">
        {sellers.map((seller) => (
          <option key={seller._id || seller.id} value={seller.name} />
        ))}
      </datalist>

      <datalist id="buyer-list">
        {buyers.map((buyer) => (
          <option key={buyer._id || buyer.id} value={buyer.name} />
        ))}
      </datalist>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        showCancel={confirmModal.showCancel}
        confirmText={confirmModal.confirmText}
      />
    </>
  );
}

export default TodayAuction;