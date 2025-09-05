// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const authButtons = document.querySelector('.auth-buttons');

// Event Listeners
if (loginBtn) loginBtn.addEventListener('click', () => openModal(loginModal));
if (signupBtn) signupBtn.addEventListener('click', () => openModal(signupModal));
if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);

// Close modals when clicking on the X or outside the modal
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang đăng nhập...';
        submitBtn.disabled = true;
        
        // Sign in with Firebase
        await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Close modal and reset form
        loginModal.style.display = 'none';
        loginForm.reset();
        
        // Show success message
        showNotification('Đăng nhập thành công!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification(`Lỗi đăng nhập: ${error.message}`, 'error');
    } finally {
        // Reset button state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Đăng Nhập';
        submitBtn.disabled = false;
    }
  });
}

// Google Sign In function
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // Close modal
            loginModal.style.display = 'none';
            
            // Check if this is a new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            
            if (isNewUser) {
                // Create user profile in database for new users
                const user = result.user;
                const userRef = firebase.database().ref('users/' + user.uid);
                
                userRef.set({
                    uid: user.uid,
                    displayName: user.displayName || 'Người dùng Google',
                    email: user.email,
                    photoURL: user.photoURL || 'https://via.placeholder.com/150',
                    miniCoins: 100,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                showNotification('Tài khoản đã được tạo thành công!', 'success');
            } else {
                showNotification('Đăng nhập thành công!', 'success');
            }
        })
        .catch((error) => {
            console.error('Google sign in error:', error);
            showNotification(`Lỗi đăng nhập Google: ${error.message}`, 'error');
        });
}

// Signup Form Submission
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validate password match
    if (password !== confirmPassword) {
        showNotification('Mật khẩu không khớp!', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang đăng ký...';
        submitBtn.disabled = true;
        
        // Create user with Firebase
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({
            displayName: name
        });
        
        // Save additional user data to database
        await database.ref(`users/${user.uid}`).set({
            displayName: name,
            email: email,
            miniCoins: 100,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Close modal and reset form
        signupModal.style.display = 'none';
        signupForm.reset();
        
        // Show success message
        showNotification('Đăng ký thành công!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(`Lỗi đăng ký: ${error.message}`, 'error');
    } finally {
        // Reset button state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Đăng Ký';
        submitBtn.disabled = false;
    }
  });
}

// Auth state change listener
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        const userData = await getCurrentUserData();
        // Make sure miniCoins is available in userData
        if (userData && !userData.miniCoins) {
            userData.miniCoins = 0;
        }
        updateUIForLoggedInUser(userData);
    } else {
        // User is signed out
        const guestData = await getCurrentUserData(); // Sẽ trả về dữ liệu khách
        updateUIForLoggedOutUser(guestData);
    }
});

