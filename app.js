// ===================================================
// 우리 반 담벼락 - Firebase Firestore 연동
//
// 메모를 쓰면 올린 순서대로 Firestore에 저장되고
// 브라우저를 새로고침해도 담벼락에 유지됩니다.
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDnyrh9sXqIVwByJyAJ3y2yeA7XdN0lywo",
  authDomain: "test-wall-starter.firebaseapp.com",
  projectId: "test-wall-starter",
  storageBucket: "test-wall-starter.firebasestorage.app",
  messagingSenderId: "268022879881",
  appId: "1:268022879881:web:639ea994dce9a08a1a9858",
  measurementId: "G-NK5J21HQ0C"
};

// Firebase 및 Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 현재 로그인한 사용자 정보 (로그아웃 상태면 null)
let currentUser = null;


// ===================================================
// 사용자 인증 (Google 로그인 / 로그아웃)
// ===================================================

// Google 계정으로 로그인하기
async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("로그인 실패:", error);
    alert("로그인에 실패했습니다: " + error.message);
  }
}

// 로그아웃하기
async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 실패:", error);
    alert("로그아웃에 실패했습니다.");
  }
}

// 로그인 영역(userArea) 화면 그리기
function renderUserArea() {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  userArea.innerHTML = "";

  if (currentUser) {
    // 로그인된 상태: 사용자 환영 메시지와 로그아웃 버튼 표시
    const welcome = document.createElement("span");
    welcome.textContent = `${currentUser.displayName || "선생님"}님 환영합니다!`;
    userArea.appendChild(welcome);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", logout);
    userArea.appendChild(logoutBtn);
  } else {
    // 로그인되지 않은 상태: Google 로그인 버튼 표시
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google 계정으로 로그인";
    loginBtn.addEventListener("click", loginWithGoogle);
    userArea.appendChild(loginBtn);
  }
}

// 로그인 상태 변경 감시 (로그인하거나 로그아웃할 때 자동으로 실행됩니다)
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderUserArea();
  render(); // 로그인 상태에 따라 내가 쓴 메모의 삭제(×) 버튼 표시를 갱신합니다.
});


// ===================================================
// 데이터를 다루는 함수 세 개 (Firestore 연동)
// ===================================================

// 메모를 읽어 옵니다 (Firestore에서 작성 시간 순으로 정렬)
async function loadMemos() {
  try {
    const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach(function (docSnap) {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return list;
  } catch (error) {
    console.error("메모 불러오기 실패:", error);
    return [];
  }
}

// 메모를 새로 씁니다 (Firestore 'memos' 컬렉션에 추가)
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장합니다.
async function addMemo(text) {
  if (!currentUser) {
    alert("로그인한 사용자만 메모를 작성할 수 있습니다.");
    return;
  }

  try {
    await addDoc(collection(db, "memos"), {
      text: text,
      createdAt: Date.now(),
      uid: currentUser.uid // 작성자의 고유 식별자(UID) 저장
    });
  } catch (error) {
    console.error("메모 추가 실패:", error);
    alert("메모 저장에 실패했습니다. Firestore 보안 규칙을 확인해 주세요.");
  }
}

// 메모를 지웁니다 (문서 ID로 삭제)
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 실패:", error);
    alert("메모 삭제에 실패했습니다.");
  }
}


// ===================================================
// 화면 그리기
// ===================================================

async function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  const memos = await loadMemos();
  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  // 본인이 작성한 메모이거나, 로그인 도입 전 작성되어 uid가 없는 메모인 경우에만 삭제 버튼을 보여줍니다.
  const isMyMemo = currentUser && memo.uid === currentUser.uid;
  const isLegacyMemo = !memo.uid;

  if (isMyMemo || isLegacyMemo) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.addEventListener("click", async function () {
      await deleteMemo(memo.id);
      await render();
    });
    div.appendChild(del);
  }

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    if (!currentUser) {
      alert("로그인 후 메모를 작성해 주세요.");
      return;
    }

    const text = input.value.trim();
    if (text === "") return;

    await addMemo(text);
    input.value = "";
    await render();
  }
});


// 첫 화면 그리기
renderUserArea();
render();
input.focus();
