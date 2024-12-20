import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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

// Authenticate Admin
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminUID = user.uid;
    loadConnectedDevices();
  } else {
    alert("Please log in to access this feature.");
    window.location.href = "login.html";
  }
});

// Load Connected Devices
async function loadConnectedDevices() {
  try {
    const devicesRef = collection(db, "devices");
    const connectedDevicesQuery = query(devicesRef, where("connectedBy", "==", adminUID));
    const devicesList = document.getElementById("devices-list");

    onSnapshot(connectedDevicesQuery, (snapshot) => {
      devicesList.innerHTML = ""; // Clear the list
      if (snapshot.empty) {
        devicesList.innerHTML = "<p>No connected devices found.</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const device = doc.data();
        const deviceCard = createDeviceCard(device, doc.id);
        devicesList.appendChild(deviceCard);
      });
    });
  } catch (error) {
    console.error("Error loading connected devices:", error);
    alert("An error occurred while loading connected devices.");
  }
}

// Create Device Card
function createDeviceCard(device, deviceId) {
  const card = document.createElement("div");
  card.className = "device-item";
  card.innerHTML = `
    <input type="checkbox" id="${deviceId}" class="device-checkbox">
    <label for="${deviceId}">
      <strong>${device.deviceName || "Unnamed Device"}</strong>
      <p>ID: ${deviceId}</p>
    </label>
  `;
  return card;
}

// Create Group for Selected Devices
async function createGroup() {
  const selectedDevices = Array.from(document.querySelectorAll(".device-checkbox:checked"));
  if (selectedDevices.length === 0) {
    alert("Please select at least one device to create a group.");
    return;
  }

  const groupName = prompt("Enter a name for the group:");
  if (!groupName) {
    alert("Group creation cancelled.");
    return;
  }

  try {
    const groupDevices = [];
    for (const checkbox of selectedDevices) {
      const deviceId = checkbox.id;
      const deviceRef = doc(db, "devices", deviceId);
      const deviceSnapshot = await getDoc(deviceRef);

      if (deviceSnapshot.exists()) {
        const deviceData = deviceSnapshot.data();
        groupDevices.push({
          id: deviceId,
          name: deviceData.deviceName || "Unnamed Device", // Store device name
        });
      }
    }

    const groupRef = doc(collection(db, "deviceGroups"));
    await setDoc(groupRef, {
      groupName,
      devices: groupDevices, // Store device details (names and IDs)
      createdBy: adminUID,
      createdAt: new Date().toISOString(),
    });

    alert(`Group "${groupName}" created successfully!`);
  } catch (error) {
    console.error("Error creating group:", error);
    alert("An error occurred while creating the group.");
  }
}
