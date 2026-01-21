import axios from 'axios';

const fallbackURL = 'http://localhost:8009';
console.log(
  '🚀 ~ process.env.REACT_APP_BACKEND_URL:',
  process.env.REACT_APP_BACKEND_URL
);
const axiosInstance = axios.create({
    baseURL: `${process.env.REACT_APP_BACKEND_URL|| fallbackURL}/api`,
    
    withCredentials: true,
  });
  
export default axiosInstance