// Update UI for logged in user
function updateUIForLoggedInUser(userData) {
    // Clear auth buttons if element exists
    if (authButtons) {
        authButtons.innerHTML = '';
    }
    
    // Show admin link in navigation if user is admin
    const adminNavLink = document.getElementById('adminNavLink');
    if (adminNavLink) {
        if (userData.email === 'micovan108@gmail.com') {
            adminNavLink.style.display = 'block';
        } else {
            adminNavLink.style.display = 'none';
        }
    }
    
    // Create user profile element
    const userProfile = document.createElement('div');
    userProfile.className = 'user-profile';
    userProfile.innerHTML = `
        <img src="${userData.photoURL}" alt="${userData.displayName}">
        <span>${userData.displayName}</span>
        <div class="mini-coins">
            <i class="fas fa-coins"></i> <span id="miniCoins">${userData.miniCoins || 0}</span>
        </div>
        <div class="dropdown-content">
            <a href="#" id="myRoomsBtn">Phòng Của Tôi</a>
            <a href="profile.html" id="profileBtn">Hồ Sơ</a>
            <a href="learning.html" id="hoctap">Học tập</a>
            <a href="https://micovan107.github.io/dikey_chat/" id="chatv2">Chat</a>
            <a href="forum.html" id="dien_dan">Diễn đàn</a>
            <a href="plant-care.html" id="minigame">Minigame</a>
            <a href="library.html" id="thuvien">Thư viện</a>
            <a href="news.html" id="tinTuc">Tin Tức</a>
            <a href="code-editor.html" id="laptrinh">Viết code</a>
            <a href="code-projects.html" id="duan">Dự án</a>
            ${userData.email === 'micovan108@gmail.com' ? '<a href="admin.html" id="adminBtn">Quản Trị</a>' : ''}
            <a href="#" id="logoutBtn">Đăng Xuất</a>
        </div>
    `;
    
    // Add user profile to auth buttons if element exists
    if (authButtons) {
        authButtons.appendChild(userProfile);
    }
    
    // Add event listener for logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Không thêm sự kiện cho nút tạo phòng ở đây vì đã được xử lý trong rooms.js
    
    // Add event listener for my rooms button
    const myRoomsBtn = document.getElementById('myRoomsBtn');
    if (myRoomsBtn) {
        myRoomsBtn.addEventListener('click', () => {
            // Filter rooms to show only user's rooms
            const filterBtn = document.querySelector('.filter-btn[data-filter="my"]');
            if (filterBtn) {
                filterBtn.click();
            } else {
                // If filter button doesn't exist, add it and click it
                const filterBtns = document.querySelector('.room-filters');
                if (filterBtns) {
                    const myRoomsFilterBtn = document.createElement('button');
                    myRoomsFilterBtn.className = 'filter-btn';
                    myRoomsFilterBtn.setAttribute('data-filter', 'my');
                    myRoomsFilterBtn.textContent = 'Phòng Của Tôi';
                    filterBtns.appendChild(myRoomsFilterBtn);
                    myRoomsFilterBtn.click();
                }
            }
            
            // Scroll to rooms section
            document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// Toggle dark mode function
function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    
    // Cập nhật localStorage
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
    
    // Cập nhật icon của nút theme-toggle trong main.js
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        if (document.body.classList.contains('dark-theme')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.setAttribute('data-tooltip', 'Chế độ sáng');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggle.setAttribute('data-tooltip', 'Chế độ tối');
        }
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser(guestData) {
    // Check if auth buttons element exists
    if (!authButtons) return;
    
    // Lưu thông tin người dùng khách vào biến toàn cục nếu có
    if (guestData) {
        window.currentUser = guestData;
    }
    
    // Clear auth buttons
    authButtons.innerHTML = '';
    
    // Add login and signup buttons
    const loginButton = document.createElement('button');
    loginButton.id = 'loginBtn';
    loginButton.className = 'btn';
    loginButton.textContent = 'Đăng Nhập';
    loginButton.addEventListener('click', () => openModal(loginModal));
    
    const signupButton = document.createElement('button');
    signupButton.id = 'signupBtn';
    signupButton.className = 'btn btn-primary';
    signupButton.textContent = 'Đăng Ký';
    signupButton.addEventListener('click', () => openModal(signupModal));
    
    authButtons.appendChild(loginButton);
    authButtons.appendChild(signupButton);
    
    // Không thêm sự kiện cho nút tạo phòng ở đây vì đã được xử lý trong rooms.js
}

// Logout function
async function logout() {
    try {
        await firebase.auth().signOut();
        showNotification('Đăng xuất thành công!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(`Lỗi đăng xuất: ${error.message}`, 'error');
    }
}

// Helper function to open modal
function openModal(modal) {
    // Close all modals first
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    
    // Open the requested modal
    modal.style.display = 'block';
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add styles for notifications if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                }
                
                .notification {
                    padding: 15px 20px;
                    margin-bottom: 10px;
                    border-radius: 5px;
                    color: white;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideIn 0.3s ease-out forwards;
                }
                
                .notification.info {
                    background-color: #3498db;
                }
                
                .notification.success {
                    background-color: #2ecc71;
                }
                
                .notification.warning {
                    background-color: #f39c12;
                }
                
                .notification.error {
                    background-color: #e74c3c;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div>${message}</div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button event
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Add CSS for user profile dropdown if not already added
if (!document.getElementById('user-profile-styles')) {
    const style = document.createElement('style');
    style.id = 'user-profile-styles';
    style.textContent = `
        .user-profile {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            cursor: pointer;
            transition: transform 0.3s ease, scale 0.3s ease;
        }
        
        .user-profile img {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            object-fit: cover;
            transition: width 0.3s ease, height 0.3s ease;
        }
        
        .user-profile span {
            font-weight: 600;
        }
        
        .dropdown-content {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background-color: white;
            min-width: 160px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
            z-index: 1;
            overflow: hidden;
        }
        
        .user-profile:hover .dropdown-content {
            display: block;
        }
        
        .dropdown-content a {
            color: var(--dark-color);
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            transition: background-color 0.3s;
        }
        
        .dropdown-content a:hover {
            background-color: #f1f1f1;
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);
}
