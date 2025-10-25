import client from "./client"

export async function login(email: string, password: string) {
  const { data } = await client.post("/auth/login", { email, password })
  return data as { token: string }
}

export async function register(issuer: {
  email: string
  password: string
  name: string
  address: string
}) {
  const { data } = await client.post("/auth/register", issuer)
  return data as { id: string; email: string; address: string }
}
