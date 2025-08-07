/**
 * Xử lý chức năng thông báo qua email khi có tin nhắn mới
 */
class EmailNotification {
    constructor() {
        this.emailServiceId = 'service_6jtozgf'; // Thay thế bằng service ID của bạn từ EmailJS
        this.emailTemplateId = '__ejs-test-mail-service__'; // Thay thế bằng template ID của bạn từ EmailJS
        this.emailUserId = '7xYUDg8Fs7oJ4LAWl'; // Thay thế bằng user ID của bạn từ EmailJS
        this.isEnabled = false;
        this.emailSettings = {};
        this.loadSettings();
    }

    /**
     * Tải cài đặt thông báo email từ localStorage
     */
    loadSettings() {
        const settings = localStorage.getItem('emailNotificationSettings');
        if (settings) {
            this.emailSettings = JSON.parse(settings);
            this.isEnabled = this.emailSettings.enabled || false;
        } else {
            // Cài đặt mặc định
            this.emailSettings = {
                enabled: false,
                email: '',
                notifyAllMessages: false,
                notifyMentions: true,
                notifyDirectMessages: true
            };
            this.saveSettings();
        }
    }

    /**
     * Lưu cài đặt thông báo email vào localStorage
     */
    saveSettings() {
        localStorage.setItem('emailNotificationSettings', JSON.stringify(this.emailSettings));
    }

    /**
     * Bật/tắt thông báo email
     * @param {boolean} enabled - Trạng thái bật/tắt
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.emailSettings.enabled = enabled;
        this.saveSettings();
    }

    /**
     * Cập nhật email nhận thông báo
     * @param {string} email - Địa chỉ email
     */
    setEmail(email) {
        this.emailSettings.email = email;
        this.saveSettings();
    }

    /**
     * Cập nhật cài đặt loại tin nhắn cần thông báo
     * @param {Object} settings - Cài đặt thông báo
     */
    updateNotificationSettings(settings) {
        this.emailSettings = {...this.emailSettings, ...settings};
        this.saveSettings();
    }

    /**
     * Kiểm tra xem tin nhắn có cần gửi thông báo không
     * @param {Object} message - Thông tin tin nhắn
     * @param {Object} chat - Thông tin cuộc trò chuyện
     * @param {Object} currentUser - Thông tin người dùng hiện tại
     * @returns {boolean} - Có cần gửi thông báo không
     */
    shouldNotify(message, chat, currentUser) {
        if (!this.isEnabled || !this.emailSettings.email) {
            return false;
        }

        // Không thông báo tin nhắn của chính mình
        if (message.senderId === currentUser.uid) {
            return false;
        }

        // Thông báo tất cả tin nhắn
        if (this.emailSettings.notifyAllMessages) {
            return true;
        }

        // Thông báo tin nhắn trực tiếp
        if (this.emailSettings.notifyDirectMessages && chat.type === 'private') {
            return true;
        }

        // Thông báo khi được nhắc đến
        if (this.emailSettings.notifyMentions && 
            message.text && 
            message.text.includes(`@${currentUser.displayName}`)) {
            return true;
        }

        return false;
    }

    /**
     * Gửi thông báo qua email
     * @param {Object} message - Thông tin tin nhắn
     * @param {Object} chat - Thông tin cuộc trò chuyện
     * @param {Object} sender - Thông tin người gửi
     */
    sendNotification(message, chat, sender) {
        const currentUser = authManager.getCurrentUser();
        
        if (!this.shouldNotify(message, chat, currentUser)) {
            return;
        }

        // Chuẩn bị dữ liệu để gửi email
        const templateParams = {
            to_email: this.emailSettings.email,
            to_name: currentUser.displayName,
            from_name: sender.displayName || 'Người dùng',
            chat_name: chat.name,
            message_text: message.type === 'image' ? '🖼️ Đã gửi một hình ảnh' : message.text,
            app_url: window.location.href
        };

        // Gửi email sử dụng EmailJS
        if (window.emailjs) {
            emailjs.send(this.emailServiceId, this.emailTemplateId, templateParams, this.emailUserId)
                .then(() => {
                    console.log('Đã gửi thông báo email thành công');
                })
                .catch(error => {
                    console.error('Lỗi khi gửi thông báo email:', error);
                });
        } else {
            console.error('EmailJS chưa được tải');
        }
    }

    /**
     * Hiển thị modal cài đặt thông báo email
     */
    showSettingsModal() {
        // Tạo modal cài đặt
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'email-notification-modal';

        const currentUser = authManager.getCurrentUser();
        const userEmail = currentUser ? currentUser.email : '';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Cài đặt thông báo email</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="switch">
                            <input type="checkbox" id="enable-email-notification" ${this.isEnabled ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                        <label for="enable-email-notification">Bật thông báo qua email</label>
                    </div>
                    <div class="form-group">
                        <label for="notification-email">Email nhận thông báo:</label>
                        <input type="email" id="notification-email" value="${this.emailSettings.email || userEmail}" placeholder="Nhập địa chỉ email...">
                    </div>
                    <div class="form-group">
                        <h4>Nhận thông báo khi:</h4>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" id="notify-all-messages" ${this.emailSettings.notifyAllMessages ? 'checked' : ''}>
                                Có tin nhắn mới trong bất kỳ cuộc trò chuyện nào
                            </label>
                        </div>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" id="notify-direct-messages" ${this.emailSettings.notifyDirectMessages ? 'checked' : ''}>
                                Có tin nhắn trực tiếp mới
                            </label>
                        </div>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" id="notify-mentions" ${this.emailSettings.notifyMentions ? 'checked' : ''}>
                                Được nhắc đến trong tin nhắn (@${currentUser ? currentUser.displayName : 'bạn'})
                            </label>
                        </div>
                    </div>
                    <div class="note">
                        <p><i class="fas fa-info-circle"></i> Lưu ý: Bạn cần cài đặt EmailJS để sử dụng tính năng này.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-email-settings" class="primary-button">Lưu cài đặt</button>
                </div>
            </div>
        `;

        // Thêm modal vào body
        document.body.appendChild(modal);

        // Hiển thị modal
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Xử lý sự kiện đóng modal
        const closeButton = modal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        });

        // Xử lý sự kiện lưu cài đặt
        const saveButton = document.getElementById('save-email-settings');
        saveButton.addEventListener('click', () => {
            const enabled = document.getElementById('enable-email-notification').checked;
            const email = document.getElementById('notification-email').value.trim();
            const notifyAllMessages = document.getElementById('notify-all-messages').checked;
            const notifyDirectMessages = document.getElementById('notify-direct-messages').checked;
            const notifyMentions = document.getElementById('notify-mentions').checked;

            // Kiểm tra email hợp lệ
            if (enabled && !email) {
                ui.showToast('error', 'Lỗi', 'Vui lòng nhập địa chỉ email');
                return;
            }

            // Cập nhật cài đặt
            this.setEnabled(enabled);
            this.setEmail(email);
            this.updateNotificationSettings({
                notifyAllMessages,
                notifyDirectMessages,
                notifyMentions
            });

            // Đóng modal
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);

            // Hiển thị thông báo
            ui.showToast('success', 'Thành công', 'Đã lưu cài đặt thông báo email');
        });
    }
}

// Khởi tạo đối tượng EmailNotification
const emailNotification = new EmailNotification();