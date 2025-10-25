import axios from "axios"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: false,
})

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(import.meta.env.VITE_STORAGE_TOKEN)
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default client
