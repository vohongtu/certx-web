import axios from 'axios'

const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? '60000')
const storageKey = import.meta.env.VITE_STORAGE_TOKEN
const storageExpKey = `${storageKey}_exp`
const authEvent = 'certx-auth-change'
const isDev = import.meta.env.DEV


const envApiBase = import.meta.env.VITE_API_BASE

const baseURL = envApiBase 
  ? envApiBase 
  : isDev 
    ? '/api' 
    : 'http://localhost:8080' 

const client = axios.create({
  baseURL: baseURL,
  withCredentials: false,
  timeout: apiTimeout,
})

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(storageKey)
  const exp = Number(localStorage.getItem(storageExpKey) || 0)

  if (token) {
    if (exp && Date.now() > exp) {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(storageExpKey)
      window.dispatchEvent(new Event(authEvent))
      return Promise.reject(new axios.Cancel('TOKEN_EXPIRED'))
    }

    cfg.headers.Authorization = `Bearer ${token}`
  }

  if (cfg.data instanceof FormData) {
    delete cfg.headers['Content-Type']
  }

  return cfg
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isDev) {
      console.error('[axios] Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      })
    }

    if (axios.isCancel(error) && error.message === 'TOKEN_EXPIRED') {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(storageExpKey)
      window.dispatchEvent(new Event(authEvent))
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.code === 'ECONNABORTED') {
      error.message = `Yêu cầu xử lý quá ${apiTimeout / 1000} giây. Vui lòng thử lại.`
    } else if (!error.response) {
      error.message = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
    }

    return Promise.reject(error)
  }
)

export default client
