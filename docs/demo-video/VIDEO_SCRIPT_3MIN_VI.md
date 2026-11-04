# ScopeGraph — bản dịch lời dẫn tiếng Việt để tập đọc

Bản tiếng Anh trong [VIDEO_SCRIPT_3MIN_EN.md](VIDEO_SCRIPT_3MIN_EN.md) là lời dẫn dự kiến cho phim. Đây là bản dịch tham khảo, chưa phải file âm thanh.

## Cảnh 1 · 00:00–00:15

Một thay đổi mã nhỏ có thể lan xa hơn một tệp. Một route gọi service; service chạm tới model; các bài test có thể cần hợp đồng mới. Trước khi sửa, ta cần bản đồ những nơi có thể bị ảnh hưởng.

## Cảnh 2 · 00:15–00:35

ScopeGraph biến yêu cầu thay đổi thành kế hoạch tác động có thể kiểm tra. Công cụ nối yêu cầu với kho mã đã lập chỉ mục và chỉ ra vì sao mỗi vị trí mã được viện dẫn. Người phát triển vẫn quyết định phần nào thực sự cần sửa.

## Cảnh 3 · 00:35–01:00

Đây là kho mẫu xác thực công khai đi kèm dự án. ScopeGraph quét các tệp Python, trích xuất symbol và quan hệ, rồi dựng đồ thị phụ thuộc. Bạn có thể đi từ API route sang các service, model và bài test liên quan trước khi sửa.

## Cảnh 4 · 01:00–01:35

Yêu cầu ở đây là xác minh địa chỉ email mới trước khi đổi email đang dùng của người dùng. Báo cáo quay sẵn dùng provider offline xác định của ScopeGraph, không phải lệnh gọi model trực tiếp. Báo cáo tách đề xuất sửa trực tiếp, mối quan tâm phụ thuộc và rủi ro tiềm năng. Mở một mục để xem đường dẫn trong chỉ mục và dòng mã có số thứ tự. Điều đó xác minh vị trí mã tồn tại; nó chưa chứng minh mọi chỉnh sửa được đề xuất đều cần thiết.

## Cảnh 5 · 01:35–01:55

Bạn cũng có thể đính kèm ảnh chụp để giải thích giao diện nhìn thấy. Một smoke test Meta Muse Spark đã được cho phép riêng nhận diện trang cài đặt email tổng hợp này. Test đó không chạy toàn bộ pipeline phân tích tác động qua Meta. Quan sát hình ảnh tự nó không xác định chính xác tệp mã cần sửa.

## Cảnh 6 · 01:55–02:15

Không gian UI Proposal thử nghiệm chuyển mô tả thành bản xem trước trước và sau, không thực thi chức năng thật. Ví dụ cục bộ hiện dùng bộ tạo offline xác định và được ghi rõ là bản khái niệm. Nhà phát triển có thể tinh chỉnh đề xuất rồi yêu cầu phân tích tác động dựa trên mã nguồn; bản xem trước không sửa kho mã.

## Cảnh 7 · 02:15–02:40

Trong đường chạy Meta được cấu hình, Muse Spark diễn giải yêu cầu và đề xuất quan hệ tác động. Truy xuất cục bộ, duyệt đồ thị và cổng kiểm tra bằng chứng đối chiếu các khẳng định với mã đã lập chỉ mục trước khi đưa ra bản tóm tắt. Công cụ MCP cung cấp ngữ cảnh có căn cứ cho coding agent. Bộ định tuyến provider đối tác là tùy chọn và hành vi trên endpoint thật chưa được kiểm chứng.

## Cảnh 8 · 02:40–03:00

ScopeGraph là công cụ hỗ trợ lập kế hoạch, không phải bằng chứng tự động cho mọi phụ thuộc. Nó cho nhà phát triển một điểm khởi đầu có thể truy vết, thể hiện sự chưa chắc chắn và đặt bằng chứng mã ngay cạnh kết luận. ScopeGraph — hiểu tác động trước khi thay đổi mã.
