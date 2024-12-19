import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5WjXzmGNUWUCr-_-PDPagpUfYaTmjjGY",
  authDomain: "cheney-25352.firebaseapp.com",
  projectId: "cheney-25352",
  storageBucket: "cheney-25352.appspot.com",
  messagingSenderId: "731368175146",
  appId: "1:731368175146:web:b2fd024d600c930373f553",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

let adminUID = null;

// Authentication Check
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminUID = user.uid;
    loadDevices();
    setupEventListeners();
    loadPlaylists();
    displayConnectedDevices();
  } else {
    alert("You must log in to access this screen.");
    window.location.href = "login.html";
  }
});

// Load Devices
async function loadDevices() {
  const deviceGrid = document.getElementById("device-grid");
  const devicesRef = collection(db, "devices");
  const adminDevicesQuery = query(devicesRef, where("connectedBy", "==", adminUID));

  onSnapshot(adminDevicesQuery, (snapshot) => {
    deviceGrid.innerHTML = "";
    snapshot.forEach((doc) => {
      const device = doc.data();
      const deviceCard = createDeviceCard(device, doc.id);
      deviceGrid.appendChild(deviceCard);
    });
  });
}

// Create Device Card
function createDeviceCard(device, deviceId) {
  const card = document.createElement("div");
  card.className = "device-card";
  card.innerHTML = `
    <h4>${device.deviceName || "Unnamed Device"}</h4>
    <p>Status: <span>${device.status || "Unknown"}</span></p>
    <p>Media Queue: ${device.currentMedia?.length || 0} items</p>
    <button class="manage-btn" data-id="${deviceId}">Manage</button>
  `;
  card.querySelector(".manage-btn").addEventListener("click", () => openDevicePopup(device, deviceId));
  return card;
}

// Open Device Popup
function openDevicePopup(device, deviceId) {
  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";

  document.getElementById("device-name").textContent = device.deviceName || "Unnamed Device";
  document.getElementById("device-id").textContent = deviceId;
  document.getElementById("device-status").textContent = device.status || "Unknown";
  document.getElementById("orientation-select").value = device.orientation || "landscape";
  document.getElementById("resize-select").value = device.resize || "contain"; // Added resize
  document.getElementById("delay-input").value = device.delay || 5;
  document.getElementById("audio-select").value = device.audio || "mute";

  loadMediaList();

  document.getElementById("push-media-btn").onclick = () => pushMedia(deviceId);
  document.getElementById("push-playlist-btn").onclick = () => pushPlaylist(deviceId);
  document.getElementById("push-restart-btn").onclick = () => pushAndRestart(deviceId);
  document.getElementById("clear-restart-btn").onclick = () => clearAndRestart(deviceId);
  document.getElementById("resize-select").onchange = (e) => updateResize(deviceId, e.target.value);
  document.getElementById("close-popup").onclick = () => closePopup(popup);
}

// Close Popup
function closePopup(popup) {
  popup.style.display = "none";
}

// Load Media List
async function loadMediaList() {
  const mediaList = document.getElementById("media-list");
  mediaList.innerHTML = "";

  try {
    const mediaRef = collection(db, `users/${adminUID}/media`);
    const querySnapshot = await getDocs(mediaRef);

    querySnapshot.forEach((doc) => {
      const media = doc.data();
      const mediaItem = document.createElement("li");
      mediaItem.className = "media-item";
      mediaItem.innerHTML = `
        <img src="${media.mediaUrl}" alt="${media.mediaType}" class="thumbnail" />
        <button class="select-media-btn" data-url="${media.mediaUrl}">Select</button>
      `;
      mediaItem.querySelector(".select-media-btn").addEventListener("click", () => selectMedia(mediaItem));
      mediaList.appendChild(mediaItem);
    });
  } catch (error) {
    console.error("Error loading media list:", error);
  }
}

// Push Media with Resize
async function pushMedia(deviceId) {
  const selectedMedia = document.querySelector(".media-item.selected");
  if (!selectedMedia) {
    alert("Please select media to push.");
    return;
  }

  const mediaUrl = selectedMedia.querySelector(".select-media-btn").dataset.url;
  const orientation = document.getElementById("orientation-select").value;
  const resize = document.getElementById("resize-select").value; // Added resize selection
  const audio = document.getElementById("audio-select").value;

  const deviceRef = doc(db, "devices", deviceId);

  try {
    await updateDoc(deviceRef, {
      currentMedia: [mediaUrl],
      orientation: orientation,
      resize: resize, // Update resize
      audio: audio,
      lastContentPush: serverTimestamp(),
    });
    alert("Media pushed successfully!");
  } catch (error) {
    console.error("Error pushing media:", error);
  }
}

// Push Playlist
async function pushPlaylist(deviceId) {
  const selectedPlaylistId = document.getElementById("playlist-select").value;
  if (!selectedPlaylistId) {
    alert("Please select a playlist.");
    return;
  }

  try {
    const playlistRef = doc(db, `users/${adminUID}/playlists`, selectedPlaylistId);
    const playlistDoc = await getDoc(playlistRef);
    const playlist = playlistDoc.data();

    const orientation = document.getElementById("orientation-select").value;
    const resize = document.getElementById("resize-select").value; // Added resize selection
    const audio = document.getElementById("audio-select").value;

    const deviceRef = doc(db, "devices", deviceId);

    await updateDoc(deviceRef, {
      currentMedia: playlist.media,
      orientation: orientation,
      resize: resize, // Update resize
      audio: audio,
      lastContentPush: serverTimestamp(),
    });
    alert("Playlist pushed successfully!");
  } catch (error) {
    console.error("Error pushing playlist:", error);
  }
}

// Update Resize
async function updateResize(deviceId, resize) {
  const deviceRef = doc(db, "devices", deviceId);
  try {
    await updateDoc(deviceRef, { resize });
    alert("Resize setting updated!");
  } catch (error) {
    console.error("Error updating resize:", error);
  }
}

// Select Media
function selectMedia(mediaItem) {
  document.querySelectorAll(".media-item").forEach((item) => item.classList.remove("selected"));
  mediaItem.classList.add("selected");
}

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });
}
