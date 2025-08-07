/**
 * Xử lý xác thực người dùng
 */
class Auth {
    constructor() {
        this.currentUser = null;
        this.googleProvider = new firebase.auth.GoogleAuthProvider();
        this.setupAuthStateListener();
    }

    /**
     * Thiết lập listener theo dõi trạng thái đăng nhập
     */
    setupAuthStateListener() {
        auth.onAuthStateChanged(user => {
            if (user) {
                // Người dùng đã đăng nhập
                this.currentUser = user;
                this.saveUserToDatabase(user);
                this.showMainScreen();
                chat.initialize();
                ui.hideLoading(); // Ẩn biểu tượng tải sau khi đăng nhập thành công
                ui.showToast('success', 'Đăng nhập thành công', `Chào mừng ${user.displayName}!`);
            } else {
                // Người dùng đã đăng xuất
                this.currentUser = null;
                this.showLoginScreen();
                chat.cleanup();
            }
        });
    }

    /**
     * Đăng nhập với Google
     */
    loginWithGoogle() {
        ui.showLoading();
        auth.signInWithPopup(this.googleProvider)
            .catch(error => {
                console.error('Lỗi đăng nhập:', error);
                ui.showToast('error', 'Lỗi đăng nhập', error.message);
                ui.hideLoading();
            });
    }

    /**
     * Đăng xuất
     */
    logout() {
        ui.showLoading();
        auth.signOut()
            .then(() => {
                ui.showToast('info', 'Đăng xuất', 'Bạn đã đăng xuất thành công');
                ui.hideLoading();
            })
            .catch(error => {
                console.error('Lỗi đăng xuất:', error);
                ui.showToast('error', 'Lỗi đăng xuất', error.message);
                ui.hideLoading();
            });
    }

    /**
     * Lưu thông tin người dùng vào database
     * @param {Object} user - Thông tin người dùng từ Firebase Auth
     */
    saveUserToDatabase(user) {
        const userRef = dbRefs.users.child(user.uid);
        
        // Kiểm tra xem người dùng đã tồn tại chưa
        userRef.once('value')
            .then(snapshot => {
                const userData = {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL || '/images/default-avatar.svg',
                    status: 'online',
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                };
                
                if (snapshot && snapshot.exists && !snapshot.exists()) {
                    // Người dùng mới, thêm vào nhóm mặc định
                    this.addUserToDefaultGroup(user.uid);
                }
                
                // Cập nhật thông tin người dùng
                userRef.update(userData);
                
                // Cập nhật trạng thái online
                this.updateOnlineStatus(user.uid, true);
            });
    }
    
    /**
     * Thêm người dùng vào nhóm mặc định
     * @param {string} userId - ID của người dùng
     */
    addUserToDefaultGroup(userId) {
        // Kiểm tra xem nhóm mặc định đã tồn tại chưa
        dbRefs.chats.orderByChild('name').equalTo(DEFAULT_COMMUNITY_GROUP).once('value')
            .then(snapshot => {
                let groupId;
                
                if (snapshot && snapshot.exists && snapshot.exists()) {
                    // Nhóm đã tồn tại, lấy ID
                    snapshot.forEach(childSnapshot => {
                        if (childSnapshot) {
                            groupId = childSnapshot.key;
                        }
                    });
                } else {
                    // Tạo nhóm mới
                    const newGroupRef = dbRefs.chats.push();
                    groupId = newGroupRef.key;
                    
                    newGroupRef.set({
                        name: DEFAULT_COMMUNITY_GROUP,
                        type: 'group',
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        createdBy: userId,
                        photoURL: '/images/co.png'
                    });
                }
                
                // Thêm người dùng vào nhóm
                dbRefs.chats.child(`${groupId}/members/${userId}`).set(true);
                
                // Thêm nhóm vào danh sách chat của người dùng
                dbRefs.userChats.child(`${userId}/${groupId}`).set({
                    chatId: groupId,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Thêm tin nhắn thông báo người dùng đã tham gia nhóm
                const welcomeMessage = {
                    senderId: 'system',
                    senderName: 'Hệ thống',
                    text: `${this.currentUser.displayName} đã tham gia nhóm.`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    type: 'text'
                };
                
                dbRefs.messages.child(groupId).push(welcomeMessage);
            });
    }
    
    /**
     * Cập nhật trạng thái online của người dùng
     * @param {string} userId - ID của người dùng
     * @param {boolean} isOnline - Trạng thái online
     */
    updateOnlineStatus(userId, isOnline) {
        const userStatusRef = dbRefs.users.child(`${userId}/status`);
        const userLastSeenRef = dbRefs.users.child(`${userId}/lastSeen`);
        
        if (isOnline) {
            userStatusRef.set('online');
            
            // Thiết lập trạng thái offline khi người dùng ngắt kết nối
            dbRefs.users.child(`${userId}/connections`).push(true)
                .onDisconnect().remove();
            userStatusRef.onDisconnect().set('offline');
            userLastSeenRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
        } else {
            userStatusRef.set('offline');
            userLastSeenRef.set(firebase.database.ServerValue.TIMESTAMP);
        }
    }
    
    /**
     * Hiển thị màn hình đăng nhập
     */
    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-screen').classList.remove('active');
    }
    
    /**
     * Hiển thị màn hình chính
     */
    showMainScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        // Cập nhật thông tin người dùng trên giao diện
        document.getElementById('user-name').textContent = this.currentUser.displayName;
        document.getElementById('user-avatar').src = this.currentUser.photoURL || '/images/default-avatar.svg';
        
        // Áp dụng ảnh nền cho khung chat từ localStorage
        chat.applyChatBackground();
    }
    
    /**
     * Lấy thông tin người dùng hiện tại
     * @returns {Object} Thông tin người dùng hiện tại
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

// Khởi tạo đối tượng Auth
const authManager = new Auth();