// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAFXUTyBwPaIDcUBM9rRwFuvp4XesZaElw",
  authDomain: "diendan-94ccf.firebaseapp.com",
  databaseURL: "https://diendan-94ccf-default-rtdb.firebaseio.com",
  projectId: "diendan-94ccf",
  storageBucket: "diendan-94ccf.firebasestorage.app",
  messagingSenderId: "278540232954",
  appId: "1:278540232954:web:f7db4b6d14adcf36964143",
  measurementId: "G-R0XH0M2835"
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