import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { formatDate } from '../../utils/dateUtils';
import ConfirmationModal from '../Common/ConfirmationModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import BackButton from '../Common/BackButton';
import VoiceSearch from '../Common/VoiceSearch';
import './PendingProducts.css';
import '../TodayAuction/TodayAuction.css'; // Reusing base card styles
import { Undo2, ListFilterPlus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import * as auctionApi from '../../api/auctionApi';
import { getSellers } from '../../api/sellerApi';

function PendingProducts() {
    const [pendingProducts, setPendingProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [today, setToday] = useState('');
    const [sellers, setSellers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Vendor ID from Redux or Session Storage
    const vendorId = useSelector((state) => state.vendorAuth.vendorId) || sessionStorage.getItem('vendorId');

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        setToday(todayStr);
        if (vendorId) {
            loadInitialData(todayStr);
        }
    }, [vendorId]);

    const loadInitialData = async (currentDate) => {
        setLoading(true);
        try {
            const sellersRes = await getSellers(vendorId);
            if (sellersRes.success) {
                setSellers(sellersRes.data);
            }
            await loadPendingProducts(currentDate);
        } catch (error) {
            console.error("Failed to load initial data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadPendingProducts = async (currentDate) => {
        if (!vendorId) return;
        try {
            const productRes = await auctionApi.getPendingProducts(vendorId, currentDate);
            if (productRes.success) {
                // Enrich variants with sold stats for display (if missing) 
                // The backend maintains sellQuantity so we can calculate remaining easily.
                const mappedProducts = productRes.data.map(p => {
                    const enrichedVariants = (p.variants || []).map(v => {
                        return { ...v, remaining: (v.quantity || 0) - (v.sellQuantity || 0) };
                    });
                    // Filter out products where all variants are fully sold
                    const hasRemaining = enrichedVariants.some(v => v.remaining > 0);
                    return { ...p, variants: enrichedVariants, hasRemaining };
                }).filter(p => p.hasRemaining);
                
                setPendingProducts(mappedProducts);
            }
        } catch (error) {
            console.error("Failed to load pending products API", error);
        }
    };
    
    const getQualityLabel = (quality) => {
        switch (quality) {
            case 'quality1': return 'Quality 1';
            case 'quality2': return 'Quality 2';
            case 'quality3': return 'Quality 3';
            default: return quality || 'N/A';
        }
    };

    const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);
    const [productToReturn, setProductToReturn] = useState(null);

    const [isMoveToTodayConfirmOpen, setIsMoveToTodayConfirmOpen] = useState(false);
    const [productToMove, setProductToMove] = useState(null);

    const handleReturnClick = (product) => {
        setProductToReturn(product);
        setIsReturnConfirmOpen(true);
    };

    const confirmReturnProduct = async () => {
        if (productToReturn) {
            try {
                // Not supported currently in API to completely mark as "returned", 
                // but one approach is changing status or disabling. Let's toggle isActive for now.
                await auctionApi.toggleProductStatus(productToReturn._id || productToReturn.id);
                toast.success("Product returned/disabled successfully");
                loadPendingProducts(today); // Refresh list
            } catch (error) {
                toast.error(error?.message || "Failed to return product");
            } finally {
                setIsReturnConfirmOpen(false);
                setProductToReturn(null);
            }
        }
    };

    const handleBackToToday = (product) => {
        setProductToMove(product);
        setIsMoveToTodayConfirmOpen(true);
    };

    const confirmMoveToToday = async () => {
        if (productToMove) {
            try {
                await auctionApi.updateAuctionProduct(productToMove._id || productToMove.id, { date: today });
                toast.success("Product moved to Today successfully");
                loadPendingProducts(today);
            } catch (error) {
                toast.error(error?.message || "Failed to move product");
            } finally {
                setIsMoveToTodayConfirmOpen(false);
                setProductToMove(null);
            }
        }
    };


    return (
        <>
            <ConfirmationModal
                isOpen={isReturnConfirmOpen}
                onClose={() => setIsReturnConfirmOpen(false)}
                onConfirm={confirmReturnProduct}
                title="Return Product"
                message={`Are you sure you want to return "${productToReturn?.name || 'this product'}"?`}
                subMessage="This item will be marked as returned."
                confirmText="Yes, Return"
                cancelText="Cancel"
                variant="warning"
            />
            <ConfirmationModal
                isOpen={isMoveToTodayConfirmOpen}
                onClose={() => setIsMoveToTodayConfirmOpen(false)}
                onConfirm={confirmMoveToToday}
                title="Move to Today's Auction"
                message={`Are you sure you want to move "${productToMove?.name || 'this product'}" back to Today's Auction?`}
                subMessage="This item will appear in the active auction list for today."
                confirmText="Yes, Move"
                cancelText="Cancel"
                variant="success"
            />
            <div className="content-header">
                <div className="header-top">
                    <h1>Pending Products</h1>
                    <BackButton />
                </div>
                <div className="breadcrumb">
                    <span>Home</span>
                    <span className="breadcrumb-separator">/</span>
                    <span>Pending Products</span>
                </div>
            </div>

            <div className="content-body pending-products-container">
                <div className="section-header">
                    <h3 className="section-title">Unsold Products from Previous Days ({pendingProducts.length})</h3>
                </div>

                {/* Search Bar */}
                <div className="card fade-in search-card">
                    <div className="form-group search-form-group">
                        <div className="search-icon-container">
                            <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
                                <Search size={20} className="search-icon-absolute" style={{ left: '12px', right: 'auto' }} />
                                <input
                                    type="text"
                                    placeholder="Search by product, seller"
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

                <div className="card-list fade-in">
                    {loading ? (
                        <LoadingSpinner message="Loading pending products..." />
                    ) : pendingProducts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <p>No pending products found.</p>
                        </div>
                    ) : (
                        <div className="table-responsive bg-card rounded-lg shadow-sm custom-table-wrapper">
                            <table className="data-table custom-data-table pending-table">
                                <thead className="bg-tertiary">
                                    <tr>
                                        <th className="custom-th">Product Details</th>
                                        <th className="custom-th">Seller & Date</th>
                                        <th className="custom-th">Variants (Qty & Comm)</th>
                                        <th className="custom-th custom-th-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingProducts
                                        .filter(product => {
                                            if (!searchQuery) return true;
                                            const query = searchQuery.toLowerCase();
                                            const seller = sellers.find(s => (s._id || s.id) === product.sellerId);
                                            const sellerName = seller ? seller.name.toLowerCase() : '';
                                            const productName = product.name.toLowerCase();
                                            const hasMatchingVariant = product.variants && product.variants.some(v => v.variety.toLowerCase().includes(query));

                                            return sellerName.includes(query) || productName.includes(query) || hasMatchingVariant;
                                        })
                                        .map(product => (
                                            <tr key={product._id || product.id} className="pending-product-card custom-tr">
                                                <td className="custom-td">
                                                    <div className="font-semibold text-primary table-product-name">
                                                        {product.name}
                                                    </div>
                                                    <span className="badge badge-disabled">Pending</span>
                                                </td>
                                                <td className="custom-td">
                                                    <div style={{ marginBottom: '4px' }}>
                                                        <strong>{sellers.find(s => (s._id || s.id) === product.sellerId)?.name || 'Unknown'}</strong>
                                                    </div>
                                                    <div className="text-muted table-product-subtext">
                                                        Created: {formatDate(product.date || product.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="custom-td custom-td-variants">
                                                    <div className="product-variants">
                                                        {product.variants && product.variants.map(v => (
                                                            <div key={v._id || v.id} className="variant-card">
                                                                <div className="variant-card-header">
                                                                    <span>{v.variety}</span>
                                                                    <span className={`badge ${v.quality === 'quality1' ? 'badge-success' : v.quality === 'quality2' ? 'badge-warning' : 'badge-error'} badge-sm`}>{getQualityLabel(v.quality)}</span>
                                                                </div>
                                                                <div className="variant-card-metrics">
                                                                    <span>{v.remaining} {v.unit}</span>
                                                                    {product.commissionPercent > 0 && <span className="text-amber font-semibold">{product.commissionPercent}% Comm</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="custom-td">
                                                    <div className="action-stack">
                                                        {/* <button
                                                            className="btn btn-error btn-pending-action action-btn-wide"
                                                            onClick={() => handleReturnClick(product)}
                                                        >
                                                            <Undo2 size={16} /> Return
                                                        </button> */}
                                                        <button
                                                            className="btn btn-success btn-pending-action action-btn-wide"
                                                            onClick={() => handleBackToToday(product)}
                                                        >
                                                            <ListFilterPlus size={16} /> To Today
                                                        </button>
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
        </>
    );
}

export default PendingProducts;
