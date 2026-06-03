# LeetBase BE 
Not for English users 😔. I will update the English version soon.

## Giới thiệu 
LeetBase là một sản phẩm clone của Leetcode, được xây dựng bằng ReactJS và NodeJS. 

Sản phẩm này được sử dụng với mục đích học tập và đánh giá bài tập lớn học phần IT4409 - Công nghệ Web và dịch vụ trực tuyến.

## Cài đặt 

```
git clone https://github.com/Zeann3th/LeetbaseBE.git 
cd leetclone-be
npm install
```

Trước khi chạy, bạn cần phải tạo một file `.env` trong thư mục gốc của project với nội dung sau:

```
PORT=5000

# MONGODB
MONGO_URI=<MONGO_URI> # Lấy từ MongoDB Atlas hoặc local
MONGO_DB_NAME=<DB_NAME> # Tên database

# JWT
TOKEN_SECRET=<TOKEN_SECRET> # Chuỗi bí mật để tạo access token
REFRESH_TOKEN_SECRET=<REFRESH_TOKEN_SECRET> # Chuỗi bí mật để tạo refresh token 

# SMTP (Sử dụng bất kỳ dịch vụ nào, có thể là Resend, Brevo, tuy nhiên cần phải có tên miền, tránh sử dụng mail @gmail vì sẽ bị để vào thư rác)
SMTP_HOST=<SMTP_HOST> # SMTP host để gửi email
SMTP_EMAIL=<SMTP_EMAIL> # Email relay để gửi email đến người dùng
SMTP_SENDER=<SMTP_SENDER> # Email gốc của người gửi
SMTP_PASSWORD=<SMTP_PASSWORD> # Mật khẩu email để gửi email

# CACHE
REDIS_URL=<REDIS_URL> # URL của Redis (có thể lấy ở Render, Upstash hay local)

# Object Storage (Sử dụng Cloudflare R2)
CF_ACCOUNT_ID=<CF_ACCOUNT_ID> # Cloudflare Account ID 
CF_BUCKET=<CF_BUCKET> # Tên Bucket 
CF_ACCESS_KEY_ID=<CF_ACCESS_KEY_ID> # Access Key ID 
CF_SECRET_ACCESS_KEY=<CF_SECRET_ACCESS_KEY> # Secret Access Key 

# Github Oauth (Đăng ký trên Github Developer) 
GH_CLIENT_ID=<GH_CLIENT_ID> # Client ID của Github Oauth 
GH_CLIENT_SECRET=<GH_CLIENT_SECRET> # Client Secret của Github Oauth
```

Sau đó, chạy lệnh sau để khởi động server:

```
npm start
```

## Chạy bằng Docker Compose

Repo đã có cấu hình local đầy đủ cho API, chatbot, MongoDB, Redis, MailHog, MinIO và local JavaScript judge.

```bash
docker compose up -d --build
docker compose --profile seed run --rm seed
```

Các endpoint local:

- API: http://localhost:7554
- Chatbot: http://localhost:9000
- MailHog UI: http://localhost:8025
- MinIO console: http://localhost:9001
- Local judge: http://localhost:2000/api/v2/runtimes

Seeder tạo 100 user, dữ liệu problem/discussion/comment/submission/todo/daily problem và template trong MinIO cho `javascript`, `typescript`, `python`, `java`, `c`, `cpp` và `go`. Local judge đi kèm chạy JavaScript; xem `RUNBOOK.md` để biết chi tiết các ngôn ngữ seeded.

Tài khoản admin seeded:

```text
email: seedadmin@example.com
username: seedadmin
password: password123
```

## Những đầu việc cần làm 

- [x] Thiết kế cơ sở dữ liệu, tạo các model Mongoose
- [x] Tạo API cho việc đăng ký, đăng nhập, cập nhật thông tin người dùng 
- [] Tạo API cho việc tạo, xem, sửa, xóa bài tập
- [] Thêm dữ liệu vào cơ sở dữ liệu (bài tập, test case, bài giải)
- [] Tạo API cho việc nộp và thực thi code người dùng 
- [] Tạo API cho diễn đàn, bình luận về bài tập 
- [] Kiểm thử hộp trắng, đen cho các API đã có
- [] Thiết kế luồng upload file template (dùng để thực thi code và chứa test case) và lấy file template
- [x] (Tùy chọn) Thêm Oauth2 để đăng nhập bằng Google, Github 
- [] (Tùy chọn) Thêm chức năng bảng xếp hạng tùy vào số bài đã làm, vào độ khó của bài tập 
- [] (Tùy chọn) Thêm chức năng random bài theo ngày
