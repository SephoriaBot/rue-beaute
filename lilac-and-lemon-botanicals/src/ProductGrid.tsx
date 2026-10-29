import { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import { backgroundImages, bottleImages } from './productImages';

type Product = {
  id: number;
  sort_order: number;
  name: string;
  ingredient_label: string;
  description: string;
  swatch_color: string;
  status: string;
  size_oz: number;
  price: number;
};

const PRODUCT_GROUPS = [
  {
    name: 'Cleanse',
    ids: [101, 104, 107],
  },
  {
    name: 'Polish',
    ids: [109],
  },
  {
    name: 'Essence',
    ids: [102, 105],
  },
  {
    name: 'Hydrate',
    ids: [103, 106],
  },
  {
    name: 'Finish',
    ids: [108],
  },
];

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const { addItem } = useCart();

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((rows: Product[]) =>
        setProducts(
          rows
            .filter((p) => p.id >= 101 && p.id <= 109)
            .sort((a, b) => a.sort_order - b.sort_order)
        )
      )
      .catch(() => setProducts([]));
  }, []);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setQuantity(1);
    setJustAdded(false);
  }

  function closeProduct() {
    setSelectedProduct(null);
    setQuantity(1);
    setJustAdded(false);
  }

  function handleAddToCart() {
    if (!selectedProduct || selectedProduct.status === 'soon') return;

    addItem(
      {
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        size_oz: selectedProduct.size_oz,
        image: bottleImages[selectedProduct.id],
      },
      quantity
    );

    setQuantity(1);
    setJustAdded(true);

    setTimeout(() => {
      setJustAdded(false);
    }, 1400);
  }

  useEffect(() => {
    if (!selectedProduct) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeProduct();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProduct]);

  const allComingSoon =
    products.length > 0 &&
    products.every((p) => p.status === 'soon');

  const eyebrowLabel =
    products.length === 0 || allComingSoon
      ? 'Coming Soon'
      : 'Now Available';

  return (
    <>
      <section className="products">
        <div className="wrap">

          <div className="products-head">
            <img className="page-icon" src="/icons/shop_products.png" alt="" aria-hidden="true" />
            <span className="label">{eyebrowLabel}</span>

            <h2>Beauty, thoughtfully considered.</h2>

            <p>Every detail has a purpose. Carefully chosen ingredients, gentle yet effective formulas, and nothing more than what you need.</p>
          </div>

          {PRODUCT_GROUPS.map((group) => {
            const groupProducts = group.ids
              .map((id) => products.find((p) => p.id === id))
              .filter((p): p is Product => Boolean(p));

            if (groupProducts.length === 0) return null;

            return (
              <div className="product-group" key={group.name}>
                <div className="product-group-heading">
                  <h3>{group.name}</h3>
                </div>

                <div className="product-grid">
                  {groupProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="product-tile"
                      onClick={() => openProduct(p)}
                      aria-label={`View ${p.name}`}
                    >
                      
<div className="product-tile-editorial">
  <span className="editorial-number">
    {String(p.sort_order).padStart(2, '0')}
  </span>

  <span className="editorial-rule" />

  
<span className="editorial-name">
  {p.name}
</span>

<span className="editorial-ingredient">
  {p.ingredient_label}
</span>

<span className="editorial-caption">
  RUE BEAUTÉ
</span>

</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {selectedProduct && (
        <div
          className="product-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProduct();
            }
          }}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <button
              type="button"
              className="product-modal-close"
              onClick={closeProduct}
              aria-label="Close product details"
            >
              ×
            </button>

            <div className="product-modal-blob">
              {backgroundImages[selectedProduct.id] && (
                <img
                  src={backgroundImages[selectedProduct.id]}
                  alt=""
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="product-modal-content">

              <div className="page-icon-inline">
                <img src="/icons/product_detail.png" alt="" aria-hidden="true" />
                <span className="product-modal-ingredient">
                  {selectedProduct.ingredient_label}
                </span>
              </div>

              <span
                className="product-modal-stem"
                style={{
                  background:
                    selectedProduct.swatch_color ||
                    'var(--butter-deep)',
                }}
              />

              <h2 id="product-modal-title">
                {selectedProduct.name}
              </h2>

              <p className="product-modal-description">
                {selectedProduct.description}
              </p>

              <div className="product-modal-meta">
                <span>{selectedProduct.size_oz} oz</span>

                <span
                  className="dot"
                  aria-hidden="true"
                >
                  ·
                </span>

                <span className="price">
                  ${selectedProduct.price.toFixed(2)}
                </span>
              </div>

              {selectedProduct.status === 'soon' ? (
                <div className="product-modal-coming-soon">
                  Coming Soon
                </div>
              ) : (
                <div className="product-modal-cart">

                  <div className="product-modal-quantity">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((current) =>
                          Math.max(1, current - 1)
                        )
                      }
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>

                    <span>{quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((current) => current + 1)
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`product-modal-add${
                      justAdded ? ' added' : ''
                    }`}
                    onClick={handleAddToCart}
                  >
                    {justAdded ? 'Added ♡' : 'Add to Cart'}
                  </button>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}