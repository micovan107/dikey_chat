# Dikey Chat - Ứng dụng Chat Trực tuyến

Dikey Chat là một ứng dụng chat trực tuyến theo thời gian thực sử dụng Firebase Realtime Database và Cloudinary để lưu trữ hình ảnh. Ứng dụng có giao diện hiện đại, hỗ trợ đăng nhập bằng Google, chat cá nhân và nhóm.

## Tính năng

- Đăng nhập bằng tài khoản Google
- Chat cá nhân và nhóm
- Gửi tin nhắn văn bản và hình ảnh
- Hiển thị trạng thái online/offline của người dùng
- Hiển thị trạng thái đang nhập
- Tạo nhóm chat mới
- Tìm kiếm người dùng và cuộc trò chuyện
- Giao diện responsive, hỗ trợ cả máy tính và điện thoại
- Emoji picker
- Nhóm chat mặc định "Cộng đồng Việt"

## Cài đặt

### Yêu cầu

- Tài khoản Firebase
- Tài khoản Cloudinary

### Bước 1: Cấu hình Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo một dự án mới
3. Trong phần "Authentication", bật phương thức đăng nhập Google
4. Trong phần "Realtime Database", tạo một database mới và thiết lập quy tắc bảo mật
5. Lấy thông tin cấu hình Firebase (apiKey, authDomain, databaseURL, projectId, ...)

### Bước 2: Cấu hình Cloudinary

1. Đăng ký tài khoản tại [Cloudinary](https://cloudinary.com/)
2. Tạo một upload preset mới
3. Lấy thông tin cloud name và upload preset

### Bước 3: Cập nhật cấu hình

Mở file `js/config.js` và cập nhật các thông tin cấu hình:

```javascript
// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'YOUR_CLOUD_NAME',
    uploadPreset: 'YOUR_UPLOAD_PRESET'
};
```

### Bước 4: Chạy ứng dụng

Bạn có thể sử dụng một máy chủ web đơn giản để chạy ứng dụng. Ví dụ, với Node.js, bạn có thể sử dụng `http-server`:

```bash
npm install -g http-server
http-server
```

Sau đó, truy cập ứng dụng tại địa chỉ `http://localhost:8080`

## Cấu trúc dự án

```
├── css/
│   └── style.css          # File CSS chính
├── images/
│   ├── logo.svg           # Logo ứng dụng
│   ├── default-avatar.svg  # Avatar mặc định
│   └── chat-placeholder.svg # Hình ảnh placeholder
├── js/
│   ├── config.js          # Cấu hình Firebase và Cloudinary
│   ├── auth.js            # Xử lý xác thực người dùng
│   ├── chat.js            # Xử lý chức năng chat
│   ├── ui.js              # Xử lý giao diện người dùng
│   └── app.js             # File JavaScript chính
└── index.html             # File HTML chính
```

## Cơ sở dữ liệu

Ứng dụng sử dụng Firebase Realtime Database với cấu trúc sau:

```
/users/{userId}            # Thông tin người dùng
/chats/{chatId}            # Thông tin cuộc trò chuyện
/messages/{chatId}/{messageId} # Tin nhắn
/user_chats/{userId}/{chatId}  # Danh sách chat của người dùng
/typing/{chatId}/{userId}      # Trạng thái đang nhập
```

## Hướng dẫn sử dụng

1. Đăng nhập bằng tài khoản Google
2. Xem danh sách cuộc trò chuyện ở tab "Trò chuyện"
3. Xem danh sách người dùng ở tab "Người dùng"
4. Nhấp vào một người dùng để bắt đầu cuộc trò chuyện mới
5. Nhấp vào nút "Tạo nhóm" để tạo nhóm chat mới
6. Gửi tin nhắn văn bản hoặc hình ảnh trong cuộc trò chuyện

## Tùy chỉnh

Bạn có thể tùy chỉnh giao diện ứng dụng bằng cách chỉnh sửa file CSS. Các biến CSS được định nghĩa ở đầu file `css/style.css`:

```css
:root {
    --primary-color: #4285f4;
    --secondary-color: #34a853;
    --accent-color: #ea4335;
    --light-color: #f8f9fa;
    --dark-color: #202124;
    --gray-color: #5f6368;
    --light-gray: #dadce0;
    --hover-color: #e8f0fe;
    --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    --border-radius: 12px;
    --transition: all 0.3s ease;
}
```

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## Tác giả

Dikey Chat - Ứng dụng chat trực tuyến hiện đại