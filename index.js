/* ===================== IMPORTS ===================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

import {
  addDoc,
 	collection,
 	deleteDoc,
 	doc,
 	getDoc,
 	getDocs,
 	getFirestore,
 	limit,
 	orderBy,
 	query,
 	serverTimestamp,
 	setDoc,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import {
 	browserLocalPersistence,
 	createUserWithEmailAndPassword,
 	deleteUser,
 	getAuth,
 	onAuthStateChanged,
 	setPersistence,
 	signInWithEmailAndPassword,
 	signOut,
 	updateProfile,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAx1gIXj1Y3YvkcF94xtj8IrSNoRJayvm4",
  authDomain: "meal-plan-dd607.firebaseapp.com",
  databaseURL: "https://meal-plan-dd607-default-rtdb.firebaseio.com",
  projectId: "meal-plan-dd607",
  storageBucket: "meal-plan-dd607.firebasestorage.app",
  messagingSenderId: "916161333001",
  appId: "1:916161333001:web:90e85f336b13e742ac75d8",
  measurementId: "G-XT4JC7QKZS",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const authPersistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Firebase Auth persistence could not be enabled.", error);
});

const USERS_COLLECTION = "users";
const USERNAME_INDEX_COLLECTION = "usernames";

const greetingTitle = document.getElementById("greeting-title");
const serviceLine = document.getElementById("service-line");
const loginForm = document.querySelector(".login-form");
const loginCard = document.querySelector(".login-card");
const createAccountCard = document.getElementById("create-account-card");
const createAccountForm = document.getElementById("create-account-form");
const goToCreateAccountButton = document.getElementById("go-to-create-account");
const backToLoginButton = document.getElementById("back-to-login");
const appView = document.getElementById("app-view");
const randomButton = document.getElementById("random-button");
const likesButton = document.getElementById("likes-button");
const historyButton = document.getElementById("history-button");
const foodPanel = document.getElementById("food-panel");
const foodPanelTitle = document.getElementById("food-panel-title");
const foodPanelContent = document.getElementById("food-panel-content");
const foodPanelClose = document.getElementById("food-panel-close");
const foodLikeToggle = document.getElementById("food-like-toggle");
const logoutButton = document.getElementById("logout-button");
const loginEmailInput = document.getElementById("username");
const loginPasswordInput = document.getElementById("password");
const createFirstNameInput = document.getElementById("first-name");
const createLastNameInput = document.getElementById("last-name");
const createEmailInput = document.getElementById("create-email");
const createUsernameInput = document.getElementById("create-username");
const createPasswordInput = document.getElementById("create-password");
const currentTimeEl = document.getElementById("current-time");
const userGreetingEl = document.getElementById("user-greeting");
const userNameEl = document.getElementById("user-name");
const loginErrorEl = document.getElementById("login-error");

let loggedInTimerId;
let currentDisplayedMeal = null;
let currentDisplayedMealLiked = false;
let foodPanelHideTimerId;

const USER_LIKES_SUBCOLLECTION = "likes";
const USER_HISTORY_SUBCOLLECTION = "history";
const randomMeals = [
  { id: "meal-pasta-arrabbiata", name: "Pasta Arrabbiata" },
  { id: "meal-salmon-rice", name: "Salmon Rice Bowl" },
  { id: "meal-veggie-tacos", name: "Veggie Tacos" },
  { id: "meal-chicken-salad", name: "Chicken Caesar Salad" },
  { id: "meal-tofu-stir-fry", name: "Tofu Stir Fry" },
  { id: "meal-beef-ramen", name: "Beef Ramen" },
];

function clearLoggedInTimer() {
  if (loggedInTimerId) {
    clearInterval(loggedInTimerId);
    loggedInTimerId = undefined;
  }
}

function getDisplayName(user) {
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim().split(/\s+/)[0];
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return "User";
}

function getFriendlyAuthErrorMessage(error, fallbackMessage) {
  if (!error || typeof error.code !== "string") {
    return fallbackMessage;
  }
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/user-not-found":
      return "No account was found for that email address.";
    case "auth/email-already-in-use":
      return "An account already exists for that email address.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/missing-password":
      return "Please enter a password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "permission-denied":
      return "Firestore permission denied. Update your Firestore rules and try again.";
    case "failed-precondition":
      return "Firestore is not ready yet. Make sure the Firestore database is created in Firebase Console.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return fallbackMessage;
  }
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function getSignedInUserOrPrompt() {
  if (!auth.currentUser) {
    window.alert("Please sign in first.");
    return null;
  }
  return auth.currentUser;
}

function setLoginError(message) {
  if (!loginErrorEl) {
    return;
  }
  loginErrorEl.textContent = message;
  loginErrorEl.hidden = !message;
}

function pickRandomMeal() {
  const randomIndex = Math.floor(Math.random() * randomMeals.length);
  return randomMeals[randomIndex];
}

async function fetchMealByTimeOfDay() {
  // Determine meal type by current hour
  const hour = new Date().getHours();
  let category = 'Seafood'; // default
  if (hour < 12) {
    category = 'Breakfast';
  } else if (hour < 17) {
    category = 'Pasta'; // lunch
  } else {
    category = 'Seafood'; // dinner
  }
  
  try {
    // Fetch meals by category
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    if (!resp.ok) throw new Error(`Network error: ${resp.status}`);
    const payload = await resp.json();
    const meals = payload && Array.isArray(payload.meals) ? payload.meals : [];
    if (!meals.length) throw new Error(`No ${category} meals found`);
    
    // Pick random meal from category
    const randomMeal = meals[Math.floor(Math.random() * meals.length)];
    return await fetchMealById(randomMeal.idMeal);
  } catch (err) {
    // Fallback to random API if category fetch fails
    const resp = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    if (!resp.ok) throw new Error(`Network error: ${resp.status}`);
    const payload = await resp.json();
    const mealRaw = payload && Array.isArray(payload.meals) && payload.meals[0];
    if (!mealRaw) throw new Error('No meal returned from API.');
    return await fetchMealById(mealRaw.idMeal);
  }
}

function getLikeDocRef(user, mealId) {
  return doc(db, USERS_COLLECTION, user.uid, USER_LIKES_SUBCOLLECTION, mealId);
}

function showFoodPanel(title, content, allowLike = false) {
  if (!foodPanel || !foodPanelTitle || !foodPanelContent || !foodLikeToggle) {
    return;
  }
  if (foodPanelHideTimerId) {
    clearTimeout(foodPanelHideTimerId);
    foodPanelHideTimerId = undefined;
  }

  // Reset any in-flight animation classes so rapid likes/history switching can replay animation.
  foodPanel.classList.remove("food-panel-collapsing", "food-panel-expanding");
  foodPanelTitle.textContent = title; // content may include markup (image, lists). Use innerHTML for rich content.
  foodPanelContent.innerHTML = content;
  foodLikeToggle.hidden = !allowLike;
  foodPanel.hidden = false;

  // replay open animation each time likes/history panel is shown
  void foodPanel.offsetHeight;
  foodPanel.classList.add("food-panel-expanding");
  const onExpandEnd = () => {
    foodPanel.classList.remove("food-panel-expanding");
    foodPanel.removeEventListener("animationend", onExpandEnd);
  };
  foodPanel.addEventListener("animationend", onExpandEnd);
}

function hideFoodPanel() {
  if (!foodPanel || !foodLikeToggle) {
    return;
  }
  if (foodPanel.hidden) {
    return;
  }

  if (foodPanelHideTimerId) {
    clearTimeout(foodPanelHideTimerId);
  }

  foodPanel.classList.remove("food-panel-expanding", "food-panel-collapsing");
  void foodPanel.offsetHeight;
  foodPanel.classList.add("food-panel-collapsing");

  const completeHide = () => {
    foodPanel.hidden = true;
    foodLikeToggle.hidden = true;
    foodPanel.classList.remove("food-panel-collapsing");
    foodPanelHideTimerId = undefined;
    foodPanel.removeEventListener("animationend", onCollapseEnd);
  };
  const onCollapseEnd = () => {
    completeHide();
  };
  foodPanel.addEventListener("animationend", onCollapseEnd);
  // Fallback in case animationend doesn't fire.
  foodPanelHideTimerId = setTimeout(completeHide, 220);
}

function updateLikeToggleVisual(isLiked) {
  if (!foodLikeToggle) {
    return;
  }
  foodLikeToggle.dataset.liked = isLiked ? "true" : "false";
  foodLikeToggle.setAttribute("aria-pressed", isLiked ? "true" : "false");
  foodLikeToggle.textContent = isLiked ? "♥ Liked" : "♡ Save to likes";
  // disable floating animation when item is liked
  if (isLiked) {
    foodLikeToggle.classList.add('no-float');
    foodLikeToggle.setAttribute('data-no-float', 'true');
  } else {
    foodLikeToggle.classList.remove('no-float');
    foodLikeToggle.removeAttribute('data-no-float');
  }
}

function deleteIndexedDbByName(databaseName) {
  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function clearBrowserCacheData() {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch (error) {
    console.warn("Storage clear failed.", error);
  }
  if ("caches" in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    } catch (error) {
      console.warn("Cache API clear failed.", error);
    }
  }
  try {
    if (typeof window.indexedDB.databases === "function") {
      const databases = await window.indexedDB.databases();
      const databaseNames = databases.map((database) => database.name).filter(Boolean);
      await Promise.all(databaseNames.map((databaseName) => deleteIndexedDbByName(databaseName)));
      return;
    }
  } catch (error) {
    console.warn("IndexedDB full clear failed.", error);
  }
  await Promise.all([
    deleteIndexedDbByName("firebaseLocalStorageDb"),
    deleteIndexedDbByName("firebase-installations-database"),
  ]);
}

async function getUsernameRecord(username) {
  const usernameKey = normalizeUsername(username);
  const usernameSnapshot = await getDoc(doc(db, USERNAME_INDEX_COLLECTION, usernameKey));
  return usernameSnapshot.exists() ? usernameSnapshot.data() : null;
}

async function getUserProfile(uid) {
  const userSnapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  return userSnapshot.exists() ? userSnapshot.data() : null;
}

async function saveUserToFirestore(user, profileData) {
  const usernameKey = normalizeUsername(profileData.username);
  await setDoc(doc(db, USERS_COLLECTION, user.uid), {
    uid: user.uid,
    email: user.email,
    username: profileData.username,
    normalizedUsername: usernameKey,
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    displayName: profileData.displayName,
    gender: profileData.gender,
    age: profileData.age,
    country: profileData.country,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, USERNAME_INDEX_COLLECTION, usernameKey), {
    uid: user.uid,
    email: user.email,
    username: profileData.username,
    normalizedUsername: usernameKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function addHistoryEntry(user, meal) {
  await addDoc(collection(db, USERS_COLLECTION, user.uid, USER_HISTORY_SUBCOLLECTION), {
    mealId: meal.id,
    mealName: meal.name,
    createdAt: serverTimestamp(),
  });
}

async function addLikedMeal(user, meal) {
  await setDoc(getLikeDocRef(user, meal.id), {
    mealId: meal.id,
    mealName: meal.name,
    updatedAt: serverTimestamp(),
  });
}

async function removeLikedMeal(user, mealId) {
  await deleteDoc(getLikeDocRef(user, mealId));
}

async function isMealLiked(user, mealId) {
  const likeSnapshot = await getDoc(getLikeDocRef(user, mealId));
  return likeSnapshot.exists();
}

async function getRecentHistoryEntries(user, maxEntries = 5) {
  const historyQuery = query(
    collection(db, USERS_COLLECTION, user.uid, USER_HISTORY_SUBCOLLECTION),
    orderBy("createdAt", "desc"),
    limit(maxEntries),
  );
  const historySnapshot = await getDocs(historyQuery);
  return historySnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
}

async function getRecentLikedMeals(user, maxEntries = 5) {
  const likesQuery = query(
    collection(db, USERS_COLLECTION, user.uid, USER_LIKES_SUBCOLLECTION),
    orderBy("updatedAt", "desc"),
    limit(maxEntries),
  );
  const likesSnapshot = await getDocs(likesQuery);
  return likesSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
}

async function fetchMealById(id) {
  const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`);
  if (!resp.ok) {
    throw new Error(`Network error: ${resp.status}`);
  }
  const payload = await resp.json();
  const meal = payload && Array.isArray(payload.meals) && payload.meals[0];
  if (!meal) {
    throw new Error("No meal returned from API.");
  }
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
          const part = `${measure ? measure.trim() + " " : ""}${ing.trim()}`.trim();
          ingredients.push(part);
        }
  }
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    instructions: meal.strInstructions,
    ingredients,
    raw: meal,
  };
}

function showMealModal(meal, allowLike = true) {
  if (!meal) return;
  currentDisplayedMeal = { id: meal.id, name: meal.name };
  // Update like state will be resolved by caller if needed; keep visual as set.
  currentDisplayedMealLiked = currentDisplayedMealLiked || false;
  updateLikeToggleVisual(currentDisplayedMealLiked);
  // Open an in-page modal overlay to display the meal (dims the rest of the UI).
  openMealOverlay(meal, allowLike);
}

// Custom confirm dialog that appears as a centered modal overlay
async function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    
    const panel = document.createElement('div');
    panel.style.width = '90%';
    panel.style.maxWidth = '400px';
    panel.style.background = '#fff';
    panel.style.borderRadius = '10px';
    panel.style.padding = '20px';
    panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    
    panel.innerHTML = `
      <p style="margin:0 0 20px;font-size:1rem;color:var(--text);">${message}</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="confirm-cancel" class="btn btn-secondary" style="width:auto;padding:8px 16px">Cancel</button>
        <button id="confirm-ok" class="btn btn-primary" style="width:auto;padding:8px 16px">OK</button>
      </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    function cleanup() { overlay.remove(); }
    
    document.getElementById('confirm-ok').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) {
        cleanup();
        resolve(false);
      }
    });
    
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        cleanup();
        resolve(false);
      }
    });
    
    document.getElementById('confirm-ok').focus();
  });
}

// Build and show an in-page modal overlay

function openMealOverlay(meal, allowLike = true) {
  // Remove existing overlay if present
  const existing = document.getElementById('meal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'meal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  const panel = document.createElement('div');
  panel.className = 'meal-panel-overlay';
  panel.style.width = '90%';
  panel.style.maxWidth = '900px';
  panel.style.maxHeight = '90%';
  panel.style.overflow = 'auto';
  panel.style.background = '#fff';
  panel.style.borderRadius = '10px';
  panel.style.padding = '18px';
  panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.style.position = 'relative';
  const likeButtonClass = currentDisplayedMealLiked ? 'btn-primary' : 'btn-secondary';
  panel.innerHTML = `
    <button id="overlay-close" class="btn btn-secondary" style="position:absolute;top:12px;right:12px;width:28px;height:28px;padding:0;border-radius:999px;font-size:1.4rem">×</button>
    <div style="display:flex;gap:16px;align-items:flex-start;">
      <div style="flex:0 0 40%;">
        <img src="${meal.image}" alt="${meal.name}" style="width:100%;height:auto;border-radius:8px;display:block" />
      </div>
      <div style="flex:1;display:flex;flex-direction:column;">
        <div>
          <h3 style="margin:0 0 6px">${meal.name}</h3>
          <h4 style="margin:6px 0">Ingredients</h4>
          <ul style="padding-left:1.2rem;margin-top:4px">${meal.ingredients.map((it) => `<li>${it}</li>`).join('')}</ul>
        </div>
        ${meal.instructions ? `<details class="instruction-details" style="margin-top:8px"><summary>Instructions</summary><p class="instruction-content" style="white-space:pre-wrap">${meal.instructions}</p></details>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;">
          ${allowLike ? `<button id="overlay-like" class="btn ${likeButtonClass}" style="width:auto;padding:8px 16px">${currentDisplayedMealLiked ? '♥ Liked' : '♡ Save to likes'}</button>` : ''}
      </div>
  `;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  // focus trap basic: focus close button
  const closeBtn = document.getElementById('overlay-close');
  if (closeBtn) closeBtn.focus();
  function removeOverlay() {
    panel.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  }
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) removeOverlay(); });
  document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); removeOverlay(); } });
  const likeBtn = document.getElementById('overlay-like');
  if (likeBtn) {
    // ensure initial no-float state matches currentDisplayedMealLiked
    if (currentDisplayedMealLiked) {
      likeBtn.classList.add('no-float');
      likeBtn.setAttribute('data-no-float', 'true');
    } else {
      likeBtn.classList.remove('no-float');
      likeBtn.removeAttribute('data-no-float');
    }
    likeBtn.addEventListener('click', async () => {
      const user = getSignedInUserOrPrompt();
      if (!user) { alert('Please sign in to save likes.'); return; }
      try {
        if (currentDisplayedMealLiked) { await removeLikedMeal(user, currentDisplayedMeal.id); currentDisplayedMealLiked = false; } else { await addLikedMeal(user, currentDisplayedMeal); currentDisplayedMealLiked = true; }
        likeBtn.textContent = currentDisplayedMealLiked ? '♥ Liked' : '♡ Save to likes';
        likeBtn.className = currentDisplayedMealLiked ? 'btn btn-primary' : 'btn btn-secondary';
        if (currentDisplayedMealLiked) {
          likeBtn.classList.add('no-float');
          likeBtn.setAttribute('data-no-float', 'true');
        } else {
          likeBtn.classList.remove('no-float');
          likeBtn.removeAttribute('data-no-float');
        }
      } catch (err) { alert(getFriendlyAuthErrorMessage(err, 'Could not update like.')); }
    });
  }
  if (closeBtn) { closeBtn.addEventListener('click', removeOverlay); }

  // Animate instructions expand/collapse with manual details toggling.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const instructionDetails = panel.querySelectorAll('.instruction-details');
  instructionDetails.forEach((detailsEl) => {
    const summaryEl = detailsEl.querySelector('summary');
    const contentEl = detailsEl.querySelector('.instruction-content');
    if (!summaryEl || !contentEl) {
      return;
    }

    contentEl.style.overflow = 'hidden';
    if (!detailsEl.open) {
      contentEl.style.maxHeight = '0px';
      contentEl.style.opacity = '0';
      contentEl.style.transform = 'scaleY(0.96)';
      contentEl.style.marginTop = '0';
    }

    let isAnimating = false;
    summaryEl.addEventListener('click', (event) => {
      event.preventDefault();
      if (isAnimating) {
        return;
      }
      if (reduceMotion) {
        detailsEl.open = !detailsEl.open;
        contentEl.style.maxHeight = detailsEl.open ? 'none' : '0px';
        contentEl.style.opacity = detailsEl.open ? '1' : '0';
        contentEl.style.transform = detailsEl.open ? 'scaleY(1)' : 'scaleY(0.96)';
        contentEl.style.marginTop = detailsEl.open ? '8px' : '0';
        return;
      }

      const opening = !detailsEl.open;
      isAnimating = true;
      contentEl.style.transition = 'max-height 0.25s ease, opacity 0.2s ease, transform 0.25s ease, margin-top 0.25s ease';

      if (opening) {
        detailsEl.open = true;
        contentEl.style.maxHeight = '0px';
        contentEl.style.opacity = '0';
        contentEl.style.transform = 'scaleY(0.96)';
        contentEl.style.marginTop = '0';

        requestAnimationFrame(() => {
          const targetHeight = contentEl.scrollHeight;
          contentEl.style.maxHeight = `${targetHeight}px`;
          contentEl.style.opacity = '1';
          contentEl.style.transform = 'scaleY(1)';
          contentEl.style.marginTop = '8px';
        });

        const onExpandEnd = (evt) => {
          if (evt.target !== contentEl || evt.propertyName !== 'max-height') {
            return;
          }
          contentEl.removeEventListener('transitionend', onExpandEnd);
          contentEl.style.maxHeight = 'none';
          isAnimating = false;
        };
        contentEl.addEventListener('transitionend', onExpandEnd);
      } else {
        const startHeight = contentEl.scrollHeight;
        contentEl.style.maxHeight = `${startHeight}px`;
        contentEl.style.opacity = '1';
        contentEl.style.transform = 'scaleY(1)';
        contentEl.style.marginTop = '8px';
        // Force style recalc so the browser has a start point for collapse.
        void contentEl.offsetHeight;

        requestAnimationFrame(() => {
          contentEl.style.maxHeight = '0px';
          contentEl.style.opacity = '0';
          contentEl.style.transform = 'scaleY(0.96)';
          contentEl.style.marginTop = '0';
        });

        const onCollapseEnd = (evt) => {
          if (evt.target !== contentEl || evt.propertyName !== 'max-height') {
            return;
          }
          contentEl.removeEventListener('transitionend', onCollapseEnd);
          detailsEl.open = false;
          isAnimating = false;
        };
        contentEl.addEventListener('transitionend', onCollapseEnd);
      }
    });
  });
}

async function deleteAllDocsFromCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const deletePromises = snapshot.docs.map((documentSnapshot) => deleteDoc(documentSnapshot.ref));
  await Promise.all(deletePromises);
}

async function wipeUsersAndCache() {
  const shouldProceed = window.confirm(
    "This will delete Firestore user data (users/usernames) and clear local browser cache. Continue?",
  );
  if (!shouldProceed) {
    return;
  }
  await authPersistencePromise;
  try {
    await deleteAllDocsFromCollection(USERNAME_INDEX_COLLECTION);
    await deleteAllDocsFromCollection(USERS_COLLECTION);
  } catch (error) {
    console.warn("Could not fully clear Firestore user documents.", error);
  }
  if (auth.currentUser) {
    try { await deleteUser(auth.currentUser); } catch (error) { console.warn("Current Auth user could not be deleted (reauth may be required).", error); }
  }
  try { await signOut(auth); } catch (error) { console.warn("Sign out during wipe failed.", error); }
  await clearBrowserCacheData();
  window.alert("Wipe complete. The page will now reload.");
  window.location.reload();
}

window.devWipeAllUsersAndCache = wipeUsersAndCache;

function showLoginState() {
  clearLoggedInTimer();
  hideFoodPanel();
  setLoginError("");
  if (loginCard) { loginCard.hidden = false; }
  if (createAccountCard) { createAccountCard.hidden = true; }
  if (appView) { appView.hidden = true; }
}

function showCreateAccountState() {
  if (loginCard) { loginCard.hidden = true; }
  if (createAccountCard) { createAccountCard.hidden = false; }
  if (appView) { appView.hidden = true; }
}

async function logoutUser() {
  try {
    await authPersistencePromise;
    await signOut(auth);
  } catch (error) {
    window.alert(getFriendlyAuthErrorMessage(error, "Unable to sign out right now."));
  }
}

function getGreetingDetails(hour) {
  if (hour < 12) {
    return {
      greeting: "Good Morning,",
      serving: "Now Serving Breakfast",
    };
  }
  if (hour < 17) {
    return {
      greeting: "Good Afternoon,",
      serving: "Now Serving Lunch",
    };
  }
  return {
    greeting: "Good Evening,",
    serving: "Now Serving Dinner",
  };
}

function updateGreeting() {
  const currentHour = new Date().getHours();
  const details = getGreetingDetails(currentHour);
  if (greetingTitle) { greetingTitle.textContent = details.greeting; }
  if (serviceLine) { serviceLine.textContent = details.serving; }
}

updateGreeting();
setInterval(updateGreeting, 60_000);

function getTimePeriod(hour) {
  if (hour < 12) { return "morning"; }
  if (hour < 17) { return "afternoon"; }
  return "evening";
}

function updateLoggedInHeader(userName) {
  const now = new Date();
  const period = getTimePeriod(now.getHours());
  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (userGreetingEl) { userGreetingEl.textContent = `Good ${period}`; userGreetingEl.dataset.period = period; }
  if (userNameEl) { userNameEl.textContent = userName; }
}

function showLoggedInState(userName) {
  clearLoggedInTimer();
  if (loginCard) { loginCard.hidden = true; }
  if (createAccountCard) { createAccountCard.hidden = true; }
  if (appView) { appView.hidden = false; }
  updateLoggedInHeader(userName);
  loggedInTimerId = setInterval(() => updateLoggedInHeader(userName), 1_000);
}

async function resolveLoginEmail(identifier) {
  if (identifier.includes("@")) { return identifier; }
  const usernameRecord = await getUsernameRecord(identifier);
  return usernameRecord && typeof usernameRecord.email === "string" ? usernameRecord.email : null;
}

if (goToCreateAccountButton) { goToCreateAccountButton.addEventListener("click", showCreateAccountState); }
if (backToLoginButton) { backToLoginButton.addEventListener("click", showLoginState); }
if (logoutButton) { logoutButton.addEventListener("click", logoutUser); }
if (foodPanelClose) { foodPanelClose.addEventListener("click", hideFoodPanel); }
if (randomButton) {
  randomButton.addEventListener("click", async () => {
    const user = getSignedInUserOrPrompt();
    if (!user) { return; }
    try {
      hideFoodPanel();
      const meal = await fetchMealByTimeOfDay();
      // Save to history
      await addHistoryEntry(user, { id: meal.id, name: meal.name });
      currentDisplayedMeal = { id: meal.id, name: meal.name };
      currentDisplayedMealLiked = await isMealLiked(user, meal.id);
      updateLikeToggleVisual(currentDisplayedMealLiked);
      showMealModal(meal, true);
    } catch (error) {
      showFoodPanel("Random Meal", getFriendlyAuthErrorMessage(error, "Could not fetch a random meal."), true);
    }
  });
}
if (likesButton) {
  likesButton.addEventListener("click", async () => {
    const user = getSignedInUserOrPrompt();
    if (!user) { return; }
    try {
      const likedEntries = await getRecentLikedMeals(user, 50);
      if (!likedEntries.length) { showFoodPanel("Liked Meals", "No likes yet."); return; }
      const listHtml = `<div style="display:flex;flex-direction:column;gap:8px;">${likedEntries.map((entry) => `<div style="display:flex;align-items:center;gap:8px;"><button class="like-view" data-id="${entry.id}" style="flex:1;text-align:left;background:none;border:none;padding:6px;cursor:pointer">${entry.mealName || entry.mealName || entry.name}</button></div>`).join("")}</div>`;
      showFoodPanel("Liked Meals", listHtml);
      const viewButtons = foodPanelContent.querySelectorAll('.like-view');
      viewButtons.forEach((btn) => {
        btn.addEventListener('click', async (ev) => {
          const mealId = btn.dataset.id;
          try {
            const meal = await fetchMealById(mealId);
            currentDisplayedMealLiked = await isMealLiked(user, mealId);
            updateLikeToggleVisual(currentDisplayedMealLiked);
            showMealModal(meal, true);
          } catch (err) {
            showFoodPanel('Liked Meals', getFriendlyAuthErrorMessage(err, 'Could not load meal details.'));
          }
        });
      });
    } catch (error) {
      showFoodPanel("Liked Meals", getFriendlyAuthErrorMessage(error, "Could not load liked meals."));
    }
  });
}
if (historyButton) {
  historyButton.addEventListener("click", async () => {
    const user = getSignedInUserOrPrompt();
    if (!user) { return; }
    try {
      const historyEntries = await getRecentHistoryEntries(user, 50);
      if (!historyEntries.length) { showFoodPanel("Meal History", "No history yet."); return; }
      const listHtml = `<div style="display:flex;flex-direction:column;gap:8px;"><div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button id="clear-history-btn" style="background:none;border:none;padding:6px;cursor:pointer;text-decoration:underline;color:var(--text)">Remove all history</button></div>${historyEntries.map((entry) => `<div style="display:flex;align-items:center;gap:8px;"><button class="history-view" data-id="${entry.mealId}" style="flex:1;text-align:left;background:none;border:none;padding:6px;cursor:pointer">${entry.mealName}</button><button class="history-remove" data-docid="${entry.id}" title="Remove" style="background:transparent;border:none;color:#c33;cursor:pointer">×</button></div>`).join("")}</div>`;
      showFoodPanel("Meal History", listHtml);
      const viewBtns = foodPanelContent.querySelectorAll('.history-view');
      viewBtns.forEach((btn) => {
        btn.addEventListener('click', async () => {
          const mealId = btn.dataset.id;
          try {
            const meal = await fetchMealById(mealId);
            currentDisplayedMealLiked = await isMealLiked(user, mealId);
            updateLikeToggleVisual(currentDisplayedMealLiked);
            showMealModal(meal, true);
          } catch (err) {
            showFoodPanel('Meal History', getFriendlyAuthErrorMessage(err, 'Could not load meal details.'));
          }
        });
      });
      const removeBtns = foodPanelContent.querySelectorAll('.history-remove');
      removeBtns.forEach((btn) => {
        btn.addEventListener('click', async () => {
          const docId = btn.dataset.docid;
          try {
            await deleteDoc(doc(db, USERS_COLLECTION, user.uid, USER_HISTORY_SUBCOLLECTION, docId));
            historyButton.click();
          } catch (err) {
            showFoodPanel('Meal History', getFriendlyAuthErrorMessage(err, 'Could not remove history entry.'));
          }
        });
      });
      const clearBtn = document.getElementById('clear-history-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          const ok = await showConfirmDialog('Remove all history entries?');
          if (!ok) return;
          try {
            const snapshot = await getDocs(collection(db, USERS_COLLECTION, user.uid, USER_HISTORY_SUBCOLLECTION));
            await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
            historyButton.click();
          } catch (err) {
            showFoodPanel('Meal History', getFriendlyAuthErrorMessage(err, 'Could not clear history.'));
          }
        });
      }
    } catch (error) {
      showFoodPanel("Meal History", getFriendlyAuthErrorMessage(error, "Could not load meal history."));
    }
  });
}
if (foodLikeToggle) {
  foodLikeToggle.addEventListener("click", async () => {
    const user = getSignedInUserOrPrompt();
    if (!user || !currentDisplayedMeal) { showFoodPanel("Random Meal", "Pick a meal first.", true); updateLikeToggleVisual(false); return; }
    try {
      if (currentDisplayedMealLiked) { await removeLikedMeal(user, currentDisplayedMeal.id); currentDisplayedMealLiked = false; } else { await addLikedMeal(user, currentDisplayedMeal); currentDisplayedMealLiked = true; }
      updateLikeToggleVisual(currentDisplayedMealLiked);
    } catch (error) {
      showFoodPanel("Random Meal", getFriendlyAuthErrorMessage(error, "Could not update likes."), true);
    }
  });
}
if (createAccountForm) {
  createAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const firstName = createFirstNameInput ? createFirstNameInput.value.trim() : "";
    const lastName = createLastNameInput ? createLastNameInput.value.trim() : "";
    const email = createEmailInput ? createEmailInput.value.trim() : "";
    const username = createUsernameInput ? createUsernameInput.value.trim() : "";
    const password = createPasswordInput ? createPasswordInput.value : "";
    const genderInput = document.getElementById("gender");
    const ageInput = document.getElementById("age");
    const countryInput = document.getElementById("country");
    const gender = genderInput instanceof HTMLSelectElement ? genderInput.value : "";
    const age = ageInput instanceof HTMLInputElement ? ageInput.value.trim() : "";
    const country = countryInput instanceof HTMLSelectElement ? countryInput.value : "";
    if (!email || !password || !username) { window.alert("Username, email, and password are required to create an account."); return; }
    try {
      await authPersistencePromise;
      try {
        const existingUsername = await getUsernameRecord(username);
        if (existingUsername) { window.alert("That username is already taken. Pick another one."); return; }
      } catch (usernameLookupError) {
        if (!usernameLookupError || usernameLookupError.code !== "permission-denied") { throw usernameLookupError; }
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || username || userCredential.user.email?.split("@")[0] || "User";
      await updateProfile(userCredential.user, { displayName });
      try {
        await saveUserToFirestore(userCredential.user, { firstName, lastName, email, username, displayName, gender, age, country });
      } catch (profileSaveError) {
        window.alert(`${getFriendlyAuthErrorMessage(profileSaveError, "Account created, but profile data could not be saved.")} Username sign-in will not work until this is fixed.`);
      }
      createAccountForm.reset();
    } catch (error) {
      window.alert(getFriendlyAuthErrorMessage(error, "Unable to create account right now."));
    }
  });
}
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    const email = loginEmailInput ? loginEmailInput.value.trim() : "";
    const password = loginPasswordInput ? loginPasswordInput.value : "";
    const identifier = email;
    if (!identifier || !password) {
      setLoginError("Please enter either a username or email, plus your password.");
      return;
    }
    try {
      await authPersistencePromise;
      const resolvedEmail = await resolveLoginEmail(identifier);
      if (!resolvedEmail) {
        setLoginError("No account was found for that username or email address.");
        return;
      }
      await signInWithEmailAndPassword(auth, resolvedEmail, password);
      loginForm.reset();
      setLoginError("");
    } catch (error) {
      setLoginError(getFriendlyAuthErrorMessage(error, "Unable to sign in right now."));
    }
  });
}
onAuthStateChanged(auth, (user) => {
  if (user) {
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile) { showLoggedInState(profile.firstName || profile.displayName || profile.username || getDisplayName(user)); return; }
        showLoggedInState(getDisplayName(user));
      })
      .catch(() => { showLoggedInState(getDisplayName(user)); });
    return;
  }
  showLoginState();
});
