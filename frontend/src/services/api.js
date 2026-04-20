import axios from 'axios';

const api = axios.create({
  baseURL: 'https://exam-platform-3enn.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ep_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ep_token');
      localStorage.removeItem('ep_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
