import { useState, useRef, FormEvent, useMemo, ChangeEvent, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { completeUpload, discardUpload, requestUploadUrl } from '@workspace/api-client-react';
import { useAuth } from '@clerk/react';
import { 
  LogOut, Plus, Search, MoreVertical, Edit2, Trash2, 
  Image as ImageIcon, ArrowLeft, Store, Settings, 
  Package, LayoutDashboard, X, Check, AlertCircle
} from 'lucide-react';
import { useSellerWorkspace, type SellerProduct, type SellerProductInput } from '@/hooks/use-seller-workspace';
import { BrandLogo } from '@/components/brand-logo';

function sellerImageUrl(image: string) {
  if (image.startsWith('data:') || image.startsWith('http')) return image;
  if (image.startsWith('/objects/')) return `/api/storage${image}`;
  const sampleName = /^product-images\/(mimoza-02|sahil-11|nisan-07|xezer-air|luna-24|merdekan-03|iceriseher-09|caspian-sun)\.jpg$/.exec(image)?.[1];
  if (sampleName) return `${import.meta.env.BASE_URL}product-images/${sampleName}-cutout.png`;
  return `${import.meta.env.BASE_URL}${image}`;
}

export default function SellerPanel() {
  const {
    user,
    isAuthenticated,
    isAuthLoading,
    signOut,
    store,
    storeError,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStore,
    isLoading,
    isSaving,
    errorMessage,
  } = useSellerWorkspace();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'store'>('products');
  const [storeForm, setStoreForm] = useState({ name: '', location: '', description: '', instagram: '', website: '' });
  const [storeSaveMessage, setStoreSaveMessage] = useState('');
  
  // Product Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-panel')}`);
  }, [isAuthLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (store) {
      setStoreForm({
        name: store.name,
        location: store.location,
        description: store.description,
        instagram: store.instagram,
        website: store.website,
      });
    }
  }, [store]);

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.color.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (isAuthLoading || !isAuthenticated || isLoading) return null;
  if (!store) {
    return (
      <div className="seller-auth-page">
        <div className="seller-auth-container">
          <div className="seller-auth-header">
            <Link href="/" className="brand"><BrandLogo /></Link>
            <div className="eyebrow" style={{ marginTop: 30 }}>Satıcı Paneli</div>
            <h1>Mağaza təsdiqi tələb olunur</h1>
            <p>{storeError || 'Bu hesaba bağlı aktiv satıcı mağazası tapılmadı.'}</p>
          </div>
          <Link href="/seller" className="btn btn-full btn-blue">Satıcı müraciətinə bax</Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    void signOut({ redirectUrl: import.meta.env.BASE_URL || '/' });
  };

  const openAddForm = () => {
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (id: string) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const activeCount = products.filter(p => p.status === 'Aktiv' && p.approvalStatus === 'approved').length;
  const draftCount = products.filter(p => p.status === 'Qaralama').length;
  const reviewCount = products.filter(p => p.approvalStatus === 'pending').length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const saveStoreProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreSaveMessage('');
    try {
      await updateStore({
        name: storeForm.name.trim(),
        location: storeForm.location.trim(),
        description: storeForm.description.trim(),
        instagram: storeForm.instagram.trim(),
        website: storeForm.website.trim(),
      });
      setStoreSaveMessage('Mağaza məlumatları yadda saxlanıldı.');
    } catch {
      setStoreSaveMessage(errorMessage || 'Mağaza məlumatları saxlanmadı.');
    }
  };

  return (
    <div className="seller-panel-layout">
      {/* Sidebar */}
      <aside className="seller-sidebar">
        <div className="seller-sidebar-header">
          <Link href="/" className="brand" data-testid="link-brand-panel">
            <BrandLogo />
          </Link>
          <span className="seller-badge">Satıcı Paneli</span>
        </div>
        
        <div className="seller-store-info">
          <div className="store-avatar"><Store size={20} /></div>
          <div>
            <strong>{store.name}</strong>
            <small>{user?.primaryEmailAddress?.emailAddress}</small>
          </div>
        </div>

        <nav className="seller-nav">
          <button 
            className={`seller-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="nav-overview"
          >
            <LayoutDashboard size={18} /> İcmal
          </button>
          <button 
            className={`seller-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
            data-testid="nav-products"
          >
            <Package size={18} /> Məhsullar
            <span className="nav-count">{products.length}</span>
          </button>
          <button
            className={`seller-nav-item ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
            data-testid="nav-store"
          >
            <Settings size={18} /> Mağaza məlumatları
          </button>
        </nav>

        <div className="seller-sidebar-footer">
          <Link href="/" className="seller-nav-item" data-testid="link-back-storefront">
            <ArrowLeft size={18} /> Vitrinə qayıt
          </Link>
          <button className="seller-nav-item text-danger" onClick={handleLogout} data-testid="button-logout">
            <LogOut size={18} /> Çıxış et
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="seller-main">
        {activeTab === 'overview' && (
          <div className="seller-content fade-in">
            <header className="seller-main-header">
              <h1>Mağaza İcmalı</h1>
              <p>Məhsullarınızın və mağazanızın ümumi vəziyyəti</p>
            </header>

            <div className="seller-stats-grid">
              <div className="seller-stat-card">
                <div className="stat-icon bg-blue-soft"><Package size={20} /></div>
                <div className="stat-info">
                  <h3>Cəmi Məhsul</h3>
                  <strong>{products.length}</strong>
                </div>
              </div>
              <div className="seller-stat-card">
                <div className="stat-icon bg-green-soft"><Check size={20} /></div>
                <div className="stat-info">
                  <h3>Aktiv</h3>
                  <strong>{activeCount}</strong>
                </div>
              </div>
              <div className="seller-stat-card">
                <div className="stat-icon bg-gray-soft"><Settings size={20} /></div>
                <div className="stat-info">
                  <h3>Qaralama</h3>
                  <strong>{draftCount}</strong>
                </div>
              </div>
              <div className="seller-stat-card">
                <div className="stat-icon bg-gray-soft"><AlertCircle size={20} /></div>
                <div className="stat-info">
                  <h3>Yoxlamada</h3>
                  <strong>{reviewCount}</strong>
                </div>
              </div>
              <div className="seller-stat-card">
                <div className="stat-icon bg-red-soft"><AlertCircle size={20} /></div>
                <div className="stat-info">
                  <h3>Bitmiş Stok</h3>
                  <strong className={outOfStockCount > 0 ? 'text-danger' : ''}>{outOfStockCount}</strong>
                </div>
              </div>
            </div>

            <div className="seller-panel-section mt-10">
              <h2>Son əlavə edilənlər</h2>
              <div className="recent-products-list">
                {products.slice(0, 4).map(p => (
                  <div key={p.id} className="recent-product-item">
                    <img src={sellerImageUrl(p.frontImage)} alt={p.name} className="recent-product-img" />
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.category}</span>
                    </div>
                    <div className="ml-auto text-right">
                      <strong>{p.price} AZN</strong>
                      <span className={`status-dot ${p.status === 'Aktiv' ? 'active' : 'draft'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="empty-state-mini">Heç bir məhsul tapılmadı.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="seller-content fade-in">
            <header className="seller-main-header with-actions">
              <div>
                <h1>Məhsullar</h1>
                <p>İnventarınızı idarə edin, yeni məhsullar əlavə edin və stokları yeniləyin.</p>
              </div>
              <button className="btn btn-blue" onClick={openAddForm} data-testid="button-create-product">
                <Plus size={16} /> Yeni Məhsul
              </button>
            </header>

            <div className="seller-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="search" 
                  placeholder="Məhsul adı və ya rəngi axtar..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="seller-products-table-wrapper">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Məhsul</th>
                    <th>Kateqoriya</th>
                    <th>Qiymət</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th className="text-right">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <tr key={product.id} data-testid={`row-product-${product.id}`}>
                        <td>
                          <div className="product-cell">
                            <div className="product-cell-img-wrap">
                              <div className="product-cell-img"><img src={sellerImageUrl(product.frontImage)} alt={product.name} /></div>
                              <div className="product-cell-img"><img src={sellerImageUrl(product.sideImage)} alt={`${product.name} yan`} /></div>
                            </div>
                            <div>
                              <strong>{product.name}</strong>
                              <span>{product.color}</span>
                            </div>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td><strong>{product.price} AZN</strong></td>
                        <td>
                          <span className={`stock-badge ${product.stock === 0 ? 'out' : product.stock < 5 ? 'low' : 'good'}`}>
                            {product.stock} ədəd
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${product.approvalStatus === 'approved' ? 'active' : product.approvalStatus === 'rejected' ? 'draft' : 'pending'}`}>
                            {product.approvalStatus === 'approved' ? 'Təsdiqləndi' : product.approvalStatus === 'pending' ? 'Yoxlamada' : product.approvalStatus === 'needs_changes' ? 'Dəyişiklik tələb olunur' : 'Rədd edildi'}
                          </span>
                          {product.moderationNote && <small className="field-help">{product.moderationNote}</small>}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-button" onClick={() => openEditForm(product.id)} aria-label="Redaktə et" data-testid={`button-edit-${product.id}`}>
                              <Edit2 size={16} />
                            </button>
                            <button className="icon-button text-danger" onClick={() => deleteProduct(product.id)} aria-label="Sil" data-testid={`button-delete-${product.id}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <Package size={24} />
                          <h3>Məhsul tapılmadı</h3>
                          <p>{searchQuery ? 'Axtarışınıza uyğun nəticə yoxdur.' : 'İnventarınızda heç bir məhsul yoxdur. Yeni məhsul əlavə edərək başlayın.'}</p>
                          {!searchQuery && (
                            <button className="btn btn-secondary mt-10" onClick={openAddForm} data-testid="button-empty-create">
                              İlk məhsulu əlavə et
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'store' && (
          <div className="seller-content fade-in">
            <header className="seller-main-header">
              <h1>Mağaza məlumatları</h1>
              <p>İctimai mağaza səhifəsində görünən məlumatları idarə edin.</p>
            </header>
            <form className="seller-form" onSubmit={saveStoreProfile} noValidate>
              <div className="field"><label htmlFor="store-profile-name">Mağaza adı</label><input id="store-profile-name" required value={storeForm.name} onChange={(event) => setStoreForm((form) => ({ ...form, name: event.target.value }))} /></div>
              <div className="field"><label htmlFor="store-profile-location">Ünvan</label><input id="store-profile-location" required value={storeForm.location} onChange={(event) => setStoreForm((form) => ({ ...form, location: event.target.value }))} /></div>
              <div className="field full"><label htmlFor="store-profile-description">Haqqında</label><textarea id="store-profile-description" value={storeForm.description} onChange={(event) => setStoreForm((form) => ({ ...form, description: event.target.value }))} /></div>
              <div className="field"><label htmlFor="store-profile-instagram">Instagram</label><input id="store-profile-instagram" value={storeForm.instagram} onChange={(event) => setStoreForm((form) => ({ ...form, instagram: event.target.value }))} /></div>
              <div className="field"><label htmlFor="store-profile-website">Veb-sayt</label><input id="store-profile-website" value={storeForm.website} onChange={(event) => setStoreForm((form) => ({ ...form, website: event.target.value }))} /></div>
              {storeSaveMessage && <div className="field-help" role="status">{storeSaveMessage}</div>}
              <div className="form-actions"><button className="btn btn-blue" disabled={isSaving} type="submit">{isSaving ? 'Yadda saxlanılır...' : 'Məlumatları saxla'}</button></div>
            </form>
          </div>
        )}
      </main>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductFormModal 
          product={editingId ? products.find(p => p.id === editingId) : undefined}
          onClose={closeForm}
          isSaving={isSaving}
          serverError={errorMessage}
          onSave={async (data) => {
            if (editingId) {
              await updateProduct(editingId, data);
            } else {
              await addProduct(data);
            }
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSave, isSaving, serverError }: { 
  product?: SellerProduct; 
  onClose: () => void; 
  onSave: (data: SellerProductInput) => Promise<void>;
  isSaving: boolean;
  serverError: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const canUpload = Boolean(isSignedIn);
  const isAuthLoading = !isLoaded;
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<SellerProductInput>({
    name: product?.name || '',
    category: product?.category || 'Optik çərçivə',
    price: product?.price || 0,
    stock: product?.stock || 0,
    color: product?.color || '',
    material: product?.material || 'Asetat',
    brand: product?.brand || '',
    gender: product?.gender || 'Uniseks',
    shape: product?.shape || 'Square',
    size: product?.size || 'M (50–20)',
    description: product?.description || '',
    status: product?.status || 'Qaralama',
    frontImage: product?.frontImage || '',
    sideImage: product?.sideImage || '',
  });

  const [frontImageError, setFrontImageError] = useState('');
  const [sideImageError, setSideImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const pendingUploads = useRef(new Set<string>());

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);

  const discardPending = async (keep: string[] = []) => {
    for (const path of pendingUploads.current) {
      if (keep.includes(path)) continue;
      try {
        await discardUpload({ objectPath: path });
        pendingUploads.current.delete(path);
      } catch {
        // The server retains ownership records for a later cleanup attempt.
      }
    }
  };

  const closeForm = async () => {
    if (isImageUploading || isSaving) return;
    await discardPending();
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateImage = (file: File): Promise<{valid: boolean, error: string}> => {
    return new Promise((resolve) => {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        resolve({valid: false, error: 'Yalnız JPG, JPEG və PNG formatları dəstəklənir.'});
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        resolve({valid: false, error: 'Şəklin ölçüsü maksimum 10 MB ola bilər.'});
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.width < 1000) {
          resolve({valid: false, error: `Şəklin eni ən azı 1000px olmalıdır (Sizin şəkil: ${img.width}px).`});
        } else {
          resolve({valid: true, error: ''});
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({valid: false, error: 'Şəkil oxuna bilmədi.'});
      };
      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'frontImage' | 'sideImage') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!canUpload) {
        const message = 'Şəkil yükləmək üçün əvvəl təhlükəsiz giriş edin.';
        if (type === 'frontImage') setFrontImageError(message);
        else setSideImageError(message);
        e.target.value = '';
        return;
      }

      const result = await validateImage(file);
      if (result.valid) {
        setIsImageUploading(true);
        let uploadedPath: string | undefined;
        try {
          const upload = await requestUploadUrl({
            name: file.name,
            size: file.size,
            contentType: file.type as 'image/jpeg' | 'image/png',
          });
          uploadedPath = upload.objectPath;
          const uploadResponse = await fetch(upload.uploadURL, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!uploadResponse.ok) throw new Error('Storage upload failed');

          const completed = await completeUpload({ objectPath: upload.objectPath });
          pendingUploads.current.add(completed.objectPath);
          setFormData(prev => ({ ...prev, [type]: completed.objectPath }));
          if (type === 'frontImage') setFrontImageError('');
          else setSideImageError('');
        } catch {
          if (uploadedPath) {
            try { await discardUpload({ objectPath: uploadedPath }); } catch { /* The upload may not exist yet. */ }
          }
          const message = 'Şəkil yüklənmədi. Yenidən cəhd edin.';
          if (type === 'frontImage') setFrontImageError(message);
          else setSideImageError(message);
        } finally {
          setIsImageUploading(false);
          e.target.value = '';
        }
      } else {
        if (type === 'frontImage') setFrontImageError(result.error);
        else setSideImageError(result.error);
        e.target.value = '';
      }
    }
  };

  const handleUseSampleImage = () => {
    setFormData(prev => ({ 
      ...prev, 
      frontImage: 'product-images/mimoza-02.jpg',
      sideImage: 'product-images/nisan-07.jpg'
    }));
    setFrontImageError('');
    setSideImageError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!formData.frontImage) setFrontImageError('Ön görünüş şəkli tələb olunur.');
    if (!formData.sideImage) setSideImageError('Yan görünüş şəkli tələb olunur.');
    if (formData.frontImage.startsWith('data:') || formData.sideImage.startsWith('data:')) {
      setSubmitError(
        'Base64 formatlı şəkillər qəbul edilmir. Şəkilləri təhlükəsiz yükləmə bölməsindən App Storage-a göndərin.',
      );
      return;
    }
    if (formData.frontImage && formData.sideImage && !frontImageError && !sideImageError) {
      try {
        await onSave(formData);
        await discardPending([formData.frontImage, formData.sideImage]);
        onClose();
      } catch {
        setSubmitError(serverError || 'Məhsul yadda saxlanmadı. Yenidən cəhd edin.');
      }
    }
  };

  return (
    <div className="seller-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) void closeForm(); }}>
      <div className="seller-modal" data-testid="modal-product-form">
        <div className="seller-modal-header">
          <h2>{product ? 'Məhsulu redaktə et' : 'Yeni məhsul əlavə et'}</h2>
          <button className="icon-button" disabled={isImageUploading || isSaving} onClick={() => void closeForm()} aria-label="Bağla" data-testid="button-close-modal">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="seller-modal-body">
          <div className="auglio-instructions">
            <h3>VTO Şəkil Tələbləri (Auglio)</h3>
            <p>Bu şəkillər Auglio virtual try-on (VTO) emalı üçün hazırlanır.</p>
            <ul>
              <li><strong>Ön görünüş:</strong> Tam düz (0°), tam çərçivə görünməlidir.</li>
              <li><strong>Yan görünüş:</strong> Tam yan (90°), sol və ya sağ tərəf, təmiz kəsim.</li>
              <li><strong>Arxa fon:</strong> Şəffaf və ya tünd çərçivələr üçün açıq, açıq çərçivələr üçün tünd fon.</li>
              <li><strong>Format:</strong> JPG, JPEG, PNG. Minimum en: 1000px.</li>
            </ul>
            <div className="google-index-note">
              <AlertCircle size={12} />
              Qeyd: Google axtarış sistemində indekslənmək üçün şəkillər canlı serverə yüklənməlidir (yerli data deyil).
            </div>
            {!isAuthLoading && !canUpload && (
              <div className="google-index-note">
                <AlertCircle size={12} />
                <span>Real şəkil yükləməsi üçün təhlükəsiz giriş tələb olunur.</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLocation(`/sign-in?redirect_url=${encodeURIComponent('/seller-panel')}`)}>
                  Giriş et
                </button>
              </div>
            )}
            {!isAuthLoading && canUpload && (
              <div className="google-index-note">
                <Check size={12} />
                Şəkillər birbaşa təhlükəsiz App Storage-a yüklənəcək.
              </div>
            )}
          </div>

          <div className="form-grid">
            {/* Image Upload Section */}
            <div className="field full">
              <label>Məhsul şəkilləri (Ön və Yan)</label>
              
              <div className="image-upload-grid">
                {/* Front Image */}
                <div className="image-upload-field">
                  <div className="image-upload-area">
                    {formData.frontImage ? (
                      <div className="image-preview">
                        <img src={sellerImageUrl(formData.frontImage)} alt="Ön görünüş" />
                        <div className="image-actions">
                          <button type="button" className="btn btn-secondary btn-sm" disabled={isImageUploading} onClick={() => frontInputRef.current?.click()}>Dəyiş</button>
                          <button type="button" className="icon-button text-danger bg-white" disabled={isImageUploading} onClick={() => { setFormData(prev => ({ ...prev, frontImage: '' })); setFrontImageError(''); }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="image-upload-prompt">
                        <div className="icon-circle"><ImageIcon size={24} /></div>
                        <p>Ön görünüş (0°)</p>
                        <div className="flex gap-2 justify-center mt-2">
                          <button type="button" className="btn btn-secondary btn-sm" disabled={isImageUploading} onClick={() => frontInputRef.current?.click()} data-testid="button-upload-front">{isImageUploading ? 'Yüklənir...' : 'Şəkil seç'}</button>
                        </div>
                      </div>
                    )}
                    <input type="file" ref={frontInputRef} disabled={isImageUploading} onChange={(e) => handleImageUpload(e, 'frontImage')} accept="image/png, image/jpeg, image/jpg" className="hidden" />
                  </div>
                  {frontImageError && <span className="field-error-text" data-testid="error-front-image">{frontImageError}</span>}
                </div>

                {/* Side Image */}
                <div className="image-upload-field">
                  <div className="image-upload-area">
                    {formData.sideImage ? (
                      <div className="image-preview">
                        <img src={sellerImageUrl(formData.sideImage)} alt="Yan görünüş" />
                        <div className="image-actions">
                          <button type="button" className="btn btn-secondary btn-sm" disabled={isImageUploading} onClick={() => sideInputRef.current?.click()}>Dəyiş</button>
                          <button type="button" className="icon-button text-danger bg-white" disabled={isImageUploading} onClick={() => { setFormData(prev => ({ ...prev, sideImage: '' })); setSideImageError(''); }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="image-upload-prompt">
                        <div className="icon-circle"><ImageIcon size={24} /></div>
                        <p>Yan görünüş (90°)</p>
                        <div className="flex gap-2 justify-center mt-2">
                          <button type="button" className="btn btn-secondary btn-sm" disabled={isImageUploading} onClick={() => sideInputRef.current?.click()} data-testid="button-upload-side">{isImageUploading ? 'Yüklənir...' : 'Şəkil seç'}</button>
                        </div>
                      </div>
                    )}
                    <input type="file" ref={sideInputRef} disabled={isImageUploading} onChange={(e) => handleImageUpload(e, 'sideImage')} accept="image/png, image/jpeg, image/jpg" className="hidden" />
                  </div>
                  {sideImageError && <span className="field-error-text" data-testid="error-side-image">{sideImageError}</span>}
                </div>
              </div>
              
              {!formData.frontImage && !formData.sideImage && (
                <div className="flex justify-center" style={{ marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleUseSampleImage} data-testid="button-sample-image">Nümunə istifadə et (Demo)</button>
                </div>
              )}
            </div>

            {/* General Info */}
            <div className="field full">
              <label htmlFor="product-name">Məhsul adı</label>
              <input 
                id="product-name" 
                type="text" 
                value={formData.name} 
                onChange={(e) => handleChange('name', e.target.value)} 
                required 
                placeholder="Məs: Sahil 11"
                data-testid="input-product-name"
              />
            </div>

            <div className="field">
              <label htmlFor="product-category">Kateqoriya</label>
              <select 
                id="product-category" 
                value={formData.category} 
                onChange={(e) => handleChange('category', e.target.value)}
                data-testid="select-product-category"
              >
                <option value="Optik çərçivə">Optik çərçivə</option>
                <option value="Gün eynəyi">Gün eynəyi</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="product-status">Status</label>
              <select 
                id="product-status" 
                value={formData.status} 
                onChange={(e) => handleChange('status', e.target.value)}
                data-testid="select-product-status"
              >
                <option value="Aktiv">Aktiv</option>
                <option value="Qaralama">Qaralama</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="product-price">Qiymət (AZN)</label>
              <input 
                id="product-price" 
                type="number" 
                min="0" 
                step="1"
                value={formData.price || ''} 
                onChange={(e) => handleChange('price', Number(e.target.value))} 
                required 
                data-testid="input-product-price"
              />
            </div>

            <div className="field">
              <label htmlFor="product-stock">Stok miqdarı</label>
              <input 
                id="product-stock" 
                type="number" 
                min="0" 
                step="1" 
                value={formData.stock || ''} 
                onChange={(e) => handleChange('stock', Number(e.target.value))} 
                required 
                data-testid="input-product-stock"
              />
            </div>

            <div className="field">
              <label htmlFor="product-color">Rəng</label>
              <input 
                id="product-color" 
                type="text" 
                value={formData.color} 
                onChange={(e) => handleChange('color', e.target.value)} 
                required 
                placeholder="Məs: Zeytun"
                data-testid="input-product-color"
              />
            </div>

            <div className="field">
              <label htmlFor="product-material">Material</label>
              <select 
                id="product-material" 
                value={formData.material} 
                onChange={(e) => handleChange('material', e.target.value)}
                data-testid="select-product-material"
              >
                <option value="Asetat">Asetat</option>
                <option value="Metal">Metal</option>
                <option value="Titanium">Titanium</option>
                <option value="Bio-nylon">Bio-nylon</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="product-brand">Brend</label>
              <input id="product-brand" type="text" value={formData.brand} onChange={(e) => handleChange('brand', e.target.value)} placeholder="Brend adı" data-testid="input-product-brand" />
            </div>

            <div className="field">
              <label htmlFor="product-gender">Cins</label>
              <select id="product-gender" value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} data-testid="select-product-gender">
                <option value="Qadın">Qadın</option><option value="Kişi">Kişi</option><option value="Uniseks">Uniseks</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="product-shape">Forma</label>
              <select id="product-shape" value={formData.shape} onChange={(e) => handleChange('shape', e.target.value)} data-testid="select-product-shape">
                <option value="Aviator">Aviator</option><option value="Cat-Eye">Cat-Eye</option><option value="Rectangle">Rectangle</option><option value="Round">Round</option><option value="Square">Square</option><option value="Wayfarer">Wayfarer</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="product-size">Ölçü</label>
              <input id="product-size" type="text" value={formData.size} onChange={(e) => handleChange('size', e.target.value)} placeholder="M (52–18)" data-testid="input-product-size" />
            </div>

            <div className="field full">
              <label htmlFor="product-description">Təsvir</label>
              <textarea id="product-description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} maxLength={1000} data-testid="input-product-description" />
            </div>
          </div>

          <div className="seller-modal-footer">
            {(submitError || serverError) && (
              <span className="field-error-text" role="alert">
                {submitError || serverError}
              </span>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} data-testid="button-cancel-product">Ləğv et</button>
            <button
              type="submit"
              className="btn btn-blue"
              disabled={
                isSaving ||
                isImageUploading ||
                !formData.name ||
                !formData.frontImage ||
                !formData.sideImage ||
                Boolean(frontImageError) ||
                Boolean(sideImageError)
              }
              data-testid="button-save-product"
            >
              {isSaving ? 'Yadda saxlanılır...' : product ? 'Yenilə' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
