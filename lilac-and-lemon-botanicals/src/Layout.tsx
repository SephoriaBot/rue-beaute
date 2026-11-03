import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useClerk } from '@clerk/react-router';
import { useCart } from './CartContext';
import './nav.css';

const navLinks = [
  { to: '/', label: 'Home', icon: 'homeicon', end: true },
  { to: '/my-skin', label: 'My Skin', icon: 'skinassessment' },
  { to: '/ingredients', label: 'Ingredients', icon: 'ingredientfinder' },
  { to: '/about', label: 'About', icon: 'aboutbrand' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/contact', label: 'Waitlist', icon: 'joinwaitlist' },
  { to: '/tester', label: 'Testers', icon: 'testerlogin' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `site-nav-item${isActive ? ' active' : ''}`;

export default function Layout() {
  const { totalItems } = useCart();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut(() => navigate('/'));
  }

  return (
    <>
      <nav className="site-nav" aria-label="Main">
        <div className="site-nav-bar">
          <Link to="/" className="site-nav-brand">
            Rue <em>Beauté</em>
          </Link>

          <div className="site-nav-links">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={linkClass}
              >
                <img src={`/icons/${link.icon}.png`} alt="" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="site-nav-actions">
            <SignedOut>
              <NavLink to="/login" className={linkClass}>
                <img src="/icons/myaccount.png" alt="" />
                <span>Log In</span>
              </NavLink>
            </SignedOut>

            <SignedIn>
              <NavLink to="/account" className={linkClass}>
                <img src="/icons/myaccount.png" alt="" />
                <span>Account</span>
              </NavLink>
              <button
                type="button"
                className="site-nav-logout"
                onClick={handleSignOut}
              >
                Log Out
              </button>
            </SignedIn>

            <NavLink
              to="/cart"
              className={linkClass}
              aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
            >
              <span className="site-nav-icon-wrap">
                <img src="/icons/cart_checkout.png" alt="" />
                {totalItems > 0 && (
                  <span className="site-nav-badge">{totalItems}</span>
                )}
              </span>
              <span>Cart</span>
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