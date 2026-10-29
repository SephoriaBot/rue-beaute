import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <section className="cart-section">
        <div className="wrap">
          <div className="cart-head">
            <img className="page-icon" src="/icons/cart.png" alt="" aria-hidden="true" />
            <span className="label">Your Cart</span>

            <h2>Nothing here yet.</h2>
          </div>
          <div className="cart-empty">
            <p>Add something to see it here.</p>
            <Link to="/products">Browse Products</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-section">
      <div className="wrap">
        <div className="cart-head">
          <img className="page-icon" src="/icons/cart_checkout.png" alt="" aria-hidden="true" />
          <span className="label">Your Cart</span>

          <h2>Ready when you are.</h2>
        </div>

        <div className="cart-list">
          {items.map((item) => (
            <div className="cart-item" key={item.id}>
              <img className="cart-item-img" src={item.image} alt={item.name} />
              <div className="cart-item-info">
                <h4>{item.name}</h4>
                <span>{item.size_oz} oz</span>
              </div>
              <div className="cart-item-controls">
                <div className="qty-stepper">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>Calculated later</span>
          </div>
          <div className="cart-summary-row total">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <Link to="/checkout" className="checkout-button">
            Reserve This Order
          </Link>
          <p className="cart-summary-note">
            The shop isn't open yet — this reserves your order so we can reach out the moment it is.
          </p>
        </div>
      </div>
    </section>
  );
}