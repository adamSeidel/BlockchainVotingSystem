import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ContractProvider } from "./context/ContractProvider";

// Needs addressing
import './pages/css/stylesheet.css'

import Layout from "./pages/Layout";
import Home from "./pages/Home";
import Vote from "./pages/Vote";
import Admin from "./pages/Admin";
import NoPage from "./pages/NoPage";

export default function App() {
  return (
    <ContractProvider>
      <BrowserRouter>
        <Routes>
          {/* Render the layout component */}
          <Route path="/" element={<Layout />}>
            {/* Nested elements inherit and add to parent route */}

            {/* Home Page - Default route */}
            <Route index element={<Home />} />

            {/* Vote Page */}
            <Route path="vote" element={<Vote />} />

            {/* Admin Page */}
            <Route path="Admin" element={<Admin />} />

            {/* 404 Error */}
            <Route path="*" element={<NoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ContractProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);