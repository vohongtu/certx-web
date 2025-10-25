import axios from "axios"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: false,
  timeout: 30000, // 30 seconds timeout
})

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(import.meta.env.VITE_STORAGE_TOKEN)
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Add response interceptor for better error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error)
    
    // Only override message for network errors (no response)
    if (!error.response) {
      error.message = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
    }
    
    return Promise.reject(error)
  }
)

export default client
