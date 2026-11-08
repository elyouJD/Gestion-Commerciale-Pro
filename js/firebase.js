import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD9zU8cJZ0uUmT0wzJTiQcEyTbXMWZv_pg',
  authDomain: 'gestion-commerciale-pro-90ac1.firebaseapp.com',
  projectId: 'gestion-commerciale-pro-90ac1',
  messagingSenderId: '734439701248',
  appId: '1:734439701248:web:396ee9912511f16f5951e5',
  measurementId: 'G-TETRQJ06TV'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
