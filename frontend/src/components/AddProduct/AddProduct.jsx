import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Trash2, Plus, X, Loader2, Edit2, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import * as productApi from '../../api/vendorApi';
import ConfirmationModal from '../Common/ConfirmationModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import BackButton from '../Common/BackButton';
import VoiceSearch from '../Common/VoiceSearch';
import './AddProduct.css';
import '../TodayAuction/TodayAuction.css';

function AddProduct() {
    const [masterProducts, setMasterProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [newMaster, setNewMaster] = useState({
        name: '',
        varieties: [],
        units: []
    });
    const [tempVariety, setTempVariety] = useState('');
    const [tempUnit, setTempUnit] = useState('kg');

    const { vendorId } = useSelector(state => state.vendorAuth);
    // Fallback to session storage if redux state is lost on refresh
    const currentVendorId = vendorId || sessionStorage.getItem('vendorId');

    useEffect(() => {
        loadData();
    }, [currentVendorId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await productApi.getProducts({ vendorId: currentVendorId });
            setMasterProducts(data);
        } catch (error) {
            toast.error("Failed to load products");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaster = async (e) => {
        e.preventDefault();
        if (!newMaster.name) {
            toast.error("Please enter product name");
            return;
        }
        if (newMaster.varieties.length === 0) {
            toast.error("Add at least one variety");
            return;
        }
        if (newMaster.units.length === 0) {
            toast.error("Add at least one quantity type");
            return;
        }

        try {
            if (isEditing) {
                const result = await productApi.updateProduct(editingProductId, { ...newMaster, vendorId: currentVendorId });
                setMasterProducts(prev => prev.map(p => p._id === editingProductId ? result.product : p));
                toast.success("Product updated successfully");
            } else {
                const result = await productApi.addProduct({
                    ...newMaster,
                    vendorId: currentVendorId
                });
                setMasterProducts([result.product, ...masterProducts]);
                toast.success("Product added successfully");
            }
            
            closeModal();
        } catch (error) {
            toast.error(error.message || "Failed to save product");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingProductId(null);
        setNewMaster({ name: '', varieties: [], units: [] });
    };

    const openEditModal = (product) => {
        setIsEditing(true);
        setEditingProductId(product._id);
        setNewMaster({
            name: product.name,
            varieties: product.varieties || [],
            units: product.units || []
        });
        setShowModal(true);
    };

    const addVariety = () => {
        if (!tempVariety.trim()) return;
        if (newMaster.varieties.includes(tempVariety.trim())) {
            toast.warning("Variety already added");
            return;
        }
        setNewMaster({
            ...newMaster,
            varieties: [...newMaster.varieties, tempVariety.trim()]
        });
        setTempVariety('');
    };

    const removeVariety = (val) => {
        setNewMaster({
            ...newMaster,
            varieties: newMaster.varieties.filter(v => v !== val)
        });
    };

    const addUnit = () => {
        if (newMaster.units.includes(tempUnit)) {
            toast.warning("Unit already added");
            return;
        }
        setNewMaster({
            ...newMaster,
            units: [...newMaster.units, tempUnit]
        });
    };

    const removeUnit = (val) => {
        setNewMaster({
            ...newMaster,
            units: newMaster.units.filter(u => u !== val)
        });
    };

    const handleDeleteClick = (id) => {
        setProductToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setDeleteLoading(true);
        try {
            await productApi.deleteProduct(productToDelete, { vendorId: currentVendorId });
            setMasterProducts(prev => prev.filter(item => item._id !== productToDelete));
            toast.success("Product removed from list");
            setShowDeleteModal(false);
        } catch (error) {
            toast.error("Failed to delete product");
        } finally {
            setDeleteLoading(false);
            setProductToDelete(null);
        }
    };

    const filteredProducts = masterProducts.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const varietyMatch = (item.varieties || []).some(v => v.toLowerCase().includes(query));
        return nameMatch || varietyMatch;
    });

    return (
        <>
            {/* Header */}
            <div className="content-header">
                <div className="header-top">
                    <h1>Product List</h1>
                    <BackButton />
                </div>
                <div className="breadcrumb-row">
                    <div className="breadcrumb">
                        <span>Home</span>
                        <span className="breadcrumb-separator">/</span>
                        <span>Product List</span>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            <div className="content-body">
                {/* Section header */}
                <div className="section-header">
                    <h3 className="section-title">All Products ({masterProducts.length})</h3>
                </div>

                {/* Search Bar */}
                <div className="card fade-in search-card">
                    <div className="form-group search-form-group">
                        <div className="search-icon-container">
                            <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
                                <Search size={20} className="search-icon-absolute" style={{ left: '12px', right: 'auto' }} />
                                <input
                                    type="text"
                                    placeholder="Search by product name"
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


                {/* Table */}
                <div className="table-container-full fade-in">
                    {loading ? (
                        <LoadingSpinner message="Loading products..." />
                    ) : filteredProducts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📦</div>
                            <p>
                                {searchQuery
                                    ? 'No products matched your search.'
                                    : 'No products found. Click "Add Product" to start building your list.'}
                            </p>
                        </div>
                    ) : (
                        <div className="table-responsive bg-card rounded-lg shadow-sm custom-table-wrapper">
                            <table className="data-table custom-data-table add-product-data-table">
                                <thead className="bg-tertiary">
                                    <tr>
                                        <th className="custom-th">Product Name</th>
                                        <th className="custom-th">Varieties</th>
                                        <th className="custom-th">Quantity Types</th>
                                        <th className="custom-th custom-th-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(item => (
                                        <tr key={item._id || item.id} className="custom-tr">
                                            <td className="custom-td" data-label="Product Name">
                                                <div className="font-semibold text-primary table-product-name">
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className="custom-td custom-td-stacked" data-label="Varieties">
                                                <div className="tag-container">
                                                    {(item.varieties || []).map((v, idx) => (
                                                        <span key={idx} className="variety-tag">{v}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="custom-td custom-td-stacked" data-label="Quantity Types">
                                                <div className="tag-container">
                                                    {(item.units || []).map((u, idx) => (
                                                        <span key={idx} className="unit-tag">{u}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="custom-td custom-td-center" data-label="Actions">
                                                <div className="action-stack">
                                                    <div className="action-icon-row">
                                                        <button
                                                            className="icon-btn edit action-icon-small"
                                                            onClick={() => openEditModal(item)}
                                                            title="Edit Product"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="icon-btn delete action-icon-small"
                                                            onClick={() => handleDeleteClick(item._id)}
                                                            title="Delete Product"
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

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{isEditing ? 'Edit Product' : 'Add New Product to List'}</h3>
                            <button className="modal-close" onClick={closeModal}><X /></button>
                        </div>
                        <form onSubmit={handleAddMaster}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Product Name</label>
                                    <input
                                        type="text"
                                        className="add-product-input"
                                        placeholder="e.g. Turmeric, Jasmine..."
                                        value={newMaster.name}
                                        onChange={e => setNewMaster({...newMaster, name: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="builder-section">
                                    <label className="form-label">Varieties</label>
                                    <div className="builder-input-group">
                                        <input
                                            type="text"
                                            className="add-product-input"
                                            placeholder="Add Variety..."
                                            value={tempVariety}
                                            onChange={e => setTempVariety(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addVariety())}
                                        />
                                        <button type="button" className="btn btn-primary btn-sm-product" onClick={addVariety}>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="tag-container mt-2">
                                        {newMaster.varieties.map((v, i) => (
                                            <span key={i} className="variety-tag-editable">
                                                {v} <X size={14} onClick={() => removeVariety(v)} />
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="builder-section">
                                    <label className="form-label">Quantity Types (Units)</label>
                                    <div className="builder-input-group">
                                        <select
                                            className="add-product-select"
                                            value={tempUnit}
                                            onChange={e => setTempUnit(e.target.value)}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="qty">qty</option>
                                            <option value="pcs">pcs</option>
                                            <option value="ltr">ltr</option>
                                            <option value="box">box</option>
                                        </select>
                                        <button type="button" className="btn btn-primary btn-sm-product" onClick={addUnit}>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="tag-container mt-2">
                                        {newMaster.units.map((u, i) => (
                                            <span key={i} className="unit-tag-editable">
                                                {u} <X size={14} onClick={() => removeUnit(u)} />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {isEditing ? 'Update Product' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Product"
                message="Are you sure you want to remove this product from your list?"
                subMessage="This will not affect existing auctions but the product won't be available for new selections."
                confirmText="Yes, Remove"
                isLoading={deleteLoading}
            />
        </>
    );
}

export default AddProduct;
