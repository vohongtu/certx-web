import client from './client'

export async function issueCert(form: FormData) {
  const { data } = await client.post('/certs/issue', form, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  })
  return data as { hash: string, verifyUrl: string, qrcodeDataUrl?: string }
}

export async function revokeCert(hash: string) {
  const { data } = await client.post('/certs/revoke', { hash })
  return data
}

export async function verifyHash(hash: string) {
  const { data } = await client.get('/verify', { params: { hash } })
  return data as { status: 'VALID'|'REVOKED'|'NOT_FOUND', metadata?: any }
}
