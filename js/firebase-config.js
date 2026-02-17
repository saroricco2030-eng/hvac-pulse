// ===================================================
// HVAC Pulse — Firebase Configuration
// ===================================================
//
// Firebase 설정 방법:
// 1. https://console.firebase.google.com 접속 → 프로젝트 추가
// 2. Authentication → 시작하기 → 로그인 방법:
//    - 이메일/비밀번호 활성화
//    - Google 활성화
// 3. Firestore Database → 데이터베이스 만들기 → 테스트 모드로 시작
// 4. 프로젝트 설정(⚙️) → 일반 → 내 앱 → 웹 앱(</>) 추가
//    → 앱 등록 → firebaseConfig 값을 아래에 복사
//
// ※ 값을 채우지 않으면 로그인/동기화 기능이 비활성화되며
//   앱은 기존 그대로 로컬 전용으로 작동합니다.
//
// Firestore 보안 규칙 (콘솔 → Firestore → 규칙):
// ─────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId}/{document=**} {
//       allow read, write: if request.auth != null
//                          && request.auth.uid == userId;
//     }
//   }
// }
// ─────────────────────────────────────
// ===================================================

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Check if Firebase SDK is loaded AND config values are filled in
function isFirebaseConfigured() {
  return !!(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    typeof firebase !== 'undefined'
  );
}
