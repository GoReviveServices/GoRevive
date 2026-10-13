import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401/404 are normal outcomes the callers handle; only log real failures.
        if (![401, 404].includes(error.response?.status)) {
            console.error("API Error:", error.response?.status || error.message);
        }
        return Promise.reject(error);
    }
);

export default api;