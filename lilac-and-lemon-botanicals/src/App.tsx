import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MySkin from './pages/MySkin';
import IngredientFinder from './pages/IngredientFinder';
import Account from './pages/Account';
import TesterDashboard from './pages/TesterDashboard';
import TesterLogin from './pages/TesterLogin';
import TesterLog from './pages/TesterLog';
import TesterPhotos from './pages/TesterPhotos';
import TesterQuestionnaires from './pages/TesterQuestionnaires';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/my-skin" element={<MySkin />} />
        <Route path="/ingredients" element={<IngredientFinder />} />
        <Route path="/account" element={<Account />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/tester/photos" element={<TesterPhotos />} />
        <Route
  path="/tester/questionnaires"
  element={<TesterQuestionnaires />}
/>
        {/* General site login */}
        <Route path="/login/*" element={<TesterLogin />} />

        {/* Signed-in user areas */}
        <Route path="/tester/log" element={<TesterLog />} />
        <Route path="/tester" element={<TesterDashboard />} />
      </Route>
    </Routes>
  );
}