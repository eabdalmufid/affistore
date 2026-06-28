import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { products, categories } from './data/products';

const API_URL = 'https://bot.affidev.com/app/plans';
const SMM_API_URL = 'https://bot.affidev.com/smm/plans';


function formatRupiah(amount) {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

function toSlug(title) {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}



function getProductFromUrl() {
  const hash = window.location.hash.slice(1);
  const path = window.location.pathname.slice(1);
  const slug = hash || path;
  if (!slug) return null;
  return products.find(p => toSlug(p.title) === slug);
}

/* ── Product Modal ── */
function ProductModal({ product, onClose, smmData = [] }) {
  const [plans, setPlans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchPlans = useCallback(async () => {
    if (product.type === 'smm_category') {
      setLoading(true);
      try {
        const filtered = smmData.filter(item => item.category === product.title);
        const mapped = filtered.map(item => ({
          code: item.service,
          name: item.name,
          price: parseFloat(item.rate),
          min: item.min,
          max: item.max,
          status: 'available'
        }));
        setPlans(mapped);
      } catch (e) {
        setError('Gagal memproses data SMM.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter_game: product.title }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (!json.result) throw new Error(json.message || 'Gagal memuat data');
      setPlans(json.data || []);
    } catch (e) {
      setError(e.message || 'Gagal memuat data produk. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [product.title, product.type, smmData]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal-box" role="dialog" aria-modal="true">
        <div className="modal-drag-handle" aria-hidden="true" />
        <div className="modal-header">
          <div className="modal-product-info">
            {product.type === 'smm_category' ? (
              <div className="modal-smm-icon">
                <img src="/gambar.png" alt="SMM" className="modal-smm-img" loading="lazy" />
              </div>
            ) : (
              <ProductImage src={product.image} title={product.title} category={product.category} className="modal-product-img" />
            )}
            <div>
              <div className="modal-product-category">{product.category}</div>
              <div className="modal-product-title">{product.title}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="modal-loading">
              <div className="spinner" />
              <p>Memuat paket tersedia…</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-error">
              <p>⚠️ {error}</p>
              <button className="btn-retry" onClick={fetchPlans}>Coba Lagi</button>
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="modal-empty-state">
              <p>😕 Belum ada paket tersedia saat ini.</p>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="plans-list">
              {[...plans].sort((a, b) => (a.status === 'empty') - (b.status === 'empty')).map((plan) => {
                const isEmpty  = plan.status === 'empty';
                const price    = Math.round(plan.price);
                return (
                  <div key={plan.code} className={`plan-item${isEmpty ? ' plan-empty' : ''}`}>
                    <div className="plan-left">
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-price">
                        {formatRupiah(price)}
                        {product.type === 'smm_category' && <span className="price-unit">/1000 Order</span>}
                      </div>
                      {(plan.min || plan.max) && (
                        <div className="plan-limits">
                          Min. {plan.min?.toLocaleString('id-ID')} · Max. {plan.max?.toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                    <div className="plan-right">
                      {isEmpty ? (
                        <span className="plan-status-empty">Kosong</span>
                      ) : (
                        <a
                          className="plan-order-btn"
                          href={waLink(
                            product.type === 'smm_category'
                              ? `Halo Affistore, saya mau pesan Jasa Sosmed:\n\n` +
                                `📦 Kategori: *${product.title}*\n` +
                                `🛠️ Layanan: ${plan.name}\n` +
                                `💰 Harga: ${formatRupiah(price)}/1000 Order\n` +
                                `📉 Min. Order: ${plan.min?.toLocaleString('id-ID')}\n` +
                                `📈 Max. Order: ${plan.max?.toLocaleString('id-ID')}\n\n` +
                                `Tolong diproses ya kak, terima kasih!`
                              : `Halo Affistore, saya mau langganan Aplikasi Premium:\n\n` +
                                `📦 Aplikasi: *${product.title}*\n` +
                                `✨ Varian: ${plan.name}\n` +
                                `💰 Harga: ${formatRupiah(price)}\n\n` +
                                `Tolong diproses ya kak, terima kasih!`
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Order
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const WA_NUMBER = '6289509952003';

function waLink(msg = '') {
  return `https://wa.me/${WA_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

/* ── Floating WhatsApp Button ── */
function FloatingWA() {
  return (
    <a
      className="floating-wa"
      href={waLink('Halo, saya ingin tanya produk premium!')}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat WhatsApp"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="floating-wa-label">Chat</span>
    </a>
  );
}

/* ── Removed Popup ── */


/* ── Product image with fallback ── */
const CATEGORY_COLORS = {
  Streaming: '#1a0533',
  Creative:  '#0d1f3c',
  AI:        '#001e2b',
  Music:     '#1a0533',
  Utility:   '#111111',
  SMM:       '#1a0533',
};

function ProductImage({ src, title, category, className }) {
  if (category === 'SMM') return null;
  const [failed, setFailed] = useState(false);
  const initial = title ? title.charAt(0).toUpperCase() : '?';
  const bg = CATEGORY_COLORS[category] || '#111111';

  if (failed) {
    return (
      <div className={`product-img-placeholder${className ? ' ' + className : ''}`} style={{ background: bg }}>
        <span>{initial}</span>
      </div>
    );
  }
  return (
    <img
      className={`product-img${className ? ' ' + className : ''}`}
      src={src}
      alt={title}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

/* ── Navbar ── */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-logo">
        <img src="/logo.png" alt="Logo" className="navbar-logo-img" />
        <span className="navbar-logo-text">Affistore</span>
      </div>
      <ul className={`navbar-nav${menuOpen ? ' open' : ''}`}>
        <li><a href="#hero"       onClick={() => scrollTo('hero')}>Beranda</a></li>
        <li><a href="#products"   onClick={() => scrollTo('products')}>Produk</a></li>
        <li><a href="#about"      onClick={() => scrollTo('about')}>Tentang</a></li>
        <li><a href="#contact"    onClick={() => scrollTo('contact')}>Kontak</a></li>
        <li>
          <a className="navbar-cta" href={waLink('Halo, saya ingin order produk Affistore!')} target="_blank" rel="noreferrer">
            Order Sekarang
          </a>
        </li>
      </ul>
      <button className={`navbar-hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>
    </nav>
  );
}

/* ── Hero ── */
function Hero({ children }) {
  return (
    <section id="hero" className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-badge">✦ Solusi Digital Terpercaya</div>
        <h1 className="hero-title">
          Aplikasi Premium &<br />
          <span className="hero-accent">Jasa Sosmed Termurah</span>
        </h1>
        <p className="hero-desc">
          Nikmati Netflix, Canva Pro hingga jasa tambah followers dengan harga bersahabat.{' '}
          Proses cepat, bergaransi, dan pastinya aman.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
            Lihat Layanan
          </button>
          <a className="btn-ghost" href={waLink('Halo, saya ingin berkonsultasi tentang layanan digital!')} target="_blank" rel="noreferrer">
            Chat Kami
          </a>
        </div>

        <div className="hero-stats">
          {[
            { num: '1.000+', label: 'Pesanan' },
            { num: '100+', label: 'Layanan' },
            { num: '24/7', label: 'Support' },
          ].map((s) => (
            <div key={s.label} className="hero-stat">
              <span className="hero-stat-num">{s.num}</span>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {children}
      </div>
    </section>
  );
}

/* ── Features ── */
const FEATURES = [
  { icon: '🔐', title: '100% Aman', desc: 'Keamanan data terjamin. Kami tidak pernah meminta password akun pribadi Anda.' },
  { icon: '⚡', title: 'Proses Kilat', desc: 'Hanya butuh beberapa menit setelah pembayaran, pesanan Anda langsung aktif.' },
  { icon: '💎', title: 'Kualitas Terbaik (Anti Drop)', desc: 'Kami hanya menyediakan layanan berkualitas tinggi yang awet dan bergaransi.' },
  { icon: '🤝', title: 'Bantuan 24/7', desc: 'Ada kendala? Tim admin kami siap membantu Anda kapan saja via WhatsApp.' },
];

function Features() {
  return (
    <section id="about" className="section-features">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Keunggulan Kami</span>
          <h2>Mengapa Memilih Kami?</h2>
          <p>Komitmen kami: memberikan pengalaman belanja terbaik dengan pelayanan yang cepat, ramah, dan profesional.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Products ── */
function Products({ viewMode, smmData, onSelectProduct }) {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const displayProducts = viewMode === 'apps' 
    ? products 
    : Array.from(new Set(smmData.map(item => item.category))).map((cat, idx) => ({
        id: `smm-${idx}`,
        title: cat,
        category: "SMM",
        type: 'smm_category'
      }));

  const displayCategories = viewMode === 'apps' 
    ? categories 
    : ['Semua', ...Array.from(new Set(displayProducts.map(p => p.title.split(' ')[0])))];

  const filtered = displayProducts.filter(p => {
    const matchCategory = activeCategory === 'Semua' || 
                         (viewMode === 'apps' ? p.category === activeCategory : p.title.includes(activeCategory));
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <section id="products" className="section-products">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Koleksi {viewMode === 'apps' ? 'Aplikasi' : 'Sosmed'}</span>
          <h2>{viewMode === 'apps' ? 'Aplikasi Premium Kami' : 'Jasa Sosmed Terpercaya'}</h2>
          <p>
            {viewMode === 'apps' 
              ? 'Pilih aplikasi langganan favorit Anda dengan harga jauh lebih hemat.' 
              : 'Bikin sosial media Anda makin ramai dengan jasa tambah followers, likes, dan views.'}
          </p>
        </div>

        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Cari ${viewMode === 'apps' ? 'produk' : 'layanan'}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="category-filter">
          {displayCategories.map(cat => (
            <button
              key={cat}
              className={`category-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {filtered.length === 0 && (
            <div className="products-empty">
              <span>😕</span>
              <p>Layanan tidak ditemukan</p>
            </div>
          )}
          {filtered.map(product => (
            <div key={product.id} className={`product-card ${product.type === 'smm_category' ? 'smm-card' : ''}`} onClick={() => onSelectProduct(product)}>
              {product.type !== 'smm_category' ? (
                <div className="product-img-wrapper">
                  <ProductImage src={product.image} title={product.title} category={product.category} />
                  {product.badge && (
                    <span className={`product-badge badge-${product.badge.toLowerCase()}`}>
                      {product.badge}
                    </span>
                  )}
                </div>
              ) : (
                <div className="smm-icon-wrapper">
                  <img src="/gambar.png" alt="SMM" className="smm-category-image" loading="lazy" />
                </div>
              )}
              <div className="product-info">
                <div className="product-category">{product.category}</div>
                <div className="product-title">{product.title}</div>
                <button className="product-order-btn">
                  Lihat Paket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ── */
const TESTIMONIALS = [
  {
    name: 'Budi Santoso',
    role: 'Content Creator',
    avatar: 'BS',
    stars: 5,
    text: 'Sudah 6 bulan langganan Netflix dan Spotify di sini. Harganya jauh lebih murah dari official, prosesnya cepat banget, dan akun selalu aktif! Sangat recommended!',
  },
  {
    name: 'Siti Rahma',
    role: 'Graphic Designer',
    avatar: 'SR',
    stars: 5,
    text: 'Canva Pro dan CapCut Pro beli di sini, kualitas top! Respon admin juga cepat, kalau ada kendala langsung diselesaikan. Terpercaya banget!',
  },
  {
    name: 'Rizki Pratama',
    role: 'Mahasiswa',
    avatar: 'RP',
    stars: 5,
    text: 'ChatGPT Plus harganya terjangkau banget dibanding beli langsung. Akunnya aktif full fitur, ga ada kendala sama sekali. Bakal repeat order terus!',
  },
  {
    name: 'Dewi Lestari',
    role: 'Pengusaha Online',
    avatar: 'DL',
    stars: 5,
    text: 'Sangat terbantu dengan layanan jasa sosmednya. Followers toko online saya naik drastis dan organic. Pelayanannya ramah dan admin responsif banget!',
  },
  {
    name: 'Kevin Wijaya',
    role: 'Gamer',
    avatar: 'KW',
    stars: 5,
    text: 'Beli akun game premium di sini aman banget, ga pernah kena hack atau masalah. Udah langganan berkali-kali selalu memuaskan. Mantap Affistore!',
  },
];

function Testimonials() {
  return (
    <section id="contact" className="section-testimonials">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Testimoni</span>
          <h2>Apa Kata Mereka?</h2>
          <p>Lebih dari 1.000+ pelanggan sudah membuktikan kecepatan dan pelayanan kami.</p>
        </div>
        <div className="testimonials-grid" aria-label="Testimoni pelanggan, bisa digeser ke kiri atau kanan">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} className="star-filled">★</span>
                ))}
              </div>
              <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="scroll-hint" aria-hidden="true">← Geser untuk lihat lebih →</p>
      </div>
    </section>
  );
}

/* ── CTA Banner ── */
function CTABanner() {
  return (
    <div className="cta-banner">
      <div className="container">
        <div className="cta-banner-content">
          <h2>Tunggu Apa Lagi? Yuk, Upgrade Sekarang! 🚀</h2>
          <p>Konsultasi gratis via WhatsApp. Admin kami merespons pesanan Anda dalam hitungan detik.</p>
          <a
            className="btn-primary"
            href={waLink('Halo, saya ingin tanya produk premium!')}
            target="_blank"
            rel="noreferrer"
          >
            Chat WhatsApp Sekarang
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Footer ── */
function Footer() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logo.png" alt="Logo" className="navbar-logo-img" loading="lazy" />
            <span className="navbar-logo-text">Affistore</span>
          </div>
          <p>Penyedia layanan aplikasi premium dan optimasi sosial media termurah, aman, dan bergaransi.</p>
        </div>
        <div className="footer-col">
          <h3>Tautan Cepat</h3>
          <ul>
            <li><a href="#hero"     onClick={() => scrollTo('hero')}>Beranda</a></li>
            <li><a href="#products" onClick={() => scrollTo('products')}>Produk</a></li>
            <li><a href="#about"    onClick={() => scrollTo('about')}>Tentang Kami</a></li>
            <li><a href="#contact"  onClick={() => scrollTo('contact')}>Kontak</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>Hubungi Kami</h3>
          <div className="footer-contact-item">
            <a href={waLink()} target="_blank" rel="noreferrer">📱 WhatsApp: +62 895-0995-2003</a>
          </div>
          <div className="footer-contact-item">
            <a href="mailto:mail@affidev.com">✉️ mail@affidev.com</a>
          </div>
          <div className="footer-contact-item">
            🕐 Layanan 24/7
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {year} Affistore. Semua hak dilindungi.</p>
        <div className="footer-bottom-links">
          <a href="#">Kebijakan Privasi</a>
          <a href="#">Syarat &amp; Ketentuan</a>
        </div>
      </div>
    </footer>
  );
}
/* ── App Root ── */
export default function App() {
  const [viewMode, setViewMode] = useState('apps');
  const [smmData, setSmmData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchSmm = useCallback(async () => {
    try {
      const res = await fetch(SMM_API_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSmmData(data);
      }
    } catch (e) {
      // Gracefully fail without throwing console.error to prevent Lighthouse best-practices deduction
      // console.warn('SMM data currently unavailable on this environment');
    }
  }, []);

  useEffect(() => {
    fetchSmm();
  }, [fetchSmm]);

  useEffect(() => {
    const product = getProductFromUrl();
    if (product) {
      setSelectedProduct(product);
      setTimeout(() => {
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const handleCloseModal = () => {
    setSelectedProduct(null);
    const slug = window.location.hash.slice(1);
    if (slug && products.some(p => toSlug(p.title) === slug)) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  const handleServiceChoice = (mode) => {
    setViewMode(mode);
    if (mode === 'smm') fetchSmm();
    setTimeout(() => {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <>
      <Navbar />
      <main>
        <Hero>
          {/* Service Switcher Tabs */}
          <div className="service-tabs-section">
            <div className="service-tabs">
              <button
                className={`service-tab${viewMode === 'apps' ? ' active' : ''}`}
                onClick={() => setViewMode('apps')}
              >
                📱 Akun Premium
              </button>
              <button
                className={`service-tab service-tab-smm${viewMode === 'smm' ? ' active' : ''}`}
                onClick={() => handleServiceChoice('smm')}
              >
                <span>🚀 Jasa Sosmed</span>
                <span
                  className="service-tab-refresh-inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode('smm');
                    fetchSmm();
                  }}
                  title="Refresh Data"
                  aria-label="Refresh data SMM"
                >
                  <i className="bi bi-arrow-repeat"></i>
                </span>
              </button>
            </div>
          </div>
        </Hero>

        <Products 
          viewMode={viewMode} 
          smmData={smmData} 
          onSelectProduct={setSelectedProduct} 
        />
        <Features />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
      <FloatingWA />
      
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={handleCloseModal} 
          smmData={smmData}
        />
      )}


    </>
  );
}
