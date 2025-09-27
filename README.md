# CertX Web - Hệ thống quản lý & xác thực văn bằng trên Blockchain

Frontend React + Vite + TypeScript cho hệ thống quản lý và xác thực văn bằng - chứng chỉ sử dụng công nghệ chuỗi khối (Blockchain Certificate Registry).

## 🚀 Tính năng

- **Đăng nhập Issuer**: Xác thực người cấp phát chứng chỉ
- **Cấp phát chứng chỉ**: Upload file, nhập thông tin và tạo chứng chỉ trên blockchain
- **Tra cứu & xác thực**: Kiểm tra tính hợp lệ của chứng chỉ qua hash
- **QR Code**: Tạo mã QR để chia sẻ liên kết xác thực
- **Thu hồi chứng chỉ**: Hủy bỏ chứng chỉ đã cấp phát

## 📁 Cấu trúc dự án

```
certx-web/
├─ src/
│  ├─ pages/
│  │  ├─ Login.tsx      # Trang đăng nhập issuer
│  │  ├─ Issue.tsx      # Trang cấp phát chứng chỉ
│  │  └─ Verify.tsx     # Trang tra cứu/xác thực
│  ├─ components/
│  │  ├─ Header.tsx     # Header navigation
│  │  ├─ FilePicker.tsx # Component chọn file
│  │  ├─ StatusBadge.tsx # Badge trạng thái chứng chỉ
│  │  └─ QRViewer.tsx   # Hiển thị QR code
│  ├─ api/
│  │  ├─ client.ts      # Axios client config
│  │  ├─ auth.api.ts    # API authentication
│  │  └─ certs.api.ts   # API chứng chỉ
│  ├─ hooks/
│  │  └─ useAuth.ts     # Hook quản lý auth
│  ├─ routes/
│  │  └─ index.tsx      # React Router config
│  ├─ utils/
│  │  └─ format.ts      # Utility functions
│  ├─ styles/
│  │  └─ index.css      # Global styles
│  ├─ App.tsx           # Main App component
│  └─ main.tsx          # Entry point
├─ .env.example         # Environment variables template
├─ index.html           # HTML template
├─ package.json         # Dependencies
├─ tsconfig.json        # TypeScript config
├─ tsconfig.node.json   # TypeScript node config
├─ vite.config.ts       # Vite config
└─ readme.md            # Documentation
```

## 🛠️ Công nghệ sử dụng

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **QRCode React** - QR code generation

## 📋 Yêu cầu hệ thống

- Node.js >= 16.0.0
- npm >= 8.0.0

## 🚀 Cách chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
VITE_API_BASE=http://localhost:8080
VITE_CHAIN_ID=11155111
```

### 3. Chạy development server

```bash
npm run dev
```

Dự án sẽ chạy tại: `http://localhost:5173`

### 4. Build production

```bash
npm run build
```

### 5. Preview production build

```bash
npm run preview
```

## 🔄 Luồng hoạt động MVP

1. **Login** → Đăng nhập với tài khoản issuer
2. **Issue** → Upload file, nhập thông tin và cấp phát chứng chỉ
3. **Verify** → Tra cứu chứng chỉ bằng hash để xác thực

## 🔗 API Endpoints

Dự án kết nối với backend `certx-api` qua các endpoints:

- `POST /auth/login` - Đăng nhập
- `POST /certs/issue` - Cấp phát chứng chỉ
- `POST /certs/revoke` - Thu hồi chứng chỉ
- `GET /verify?hash=...` - Xác thực chứng chỉ

## 📱 Responsive Design

- Hỗ trợ desktop và mobile
- UI thân thiện, dễ sử dụng
- Giao diện tiếng Việt

## 🔧 Development

### Scripts có sẵn

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build

### Cấu trúc code

- **Pages**: Các trang chính của ứng dụng
- **Components**: Các component tái sử dụng
- **API**: Layer giao tiếp với backend
- **Hooks**: Custom React hooks
- **Utils**: Utility functions
- **Styles**: Global CSS styles

## 📄 License

MIT License
