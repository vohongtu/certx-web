import client from "./client"

export async function login(email: string, password: string) {
  const { data } = await client.post("/auth/login", { email, password })
  return data as { token: string; user?: { id: string; email: string; name: string; role: string } }
}

export async function register(user: {
  email: string
  password: string
  name: string
}) {
  const { data } = await client.post("/auth/register", user)
  return data as { id: string; email: string; name: string }
}
