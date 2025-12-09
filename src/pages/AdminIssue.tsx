import { useState, useEffect } from 'react'
import { issueCert } from '../api/certs.api'
import FilePicker from '../components/FilePicker'
import DocumentTypeSelector from '../components/DocumentTypeSelector'
import UserSelector from '../components/UserSelector'
import { listValidityOptions, CredentialValidityOption } from '../api/credential-validity-options.api'
import { getCredentialTypeById } from '../api/credential-types.api'
import { useAuth } from '../hooks/useAuth'
import { decodeJwt } from '../utils/jwt'
import QRViewer from '../components/QRViewer'

export default function AdminIssue() {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [holderName, setHolderName] = useState('')
  const [degree, setDegree] = useState('')
  const [credentialTypeId, setCredentialTypeId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [issuedDate, setIssuedDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [selectedValidityOptionId, setSelectedValidityOptionId] = useState<string>('')
  const [useCustomExpiration, setUseCustomExpiration] = useState(false)
  const [isPermanent, setIsPermanent] = useState(false)
  const [validityOptions, setValidityOptions] = useState<CredentialValidityOption[]>([])
  const [isLoadingValidityOptions, setIsLoadingValidityOptions] = useState(false)
  const [result, setResult] = useState<{ hash: string; verifyUrl: string; qrcodeDataUrl?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load validity options và check isPermanent khi credentialTypeId thay đổi
  useEffect(() => {
    const loadValidityData = async () => {
      setIsLoadingValidityOptions(true)
      try {
        // Load credential type để check isPermanent
        if (credentialTypeId) {
          try {
            const credType = await getCredentialTypeById(credentialTypeId)
            setIsPermanent(credType.isPermanent)
            
            if (!credType.isPermanent) {
              const options = await listValidityOptions(credentialTypeId)
              setValidityOptions(options.items || [])
            } else {
              setValidityOptions([])
            }
          } catch (err) {
            console.warn('Could not load credential type, trying to load all validity options:', err)
            setIsPermanent(false)
            const options = await listValidityOptions()
            setValidityOptions(options.items || [])
          }
        } else {
          setIsPermanent(false)
          try {
            const options = await listValidityOptions()
            setValidityOptions(options.items || [])
          } catch (err) {
            console.warn('Could not load validity options:', err)
            setValidityOptions([])
          }
        }
      } catch (err) {
        console.error('Error loading validity data:', err)
        setValidityOptions([])
        setIsPermanent(false)
      } finally {
        setIsLoadingValidityOptions(false)
      }
    }
    
    loadValidityData()
  }, [credentialTypeId])

  // Reset expiration khi issuedDate hoặc validityOptionId thay đổi
  useEffect(() => {
    if (selectedValidityOptionId && issuedDate && !useCustomExpiration) {
      const selectedOption = validityOptions.find(opt => opt.id === selectedValidityOptionId)
      if (selectedOption) {
        const baseDate = new Date(issuedDate)
        let calculatedExpirationDate: string | undefined
        if (selectedOption.periodMonths) {
          baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
        } else if (selectedOption.periodDays) {
          baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
          calculatedExpirationDate = baseDate.toISOString().split('T')[0]
        }
        setExpirationDate(calculatedExpirationDate || '')
      }
    }
  }, [selectedValidityOptionId, issuedDate, validityOptions, useCustomExpiration])

  const doIssue = async () => {
    if (!file) return

    // Kiểm tra kích thước file (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File quá lớn. Kích thước tối đa là 5MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    // Validate required fields
    if (!holderName.trim()) {
      setError('Vui lòng nhập họ tên người nhận')
      return
    }

    if (!degree.trim() && !credentialTypeId) {
      setError('Vui lòng chọn hoặc nhập loại văn bằng')
      return
    }

    if (!issuedDate) {
      setError('Vui lòng chọn ngày cấp thật')
      return
    }

    if (!isPermanent && !expirationDate && !selectedValidityOptionId && !useCustomExpiration) {
      setError('Vui lòng chọn thời hạn hoặc nhập ngày hết hạn')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Tính expirationDate từ validityOptionId nếu có
      let finalExpirationDate = expirationDate
      if (!finalExpirationDate && selectedValidityOptionId && issuedDate && !useCustomExpiration) {
        const selectedOption = validityOptions.find(opt => opt.id === selectedValidityOptionId)
        if (selectedOption) {
          const baseDate = new Date(issuedDate)
          if (selectedOption.periodMonths) {
            baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
            finalExpirationDate = baseDate.toISOString().split('T')[0]
          } else if (selectedOption.periodDays) {
            baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
            finalExpirationDate = baseDate.toISOString().split('T')[0]
          }
        }
      }

      const fd = new FormData()
      fd.append('file', file)
      fd.append('holderName', holderName.trim())
      fd.append('degree', degree.trim())
      fd.append('issuedDate', issuedDate)
      
      if (credentialTypeId) {
        fd.append('credentialTypeId', credentialTypeId)
      }
      
      if (finalExpirationDate) {
        fd.append('expirationDate', finalExpirationDate)
      }

      if (selectedUserId) {
        fd.append('userId', selectedUserId)
      }

      const res = await issueCert(fd)
      setResult(res)
      
      // Reset form sau khi issue thành công
      setFile(null)
      setHolderName('')
      setDegree('')
      setCredentialTypeId(null)
      setSelectedUserId(null)
      setIssuedDate('')
      setExpirationDate('')
      setSelectedValidityOptionId('')
      setUseCustomExpiration(false)
      setIsPermanent(false)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi cấp phát chứng chỉ')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user is admin or super admin
  const userRole = token ? (decodeJwt(token) as any)?.role : null
  const isAuthorized = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  if (!isAuthorized) {
    return (
      <div className='page'>
        <div className='page-header'>
          <h1 className='page-title'>Không có quyền truy cập</h1>
          <p className='page-subtitle'>Chỉ Admin và Super Admin mới có thể truy cập trang này.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <div>
          <div className='page-eyebrow'>Admin Console</div>
          <h1 className='page-title'>Cấp phát chứng chỉ</h1>
          <p className='page-subtitle'>Upload file và cấp phát chứng chỉ trực tiếp. File sẽ được xử lý ngay lập tức (watermark, IPFS, blockchain).</p>
        </div>
        {result && <span className='badge-soft'>Đã cấp phát thành công</span>}
      </div>

      <div className='page-grid page-grid--split'>
        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Thông tin chứng chỉ</h2>
            <p className='card-subtitle'>Điền các trường bắt buộc rồi tải lên file PDF/ảnh của chứng chỉ. Chứng chỉ sẽ được cấp phát ngay lập tức.</p>
          </header>

          <FilePicker onPick={setFile} file={file} onError={setError} />

          <div className='form-grid' style={{ gap: '12px' }}>
            <div className='field' style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '14px', marginBottom: '6px' }}>Họ tên người nhận *</label>
              <input 
                value={holderName} 
                onChange={(e) => setHolderName(e.target.value)} 
                placeholder='Nguyễn Văn A'
                style={{ padding: '8px 12px', fontSize: '14px' }}
                required
              />
            </div>
            <div className='field' style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '14px', marginBottom: '6px' }}>Văn bằng *</label>
              <DocumentTypeSelector
                value={credentialTypeId || degree}
                onChange={(id, name) => {
                  setCredentialTypeId(id)
                  setDegree(name)
                  // Reset validity options khi thay đổi credential type
                  setSelectedValidityOptionId('')
                  setExpirationDate('')
                  setUseCustomExpiration(false)
                }}
                placeholder="Chọn loại văn bằng..."
                allowCustom={true}
              />
            </div>
          </div>

          <div className='field' style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '14px', marginBottom: '6px' }}>
              Chọn người nhận (tùy chọn)
            </label>
            <UserSelector
              value={selectedUserId || undefined}
              onChange={(userId, userName) => {
                setSelectedUserId(userId)
                // Tự động điền tên vào holderName khi chọn user
                if (userId && userName) {
                  setHolderName(userName)
                } else if (!userId) {
                  // Không tự động xóa holderName
                }
              }}
              placeholder="Chọn người nhận từ hệ thống (tùy chọn)..."
            />
            <small className='field-hint'>
              Nếu chọn user từ hệ thống, tên sẽ tự động điền vào "Họ tên người nhận". Có thể chỉnh sửa sau.
            </small>
          </div>

          <div className='field' style={{ marginTop: '12px' }}>
            <label>Ngày cấp thật *</label>
            <input
              type='date'
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              required
              style={{ padding: '8px 12px', fontSize: '14px' }}
            />
            <small className='field-hint'>Ngày chứng chỉ được cấp bởi cơ quan</small>
          </div>

          {!isPermanent && (
            <>
              {isLoadingValidityOptions ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>Đang tải tùy chọn thời hạn...</div>
              ) : (() => {
                // Filter validity options theo credentialTypeId (nếu có)
                const filteredOptions = credentialTypeId
                  ? validityOptions.filter(opt => opt.credentialTypeId === credentialTypeId)
                  : validityOptions // Nếu không có credentialTypeId, hiển thị tất cả
                if (filteredOptions.length > 0) {
                  return (
                    <>
                      <div className='field'>
                        <label>Ngày hết hạn *</label>
                        <select
                          value={useCustomExpiration ? 'custom' : selectedValidityOptionId}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === 'custom') {
                              setUseCustomExpiration(true)
                              setSelectedValidityOptionId('')
                              setExpirationDate('')
                            } else {
                              setUseCustomExpiration(false)
                              setSelectedValidityOptionId(value)
                              if (value && issuedDate) {
                                const selectedOption = filteredOptions.find(opt => opt.id === value)
                                if (selectedOption) {
                                  const baseDate = new Date(issuedDate)
                                  let calculatedExpirationDate: string | undefined
                                  if (selectedOption.periodMonths) {
                                    baseDate.setMonth(baseDate.getMonth() + selectedOption.periodMonths)
                                    calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                  } else if (selectedOption.periodDays) {
                                    baseDate.setDate(baseDate.getDate() + selectedOption.periodDays)
                                    calculatedExpirationDate = baseDate.toISOString().split('T')[0]
                                  }
                                  setExpirationDate(calculatedExpirationDate || '')
                                } else {
                                  setExpirationDate('')
                                }
                              } else {
                                setExpirationDate('')
                              }
                            }
                          }}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
                          required
                        >
                          <option value=''>-- Chọn thời hạn --</option>
                          {filteredOptions.map((opt) => {
                            let displayText = ''
                            if (opt.periodMonths) {
                              if (opt.periodMonths >= 12 && opt.periodMonths % 12 === 0) {
                                const years = opt.periodMonths / 12
                                displayText = years === 1 ? '1 năm' : `${years} năm`
                              } else {
                                displayText = `${opt.periodMonths} tháng`
                              }
                            } else if (opt.periodDays) {
                              if (opt.periodDays >= 365 && opt.periodDays % 365 === 0) {
                                const years = opt.periodDays / 365
                                displayText = years === 1 ? '1 năm' : `${years} năm`
                              } else if (opt.periodDays >= 30 && opt.periodDays % 30 === 0) {
                                const months = opt.periodDays / 30
                                displayText = months === 1 ? '1 tháng' : `${months} tháng`
                              } else {
                                displayText = `${opt.periodDays} ngày`
                              }
                            } else {
                              displayText = 'N/A'
                            }
                            return (
                              <option key={opt.id} value={opt.id}>
                                {displayText}
                                {opt.note ? ` - ${opt.note}` : ''}
                              </option>
                            )
                          })}
                          <option value='custom'>-- Chọn ngày hết hạn tùy chỉnh --</option>
                        </select>
                        <small className='field-hint'>
                          Chọn thời hạn từ danh sách (dựa trên văn bằng: {degree || credentialTypeId || 'N/A'}). Hệ thống sẽ tự động tính ngày hết hạn dựa trên ngày cấp thật ({issuedDate ? new Date(issuedDate).toLocaleDateString('vi-VN') : 'chưa chọn'}).
                          {selectedValidityOptionId && expirationDate && !useCustomExpiration && (
                            <span style={{ display: 'block', marginTop: '4px', fontWeight: '500', color: '#059669' }}>
                              → Ngày hết hạn: {new Date(expirationDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </small>
                      </div>
                      {useCustomExpiration && (
                        <div className='field'>
                          <label>Ngày hết hạn (tùy chỉnh) *</label>
                          <input
                            type='date'
                            value={expirationDate}
                            onChange={(e) => setExpirationDate(e.target.value)}
                            required
                            style={{ padding: '8px 12px', fontSize: '14px' }}
                          />
                          <small className='field-hint'>Nhập ngày hết hạn tùy chỉnh</small>
                        </div>
                      )}
                    </>
                  )
                } else {
                  return (
                    <div className='field'>
                      <label>Ngày hết hạn *</label>
                      <input
                        type='date'
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        required
                        style={{ padding: '8px 12px', fontSize: '14px' }}
                      />
                      <small className='field-hint'>
                        {credentialTypeId
                          ? 'Nhập ngày hết hạn thủ công (không có tùy chọn thời hạn có sẵn cho loại văn bằng này)'
                          : 'Nhập ngày hết hạn thủ công (văn bằng này chưa có loại văn bằng được chọn)'}
                      </small>
                    </div>
                  )
                }
              })()}
            </>
          )}
          {isPermanent && (
            <div className='info-box' style={{ padding: '12px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '8px', marginTop: '16px' }}>
              <small className='field-hint' style={{ color: '#059669' }}>
                ✓ Loại văn bằng này là vĩnh viễn, không cần chọn thời hạn
              </small>
            </div>
          )}
          
          <div className='info-box' style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px' }}>
            <small className='field-hint'>
              ⚡ Chứng chỉ sẽ được xử lý ngay lập tức: thêm watermark, upload lên IPFS và ghi lên blockchain.
            </small>
          </div>

          <div className='card-footer'>
            <button 
              className='btn btn-primary' 
              onClick={doIssue} 
              disabled={!file || !holderName || !degree || !issuedDate || isLoading || (!isPermanent && !expirationDate && !selectedValidityOptionId && !useCustomExpiration)}
            >
              {isLoading ? 'Đang cấp phát...' : 'Cấp phát chứng chỉ'}
            </button>
          </div>
        </section>

        <section className='card'>
          <header className='card-header'>
            <h2 className='card-title'>Kết quả & hướng dẫn</h2>
            <p className='card-subtitle'>Theo dõi kết quả cấp phát và thông tin chứng chỉ.</p>
          </header>

          {error && <div className='alert'>⚠️ {error}</div>}

          {result ? (
            <>
              <div className='alert alert-success'>
                ✅ Chứng chỉ đã được cấp phát thành công!
              </div>
              <div className='field'>
                <label>Hash</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className='hash-pill' style={{ flex: 1, minWidth: 0 }}>{result.hash}</div>
                  <button
                    className='btn btn-outline'
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(result.hash)
                        alert('Đã copy hash vào clipboard!')
                      } catch (err) {
                        // Fallback nếu clipboard API không khả dụng
                        const textarea = document.createElement('textarea')
                        textarea.value = result.hash
                        textarea.style.position = 'fixed'
                        textarea.style.opacity = '0'
                        document.body.appendChild(textarea)
                        textarea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textarea)
                        alert('Đã copy hash vào clipboard!')
                      }
                    }}
                    style={{ flexShrink: 0 }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className='field'>
                <label>Verify URL</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className='btn btn-primary'
                    onClick={() => {
                      window.open(result.verifyUrl, '_blank', 'noopener,noreferrer')
                    }}
                    style={{ flex: '1', minWidth: '120px' }}
                  >
                    Verify
                  </button>
                  <button
                    className='btn btn-outline'
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(result.verifyUrl)
                        // Có thể thêm toast notification ở đây nếu cần
                        alert('Đã copy URL vào clipboard!')
                      } catch (err) {
                        // Fallback nếu clipboard API không khả dụng
                        const textarea = document.createElement('textarea')
                        textarea.value = result.verifyUrl
                        textarea.style.position = 'fixed'
                        textarea.style.opacity = '0'
                        document.body.appendChild(textarea)
                        textarea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textarea)
                        alert('Đã copy URL vào clipboard!')
                      }
                    }}
                    style={{ flex: '1', minWidth: '120px' }}
                  >
                    Copy URL
                  </button>
                </div>
                <small className='field-hint' style={{ marginTop: '8px', display: 'block', wordBreak: 'break-all', color: '#666' }}>
                  {result.verifyUrl}
                </small>
              </div>
              {result.verifyUrl && (
                <div className='field'>
                  <label>QR Code</label>
                  <QRViewer value={result.verifyUrl} />
                </div>
              )}

              <ul className='history-list'>
                <li>- Chứng chỉ đã được thêm watermark.</li>
                <li>- Metadata đã được upload lên IPFS.</li>
                <li>- Thông tin đã được ghi lên blockchain.</li>
                <li>- Chứng chỉ đã sẵn sàng để verify.</li>
              </ul>
            </>
          ) : (
            <ul className='history-list'>
              <li>- Bước 1: Chọn file chứng chỉ (PDF, JPG, PNG).</li>
              <li>- Bước 2: Nhập thông tin người nhận và văn bằng.</li>
              <li>- Bước 3: Chọn ngày cấp thật và thời hạn.</li>
              <li>- Bước 4: Cấp phát chứng chỉ (tự động xử lý).</li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

