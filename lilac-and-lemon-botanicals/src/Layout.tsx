import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useClerk } from '@clerk/react-router';
import { useCart } from './CartContext';
import './nav.css';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  secondary?: boolean; // goes under "More" on mobile
};

const navLinks: NavItem[] = [
  { to: '/', label: 'Home', icon: 'homeicon', end: true },
  { to: '/my-skin', label: 'My Skin', icon: 'skinassessment' },
  { to: '/ingredients', label: 'Ingredients', icon: 'ingredientfinder' },
  { to: '/about', label: 'About', icon: 'aboutbrand', secondary: true },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/contact', label: 'Waitlist', icon: 'joinwaitlist', secondary: true },
  { to: '/tester', label: 'Testers', icon: 'testerlogin', secondary: true },
];

const secondaryLinks = navLinks.filter((l) => l.secondary);

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `site-nav-item${isActive ? ' active' : ''}`;

export default function Layout() {
  const { totalItems } = useCart();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const moreActive = secondaryLinks.some((l) =>
    location.pathname.startsWith(l.to)
  );

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
                className={({ isActive }) =>
                  `${linkClass({ isActive })}${
                    link.secondary ? ' site-nav-secondary' : ''
                  }`
                }
              >
                <img src={`/icons/${link.icon}.png`} alt="" />
                <span>{link.label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              className={`site-nav-item site-nav-more${
                moreActive || moreOpen ? ' active' : ''
              }`}
              aria-expanded={moreOpen}
              aria-label="More pages"
              onClick={() => setMoreOpen((o) => !o)}
            >
              <svg viewBox="0 0 32 28" aria-hidden="true">
                <circle cx="7" cy="14" r="2.4" />
                <circle cx="16" cy="14" r="2.4" />
                <circle cx="25" cy="14" r="2.4" />
              </svg>
              <span>More</span>
            </button>
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

        {moreOpen && (
          <>
            <button
              type="button"
              className="site-nav-sheet-backdrop"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="site-nav-sheet">
              {secondaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={linkClass}
                  onClick={() => setMoreOpen(false)}
                >
                  <img src={`/icons/${link.icon}.png`} alt="" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <Outlet />

      <footer>
        <div className="wrap">© 2026 Rue Beaute</div>
      </footer>
    </>
  );
}