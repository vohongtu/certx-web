import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: false
})

client.interceptors.request.use(cfg => {
  const t = localStorage.getItem('certx_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export default client
