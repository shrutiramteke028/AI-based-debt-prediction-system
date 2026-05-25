import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

export const api = {
  getDepartments: async () => {
    const res = await axios.get(`${BASE_URL}/api/departments`);
    return res.data;
  },
  getDebtPulse: async () => {
    const res = await axios.get(`${BASE_URL}/api/debt-pulse`);
    return res.data;
  },
  getPeakHours: async () => {
    const res = await axios.get(`${BASE_URL}/api/peak-hours`);
    return res.data;
  },
  predict: async (inputData) => {
    const res = await axios.post(`${BASE_URL}/api/predict`, inputData);
    return res.data;
  },
  getShap: async (inputData) => {
    const res = await axios.post(`${BASE_URL}/api/shap`, inputData);
    return res.data;
  },
  getLivePatient: async () => {
    const res = await axios.get(`${BASE_URL}/api/live-patient`);
    return res.data;
  },
  getFutureRisk: async () => {
    const res = await axios.get(`${BASE_URL}/api/future-risk`);
    return res.data;
  },
  getAlerts: async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts`);
    return res.data;
  },
  getTrends: async () => {
    const res = await axios.get(`${BASE_URL}/api/trends`);
    return res.data;
  },
  whatIf: async (data) => {
    const res = await axios.post(`${BASE_URL}/api/whatif`, data);
    return res.data;
  },
  retrain: async () => {
    const res = await axios.post(`${BASE_URL}/api/retrain`);
    return res.data;
  }
};

export default api;
