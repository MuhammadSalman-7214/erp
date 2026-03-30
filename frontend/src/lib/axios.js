import axios from "axios";
import toast from "react-hot-toast";

const fallbackURL = "http://localhost:8009";

const axiosInstance = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL || fallbackURL}/api`,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unauthorized";
      console.error("Auth error:", message, error?.response?.data);
      debugger;
      toast.error(message);
      if (typeof window !== "undefined") {
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.replace("/login");
        }, 2000);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
