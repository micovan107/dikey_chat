/**
 * Xử lý chức năng chat
 */
class Chat {
    constructor() {
        this.currentChatId = null;
        this.chats = {};
        this.users = {};
        this.messages = {};
        this.typingTimeout = null;
        this.typingUsers = {};
        this.messageListeners = {};
        this.chatListeners = {};
        this.userListeners = {};
        this.typingListeners = {};
        this.unreadMessages = {}; // Số tin nhắn chưa đọc cho mỗi chat
    }

    /**
     * Áp dụng ảnh nền cho khung chat từ localStorage
     */
    applyChatBackground() {
        const chatArea = document.querySelector('.chat-area');
        const bgImage = localStorage.getItem('chatBackgroundImage');
        const bgColor = localStorage.getItem('chatBackgroundColor');
        
        if (bgImage) {
            chatArea.style.backgroundImage = `url(${bgImage})`;
            chatArea.style.backgroundColor = 'transparent';
        } else if (bgColor) {
            chatArea.style.backgroundImage = 'none';
            chatArea.style.backgroundColor = bgColor;
        }
    }
    
    /**
     * Khởi tạo các listener và load dữ liệu
     */
    initialize() {
        if (!authManager.getCurrentUser()) return;

        // Load danh sách người dùng
        this.loadUsers();
        
        // Load danh sách chat của người dùng hiện tại
        this.loadUserChats();
        
        // Thiết lập các listener cho sự kiện
        this.setupEventListeners();
    }

