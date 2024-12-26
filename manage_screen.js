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
    loadGroups();
    setupEventListeners();
    loadPlaylists();
  } else {
    alert("Please log in to access this screen.");
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

// Load Groups
async function loadGroups() {
  const groupsList = document.getElementById("groups-list");
  const groupsRef = collection(db, `users/${adminUID}/deviceGroups`);

  onSnapshot(groupsRef, (snapshot) => {
    groupsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const group = doc.data();
      const groupCard = createGroupCard(group, doc.id);
      groupsList.appendChild(groupCard);
    });
  });
}

// Create Group Card
function createGroupCard(group, groupId) {
  const card = document.createElement("div");
  card.className = "group-card";
  card.innerHTML = `
    <h4>${group.groupName || "Unnamed Group"}</h4>
    <p>Group ID: ${groupId}</p>
    <p>${group.devices.length} Devices</p>
    <button class="manage-group-btn" data-id="${groupId}">Manage</button>
  `;
  card.querySelector(".manage-group-btn").addEventListener("click", () => openGroupPopup(group, groupId));
  return card;
}

// Open Group Popup
function openGroupPopup(group, groupId) {
  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";

  document.getElementById("device-name").textContent = group.groupName || "Unnamed Group";
  document.getElementById("device-id").textContent = `Group ID: ${groupId}`;
  document.getElementById("device-status").textContent = `${group.devices.length} Devices`;

  loadMediaList();
  loadPlaylists();

  document.getElementById("push-media-btn").onclick = () => pushMediaToGroup(group.devices);
  document.getElementById("push-playlist-btn").onclick = () => pushPlaylistToGroup(group.devices);
  document.getElementById("clear-restart-btn").onclick = () => clearAndRestartGroup(group.devices);
  document.getElementById("close-popup").onclick = () => closePopup(popup);
}

// Push Media to Group with Orientation, Resize Mode, Delay, and Audio
function pushMediaToGroup(deviceIds) {
  const selectedMedia = document.querySelector(".media-item.selected");
  if (!selectedMedia) {
    alert("Please select media to push.");
    return;
  }

  const mediaUrl = selectedMedia.querySelector(".select-media-btn").dataset.url;
  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;

  deviceIds.forEach(async (deviceId) => {
    const deviceRef = doc(db, "devices", deviceId);
    await updateDoc(deviceRef, {
      currentMedia: [mediaUrl],
      orientation: orientation,
      resizeMode: resizeMode,
      delay: delaySeconds,
      audio: audio,
      lastContentPush: serverTimestamp(),
    });
  });

  alert("Media pushed to all devices in the group with orientation, resize mode, delay, and audio settings!");
}

// Push Playlist to Group with Orientation, Resize Mode, Delay, and Audio
function pushPlaylistToGroup(deviceIds) {
  const selectedPlaylistId = document.getElementById("playlist-select").value;
  if (!selectedPlaylistId) {
    alert("Please select a playlist.");
    return;
  }

  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;

  deviceIds.forEach(async (deviceId) => {
    const deviceRef = doc(db, "devices", deviceId);
    const playlistRef = doc(db, `users/${adminUID}/playlists`, selectedPlaylistId);
    const playlistDoc = await getDoc(playlistRef);

    if (playlistDoc.exists()) {
      await updateDoc(deviceRef, {
        currentMedia: playlistDoc.data().media,
        orientation: orientation,
        resizeMode: resizeMode,
        delay: delaySeconds,
        audio: audio,
        lastContentPush: serverTimestamp(),
      });
    }
  });

  alert("Playlist pushed to all devices in the group with orientation, resize mode, delay, and audio settings!");
}

