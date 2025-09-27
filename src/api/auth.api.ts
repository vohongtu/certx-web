import client from './client'

export async function login(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password })
  return data as { token: string }
}
