import axios from "axios";

const client = axios.create({ baseURL: "/api" });

export const api = {
  getProcurementFleet: () => client.get("/procurement/fleet").then((r) => r.data),
  getProcurementPlan: (phaseSize = 20) =>
    client.get("/procurement/plan", { params: { phase_size: phaseSize } }).then((r) => r.data),

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
