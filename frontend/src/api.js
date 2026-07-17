import axios from "axios";

// In dev, Vite proxies "/api" to the local backend (see vite.config.js).
// In production there's no such proxy, so VITE_API_URL must point at the
// deployed backend's absolute URL (set in the hosting platform's env vars).
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const client = axios.create({ baseURL: API_BASE });

export const api = {
  getProcurementFleet: () => client.get("/procurement/fleet").then((r) => r.data),
  getProcurementPlan: (phaseSize = 20) =>
    client.get("/procurement/plan", { params: { phase_size: phaseSize } }).then((r) => r.data),
  getKnownSegments: () => client.get("/procurement/known-segments").then((r) => r.data),
  getFleetTemplateUrl: () => `${API_BASE}/procurement/template`,
  uploadFleet: (file, assumptions = {}) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(assumptions).forEach(([k, v]) => {
      if (v !== null && v !== "" && v !== undefined) form.append(k, v);
    });
    return client.post("/procurement/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  getHealthFleet: () => client.get("/health/fleet").then((r) => r.data),
  getHealthValidation: () => client.get("/health/validation").then((r) => r.data),

  getSuppliers: () => client.get("/supply-chain/suppliers").then((r) => r.data),
  getConcentration: () => client.get("/supply-chain/concentration").then((r) => r.data),
  getLeadTime: () => client.get("/supply-chain/lead-time").then((r) => r.data),

  getCarbonSummary: () => client.get("/carbon/summary").then((r) => r.data),
  getTopImpact: (n = 10) => client.get("/carbon/top-impact", { params: { n } }).then((r) => r.data),

  chat: (message, history = []) =>
    client.post("/chat", { message, history }).then((r) => r.data),
};
