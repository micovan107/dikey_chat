// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBgITWCnQO7pW2-VOAgpKFsK6GN8H037HM",
  authDomain: "masoi-92684.firebaseapp.com",
  databaseURL: "https://masoi-92684-default-rtdb.firebaseio.com",
  projectId: "masoi-92684",
  storageBucket: "masoi-92684.firebasestorage.app",
  messagingSenderId: "1030518945375",
  appId: "1:1030518945375:web:a531a0233c0dcbde120dea",
  measurementId: "G-QNS4GVQ178"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database(); 

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'dw8rpacnn',
    uploadPreset: 'dikeychat'
};

// Initialize Cloudinary
const cloudinary = window.cloudinary.Cloudinary.new({
    cloud_name: cloudinaryConfig.cloudName
});

// Default community group name
const DEFAULT_COMMUNITY_GROUP = "Cộng đồng Việt";

// Database references
const dbRefs = {
    users: database.ref('users'),
    messages: database.ref('messages'),
    chats: database.ref('chats'),
    userChats: database.ref('user_chats'),
    typing: database.ref('typing')
};

// Emoji list for emoji picker
const emojiList = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
    '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
    '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
    '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
    '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '❤️', '🧡',
    '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👍', '👎', '👌',
    '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️',
    '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝'
];

// Ghi log để xác nhận biến emojiList đã được định nghĩa
console.log('emojiList đã được định nghĩa trong config.js');
