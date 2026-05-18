import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Clear ALL old localStorage cache - use only database
localStorage.clear();
sessionStorage.clear();

// Clear ALL old localStorage cache - use only database
localStorage.clear();
sessionStorage.clear();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
