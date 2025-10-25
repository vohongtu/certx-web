import axios from "axios"
import CertIPFS from "../interfaces/cert.interface"

export async function getCertIPFSData(uri: string): Promise<CertIPFS> {
  const response = await axios.get(uri)

  return response.data
}
