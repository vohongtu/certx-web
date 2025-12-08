// pdf-worker-setup.ts
// Setup worker cho react-pdf - chạy trước khi mount Document
import { pdfjs } from 'react-pdf'

// ✅ Phương án 4: Dùng worker nội bộ trong public/ (chắc chắn đúng version)
// Worker đã được copy vào public/pdf.worker.min.mjs từ node_modules/pdfjs-dist@5.4.296
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs' // ✅ nội bộ, cùng phiên bản

