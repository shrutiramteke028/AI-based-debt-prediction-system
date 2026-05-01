import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

export const api = {

  // Get all department health scores
  getDepartments: async () => {
    const res = await axios.get(`${BASE_URL}/api/departments`);
    return res.data;
  },

  // Get debt pulse time series
  getDebtPulse: async () => {
    const res = await axios.get(`${BASE_URL}/api/debt-pulse`);
    return res.data;
  },

  // Get peak hour analysis
  getPeakHours: async () => {
    const res = await axios.get(`${BASE_URL}/api/peak-hours`);
    return res.data;
  },

  // Run full prediction
  predict: async (inputData) => {
    const res = await axios.post(`${BASE_URL}/api/predict`, inputData);
    return res.data;
  },

  // Get SHAP explanation
  getShap: async (inputData) => {
    const res = await axios.post(`${BASE_URL}/api/shap`, inputData);
    return res.data;
  }

};

export default api;