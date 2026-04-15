🚀 iMath - Hệ thống Quản lý & Xử lý Dữ liệu Giáo dục Thông minh
Dự án này được xây dựng trên nền tảng Next.js (App Router), tập trung vào việc tối ưu hóa giao diện người dùng (UI/UX) và xử lý dữ liệu khảo sát giáo dục số.

📋 Mục lục
Yêu cầu hệ thống

Hướng dẫn cài đặt

Khởi chạy dự án

Cấu trúc dự án

Lưu ý về dữ liệu

💻 Yêu cầu hệ thống
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

Node.js: Phiên bản 18.x trở lên.

npm hoặc yarn (trình quản lý gói).

🛠 Hướng dẫn cài đặt
Bước 1: Tải mã nguồn từ GitHub về máy (nếu chưa có):

Bash
git clone https://github.com/transonbachts-ops/imath.git
cd imath
Bước 2: Cài đặt các thư viện cần thiết (Dependencies):

Bash
npm install
# hoặc
yarn install
🚀 Khởi chạy dự án
1. Môi trường phát triển (Development)
Để chạy dự án trên máy cá nhân và xem các thay đổi trực tiếp:

Bash
npm run dev
Sau đó, mở trình duyệt và truy cập: http://localhost:3000

2. Xây dựng bản chính thức (Production)
Dành cho việc triển khai lên máy chủ:

Bash
npm run build
npm run start
📂 Cấu trúc dự án chính
/app: Chứa các trang (pages) và components chính của ứng dụng.

/public: Chứa các tài nguyên tĩnh như hình ảnh, biểu tượng.

/.gitignore: Cấu hình các file và thư mục không đưa lên GitHub (như node_modules, .env).

⚠️ Lưu ý về dữ liệu bài giảng
Các tệp tin nặng như video (mp4) hoặc bài giảng nén (rar) trong thư mục public/scorm/ hoặc public/uploads/ được cấu hình để không đẩy lên GitHub nhằm đảm bảo tốc độ và bảo mật.

Nếu bạn tải mã nguồn này về, vui lòng liên hệ quản trị viên để nhận các file tài nguyên lớn này.

🌐 Triển khai (Deployment)
Dự án được tối ưu hóa để triển khai dễ dàng nhất trên nền tảng Vercel.

Người thực hiện: Basch 

Mục tiêu: Đóng góp vào tiến trình chuyển đổi số trong giáo dục.