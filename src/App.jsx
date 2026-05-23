import { useState } from "react";
import CatalogApp from "./CatalogApp.jsx";
import OMSApp    from "./OMSApp.jsx";

/*
 * Meridian Studio — Top-level router
 *
 * "client"  (default) → CatalogApp   public-facing ordering catalog + workspace
 * "admin"             → OMSApp        internal order-management dashboard
 *
 * Navigation:
 *   Client catalog  → Workspace "Staff access →"     → OMS landing
 *   OMS landing     → "← Back to site"               → Client catalog
 */
export default function App() {
  const [mode, setMode] = useState("client");

  return mode === "admin"
    ? <OMSApp    onBack={() => setMode("client")} />
    : <CatalogApp onAdmin={() => setMode("admin")} />;
}