    /**
     * Thiết lập các listener cho sự kiện
     */
    setupEventListeners() {
        // Sự kiện khi người dùng gửi tin nhắn
        document.getElementById('send-button').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Gửi trạng thái đang nhập
            this.sendTypingStatus();
        });
        
        // Sự kiện khi người dùng đính kèm file
        document.getElementById('attach-button').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadImage(e.target.files[0]);
            }
        });
        
        // Sự kiện khi người dùng mở emoji picker
        document.getElementById('emoji-button').addEventListener('click', () => {
            document.getElementById('emoji-picker').classList.toggle('active');
        });
        
        // Sự kiện khi người dùng nhấp vào bên ngoài emoji picker
        document.addEventListener('click', (e) => {
            const emojiPicker = document.getElementById('emoji-picker');
            const emojiButton = document.getElementById('emoji-button');
            
            if (!emojiPicker.contains(e.target) && e.target !== emojiButton && !emojiButton.contains(e.target)) {
                emojiPicker.classList.remove('active');
            }
        });
        
        // Sự kiện khi người dùng nhấp vào nút thông tin chat
        document.getElementById('chat-info-button').addEventListener('click', () => {
            document.getElementById('info-sidebar').classList.toggle('active');
        });
        
        document.getElementById('close-info').addEventListener('click', () => {
            document.getElementById('info-sidebar').classList.remove('active');
        });
        
        // Sự kiện khi người dùng chuyển tab
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Sự kiện khi người dùng tìm kiếm
        document.getElementById('search-input').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.searchChatsAndUsers(searchTerm);
        });
        
        // Sự kiện khi người dùng tạo nhóm
        document.getElementById('create-group').addEventListener('click', () => {
            this.showCreateGroupModal();
        });
        
        // Sự kiện khi người dùng đóng modal
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('create-group-modal').classList.remove('active');
            });
        });
        
        // Sự kiện khi người dùng nhấp vào nút tạo nhóm trong modal
        document.getElementById('create-group-button').addEventListener('click', () => {
            this.createGroup();
        });
    }

    /**
     * Load danh sách người dùng
     */
    loadUsers() {
        // Xóa listener cũ nếu có
        if (this.userListeners.users) {
            this.userListeners.users();
        }
        
        // Thiết lập listener mới
        this.userListeners.users = dbRefs.users.on('value', snapshot => {
            this.users = (snapshot && snapshot.val) ? snapshot.val() || {} : {};
            console.log('Danh sách người dùng đã được tải:', Object.keys(this.users).length, 'người dùng');
            this.renderUserList();
            
            // Cập nhật thông tin người dùng trong các cuộc trò chuyện
            this.updateChatUserInfo();
        });
        
        // Đảm bảo danh sách người dùng được hiển thị
        setTimeout(() => {
            if (Object.keys(this.users).length > 0) {
                this.renderUserList();
                console.log('Render lại danh sách người dùng sau timeout');
            }
        }, 3000);
    }

    /**
     * Load danh sách chat của người dùng hiện tại
     */
    loadUserChats() {
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;
        
        // Xóa listener cũ nếu có
        if (this.chatListeners.userChats) {
            this.chatListeners.userChats();
        }
        
        // Thiết lập listener mới
        const userChatsRef = dbRefs.userChats.child(currentUser.uid);
        this.chatListeners.userChats = userChatsRef.on('value', snapshot => {
            const userChats = (snapshot && snapshot.val) ? snapshot.val() || {} : {};
            
            // Load thông tin chi tiết của từng chat
            Object.keys(userChats).forEach(chatId => {
                this.loadChatDetails(chatId);
            });
        });
    }

    /**
     * Load thông tin chi tiết của một chat
     * @param {string} chatId - ID của chat
     */
    loadChatDetails(chatId) {
        // Xóa listener cũ nếu có
        if (this.chatListeners[`chat_${chatId}`]) {
            this.chatListeners[`chat_${chatId}`]();
        }
        
        // Thiết lập listener mới
        const chatRef = dbRefs.chats.child(chatId);
        this.chatListeners[`chat_${chatId}`] = chatRef.on('value', snapshot => {
            const chatData = (snapshot && snapshot.val) ? snapshot.val() : null;
            if (chatData) {
                this.chats[chatId] = chatData;
                this.chats[chatId].id = chatId;
                
                // Cập nhật thông tin người dùng trong chat
                this.updateChatUserInfo();
                
                // Load tin nhắn của chat này
                this.loadChatMessages(chatId);
                
                // Render lại danh sách chat
                this.renderChatList();
                
                // Cập nhật thông tin chat hiện tại nếu đang xem
                if (this.currentChatId === chatId) {
                    this.updateCurrentChatInfo();
                }
            }
        });
    }

    /**
     * Load tin nhắn của một chat
     * @param {string} chatId - ID của chat
     */
    loadChatMessages(chatId) {
        // Xóa listener cũ nếu có
        if (this.messageListeners[chatId]) {
            this.messageListeners[chatId]();
        }
        
        // Khởi tạo mảng tin nhắn trống nếu chưa có
        if (!this.messages[chatId]) {
            this.messages[chatId] = [];
        }
        
        // Khởi tạo số tin nhắn chưa đọc nếu chưa có
        if (!this.unreadMessages[chatId]) {
            this.unreadMessages[chatId] = 0;
        }
        
        // Thiết lập listener mới
        const messagesRef = dbRefs.messages.child(chatId).orderByChild('timestamp');
        this.messageListeners[chatId] = messagesRef.on('value', snapshot => {
            // Lưu lại số lượng tin nhắn cũ
            const oldMessagesCount = this.messages[chatId] ? this.messages[chatId].length : 0;
            this.messages[chatId] = [];
            
            // Kiểm tra xem snapshot có tồn tại và có tin nhắn nào không
            if (snapshot && snapshot.exists && snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    if (childSnapshot && childSnapshot.val) {
                        const message = childSnapshot.val();
                        message.id = childSnapshot.key;
                        this.messages[chatId].push(message);
                    }
                });
            }
            
            // Chỉ tính số tin nhắn mới khi có tin nhắn cũ và số tin nhắn mới nhiều hơn
            if (oldMessagesCount > 0 && this.messages[chatId].length > oldMessagesCount) {
                // Tính số tin nhắn mới
                const currentUser = authManager.getCurrentUser();
                const newMessagesCount = this.messages[chatId].length - oldMessagesCount;
                
                // Nếu có tin nhắn mới và không phải là chat hiện tại, tăng số tin nhắn chưa đọc
                if (this.currentChatId !== chatId) {
                    // Chỉ đếm tin nhắn không phải do người dùng hiện tại gửi
                    const newMessages = this.messages[chatId].slice(-newMessagesCount);
                    const unreadCount = newMessages.filter(msg => msg.senderId !== currentUser.uid && msg.senderId !== 'system').length;
                    this.unreadMessages[chatId] += unreadCount;
                    
                    // Cập nhật giao diện
                    this.renderChatList();
                }
            }
            
            // Render lại tin nhắn nếu đang xem chat này
            if (this.currentChatId === chatId) {
                this.renderMessages();
                // Đặt lại số tin nhắn chưa đọc về 0 khi xem chat
                this.unreadMessages[chatId] = 0;
                this.renderChatList();
            }
            
            // Cập nhật tin nhắn cuối cùng trong danh sách chat
            this.updateLastMessage(chatId);
        });
        
        // Thiết lập listener cho trạng thái đang nhập
        this.setupTypingListener(chatId);
    }

    /**
     * Thiết lập listener cho trạng thái đang nhập
     * @param {string} chatId - ID của chat
     */
    setupTypingListener(chatId) {
        // Xóa listener cũ nếu có
        if (this.typingListeners[chatId]) {
            this.typingListeners[chatId]();
        }
        
        // Thiết lập listener mới
        const typingRef = dbRefs.typing.child(chatId);
        this.typingListeners[chatId] = typingRef.on('value', snapshot => {
            this.typingUsers[chatId] = (snapshot && snapshot.val) ? snapshot.val() || {} : {};
            
            // Hiển thị trạng thái đang nhập nếu đang xem chat này
            if (this.currentChatId === chatId) {
                this.renderTypingIndicator();
            }
        });
    }

    /**
     * Cập nhật tin nhắn cuối cùng trong danh sách chat
     * @param {string} chatId - ID của chat
     */
    updateLastMessage(chatId) {
        if (!this.messages[chatId] || this.messages[chatId].length === 0) return;
        
        const lastMessage = this.messages[chatId][this.messages[chatId].length - 1];
        const chatElement = document.querySelector(`.chat-item[data-id="${chatId}"] .chat-last-message`);
        
        if (chatElement) {
            let messageText = '';
            
            if (lastMessage.type === 'image') {
                messageText = '🖼️ Hình ảnh';
            } else {
                messageText = lastMessage.text;
            }
            
            // Hiển thị tên người gửi nếu là nhóm
            if (this.chats[chatId].type === 'group' && lastMessage.senderId !== 'system') {
                const senderName = lastMessage.senderName || this.getUserName(lastMessage.senderId);
                messageText = `${senderName}: ${messageText}`;
            }
            
            chatElement.textContent = messageText;
            
            // Cập nhật thời gian
            const timeElement = document.querySelector(`.chat-item[data-id="${chatId}"] .chat-time`);
            if (timeElement) {
                timeElement.textContent = this.formatTime(lastMessage.timestamp);
            }
        }
    }

    /**
     * Cập nhật thông tin người dùng trong các cuộc trò chuyện
     */
    updateChatUserInfo() {
        Object.keys(this.chats).forEach(chatId => {
            const chat = this.chats[chatId];
            
            // Nếu là chat 1-1, cập nhật thông tin người dùng
            if (chat.type === 'private') {
                const currentUser = authManager.getCurrentUser();
                const otherUserId = Object.keys(chat.members || {}).find(id => id !== currentUser.uid);
                
                if (otherUserId && this.users[otherUserId]) {
                    // Đảm bảo thông tin người dùng được cập nhật đúng
                    chat.name = this.users[otherUserId].displayName || 'Người dùng';
                    chat.photoURL = this.users[otherUserId].photoURL || '/images/default-avatar.svg';
                    chat.status = this.users[otherUserId].status || 'offline';
                    
                    // Lưu thông tin cập nhật vào database
                    dbRefs.chats.child(chatId).update({
                        name: chat.name,
                        photoURL: chat.photoURL
                    });
                }
            }
        });
        
        // Render lại danh sách chat
        this.renderChatList();
        
        // Cập nhật thông tin chat hiện tại nếu đang xem
        if (this.currentChatId) {
            this.updateCurrentChatInfo();
        }
    }

    /**
     * Chọn một chat để xem
     * @param {string} chatId - ID của chat
     */
    selectChat(chatId) {
        this.currentChatId = chatId;
        
        // Hiển thị container chat
        document.getElementById('empty-chat').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        
        // Cập nhật active class trong danh sách chat
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedChat = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (selectedChat) {
            selectedChat.classList.add('active');
        }
        
        // Đảm bảo tin nhắn được tải
        if (!this.messages[chatId]) {
            this.loadChatMessages(chatId);
        }
        
        // Đặt lại số tin nhắn chưa đọc về 0
        this.unreadMessages[chatId] = 0;
        
        // Cập nhật thông tin chat hiện tại
        this.updateCurrentChatInfo();
        
        // Xử lý giao diện trên thiết bị di động
        if (window.innerWidth <= 480) {
            // Thêm class chat-selected vào app-container
            document.querySelector('.app-container').classList.add('chat-selected');
            
            // Hiển thị nút quay lại
            const backButton = document.getElementById('back-button');
            if (backButton) {
                backButton.classList.remove('hidden');
            }
        }
        
        // Render tin nhắn và cập nhật danh sách chat
        this.renderMessages();
        this.renderChatList();
        
        // Render thông tin chat
        this.renderChatInfo();
    }

    /**
     * Cập nhật thông tin chat hiện tại trên giao diện
     */
    updateCurrentChatInfo() {
        if (!this.currentChatId || !this.chats[this.currentChatId]) return;
        
        const chat = this.chats[this.currentChatId];
        
        document.getElementById('current-chat-name').textContent = chat.name;
        document.getElementById('current-chat-avatar').src = chat.photoURL || '/images/default-avatar.svg';
        
        // Hiển thị trạng thái
        let statusText = '';
        
        if (chat.type === 'private') {
            const currentUser = authManager.getCurrentUser();
            const otherUserId = Object.keys(chat.members).find(id => id !== currentUser.uid);
            
            if (otherUserId && this.users[otherUserId]) {
                statusText = this.users[otherUserId].status === 'online' ? 'Đang hoạt động' : 'Không hoạt động';
            }
        } else {
            const memberCount = Object.keys(chat.members).length;
            statusText = `${memberCount} thành viên`;
        }
        
        document.getElementById('current-chat-status').textContent = statusText;
    }

    /**
     * Render danh sách chat
     */
    renderChatList() {
        const chatListElement = document.getElementById('chat-list');
        const currentUser = authManager.getCurrentUser();
        
        if (!currentUser || !chatListElement) return;
        
        // Sắp xếp chat theo thời gian tin nhắn cuối cùng
        const sortedChats = Object.values(this.chats).sort((a, b) => {
            const aLastMessage = this.getLastMessage(a.id);
            const bLastMessage = this.getLastMessage(b.id);
            
            const aTime = aLastMessage ? aLastMessage.timestamp : 0;
            const bTime = bLastMessage ? bLastMessage.timestamp : 0;
            
            return bTime - aTime;
        });
        
        // Xóa danh sách cũ
        chatListElement.innerHTML = '';
        
        // Render danh sách mới
        sortedChats.forEach(chat => {
            // Kiểm tra xem người dùng có trong chat này không
            if (!chat.members || !chat.members[currentUser.uid]) return;
            
            const lastMessage = this.getLastMessage(chat.id);
            let lastMessageText = '';
            let lastMessageTime = '';
            
            if (lastMessage) {
                if (lastMessage.type === 'image') {
                    lastMessageText = '🖼️ Hình ảnh';
                } else {
                    lastMessageText = lastMessage.text;
                }
                
                // Hiển thị tên người gửi nếu là nhóm
                if (chat.type === 'group' && lastMessage.senderId !== 'system') {
                    const senderName = lastMessage.senderName || this.getUserName(lastMessage.senderId);
                    lastMessageText = `${senderName}: ${lastMessageText}`;
                }
                
                lastMessageTime = this.formatTime(lastMessage.timestamp);
            }
            
            // Tạo phần tử chat
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.setAttribute('data-id', chat.id);
            
            if (this.currentChatId === chat.id) {
                chatItem.classList.add('active');
            }
            
            // Xác định trạng thái online
            let onlineStatus = '';
            if (chat.type === 'private') {
                const otherUserId = Object.keys(chat.members).find(id => id !== currentUser.uid);
                if (otherUserId && this.users[otherUserId] && this.users[otherUserId].status === 'online') {
                    onlineStatus = '<div class="online-indicator"></div>';
                }
            }
            
            // Đảm bảo chat.name và chat.photoURL có giá trị hợp lệ
            const chatName = chat.name || 'Người dùng';
            const chatPhoto = chat.photoURL || '/images/default-avatar.svg';
            
            // Hiển thị số tin nhắn chưa đọc
            const unreadCount = this.unreadMessages[chat.id] || 0;
            const unreadBadge = unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : '';
            
            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <img src="${chatPhoto}" alt="${chatName}">
                    ${onlineStatus}
                </div>
                <div class="chat-details">
                    <div class="chat-name">
                        ${chatName}
                        <span class="chat-time">${lastMessageTime}</span>
                    </div>
                    <div class="chat-last-message">${lastMessageText}</div>
                </div>
                ${unreadBadge}
            `;
            
            // Thêm sự kiện click
            chatItem.addEventListener('click', () => {
                this.selectChat(chat.id);
            });
            
            chatListElement.appendChild(chatItem);
        });
    }

    /**
     * Render danh sách người dùng
     */
    renderUserList() {
        const userListElement = document.getElementById('user-list');
        const currentUser = authManager.getCurrentUser();
        
        if (!currentUser || !userListElement) return;
        
        // Xóa danh sách cũ
        userListElement.innerHTML = '';
        
        // Kiểm tra xem có người dùng nào không
        if (Object.keys(this.users).length === 0) {
            userListElement.innerHTML = '<div class="empty-user-list">Đang tải danh sách người dùng...</div>';
            return;
        }
        
        // Lọc và sắp xếp người dùng - hiển thị tất cả người dùng đã tham gia
        const filteredUsers = Object.values(this.users)
            .sort((a, b) => {
                // Người dùng hiện tại luôn ở đầu tiên
                if (a.uid === currentUser.uid) return -1;
                if (b.uid === currentUser.uid) return 1;
                
                // Sắp xếp theo trạng thái online tiếp theo
                if (a.status === 'online' && b.status !== 'online') return -1;
                if (a.status !== 'online' && b.status === 'online') return 1;
                
                // Sau đó sắp xếp theo tên (đảm bảo displayName không undefined)
                const nameA = a.displayName || 'Người dùng';
                const nameB = b.displayName || 'Người dùng';
                return nameA.localeCompare(nameB);
            });
            
        // Kiểm tra sau khi lọc
        if (filteredUsers.length === 0) {
            userListElement.innerHTML = '<div class="empty-user-list">Không tìm thấy người dùng nào khác</div>';
            return;
        }
        
        // Render danh sách mới
        filteredUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.setAttribute('data-id', user.uid);
            
            // Thêm class 'current-user' nếu là người dùng hiện tại
            if (user.uid === currentUser.uid) {
                userItem.classList.add('current-user');
            }
            
            const onlineStatus = user.status === 'online' ? '<div class="online-indicator"></div>' : '';
            
            userItem.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.photoURL || '/images/default-avatar.svg'}" alt="${user.displayName}">
                    ${onlineStatus}
                </div>
                <div class="user-details">
                    <div class="user-name">${user.displayName}</div>
                    <div class="user-status">${user.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'}</div>
                </div>
                <div class="user-actions">
                    <button class="chat-button" title="Nhắn tin">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
            
            userListElement.appendChild(userItem);
            
            // Thêm sự kiện click cho avatar và tên người dùng để xem hồ sơ
            const avatarElement = userItem.querySelector('.user-avatar');
            const detailsElement = userItem.querySelector('.user-details');
            
            avatarElement.addEventListener('click', () => {
                this.showUserProfile(user.uid);
            });
            
            detailsElement.addEventListener('click', () => {
                this.showUserProfile(user.uid);
            });
            
            // Thêm sự kiện click cho nút nhắn tin
            const chatButton = userItem.querySelector('.chat-button');
            chatButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện lan ra phần tử cha
                this.startPrivateChat(user.uid);
            });
        });
    }

    /**
     * Render tin nhắn của chat hiện tại
     */
    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        
        if (!this.currentChatId || !messagesContainer) return;
        
        // Lưu vị trí cuộn hiện tại
        const isScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 50;
        
        // Xóa tin nhắn cũ
        messagesContainer.innerHTML = '';
        
        // Kiểm tra xem có tin nhắn không
        if (!this.messages[this.currentChatId] || this.messages[this.currentChatId].length === 0) {
            messagesContainer.innerHTML = '<div class="empty-messages">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>';
            
            // Đảm bảo chat hiện tại có trong danh sách chat
            if (this.chats[this.currentChatId]) {
                // Cập nhật thông tin người dùng trong chat
                this.updateChatUserInfo();
            }
            
            return;
        }
        
        // Nhóm tin nhắn theo ngày
        let currentDate = null;
        let lastSenderId = null; // Theo dõi ID người gửi cuối cùng
        
        this.messages[this.currentChatId].forEach((message, index) => {
            // Xác định xem tin nhắn có phải là đầu tiên trong chuỗi không
            const isFirstInSequence = message.senderId !== lastSenderId;
            // Kiểm tra xem có cần thêm divider ngày không
            const messageDate = new Date(message.timestamp).toLocaleDateString('vi-VN');
            
            if (messageDate !== currentDate) {
                currentDate = messageDate;
                
                const dateDivider = document.createElement('div');
                dateDivider.className = 'date-divider';
                dateDivider.textContent = messageDate;
                
                messagesContainer.appendChild(dateDivider);
            }
            
            // Tạo phần tử tin nhắn
            const messageElement = document.createElement('div');
            const currentUser = authManager.getCurrentUser();
            
            // Xác định loại tin nhắn (đi/đến)
            if (message.senderId === 'system') {
                // Tin nhắn hệ thống - reset lastSenderId để tin nhắn tiếp theo luôn hiển thị avatar
                lastSenderId = null;
                
                // Tin nhắn hệ thống
                messageElement.className = 'message system';
                messageElement.innerHTML = `
                    <div class="message-bubble">${message.text}</div>
                `;
            } else {
                messageElement.className = message.senderId === currentUser.uid ? 'message outgoing' : 'message incoming';
                
                // Hiển thị tên người gửi nếu là tin nhắn đến trong nhóm và là tin nhắn đầu tiên trong chuỗi
                let senderName = '';
                if (message.senderId !== currentUser.uid && this.chats[this.currentChatId].type === 'group' && isFirstInSequence) {
                    senderName = `<div class="message-sender">${message.senderName || this.getUserName(message.senderId)}</div>`;
                }
                
                // Nội dung tin nhắn
                let messageContent = '';
                
                if (message.type === 'image') {
                    messageContent = `<img src="${message.imageUrl}" alt="Hình ảnh" class="message-image" onclick="ui.showImagePreview('${message.imageUrl}')">`;
                } else {
                    messageContent = message.text;
                }
                
                // Cập nhật lastSenderId sau khi xử lý tin nhắn
                lastSenderId = message.senderId;
                
                // Lấy thông tin người gửi để hiển thị avatar
                const sender = message.senderId !== 'system' ? this.users[message.senderId] : null;
                const senderAvatar = sender ? sender.photoURL || '/images/default-avatar.svg' : '/images/default-avatar.svg';
                
                // Thêm avatar vào tin nhắn đến, chỉ khi là tin nhắn đầu tiên trong chuỗi
                const avatarHtml = (message.senderId !== currentUser.uid && isFirstInSequence) ? 
                    `<div class="message-avatar" onclick="chat.showUserProfile('${message.senderId}')">
                        <img src="${senderAvatar}" alt="Avatar">
                    </div>` : 
                    (message.senderId !== currentUser.uid ? '<div class="message-avatar-placeholder"></div>' : '');
                
                // Kiểm tra xem đây có phải là tin nhắn cuối cùng của người dùng hiện tại không
                const isLastMessageFromCurrentUser = index === this.messages[this.currentChatId].length - 1 && 
                                                    message.senderId === currentUser.uid;
                
                messageElement.innerHTML = `
                    ${avatarHtml}
                    <div class="message-content">
                        ${senderName}
                        <div class="message-bubble">${messageContent}</div>
                        <div class="message-info">
                            <span class="message-time">${this.formatTime(message.timestamp, false)}</span>
                            ${message.senderId === currentUser.uid && isLastMessageFromCurrentUser ? '<span class="message-status"><i class="fas fa-check"></i></span>' : ''}
                        </div>
                    </div>
                `;
            }
            
            messagesContainer.appendChild(messageElement);
        });
        
        // Hiển thị trạng thái đang nhập
        this.renderTypingIndicator();
        
        // Cuộn xuống dưới nếu trước đó đã ở dưới cùng
        if (isScrolledToBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * Render chỉ báo đang nhập
     */
    renderTypingIndicator() {
        const messagesContainer = document.getElementById('messages-container');
        
        if (!this.currentChatId || !messagesContainer) return;
        
        // Xóa chỉ báo đang nhập cũ
        const oldIndicator = document.querySelector('.typing-indicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
        
        // Kiểm tra xem có ai đang nhập không
        const typingUsers = this.typingUsers[this.currentChatId] || {};
        const currentUser = authManager.getCurrentUser();
        
        // Lọc ra những người đang nhập (không bao gồm người dùng hiện tại)
        const typingUserIds = Object.keys(typingUsers).filter(uid => {
            return uid !== currentUser.uid && typingUsers[uid] === true;
        });
        
        if (typingUserIds.length > 0) {
            // Tạo chỉ báo đang nhập
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            
            let typingText = '';
            
            if (typingUserIds.length === 1) {
                const userName = this.getUserName(typingUserIds[0]);
                typingText = `${userName} đang nhập...`;
            } else if (typingUserIds.length === 2) {
                const userName1 = this.getUserName(typingUserIds[0]);
                const userName2 = this.getUserName(typingUserIds[1]);
                typingText = `${userName1} và ${userName2} đang nhập...`;
            } else {
                typingText = 'Nhiều người đang nhập...';
            }
            
            typingIndicator.innerHTML = `
                ${typingText}
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            messagesContainer.appendChild(typingIndicator);
            
            // Cuộn xuống để hiển thị chỉ báo
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * Render thông tin chat
     */
    renderChatInfo() {
        const infoContent = document.getElementById('info-content');
        
        if (!this.currentChatId || !infoContent) return;
        
        const chat = this.chats[this.currentChatId];
        
        // Kiểm tra xem chat có tồn tại không
        if (!chat) {
            console.error('Không tìm thấy thông tin chat:', this.currentChatId);
            return;
        }
        
        const currentUser = authManager.getCurrentUser();
        const isGroupCreator = chat.type === 'group' && chat.createdBy === currentUser.uid;
        
        // Xóa nội dung cũ
        infoContent.innerHTML = '';
        
        // Thông tin cơ bản
        const basicInfo = document.createElement('div');
        basicInfo.className = 'info-section';
        
        // Thêm nút đổi avatar nếu là nhóm và người dùng là người tạo nhóm
        const changeAvatarButton = isGroupCreator ? 
            `<div class="change-avatar-button" id="change-avatar-button">
                <i class="fas fa-camera"></i>
                <span>Đổi avatar</span>
            </div>` : '';
        
        // Thêm các nút quản lý nhóm cho chủ nhóm
        const groupAdminButtons = isGroupCreator && chat.type === 'group' ? `
            <div class="group-admin-buttons">
                <button class="group-admin-button" id="invite-member-button">
                    <i class="fas fa-user-plus"></i>
                    <span>Mời thành viên</span>
                </button>
                <button class="group-admin-button danger" id="delete-group-button">
                    <i class="fas fa-trash"></i>
                    <span>Xóa nhóm</span>
                </button>
            </div>
        ` : '';
        
        // Thêm nút thay đổi ảnh nền chat
        const changeBgButton = `
            <button class="group-admin-button" id="change-bg-button">
                <i class="fas fa-image"></i>
                <span>Thay đổi ảnh nền chat</span>
            </button>
        `;
        
        basicInfo.innerHTML = `
            <h4>Thông tin</h4>
            <div class="info-item">
                <div class="avatar-container">
                    <img src="${chat.photoURL || '/images/default-avatar.svg'}" alt="${chat.name}" style="width: 80px; height: 80px; border-radius: 50%; margin: 10px auto; display: block;">
                    ${changeAvatarButton}
                </div>
                <h3 style="text-align: center; margin-bottom: 15px;">${chat.name}</h3>
                ${groupAdminButtons}
                <div class="chat-settings">
                    ${changeBgButton}
                </div>
            </div>
        `;
        
        infoContent.appendChild(basicInfo);
        
        // Thêm sự kiện cho nút đổi avatar
        if (isGroupCreator) {
            const changeAvatarBtn = document.getElementById('change-avatar-button');
            if (changeAvatarBtn) {
                changeAvatarBtn.addEventListener('click', () => {
                    this.showChangeAvatarModal();
                });
            }
            
            // Thêm sự kiện cho nút mời thành viên
            const inviteMemberBtn = document.getElementById('invite-member-button');
            if (inviteMemberBtn) {
                inviteMemberBtn.addEventListener('click', () => {
                    this.showInviteMembersModal();
                });
            }
            
            // Thêm sự kiện cho nút xóa nhóm
            const deleteGroupBtn = document.getElementById('delete-group-button');
            if (deleteGroupBtn) {
                deleteGroupBtn.addEventListener('click', () => {
                    this.showDeleteGroupConfirmation();
                });
            }
        }
        
        // Thêm sự kiện cho nút thay đổi ảnh nền chat
        const changeBgBtn = document.getElementById('change-bg-button');
        if (changeBgBtn) {
            changeBgBtn.addEventListener('click', () => {
                this.showChangeChatBackgroundModal();
            });
        }
        
        // Danh sách thành viên (chỉ hiển thị nếu là nhóm)
        if (chat.type === 'group') {
            const membersSection = document.createElement('div');
            membersSection.className = 'info-section';
            membersSection.innerHTML = '<h4>Thành viên</h4>';
            
            // Lấy danh sách thành viên
            const memberIds = Object.keys(chat.members || {});
            
            // Sắp xếp thành viên: người tạo nhóm đầu tiên, sau đó là theo trạng thái online
            memberIds.sort((a, b) => {
                // Người tạo nhóm đầu tiên
                if (a === chat.createdBy) return -1;
                if (b === chat.createdBy) return 1;
                
                // Sắp xếp theo trạng thái online
                const userA = this.users[a] || {};
                const userB = this.users[b] || {};
                
                if (userA.status === 'online' && userB.status !== 'online') return -1;
                if (userA.status !== 'online' && userB.status === 'online') return 1;
                
                // Sắp xếp theo tên
                return (userA.displayName || '').localeCompare(userB.displayName || '');
            });
            
            // Render từng thành viên
            memberIds.forEach(userId => {
                const user = this.users[userId];
                if (!user) return;
                
                const memberItem = document.createElement('div');
                memberItem.className = 'member-item';
                
                const isCreator = userId === chat.createdBy;
                const roleLabel = isCreator ? ' (Người tạo)' : '';
                
                memberItem.innerHTML = `
                    <img src="${user.photoURL || '/images/default-avatar.svg'}" alt="${user.displayName}">
                    <div class="member-info">
                        <h4>${user.displayName}${roleLabel}</h4>
                        <p>${user.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'}</p>
                    </div>
                `;
                
                membersSection.appendChild(memberItem);
            });
            
            infoContent.appendChild(membersSection);
        }
    }

    /**
     * Gửi tin nhắn
     */
    sendMessage() {
        if (!this.currentChatId) return;
        
        const messageInput = document.getElementById('message-text');
        const messageText = messageInput.value.trim();
        
        if (messageText === '') return;
        
        const currentUser = authManager.getCurrentUser();
        
        // Tạo tin nhắn mới
        const newMessage = {
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'text'
        };
        
        // Lưu tin nhắn vào database
        dbRefs.messages.child(this.currentChatId).push(newMessage)
            .then(() => {
                // Xóa trạng thái đang nhập
                this.clearTypingStatus();
                
                // Xóa nội dung input
                messageInput.value = '';
                
                // Cập nhật thời gian hoạt động cuối cùng của chat
                dbRefs.chats.child(`${this.currentChatId}/lastActivity`).set(firebase.database.ServerValue.TIMESTAMP);
                
                // Gửi thông báo email
                if (this.chats[this.currentChatId]) {
                    emailNotification.sendNotification(newMessage, this.chats[this.currentChatId], currentUser);
                }
            })
            .catch(error => {
                console.error('Lỗi khi gửi tin nhắn:', error);
                ui.showToast('error', 'Lỗi', 'Không thể gửi tin nhắn');
            });
    }

    /**
     * Gửi trạng thái đang nhập
     */
    sendTypingStatus() {
        if (!this.currentChatId) return;
        
        const currentUser = authManager.getCurrentUser();
        
        // Cập nhật trạng thái đang nhập
        dbRefs.typing.child(`${this.currentChatId}/${currentUser.uid}`).set(true);
        
        // Xóa trạng thái sau một khoảng thời gian
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.clearTypingStatus();
        }, 3000);
    }

    /**
     * Xóa trạng thái đang nhập
     */
    clearTypingStatus() {
        if (!this.currentChatId) return;
        
        const currentUser = authManager.getCurrentUser();
        dbRefs.typing.child(`${this.currentChatId}/${currentUser.uid}`).remove();
    }

    /**
     * Upload hình ảnh lên Cloudinary
     * @param {File} file - File hình ảnh
     */
    uploadImage(file) {
        if (!this.currentChatId) return;
        
        ui.showLoading();
        
        // Tạo form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        
        // Upload lên Cloudinary
        fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                // Gửi tin nhắn với hình ảnh
                this.sendImageMessage(data.secure_url);
                ui.hideLoading();
            })
            .catch(error => {
                console.error('Lỗi khi upload hình ảnh:', error);
                ui.showToast('error', 'Lỗi', 'Không thể upload hình ảnh');
                ui.hideLoading();
            });
    }

    /**
     * Gửi tin nhắn hình ảnh
     * @param {string} imageUrl - URL của hình ảnh
     */
    sendImageMessage(imageUrl) {
        if (!this.currentChatId) return;
        
        const currentUser = authManager.getCurrentUser();
        
        // Tạo tin nhắn mới
        const newMessage = {
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            imageUrl: imageUrl,
            text: 'Đã gửi một hình ảnh',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'image'
        };
        
        // Lưu tin nhắn vào database
        dbRefs.messages.child(this.currentChatId).push(newMessage)
            .then(() => {
                // Cập nhật thời gian hoạt động cuối cùng của chat
                dbRefs.chats.child(`${this.currentChatId}/lastActivity`).set(firebase.database.ServerValue.TIMESTAMP);
                
                // Gửi thông báo email
                if (this.chats[this.currentChatId]) {
                    emailNotification.sendNotification(newMessage, this.chats[this.currentChatId], currentUser);
                }
            })
            .catch(error => {
                console.error('Lỗi khi gửi tin nhắn hình ảnh:', error);
                ui.showToast('error', 'Lỗi', 'Không thể gửi hình ảnh');
            });
    }

    /**
     * Bắt đầu chat riêng với một người dùng
     * @param {string} userId - ID của người dùng
     */
    startPrivateChat(userId) {
        const currentUser = authManager.getCurrentUser();
        
        if (userId === currentUser.uid) return;
        
        // Kiểm tra xem đã có chat riêng với người dùng này chưa
        this.findPrivateChatId(userId)
            .then(chatId => {
                if (chatId) {
                    // Đã có chat, chọn chat đó
                    this.selectChat(chatId);
                } else {
                    // Chưa có chat, tạo mới
                    this.createPrivateChat(userId);
                }
            });
    }

    /**
     * Tìm ID của chat riêng với một người dùng
     * @param {string} userId - ID của người dùng
     * @returns {Promise<string|null>} - ID của chat hoặc null nếu không tìm thấy
     */
    findPrivateChatId(userId) {
        return new Promise(resolve => {
            const currentUser = authManager.getCurrentUser();
            
            // Tìm trong danh sách chat
            const privateChatId = Object.keys(this.chats).find(chatId => {
                const chat = this.chats[chatId];
                
                return (
                    chat.type === 'private' &&
                    chat.members &&
                    chat.members[currentUser.uid] &&
                    chat.members[userId]
                );
            });
            
            resolve(privateChatId || null);
        });
    }

    /**
     * Tạo chat riêng với một người dùng
     * @param {string} userId - ID của người dùng
     */
    createPrivateChat(userId) {
        const currentUser = authManager.getCurrentUser();
        const otherUser = this.users[userId];
        
        if (!otherUser) return;
        
        // Tạo chat mới
        const newChatRef = dbRefs.chats.push();
        const chatId = newChatRef.key;
        
        const chatData = {
            type: 'private',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUser.uid,
            lastActivity: firebase.database.ServerValue.TIMESTAMP,
            // Thêm tên và ảnh đại diện cho chat riêng
            name: otherUser.displayName,
            photoURL: otherUser.photoURL || '/images/default-avatar.svg',
            members: {
                [currentUser.uid]: true,
                [userId]: true
            }
        };
        
        // Lưu chat vào database
        newChatRef.set(chatData)
            .then(() => {
                // Thêm chat vào danh sách chat của cả hai người dùng
                const updates = {};
                updates[`${currentUser.uid}/${chatId}`] = {
                    chatId: chatId,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };
                updates[`${userId}/${chatId}`] = {
                    chatId: chatId,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                return dbRefs.userChats.update(updates);
            })
            .then(() => {
                // Chọn chat mới tạo
                this.selectChat(chatId);
                
                // Gửi tin nhắn chào mừng
                const welcomeMessage = {
                    senderId: 'system',
                    senderName: 'Hệ thống',
                    text: 'Bắt đầu cuộc trò chuyện với ' + (otherUser.displayName || 'Người dùng'),
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    type: 'text'
                };
                
                return dbRefs.messages.child(chatId).push(welcomeMessage);
            })
            .catch(error => {
                console.error('Lỗi khi tạo chat riêng:', error);
                ui.showToast('error', 'Lỗi', 'Không thể tạo cuộc trò chuyện');
            });
    }

    /**
     * Hiển thị modal tạo nhóm
     */
    showCreateGroupModal() {
        const userSelectionElement = document.getElementById('user-selection');
        
        // Xóa danh sách cũ
        userSelectionElement.innerHTML = '';
        
        // Thiết lập sự kiện cho việc chọn icon nhóm
        const iconOptions = document.querySelectorAll('.group-icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Nếu là tùy chọn tải lên, mở hộp thoại chọn file
                if (option.classList.contains('custom-upload')) {
                    document.getElementById('group-icon-upload').click();
                    return;
                }
                
                // Xóa class selected từ tất cả các options
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                // Thêm class selected cho option được chọn
                option.classList.add('selected');
            });
        });
        
        // Xử lý sự kiện khi người dùng chọn file
        const fileInput = document.getElementById('group-icon-upload');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Tạo URL cho file đã chọn
                const imageUrl = URL.createObjectURL(file);
                
                // Cập nhật giao diện
                const customOption = document.querySelector('.group-icon-option.custom-upload');
                customOption.innerHTML = `
                    <img src="${imageUrl}" alt="Tùy chỉnh">
                    <span>Tùy chỉnh</span>
                    <input type="file" id="group-icon-upload" accept="image/*" style="display: none;">
                `;
                
                // Đặt data-icon là URL của file
                customOption.setAttribute('data-icon', 'custom-upload');
                
                // Chọn tùy chọn này
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                
                // Thiết lập lại sự kiện cho input file mới
                document.getElementById('group-icon-upload').addEventListener('change', (e) => {
                    fileInput.dispatchEvent(new Event('change'));
                });
            }
        });
        
        // Render danh sách người dùng để chọn
        const currentUser = authManager.getCurrentUser();
        
        Object.values(this.users)
            .filter(user => user.uid !== currentUser.uid)
            .sort((a, b) => {
                const nameA = a.displayName || 'Người dùng';
                const nameB = b.displayName || 'Người dùng';
                return nameA.localeCompare(nameB);
            })
            .forEach(user => {
                const userCheckbox = document.createElement('div');
                userCheckbox.className = 'user-checkbox';
                const userName = user.displayName || 'Người dùng';
                userCheckbox.innerHTML = `
                    <input type="checkbox" id="user-${user.uid}" value="${user.uid}">
                    <img src="${user.photoURL || '/images/default-avatar.svg'}" alt="${userName}">
                    <label for="user-${user.uid}">${userName}</label>
                `;
                
                userSelectionElement.appendChild(userCheckbox);
            });
        
        // Hiển thị modal
        document.getElementById('create-group-modal').classList.add('active');
    }

    /**
     * Hiển thị trang hồ sơ người dùng
     * @param {string} userId - ID của người dùng cần hiển thị hồ sơ
     */
    showUserProfile(userId) {
        // Kiểm tra xem người dùng có tồn tại không
        if (!this.users[userId]) {
            ui.showToast('error', 'Lỗi', 'Không tìm thấy thông tin người dùng');
            return;
        }
        
        const user = this.users[userId];
        const currentUser = authManager.getCurrentUser();
        const isCurrentUser = userId === currentUser.uid;
        
        // Tạo modal hiển thị thông tin người dùng
        const profileModal = document.createElement('div');
        profileModal.className = 'modal active';
        profileModal.id = 'user-profile-modal';
        
        // Tạo nội dung modal
        profileModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Hồ sơ người dùng</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="user-profile">
                        <div class="user-profile-avatar">
                            <img src="${user.photoURL || '/images/default-avatar.svg'}" alt="${user.displayName}">
                            ${isCurrentUser ? '<button class="change-avatar-button" id="change-profile-avatar"><i class="fas fa-camera"></i></button>' : ''}
                        </div>
                        <div class="user-profile-info">
                            <h2>${user.displayName}</h2>
                            <p><strong>Email:</strong> ${user.email || 'Không có thông tin'}</p>
                            <p><strong>Trạng thái:</strong> ${user.isOnline ? '<span class="online-status">Đang trực tuyến</span>' : '<span class="offline-status">Ngoại tuyến</span>'}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    ${isCurrentUser ? 
                        '<button id="edit-profile-button" class="primary-button"><i class="fas fa-edit"></i> Chỉnh sửa hồ sơ</button>' : 
                        '<button id="start-chat-button" class="primary-button"><i class="fas fa-comment"></i> Nhắn tin</button>'
                    }
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.appendChild(profileModal);
        
        // Xử lý sự kiện đóng modal
        const closeButton = profileModal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            profileModal.remove();
        });
        
        if (isCurrentUser) {
            // Xử lý sự kiện nhấn nút chỉnh sửa hồ sơ
            const editProfileButton = profileModal.querySelector('#edit-profile-button');
            if (editProfileButton) {
                editProfileButton.addEventListener('click', () => {
                    profileModal.remove();
                    this.showEditProfileModal();
                });
            }
            
            // Xử lý sự kiện nhấn nút thay đổi ảnh đại diện
            const changeAvatarButton = profileModal.querySelector('#change-profile-avatar');
            if (changeAvatarButton) {
                changeAvatarButton.addEventListener('click', () => {
                    profileModal.remove();
                    this.showChangeProfileAvatarModal();
                });
            }
        } else {
            // Xử lý sự kiện nhấn nút nhắn tin
            const startChatButton = profileModal.querySelector('#start-chat-button');
            if (startChatButton) {
                startChatButton.addEventListener('click', () => {
                    // Đóng modal
                    profileModal.remove();
                    
                    // Bắt đầu cuộc trò chuyện với người dùng
                    this.startPrivateChat(userId);
                });
            }
        }
    }
    
    /**
     * Tạo nhóm chat mới
     */
    createGroup() {
        const groupNameInput = document.getElementById('group-name');
        const groupName = groupNameInput.value.trim();
        
        if (groupName === '') {
            ui.showToast('error', 'Lỗi', 'Vui lòng nhập tên nhóm');
            return;
        }
        
        // Hiển thị loading
        ui.showLoading();
        
        // Lấy danh sách người dùng được chọn
        const selectedUsers = [];
        const checkboxes = document.querySelectorAll('#user-selection input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            selectedUsers.push(checkbox.value);
        });
        
        console.log('Tạo nhóm mới:', groupName, 'với', selectedUsers.length, 'thành viên');
        
        if (selectedUsers.length === 0) {
            ui.showToast('error', 'Lỗi', 'Vui lòng chọn ít nhất một thành viên');
            return;
        }
        
        // Tạo nhóm mới
        const currentUser = authManager.getCurrentUser();
        const newGroupRef = dbRefs.chats.push();
        const groupId = newGroupRef.key;
        
        // Tạo danh sách thành viên (bao gồm cả người tạo nhóm)
        const members = {};
        members[currentUser.uid] = true;
        
        selectedUsers.forEach(userId => {
            members[userId] = true;
        });
        
        // Lấy icon nhóm đã chọn
        const selectedIcon = document.querySelector('.group-icon-option.selected');
        let groupIcon = selectedIcon ? selectedIcon.getAttribute('data-icon') : '/images/co.png';
        
        // Xử lý trường hợp icon tùy chỉnh
        if (groupIcon === 'custom-upload') {
            // Lấy URL của ảnh đã tải lên
            const customImg = selectedIcon.querySelector('img');
            if (customImg && customImg.src) {
                // Lấy file từ input
                const fileInput = document.getElementById('group-icon-upload');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    // Tải ảnh lên Firebase Storage
                    const file = fileInput.files[0];
                    const storageRef = firebase.storage().ref();
                    const fileRef = storageRef.child(`group-icons/${groupId}/${file.name}`);
                    
                    // Tải file lên và lấy URL
                    return fileRef.put(file).then(snapshot => {
                        return snapshot.ref.getDownloadURL();
                    }).then(downloadURL => {
                        // Tiếp tục với URL đã tải lên
                        this.completeGroupCreation(groupId, groupName, downloadURL, members, currentUser);
                    }).catch(error => {
                        console.error('Lỗi khi tải lên ảnh nhóm:', error);
                        ui.showToast('error', 'Lỗi', 'Không thể tải lên ảnh nhóm');
                        // Sử dụng icon mặc định nếu có lỗi
                        this.completeGroupCreation(groupId, groupName, '/images/co.png', members, currentUser);
                    });
                }
                
                // Nếu không có file, sử dụng URL tạm thời
                groupIcon = customImg.src;
            }
        }
        
        // Nếu không phải là ảnh tùy chỉnh, tiếp tục bình thường
        this.completeGroupCreation(groupId, groupName, groupIcon, members, currentUser);
        return; // Dừng hàm ở đây vì đã xử lý trong completeGroupCreation
    }
    
    /**
     * Hoàn tất quá trình tạo nhóm sau khi đã xử lý ảnh
     * @param {string} groupId - ID của nhóm
     * @param {string} groupName - Tên nhóm
     * @param {string} groupIcon - URL của icon nhóm
     * @param {Object} members - Danh sách thành viên
     * @param {Object} currentUser - Người dùng hiện tại
     */
    completeGroupCreation(groupId, groupName, groupIcon, members, currentUser) {
        // Ẩn loading
        ui.hideLoading();
        
        const groupData = {
            name: groupName,
            type: 'group',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUser.uid,
            lastActivity: firebase.database.ServerValue.TIMESTAMP,
            photoURL: groupIcon,
            members: members
        };
        
        // Lưu nhóm vào database
        dbRefs.chats.child(groupId).set(groupData)
            .then(() => {
                // Thêm nhóm vào danh sách chat của tất cả thành viên
                const updates = {};
                
                Object.keys(members).forEach(userId => {
                    updates[`${userId}/${groupId}`] = {
                        chatId: groupId,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                });
                
                return dbRefs.userChats.update(updates);
            })
            .then(() => {
                // Gửi tin nhắn chào mừng
                const welcomeMessage = {
                    senderId: 'system',
                    senderName: 'Hệ thống',
                    text: `${currentUser.displayName} đã tạo nhóm ${groupName}`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    type: 'text'
                };
                
                return dbRefs.messages.child(groupId).push(welcomeMessage);
            })
            .then(() => {
                // Đóng modal
                document.getElementById('create-group-modal').classList.remove('active');
                
                // Xóa dữ liệu nhập
                document.getElementById('group-name').value = '';
                
                // Chọn nhóm mới tạo
                this.selectChat(groupId);
                
                // Hiển thị thông báo thành công
                ui.showToast('success', 'Thành công', 'Đã tạo nhóm ' + groupName);
                // Ẩn loading
                ui.hideLoading();
            })
            .catch(error => {
                console.error('Lỗi khi tạo nhóm:', error);
                ui.showToast('error', 'Lỗi', 'Không thể tạo nhóm');
                // Ẩn loading
                ui.hideLoading();
            });
    }

    /**
     * Hiển thị modal đổi avatar nhóm
     */
    showChangeAvatarModal() {
        if (!this.currentChatId) return;
        
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'change-avatar-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Đổi avatar nhóm</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="group-icon-selection">
                        <div class="group-icon-option" data-icon="/images/co.png">
                            <img src="co.png" alt="Cộng đồng Việt">
                            <span>Cộng đồng Việt</span>
                        </div>
                        <div class="group-icon-option" data-icon="/images/default-avatar.svg">
                            <img src="images/default-avatar.svg" alt="Mặc định">
                            <span>Mặc định</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="update-avatar-button" class="primary-button">Cập nhật</button>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.appendChild(modal);
        
        // Thiết lập sự kiện cho việc chọn icon
        const iconOptions = modal.querySelectorAll('.group-icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Xóa class selected từ tất cả các options
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                // Thêm class selected cho option được chọn
                option.classList.add('selected');
            });
        });
        
        // Chọn icon hiện tại của nhóm
        const currentIcon = this.chats[this.currentChatId].photoURL;
        const currentIconOption = modal.querySelector(`.group-icon-option[data-icon="${currentIcon}"]`);
        if (currentIconOption) {
            currentIconOption.classList.add('selected');
        } else {
            // Nếu không tìm thấy, chọn icon đầu tiên
            iconOptions[0].classList.add('selected');
        }
        
        // Xử lý sự kiện đóng modal
        const closeButton = modal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
        
        // Xử lý sự kiện cập nhật avatar
        const updateButton = modal.querySelector('#update-avatar-button');
        updateButton.addEventListener('click', () => {
            const selectedIcon = modal.querySelector('.group-icon-option.selected');
            if (selectedIcon) {
                const iconPath = selectedIcon.getAttribute('data-icon');
                this.updateGroupAvatar(iconPath);
            }
            modal.remove();
        });
    }
    
    /**
     * Cập nhật avatar nhóm
     * @param {string} iconPath - Đường dẫn đến icon mới
     */
    updateGroupAvatar(iconPath) {
        if (!this.currentChatId) return;
        
        ui.showLoading();
        
        // Cập nhật avatar trong database
        dbRefs.chats.child(`${this.currentChatId}/photoURL`).set(iconPath)
            .then(() => {
                // Cập nhật trong bộ nhớ cục bộ
                this.chats[this.currentChatId].photoURL = iconPath;
                
                // Cập nhật giao diện
                this.updateCurrentChatInfo();
                this.renderChatList();
                this.renderChatInfo();
                
                ui.showToast('success', 'Thành công', 'Đã cập nhật avatar nhóm');
                ui.hideLoading();
            })
            .catch(error => {
                console.error('Lỗi khi cập nhật avatar nhóm:', error);
                ui.showToast('error', 'Lỗi', 'Không thể cập nhật avatar nhóm');
                ui.hideLoading();
            });
    }
    
    /**
     * Chuyển đổi tab
     * @param {string} tabName - Tên tab
     */
    switchTab(tabName) {
        // Cập nhật active class cho tab button
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
        
        // Cập nhật active class cho tab pane
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    /**
     * Tìm kiếm chat và người dùng
     * @param {string} searchTerm - Từ khóa tìm kiếm
     */
    searchChatsAndUsers(searchTerm) {
        // Tìm kiếm trong danh sách chat
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
            
            if (chatName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Tìm kiếm trong danh sách người dùng
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach(item => {
            const userName = item.querySelector('.user-name').textContent.toLowerCase();
            
            if (userName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Lấy tin nhắn cuối cùng của một chat
     * @param {string} chatId - ID của chat
     * @returns {Object|null} - Tin nhắn cuối cùng hoặc null nếu không có
     */
    getLastMessage(chatId) {
        if (!this.messages[chatId] || this.messages[chatId].length === 0) {
            return null;
        }
        
        return this.messages[chatId][this.messages[chatId].length - 1];
    }

    /**
     * Lấy tên của một người dùng
     * @param {string} userId - ID của người dùng
     * @returns {string} - Tên của người dùng
     */
    getUserName(userId) {
        if (userId === 'system') return 'Hệ thống';
        
        if (this.users[userId] && this.users[userId].displayName) {
            return this.users[userId].displayName;
        }
        
        return 'Người dùng';
    }

    /**
     * Format thời gian
     * @param {number} timestamp - Timestamp
     * @param {boolean} showDetailed - Có hiển thị chi tiết không
     * @returns {string} - Chuỗi thời gian đã format
     */
    formatTime(timestamp, showDetailed = false) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        
        // Tính khoảng cách thời gian
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Nếu không yêu cầu hiển thị chi tiết, giảm thiểu hiển thị thời gian
        if (!showDetailed) {
            // Ẩn thời gian tin nhắn
            return '';
        }
        
        // Nếu là hôm nay, chỉ hiển thị giờ
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Nếu là tuần này, hiển thị thứ
        if (diffDays < 7) {
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return days[date.getDay()];
        }
        
        // Nếu là năm nay, hiển thị ngày và tháng
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        }
        
        // Nếu là năm khác, hiển thị ngày, tháng và năm
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Hiển thị modal mời thành viên vào nhóm
     */
    showInviteMembersModal() {
        const chat = this.chats[this.currentChatId];
        if (!chat || chat.type !== 'group') return;
        
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'invite-members-modal';
        
        // Lấy danh sách thành viên hiện tại của nhóm
        const currentMemberIds = Object.keys(chat.members || {});
        
        // Lấy danh sách tất cả người dùng
        const allUserIds = Object.keys(this.users);
        
        // Lọc ra những người dùng chưa là thành viên của nhóm
        const nonMemberIds = allUserIds.filter(userId => !currentMemberIds.includes(userId));
        
        // Nếu không có người dùng nào để mời
        if (nonMemberIds.length === 0) {
            ui.showToast('Không có người dùng nào để mời vào nhóm', 'info');
            return;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Mời thành viên vào nhóm</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Chọn người dùng để mời:</label>
                        <div class="user-list" id="invite-user-list"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="invite-members-btn">Mời thành viên</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Hiển thị modal
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
        
        // Render danh sách người dùng
        const userListContainer = document.getElementById('invite-user-list');
        
        nonMemberIds.forEach(userId => {
            const user = this.users[userId];
            if (!user) return;
            
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            userItem.innerHTML = `
                <label class="user-checkbox">
                    <input type="checkbox" value="${userId}">
                    <div class="user-info">
                        <img src="${user.photoURL || '/images/default-avatar.svg'}" alt="${user.displayName}">
                        <div>
                            <h4>${user.displayName}</h4>
                            <p>${user.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'}</p>
                        </div>
                    </div>
                </label>
            `;
            
            userListContainer.appendChild(userItem);
        });
        
        // Xử lý sự kiện đóng modal
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        });
        
        // Xử lý sự kiện mời thành viên
        const inviteBtn = document.getElementById('invite-members-btn');
        inviteBtn.addEventListener('click', () => {
            const selectedUserIds = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
            
            if (selectedUserIds.length === 0) {
                ui.showToast('Vui lòng chọn ít nhất một người dùng', 'error');
                return;
            }
            
            this.inviteMembers(selectedUserIds);
            
            // Đóng modal
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        });
    }
    
    /**
     * Mời thành viên vào nhóm
     * @param {Array} userIds - Danh sách ID người dùng cần mời
     */
    inviteMembers(userIds) {
        const chat = this.chats[this.currentChatId];
        if (!chat || chat.type !== 'group') return;
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;
        
        // Hiển thị loading
        ui.showLoading();
        
        // Cập nhật danh sách thành viên
        const updates = {};
        
        userIds.forEach(userId => {
            updates[`chats/${this.currentChatId}/members/${userId}`] = true;
            updates[`userChats/${userId}/${this.currentChatId}`] = {
                id: this.currentChatId,
                name: chat.name,
                photoURL: chat.photoURL,
                type: 'group',
                lastMessage: {
                    text: `${currentUser.displayName} đã thêm bạn vào nhóm`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                },
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
        });
        
        // Cập nhật thời gian hoạt động của nhóm
        updates[`chats/${this.currentChatId}/timestamp`] = firebase.database.ServerValue.TIMESTAMP;
        
        // Thêm tin nhắn thông báo
        const newMessageRef = database.ref('messages').push();
        const messageId = newMessageRef.key;
        
        const invitedUsers = userIds.map(userId => this.users[userId]?.displayName).filter(Boolean).join(', ');
        
        updates[`messages/${messageId}`] = {
            id: messageId,
            chatId: this.currentChatId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            senderAvatar: currentUser.photoURL,
            text: `${currentUser.displayName} đã thêm ${invitedUsers} vào nhóm`,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'notification'
        };
        
        updates[`chats/${this.currentChatId}/lastMessage`] = {
            text: `${currentUser.displayName} đã thêm ${invitedUsers} vào nhóm`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Thực hiện cập nhật
        database.ref().update(updates)
            .then(() => {
                ui.hideLoading();
                ui.showToast('Đã mời thành viên vào nhóm thành công', 'success');
                
                // Cập nhật lại thông tin chat
                this.renderChatInfo();
            })
            .catch(error => {
                ui.hideLoading();
                ui.showToast('Lỗi khi mời thành viên: ' + error.message, 'error');
                console.error('Lỗi khi mời thành viên:', error);
            });
    }
    
    /**
     * Hiển thị xác nhận xóa nhóm
     */
    showDeleteGroupConfirmation() {
        const chat = this.chats[this.currentChatId];
        if (!chat || chat.type !== 'group') return;
        
        // Tạo modal xác nhận
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'delete-group-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Xác nhận xóa nhóm</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc chắn muốn xóa nhóm <strong>${chat.name}</strong>?</p>
                    <p class="text-danger">Lưu ý: Hành động này không thể hoàn tác và tất cả tin nhắn sẽ bị xóa vĩnh viễn.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-delete-btn">Hủy</button>
                    <button class="btn btn-danger" id="confirm-delete-btn">Xóa nhóm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Hiển thị modal
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
        
        // Xử lý sự kiện đóng modal
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        
        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Xử lý sự kiện xác nhận xóa
        const confirmBtn = document.getElementById('confirm-delete-btn');
        confirmBtn.addEventListener('click', () => {
            this.deleteGroup();
            closeModal();
        });
    }
    
    /**
     * Xóa nhóm chat
     */
    deleteGroup() {
        const chat = this.chats[this.currentChatId];
        if (!chat || chat.type !== 'group') return;
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser || chat.createdBy !== currentUser.uid) return;
        
        // Hiển thị loading
        ui.showLoading();
        
        // Lấy danh sách thành viên
        const memberIds = Object.keys(chat.members || {});
        
        // Xóa nhóm khỏi danh sách chat của từng thành viên
        const updates = {};
        memberIds.forEach(memberId => {
            updates[`userChats/${memberId}/${this.currentChatId}`] = null;
        });
        
        // Xóa tin nhắn của nhóm
        database.ref(`messages`).orderByChild('chatId').equalTo(this.currentChatId).once('value', snapshot => {
            const messages = snapshot.val() || {};
            Object.keys(messages).forEach(messageId => {
                updates[`messages/${messageId}`] = null;
            });
            
            // Xóa nhóm
            updates[`chats/${this.currentChatId}`] = null;
            
            // Thực hiện cập nhật
            database.ref().update(updates)
                .then(() => {
                    ui.hideLoading();
                    ui.showToast('Đã xóa nhóm thành công', 'success');
                    
                    // Xóa nhóm khỏi danh sách chat hiện tại
                    delete this.chats[this.currentChatId];
                    
                    // Chuyển về màn hình trống
                    this.currentChatId = null;
                    this.renderChatList();
                    this.showEmptyChatPlaceholder();
                })
                .catch(error => {
                    ui.hideLoading();
                    ui.showToast('Lỗi khi xóa nhóm: ' + error.message, 'error');
                    console.error('Lỗi khi xóa nhóm:', error);
                });
        });
    }
    
    /**
     * Hiển thị placeholder khi không có chat nào được chọn
     */
    showEmptyChatPlaceholder() {
        // Ẩn container chat
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('empty-chat').style.display = 'flex';
        
        // Xử lý giao diện trên thiết bị di động
        if (window.innerWidth <= 480) {
            // Xóa class chat-selected khỏi app-container
            document.querySelector('.app-container').classList.remove('chat-selected');
            
            // Ẩn nút quay lại
            const backButton = document.getElementById('back-button');
            if (backButton) {
                backButton.classList.add('hidden');
            }
        }
    }
    
    /**
     * Hiển thị modal chỉnh sửa hồ sơ người dùng
     */
    showEditProfileModal() {
        const currentUser = authManager.getCurrentUser();
        const user = this.users[currentUser.uid];
        
        if (!user) {
            ui.showToast('error', 'Lỗi', 'Không thể tải thông tin người dùng');
            return;
        }
        
        // Tạo modal chỉnh sửa hồ sơ
        const editProfileModal = document.createElement('div');
        editProfileModal.className = 'modal active';
        editProfileModal.id = 'edit-profile-modal';
        
        // Tạo nội dung modal
        editProfileModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Chỉnh sửa hồ sơ</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-display-name">Tên hiển thị:</label>
                        <input type="text" id="edit-display-name" value="${user.displayName || ''}" placeholder="Nhập tên hiển thị...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-profile-button" class="primary-button">Lưu thay đổi</button>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.appendChild(editProfileModal);
        
        // Xử lý sự kiện đóng modal
        const closeButton = editProfileModal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            editProfileModal.remove();
        });
        
        // Xử lý sự kiện lưu thay đổi
        const saveButton = editProfileModal.querySelector('#save-profile-button');
        saveButton.addEventListener('click', () => {
            const displayName = document.getElementById('edit-display-name').value.trim();
            
            if (displayName === '') {
                ui.showToast('error', 'Lỗi', 'Vui lòng nhập tên hiển thị');
                return;
            }
            
            // Hiển thị loading
            ui.showLoading('Đang cập nhật thông tin...');
            
            // Cập nhật thông tin người dùng
            const userRef = dbRefs.users.child(currentUser.uid);
            userRef.update({
                displayName: displayName
            })
            .then(() => {
                // Cập nhật thông tin người dùng trong Firebase Auth
                return currentUser.updateProfile({
                    displayName: displayName
                });
            })
            .then(() => {
                // Cập nhật thông tin người dùng trong ứng dụng
                this.users[currentUser.uid].displayName = displayName;
                
                // Cập nhật giao diện
                document.getElementById('user-name').textContent = displayName;
                
                // Đóng modal
                editProfileModal.remove();
                
                // Hiển thị thông báo thành công
                ui.hideLoading();
                ui.showToast('success', 'Thành công', 'Đã cập nhật thông tin hồ sơ');
            })
            .catch(error => {
                console.error('Lỗi khi cập nhật hồ sơ:', error);
                ui.hideLoading();
                ui.showToast('error', 'Lỗi', 'Không thể cập nhật thông tin hồ sơ');
            });
        });
    }
    
    /**
     * Hiển thị modal thay đổi ảnh nền khung chat
     */
    showChangeChatBackgroundModal() {
        // Tạo modal thay đổi ảnh nền
        const changeBgModal = document.createElement('div');
        changeBgModal.className = 'modal active';
        changeBgModal.id = 'change-chat-background-modal';
        
        // Tạo nội dung modal
        changeBgModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Thay đổi ảnh nền khung chat</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Chọn màu nền:</label>
                        <div class="color-picker-container">
                            <input type="color" id="chat-bg-color" value="#f5f5f5">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Hoặc chọn ảnh nền:</label>
                        <div class="bg-upload-container">
                            <div class="bg-preview">
                                <img id="bg-preview" src="" alt="Ảnh nền" style="display: none;">
                            </div>
                            <div class="bg-upload-button">
                                <button id="select-bg-button" class="secondary-button">
                                    <i class="fas fa-upload"></i> Chọn ảnh
                                </button>
                                <input type="file" id="bg-upload" accept="image/*" style="display: none;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-bg-button" class="primary-button">Lưu thay đổi</button>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.appendChild(changeBgModal);
        
        // Xử lý sự kiện đóng modal
        const closeButton = changeBgModal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            changeBgModal.remove();
        });
        
        // Lấy các phần tử trong modal
        const colorPicker = changeBgModal.querySelector('#chat-bg-color');
        const selectButton = changeBgModal.querySelector('#select-bg-button');
        const fileInput = changeBgModal.querySelector('#bg-upload');
        const saveButton = changeBgModal.querySelector('#save-bg-button');
        const bgPreview = changeBgModal.querySelector('#bg-preview');
        
        // Lấy giá trị hiện tại của ảnh nền
        const chatArea = document.querySelector('.chat-area');
        const currentBgColor = window.getComputedStyle(chatArea).backgroundColor;
        const currentBgImage = window.getComputedStyle(chatArea).backgroundImage;
        
        // Chuyển đổi RGB sang HEX
        const rgbToHex = (rgb) => {
            // Mặc định nếu không phải RGB
            if (!rgb.startsWith('rgb')) return '#f5f5f5';
            
            const [r, g, b] = rgb.match(/\d+/g);
            return "#" + ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1);
        };
        
        // Đặt giá trị mặc định cho color picker
        colorPicker.value = rgbToHex(currentBgColor);
        
        // Nếu có ảnh nền, hiển thị nó
         if (currentBgImage !== 'none') {
             const imageUrl = currentBgImage.replace(/url\(["']?([^"']*)["']?\)/, '$1');
             bgPreview.src = imageUrl;
             bgPreview.style.display = 'block';
         }
        
        // Xử lý sự kiện chọn ảnh
        selectButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        let selectedFile = null;
        
        fileInput.addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                // Hiển thị ảnh đã chọn
                const imageUrl = URL.createObjectURL(selectedFile);
                bgPreview.src = imageUrl;
                bgPreview.style.display = 'block';
            }
        });
        
        // Xử lý sự kiện lưu thay đổi
        saveButton.addEventListener('click', () => {
            // Hiển thị loading
            ui.showLoading('Đang cập nhật ảnh nền...');
            
            if (selectedFile) {
                // Nếu người dùng đã chọn ảnh, tải lên và sử dụng làm ảnh nền
                this.uploadImage(selectedFile)
                    .then(imageUrl => {
                        // Lưu URL ảnh nền vào localStorage
                        localStorage.setItem('chatBackgroundImage', imageUrl);
                        localStorage.removeItem('chatBackgroundColor');
                        
                        // Áp dụng ảnh nền
                        chatArea.style.backgroundImage = `url(${imageUrl})`;
                        chatArea.style.backgroundColor = 'transparent';
                        
                        // Đóng modal
                        changeBgModal.remove();
                        
                        // Hiển thị thông báo thành công
                        ui.hideLoading();
                        ui.showToast('success', 'Thành công', 'Đã cập nhật ảnh nền khung chat');
                    })
                    .catch(error => {
                        console.error('Lỗi khi cập nhật ảnh nền:', error);
                        ui.hideLoading();
                        ui.showToast('error', 'Lỗi', 'Không thể cập nhật ảnh nền khung chat');
                    });
            } else {
                // Nếu người dùng chỉ chọn màu
                const selectedColor = colorPicker.value;
                
                // Lưu màu nền vào localStorage
                localStorage.setItem('chatBackgroundColor', selectedColor);
                localStorage.removeItem('chatBackgroundImage');
                
                // Áp dụng màu nền
                chatArea.style.backgroundImage = 'none';
                chatArea.style.backgroundColor = selectedColor;
                
                // Đóng modal
                changeBgModal.remove();
                
                // Hiển thị thông báo thành công
                ui.hideLoading();
                ui.showToast('success', 'Thành công', 'Đã cập nhật màu nền khung chat');
            }
        });
    }
    
    /**
     * Hiển thị modal thay đổi ảnh đại diện người dùng
     */
    showChangeProfileAvatarModal() {
        // Tạo modal thay đổi ảnh đại diện
        const changeAvatarModal = document.createElement('div');
        changeAvatarModal.className = 'modal active';
        changeAvatarModal.id = 'change-profile-avatar-modal';
        
        // Tạo nội dung modal
        changeAvatarModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Thay đổi ảnh đại diện</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Chọn ảnh đại diện mới:</label>
                        <div class="avatar-upload-container">
                            <div class="avatar-preview">
                                <img id="avatar-preview" src="/images/default-avatar.svg" alt="Ảnh đại diện">
                            </div>
                            <div class="avatar-upload-button">
                                <button id="select-avatar-button" class="secondary-button">
                                    <i class="fas fa-upload"></i> Chọn ảnh
                                </button>
                                <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-avatar-button" class="primary-button" disabled>Lưu thay đổi</button>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.appendChild(changeAvatarModal);
        
        // Xử lý sự kiện đóng modal
        const closeButton = changeAvatarModal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            changeAvatarModal.remove();
        });
        
        // Xử lý sự kiện chọn ảnh
        const selectButton = changeAvatarModal.querySelector('#select-avatar-button');
        const fileInput = changeAvatarModal.querySelector('#avatar-upload');
        const saveButton = changeAvatarModal.querySelector('#save-avatar-button');
        const avatarPreview = changeAvatarModal.querySelector('#avatar-preview');
        
        selectButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        let selectedFile = null;
        
        fileInput.addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                // Hiển thị ảnh đã chọn
                const imageUrl = URL.createObjectURL(selectedFile);
                avatarPreview.src = imageUrl;
                
                // Kích hoạt nút lưu
                saveButton.disabled = false;
            }
        });
        
        // Xử lý sự kiện lưu ảnh đại diện
        saveButton.addEventListener('click', () => {
            if (!selectedFile) {
                ui.showToast('error', 'Lỗi', 'Vui lòng chọn ảnh đại diện');
                return;
            }
            
            // Hiển thị loading
            ui.showLoading('Đang tải ảnh lên...');
            
            // Tải ảnh lên Cloudinary
            this.uploadImage(selectedFile)
                .then(imageUrl => {
                    const currentUser = authManager.getCurrentUser();
                    
                    // Cập nhật ảnh đại diện trong Firebase Auth
                    return currentUser.updateProfile({
                        photoURL: imageUrl
                    })
                    .then(() => {
                        // Cập nhật ảnh đại diện trong database
                        return dbRefs.users.child(currentUser.uid).update({
                            photoURL: imageUrl
                        });
                    })
                    .then(() => {
                        // Cập nhật thông tin người dùng trong ứng dụng
                        this.users[currentUser.uid].photoURL = imageUrl;
                        
                        // Cập nhật giao diện
                        document.getElementById('user-avatar').src = imageUrl;
                        
                        // Đóng modal
                        changeAvatarModal.remove();
                        
                        // Hiển thị thông báo thành công
                        ui.hideLoading();
                        ui.showToast('success', 'Thành công', 'Đã cập nhật ảnh đại diện');
                    });
                })
                .catch(error => {
                    console.error('Lỗi khi cập nhật ảnh đại diện:', error);
                    ui.hideLoading();
                    ui.showToast('error', 'Lỗi', 'Không thể cập nhật ảnh đại diện');
                });
        });
    }
    
    /**
     * Dọn dẹp các listener khi đăng xuất
     */
    cleanup() {
        // Xóa tất cả listener
        Object.values(this.messageListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        Object.values(this.chatListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        Object.values(this.userListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        Object.values(this.typingListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        // Reset các biến
        this.messageListeners = {};
        this.chatListeners = {};
        this.userListeners = {};
        this.typingListeners = {};
        this.currentChatId = null;
        this.chats = {};
        this.users = {};
        this.messages = {};
        this.typingUsers = {};
    }
}

// Khởi tạo đối tượng Chat
const chat = new Chat();
