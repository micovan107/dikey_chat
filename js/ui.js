/**
 * Xử lý giao diện người dùng
 */
class UI {
    constructor() {
        this.loadingCount = 0;
        this.setupMobileUI();
    }

    /**
 * Khởi tạo emoji picker
 */
initializeEmojiPicker() {
    const emojiContainer = document.getElementById('emoji-container');
    
    // Kiểm tra xem emojiList đã được định nghĩa chưa
    if (typeof emojiList === 'undefined') {
        console.error('emojiList is not defined in UI.initializeEmojiPicker()');
        return;
    }
    
    // Thêm emoji vào container
    emojiList.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        
        // Thêm sự kiện click
        emojiItem.addEventListener('click', () => {
            this.insertEmoji(emoji);
        });
        
        emojiContainer.appendChild(emojiItem);
    });
}

    /**
     * Thiết lập giao diện cho thiết bị di động
     */
    setupMobileUI() {
        // Thêm nút menu cho thiết bị di động
        const chatHeader = document.querySelector('.chat-header .chat-info');
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Thêm sự kiện click
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
        
        // Thêm vào DOM
        chatHeader.parentNode.insertBefore(menuToggle, chatHeader);
        
        // Thêm sự kiện click bên ngoài sidebar để đóng sidebar trên mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const menuToggleButton = document.querySelector('.menu-toggle');
            
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                e.target !== menuToggleButton && 
                !menuToggleButton.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    /**
     * Chèn emoji vào input
     * @param {string} emoji - Emoji cần chèn
     */
    insertEmoji(emoji) {
        const messageInput = document.getElementById('message-text');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        
        // Đặt con trỏ sau emoji
        messageInput.selectionStart = cursorPos + emoji.length;
        messageInput.selectionEnd = cursorPos + emoji.length;
        
        // Focus vào input
        messageInput.focus();
        
        // Đóng emoji picker
        document.getElementById('emoji-picker').classList.remove('active');
    }

    /**
     * Hiển thị thông báo toast
     * @param {string} type - Loại thông báo (success, error, info)
     * @param {string} title - Tiêu đề thông báo
     * @param {string} message - Nội dung thông báo
     */
    showToast(type, title, message) {
        const toastContainer = document.getElementById('toast-container');
        
        // Tạo toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icon cho từng loại thông báo
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
            default:
                icon = '<i class="fas fa-bell"></i>';
        }
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        // Thêm vào container
        toastContainer.appendChild(toast);
        
        // Xóa toast sau 3 giây
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Hiển thị loading spinner
     */
    showLoading() {
        this.loadingCount++;
        
        if (this.loadingCount === 1) {
            // Tạo overlay loading nếu chưa có
            if (!document.getElementById('loading-overlay')) {
                const loadingOverlay = document.createElement('div');
                loadingOverlay.id = 'loading-overlay';
                loadingOverlay.style.position = 'fixed';
                loadingOverlay.style.top = '0';
                loadingOverlay.style.left = '0';
                loadingOverlay.style.width = '100%';
                loadingOverlay.style.height = '100%';
                loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                loadingOverlay.style.display = 'flex';
                loadingOverlay.style.justifyContent = 'center';
                loadingOverlay.style.alignItems = 'center';
                loadingOverlay.style.zIndex = '9999';
                
                const spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                
                loadingOverlay.appendChild(spinner);
                document.body.appendChild(loadingOverlay);
            } else {
                document.getElementById('loading-overlay').style.display = 'flex';
            }
        }
    }

    /**
     * Ẩn loading spinner
     */
    hideLoading() {
        this.loadingCount--;
        
        if (this.loadingCount <= 0) {
            this.loadingCount = 0;
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }

    /**
     * Hiển thị xem trước hình ảnh
     * @param {string} imageUrl - URL của hình ảnh
     */
    showImagePreview(imageUrl) {
        // Tạo hoặc lấy phần tử xem trước hình ảnh
        let imagePreview = document.getElementById('image-preview');
        
        if (!imagePreview) {
            imagePreview = document.createElement('div');
            imagePreview.id = 'image-preview';
            imagePreview.className = 'image-preview';
            
            const closeButton = document.createElement('button');
            closeButton.className = 'image-preview-close';
            closeButton.innerHTML = '<i class="fas fa-times"></i>';
            closeButton.addEventListener('click', () => {
                imagePreview.classList.remove('active');
            });
            
            const image = document.createElement('img');
            
            imagePreview.appendChild(closeButton);
            imagePreview.appendChild(image);
            document.body.appendChild(imagePreview);
            
            // Thêm sự kiện click để đóng preview
            imagePreview.addEventListener('click', (e) => {
                if (e.target === imagePreview) {
                    imagePreview.classList.remove('active');
                }
            });
        }
        
        // Cập nhật URL hình ảnh
        const image = imagePreview.querySelector('img');
        image.src = imageUrl;
        
        // Hiển thị preview
        imagePreview.classList.add('active');
    }
}

// Khởi tạo đối tượng UI
const ui = new UI();