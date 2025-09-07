const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzpa6hUbVxXZfzTgNpoU2CfeoAz7UACmF39MoNUQNqmmVRWT5Fy8fAbmreRw3NQ0NI/exec";
const DEFAULT_BACKGROUND =
  "https://images.unsplash.com/photo-1470167290877-7d5d3446de4c?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

function setBackgroundImage(imageUrl) {
  document.body.style.backgroundImage = `url('${imageUrl}')`;
}

async function loadBackgroundFromSheet() {
  try {
    console.log("Fetching background image from Google Sheets...");
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=branding`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.success && data.backgroundImage) {
      setBackgroundImage(data.backgroundImage);
    } else {
      setBackgroundImage(DEFAULT_BACKGROUND);
    }
  } catch (error) {
    console.error("Error loading background from Google Sheets:", error);
    setBackgroundImage(DEFAULT_BACKGROUND);
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", function () {
  setBackgroundImage(DEFAULT_BACKGROUND);
  loadBackgroundFromSheet();
});
// Script URL for admin login
const scriptURL =
  "https://script.google.com/macros/s/AKfycbxP1_iEtYzHCJ2r5qxdJsW-mHN5ZfL_YtE08kH55iPH9C1f-v_pGs0AYx2DRv2k2GiB/exec";
const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");

// Check if already logged in
if (localStorage.getItem("isAdminLoggedIn") === "true") {
  window.location.href = "/server/admin.html";
}

// Toggle password visibility
togglePassword.addEventListener("click", function () {
  const passwordInput = document.getElementById("password");
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  togglePassword.innerHTML =
    type === "password"
      ? '<i class="far fa-eye"></i>'
      : '<i class="far fa-eye-slash"></i>';
});

// Custom Alert Implementation
function createCustomAlert(message, isError, shouldRedirect = false) {
  // Create container for alerts if it doesn't exist
  if (!document.getElementById("custom-alert-container")) {
    const alertContainer = document.createElement("div");
    alertContainer.id = "custom-alert-container";
    document.body.appendChild(alertContainer);
  }

  const container = document.getElementById("custom-alert-container");

  // Create alert box
  const alertBox = document.createElement("div");
  alertBox.className = `custom-alert ${
    isError ? "alert-error" : "alert-success"
  }`;

  // Create title based on message type
  const title = document.createElement("h3");
  title.textContent = isError ? "Error" : "Success";

  // Create message
  const text = document.createElement("p");
  text.textContent = message;

  // Create button
  const button = document.createElement("button");
  button.className = "alert-btn";
  button.textContent = "OK";
  button.onclick = function () {
    container.remove();

    // Redirect if login is successful
    if (shouldRedirect) {
      window.location.href = "/server/admin.html";
    }
  };

  // Assemble alert
  alertBox.appendChild(title);
  alertBox.appendChild(text);
  alertBox.appendChild(button);
  container.appendChild(alertBox);
}

// Override the default alert function
window.originalAlert = window.alert;
window.alert = function (message) {
  const isError =
    message.toLowerCase().includes("invalid") ||
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("error") ||
    message.toLowerCase().includes("pending");

  const shouldRedirect =
    !isError &&
    (message.toLowerCase().includes("successful") ||
      message.toLowerCase().includes("success"));

  createCustomAlert(message, isError, shouldRedirect);
};

// Function to fetch employee details
function fetchEmployeeDetails(username) {
  const queryParams = `?action=getEmployeeDetails&username=${encodeURIComponent(
    username
  )}`;

  fetch(scriptURL + queryParams)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        // Store employee details in localStorage
        localStorage.setItem("adminEmail", data.email);
        localStorage.setItem("adminProfileImage", data.profileImage);
        localStorage.setItem("adminName", `${data.firstName} ${data.lastName}`);

        // Redirect to admin panel
        alert("Login successful! Redirecting to admin panel...");
      } else {
        errorMessage.textContent = "Failed to load employee details.";
        errorMessage.style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      // If error occurs, still redirect but without profile image
      localStorage.setItem("adminEmail", username);
      alert("Login successful! Redirecting to admin panel...");
    });
}

// Handle form submission
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  if (!username || !password) {
    errorMessage.textContent = "Please enter both username and password";
    errorMessage.style.display = "block";
    return;
  }

  // Hide error message and show loader
  errorMessage.style.display = "none";
  submitBtn.style.display = "none";
  loader.style.display = "block";

  // Prepare data for API
  const formData = `action=login&username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;

  try {
    // Make POST request to API
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      redirect: "follow",
    });

    const result = await response.text();

    // Hide loader
    loader.style.display = "none";
    submitBtn.style.display = "block";

    if (result === "superadmin") {
      // Super admin login successful
      localStorage.setItem("isAdminLoggedIn", "true");
      localStorage.setItem("isSuperAdmin", "true");
      localStorage.setItem("adminEmail", "s2ksewing@gmail.com"); // Super admin email
      localStorage.setItem("adminUsername", username);
      alert("Super Admin login successful! Redirecting...");
    } else if (result === "approved") {
      // Employee login successful
      localStorage.setItem("isAdminLoggedIn", "true");
      localStorage.setItem("isSuperAdmin", "false");
      localStorage.setItem("adminUsername", username);

      // Get employee details including profile image
      fetchEmployeeDetails(username);
    } else if (result === "pending") {
      // Account pending approval
      errorMessage.textContent =
        "Your account is pending approval from Super Admin.";
      errorMessage.style.display = "block";
    } else {
      // Login denied
      errorMessage.textContent = "Invalid username or password.";
      errorMessage.style.display = "block";
    }
  } catch (error) {
    console.error("Error:", error);
    loader.style.display = "none";
    submitBtn.style.display = "block";
    errorMessage.textContent = "Something went wrong. Please try again.";
    errorMessage.style.display = "block";
  }
});

// Handle forgot password link
document
  .getElementById("forgot-password")
  .addEventListener("click", function (e) {
    e.preventDefault();
    alert("Please contact Super Admin to reset your password.");
  });

document.addEventListener("DOMContentLoaded", function () {
  const loginContainer = document.querySelector(".login-container");

  // Check if employee is logged in
  if (localStorage.getItem("isAdminLoggedIn") === "true") {
    const username = localStorage.getItem("adminUsername");
    const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
    const displayName = localStorage.getItem("adminName") || username;

    // Replace login form with welcome screen
    loginContainer.innerHTML = `
          <div class="login-box">
            <h2>Welcome, ${displayName}!</h2>
            <p style="text-align: center; margin-bottom: 20px;">You are successfully logged in as ${
              isSuperAdmin ? "Super Admin" : "Employee"
            }.</p>
            <button class="btn logout-btn" id="logoutBtn">Sign Out</button>
            <button class="btn admin-btn" id="adminBtn">Go to Admin Panel</button>
          </div>
        `;

    // Add event listener for logout button
    document.getElementById("logoutBtn").addEventListener("click", function () {
      // Clear localStorage
      localStorage.removeItem("isAdminLoggedIn");
      localStorage.removeItem("isSuperAdmin");
      localStorage.removeItem("adminUsername");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminName");
      localStorage.removeItem("adminProfileImage");

      // Reload the page to show login form
      window.location.reload();
    });

    document.getElementById("adminBtn").addEventListener("click", function () {
      // Redirect to admin panel
      window.location.href = "/server/admin.html";
    });
  }
});