// Open Device Popup
function openDevicePopup(device, deviceId) {
  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";

  document.getElementById("device-name").textContent = device.deviceName || "Unnamed Device";
  document.getElementById("device-id").textContent = `Device ID: ${deviceId}`;
  document.getElementById("device-status").textContent = device.status || "Unknown";
  document.getElementById("orientation-select").value = device.orientation || "landscape";
  document.getElementById("resize-select").value = device.resizeMode || "contain";
  document.getElementById("delay-input").value = device.delay || 5;
  document.getElementById("audio-select").value = device.audio || "mute";

  loadMediaList();
  loadPlaylists();

  document.getElementById("push-media-btn").onclick = () => pushMedia(deviceId);
  document.getElementById("push-playlist-btn").onclick = () => pushPlaylist(deviceId);
  document.getElementById("clear-restart-btn").onclick = () => clearAndRestart(deviceId);
  document.getElementById("close-popup").onclick = () => closePopup(popup);
}

// Clear and Restart Functionality
async function clearAndRestart(deviceId) {
  try {
    const deviceRef = doc(db, "devices", deviceId);
    await updateDoc(deviceRef, {
      currentMedia: null,
      commands: {
        clearContent: true,
        restartApp: true,
      },
    });
    alert("Media cleared and restart command sent!");
  } catch (error) {
    console.error("Error clearing and restarting device:", error);
  }
}

// Clear and Restart for Group
async function clearAndRestartGroup(deviceIds) {
  try {
    for (const deviceId of deviceIds) {
      const deviceRef = doc(db, "devices", deviceId);
      await updateDoc(deviceRef, {
        currentMedia: null,
        commands: {
          clearContent: true,
          restartApp: true,
        },
      });
    }
    alert("Media cleared and restart command sent to all devices in the group!");
  } catch (error) {
    console.error("Error clearing and restarting group devices:", error);
  }
}

// Push Media with Orientation, Resize Mode, Delay, and Audio
function pushMedia(deviceId) {
  const selectedMedia = document.querySelector(".media-item.selected");
  if (!selectedMedia) {
    alert("Please select media to push.");
    return;
  }

  const mediaUrl = selectedMedia.querySelector(".select-media-btn").dataset.url;
  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;
  const deviceRef = doc(db, "devices", deviceId);

  updateDoc(deviceRef, {
    currentMedia: [mediaUrl],
    orientation: orientation,
    resizeMode: resizeMode,
    delay: delaySeconds,
    audio: audio,
    lastContentPush: serverTimestamp(),
  })
    .then(() => alert("Media pushed successfully with orientation, resize mode, delay, and audio settings!"))
    .catch((error) => console.error("Error pushing media:", error));
}

// Push Playlist with Orientation, Resize Mode, Delay, and Audio
function pushPlaylist(deviceId) {
  const selectedPlaylistId = document.getElementById("playlist-select").value;
  if (!selectedPlaylistId) {
    alert("Please select a playlist.");
    return;
  }

  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;
  const deviceRef = doc(db, "devices", deviceId);
  const playlistRef = doc(db, `users/${adminUID}/playlists`, selectedPlaylistId);

  getDoc(playlistRef)
    .then((playlistDoc) => {
      if (playlistDoc.exists()) {
        updateDoc(deviceRef, {
          currentMedia: playlistDoc.data().media,
          orientation: orientation,
          resizeMode: resizeMode,
          delay: delaySeconds,
          audio: audio,
          lastContentPush: serverTimestamp(),
        }).then(() => alert("Playlist pushed successfully with orientation, resize mode, delay, and audio settings!"));
      }
    })
    .catch((error) => console.error("Error pushing playlist:", error));
}

// Close Popup
function closePopup(popup) {
  popup.style.display = "none";
}

// Load Media List
async function loadMediaList() {
  const mediaList = document.getElementById("media-list");
  mediaList.innerHTML = "";

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
}

// Select Media
function selectMedia(mediaItem) {
  document.querySelectorAll(".media-item").forEach((item) => item.classList.remove("selected"));
  mediaItem.classList.add("selected");
}

// Load Playlists
async function loadPlaylists() {
  const playlistSelect = document.getElementById("playlist-select");
  playlistSelect.innerHTML = `<option value="">Select Playlist</option>`;

  const playlistsRef = collection(db, `users/${adminUID}/playlists`);
  const querySnapshot = await getDocs(playlistsRef);

  querySnapshot.forEach((doc) => {
    const playlist = doc.data();
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = playlist.name || "Unnamed Playlist";
    playlistSelect.appendChild(option);
  });
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
