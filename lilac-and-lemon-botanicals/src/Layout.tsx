import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useClerk } from '@clerk/react-router';
import { useCart } from './CartContext';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/my-skin', label: 'My Skin Assessment' },
  { to: '/ingredients', label: 'Ingredient Finder' },
  { to: '/about', label: 'About the Brand' },
  { to: '/products', label: 'Products' },
  { to: '/contact', label: 'Join Waitlist' },
  { to: '/tester', label: 'Product Tester Portal' },
  ];

export default function Layout() {
  const { totalItems } = useCart();
  const { signOut } = useClerk();
  const navigate = useNavigate();

function handleSignOut() {
  signOut(() => navigate('/'));
}

  return (
    <>
      <nav>
        <div className="wrap nav-inner">
          <div className="nav-links">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}

            <SignedOut>
  <NavLink
    to="/login"
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
  >
    Log In
  </NavLink>
</SignedOut>

            <SignedIn>
  <NavLink
    to="/account"
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
  >
    My Account
  </NavLink>
  <button
    type="button"
    className="nav-link nav-link-button"
    onClick={handleSignOut}
  >
    Log Out
  </button>
</SignedIn>
          </div>
          <div className="nav-right">
           <NavLink
  to="/cart"
  className={({ isActive }) => `cart-link${isActive ? ' active' : ''}`}
  aria-label="View cart"
>
  <div className="art-frame filled story-art">
    <img
      src="/icons/cart_checkout.png"
      alt="Illustrated shopping cart"
    />
  </div>

  <span className="cart-label">Cart</span>

  {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
</NavLink>
          </div>
        </div>
      </nav>

      <Outlet />

      <footer>
        <div className="wrap">© 2026 Rue Beaute</div>
      </footer>
    </>
  );
}