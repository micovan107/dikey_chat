/**
 * File chính khởi tạo ứng dụng
 */
document.addEventListener('DOMContentLoaded', () => {
    // Thiết lập sự kiện đăng nhập
    document.getElementById('google-login').addEventListener('click', () => {
        authManager.loginWithGoogle();
    });
    
    // Thiết lập sự kiện đăng xuất
    document.getElementById('logout-button').addEventListener('click', () => {
        authManager.logout();
    });
    
    // Thiết lập sự kiện khi người dùng nhấp vào avatar của họ trong sidebar
    document.getElementById('user-avatar').addEventListener('click', () => {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            chat.showUserProfile(currentUser.uid);
        }
    });
    
    // Thiết lập sự kiện khi người dùng nhấp vào tên của họ trong sidebar
    document.getElementById('user-name').addEventListener('click', () => {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            chat.showUserProfile(currentUser.uid);
        }
    });
    
    // Khởi tạo emoji picker
     if (typeof emojiList !== 'undefined') {
         initializeEmojiPicker();
     } else {
         console.error('emojiList is not defined. Make sure config.js is loaded before app.js');
     }
     
    // Thiết lập sự kiện cho nút quay lại trên thiết bị di động
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Ẩn nút quay lại
            backButton.classList.add('hidden');
            
            // Hiển thị sidebar và ẩn chat area
            document.querySelector('.app-container').classList.remove('chat-selected');
            
            // Hiển thị empty chat placeholder
            document.getElementById('empty-chat').style.display = 'flex';
            document.getElementById('chat-container').style.display = 'none';
        });
        
        // Ẩn nút quay lại khi trang được tải
        backButton.classList.add('hidden');
    }
});

/**
 * Khởi tạo emoji picker
 */
function initializeEmojiPicker() {
    const emojiContainer = document.getElementById('emoji-container');
    
    // Kiểm tra xem emojiList đã được định nghĩa chưa
    if (typeof emojiList === 'undefined') {
        console.error('emojiList is not defined in initializeEmojiPicker()');
        return;
    }
    
    // Xóa nội dung cũ
    emojiContainer.innerHTML = '';
    
    // Thêm emoji vào container
    emojiList.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        
        // Thêm sự kiện click
        emojiItem.addEventListener('click', () => {
            const messageInput = document.getElementById('message-text');
            messageInput.value += emoji;
            messageInput.focus();
            document.getElementById('emoji-picker').classList.remove('active');
        });
        
        emojiContainer.appendChild(emojiItem);
    });
}

/**
 * Xử lý sự kiện khi kích thước màn hình thay đổi
 */
window.addEventListener('resize', () => {
    adjustLayoutForScreenSize();
});

/**
 * Điều chỉnh layout cho kích thước màn hình
 */
function adjustLayoutForScreenSize() {
    const sidebar = document.querySelector('.sidebar');
    const infoSidebar = document.querySelector('.info-sidebar');
    
    if (window.innerWidth <= 768) {
        // Thiết bị di động
        sidebar.classList.remove('active');
        infoSidebar.classList.remove('active');
    }
}

// Khởi tạo layout ban đầu
adjustLayoutForScreenSize();

// Xử lý sự kiện khi người dùng rời khỏi trang
window.addEventListener('beforeunload', () => {
    // Nếu người dùng đã đăng nhập, cập nhật trạng thái offline
    const currentUser = authManager.getCurrentUser();
    if (currentUser) {
        dbRefs.users.child(`${currentUser.uid}/status`).set('offline');
        dbRefs.users.child(`${currentUser.uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
    }
});