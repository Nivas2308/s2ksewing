// Define the script URLs
const scriptURL =
  "https://script.google.com/macros/s/AKfycbwRSPzWFIq2I0fkd84d3F8-C0XQIC-rsg-uuaDogfzh7yKsPW5VgaSKoY8gTXKyAHBQ/exec";

// Replace with your Google Apps Script URL for branding
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec";

// Default fallback background image
const DEFAULT_BACKGROUND =
  "https://images.unsplash.com/photo-1470167290877-7d5d3446de4c?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

// Get references to DOM elements
const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginBtn");
const loader = document.getElementById("loader");

// Global background loader instance
let backgroundLoaderInstance = null;

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the background loader with custom settings
  backgroundLoaderInstance = initBackgroundLoader({
    googleScriptUrl: GOOGLE_SCRIPT_URL,
    defaultBackground: DEFAULT_BACKGROUND,
    loadingText: "Preparing Your Experience...",
    loadingTimeout: 10000, // 10 seconds
    fadeInDuration: 1000, // 1 second fade
    showLoadingOverlay: true,
  });

  // Other initialization code
  checkExistingLogin();
  checkRedirectParameters();

  const usernameField = document.getElementById("username");
  if (usernameField) {
    usernameField.focus();
  }

  loadRememberedUsername();
});

// Custom alert function
function showCustomAlert(title, message, type = "success") {
  // Create alert container if it doesn't exist
  let alertContainer = document.getElementById("custom-alert-container");
  if (!alertContainer) {
    alertContainer = document.createElement("div");
    alertContainer.id = "custom-alert-container";
    document.body.appendChild(alertContainer);
  }

  // Create alert content
  const alertContent = `
    <div class="custom-alert alert-${type}">
      <h3>${title}</h3>
      <p>${message}</p>
      <button class="alert-btn" onclick="closeCustomAlert()">OK</button>
    </div>
  `;

  // Add alert to container
  alertContainer.innerHTML = alertContent;
  alertContainer.style.display = "flex";

  // Add close function to window
  window.closeCustomAlert = function () {
    alertContainer.style.display = "none";
  };
}

// Employee verification functions
function showEmployeeModal() {
  const modal = document.getElementById("employee-verification-modal");
  modal.style.display = "flex";

  // Focus on email input
  setTimeout(() => {
    document.getElementById("employee-email").focus();
  }, 100);
}

function closeEmployeeModal() {
  const modal = document.getElementById("employee-verification-modal");
  modal.style.display = "none";

  // Clear the email input
  document.getElementById("employee-email").value = "";
}

function verifyEmployeeEmail() {
  const emailInput = document.getElementById("employee-email");
  const email = emailInput.value.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showCustomAlert(
      "Invalid Email",
      "Please enter a valid email address.",
      "error"
    );
    return;
  }

  // Check if email ends with @s2ksewing.com
  if (email.endsWith("@s2ksewing.com")) {
    closeEmployeeModal();

    // Show success message
    showCustomAlert(
      "Access Granted",
      "Email verified successfully! Redirecting to employee login...",
      "success"
    );

    // Redirect to admin login after a short delay
    setTimeout(() => {
      window.location.href = "adminlogin.html";
    }, 1500);
  } else {
    closeEmployeeModal();
    showCustomAlert("Access Denied", "Access is restricted.", "error");
  }
}

async function loginUser(username, password) {
  try {
    // Show loader
    submitBtn.style.display = "none";
    loader.style.display = "block";

    // IMPORTANT: Do NOT modify the case of username or password
    // Send them exactly as the user typed them
    const response = await fetch(
      scriptURL +
        `?action=login&username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`
    );

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const text = await response.text();

    // Hide loader
    submitBtn.style.display = "block";
    loader.style.display = "none";

    if (!text) {
      throw new Error("Empty response from server");
    }

    const result = JSON.parse(text);

    // Enhanced logging for case-sensitive debugging
    if (result.success) {
      console.log(`Login successful for username: '${username}' (exact case)`);
      console.log(`Server returned userId: ${result.userId}`);
      console.log(`Server returned username: '${result.username}'`);
    } else {
      console.log(`Login failed for username: '${username}' (exact case)`);
      console.log(`Server message: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error in loginUser:", error);
    // Make sure loader is hidden in case of error
    submitBtn.style.display = "block";
    loader.style.display = "none";
    return {
      success: false,
      message:
        "Failed to connect to server. Please check your internet connection and try again.",
    };
  }
}

// Enhanced handleLogin function with case-sensitive storage
function handleLogin(event, username, password, userId, serverUsername) {
  // Use the exact username returned from server (or original if not provided)
  const exactUsername = serverUsername || username;

  // Extract name from username (email) or use provided username
  const name = exactUsername.includes("@")
    ? exactUsername.split("@")[0]
    : exactUsername;

  // Make sure we have a userId
  if (!userId) {
    userId = generateUserId(exactUsername);
  }

  // Save to localStorage and sessionStorage with EXACT case preservation
  const userInfo = {
    email: exactUsername.includes("@") ? exactUsername : "",
    name: name,
    userId: userId,
    username: exactUsername, // Store exact case username
    loginTime: new Date().toISOString(),
    caseSensitive: true, // Flag to indicate this is case-sensitive storage
  };

  // Store the userId separately for easy access
  localStorage.setItem("userId", userId);
  sessionStorage.setItem("userId", userId);

  // Store the complete userInfo object
  localStorage.setItem("userInfo", JSON.stringify(userInfo));
  sessionStorage.setItem("userInfo", JSON.stringify(userInfo));

  // Set login flags
  localStorage.setItem("isLoggedIn", "true");
  sessionStorage.setItem("isLoggedIn", "true");

  // Store exact case username
  localStorage.setItem("username", exactUsername);
  sessionStorage.setItem("username", exactUsername);

  console.log(`User info stored with exact username: '${exactUsername}'`);

  return userInfo;
}

// Enhanced form submission handler with case-sensitive alerts
if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get values WITHOUT any case modification
    const username = document.getElementById("username").value; // No .trim() here to preserve exact input
    const password = document.getElementById("password").value; // No .trim() here to preserve exact input
    const rememberMe = document.getElementById("remember-me").checked;

    // Only trim for validation, but use original values for login
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Basic validation
    if (!trimmedUsername || !trimmedPassword) {
      showCustomAlert("Error", "Please fill in all fields.", "error");
      return;
    }

    // Save remembered username (with exact case)
    saveRememberedUsername(trimmedUsername, rememberMe);

    try {
      // Attempt login with exact case values
      const result = await loginUser(trimmedUsername, trimmedPassword);

      if (result.success) {
        // Handle successful login with exact username from server
        const userInfo = handleLogin(
          e,
          trimmedUsername,
          trimmedPassword,
          result.userId,
          result.username // Use exact username from server
        );

        showCustomAlert(
          "Login Successful",
          `Welcome back, ${userInfo.name}! (Username: '${userInfo.username}')`,
          "success"
        );

        // Redirect after a short delay
        setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get("redirect") || "/index.html";
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        // Enhanced error message for case-sensitive issues
        let errorMessage = result.message || "Invalid username or password.";

        // Add helpful hint about case sensitivity
        if (errorMessage.includes("Invalid username or password")) {
          errorMessage +=
            "\n\nNote: Usernames are case-sensitive. Please check your capitalization.";
        }

        showCustomAlert("Login Failed", errorMessage, "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showCustomAlert(
        "Error",
        "An error occurred during login. Please try again.",
        "error"
      );
    }
  });
}

// Enhanced generateUserId function to handle case-sensitive usernames
function generateUserId(username) {
  // Extract name from email if username is an email
  const name = username.includes("@") ? username.split("@")[0] : username;

  // Create a hash that preserves case sensitivity
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Add the original username length and first character code for uniqueness
  const firstCharCode = username.length > 0 ? username.charCodeAt(0) : 0;
  hash = hash + username.length + firstCharCode;

  // Format as a user ID (use absolute value to ensure positive)
  return `user_${Math.abs(hash).toString(16)}`;
}

// Enhanced function to load remembered username with case preservation
function loadRememberedUsername() {
  const rememberedUsername = localStorage.getItem("rememberedUsername");
  const rememberCheckbox = document.getElementById("remember-me");
  const usernameField = document.getElementById("username");

  if (rememberedUsername && usernameField) {
    // Set the exact case username as remembered
    usernameField.value = rememberedUsername;
    rememberCheckbox.checked = true;
    console.log(
      `Loaded remembered username: '${rememberedUsername}' (exact case)`
    );
  }
}

// Enhanced function to save username with exact case
function saveRememberedUsername(username, remember) {
  if (remember) {
    // Save the exact case username
    localStorage.setItem("rememberedUsername", username);
    console.log(`Saved remembered username: '${username}' (exact case)`);
  } else {
    localStorage.removeItem("rememberedUsername");
    console.log("Removed remembered username");
  }
}
// Main form submission handler
if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("remember-me").checked;

    // Basic validation
    if (!username || !password) {
      showCustomAlert("Error", "Please fill in all fields.", "error");
      return;
    }

    // Save remembered username
    saveRememberedUsername(username, rememberMe);

    try {
      // Attempt login
      const result = await loginUser(username, password);

      if (result.success) {
        // Handle successful login
        const userInfo = handleLogin(e, username, password, result.userId);

        showCustomAlert(
          "Login Successful",
          `Welcome back, ${userInfo.name}!`,
          "success"
        );

        // Redirect after a short delay
        setTimeout(() => {
          // Check if there's a redirect URL
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get("redirect") || "/index.html";
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        // Handle login failure
        showCustomAlert(
          "Login Failed",
          result.message || "Invalid username or password.",
          "error"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      showCustomAlert(
        "Error",
        "An error occurred during login. Please try again.",
        "error"
      );
    }
  });
}

// Event listeners for footer links
document.addEventListener("DOMContentLoaded", function () {
  // Employee login link
  const employeeLoginLink = document.getElementById("employee-login");
  if (employeeLoginLink) {
    employeeLoginLink.addEventListener("click", function (e) {
      e.preventDefault();
      showEmployeeModal();
    });
  }

  // Forgot password link
  const forgotPasswordLink = document.getElementById("forgot-password");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      showCustomAlert(
        "Password Reset",
        "Please contact support to reset your password.",
        "error"
      );
    });
  }

  // Handle Enter key in employee email modal
  const employeeEmailInput = document.getElementById("employee-email");
  if (employeeEmailInput) {
    employeeEmailInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        verifyEmployeeEmail();
      }
    });
  }

  // Handle Escape key to close modals
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const employeeModal = document.getElementById(
        "employee-verification-modal"
      );
      const alertContainer = document.getElementById("custom-alert-container");

      if (employeeModal && employeeModal.style.display === "flex") {
        closeEmployeeModal();
      }

      if (alertContainer && alertContainer.style.display === "flex") {
        closeCustomAlert();
      }
    }
  });
});

// Function to handle logout (for future use)
function logout() {
  // Clear all stored data
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userId");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("username");

  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("userInfo");
  sessionStorage.removeItem("username");

  // Update profile icon
  updateProfileIconColor(false);

  // Redirect to login page
  window.location.href = "login.html";
}

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to show loading state
function showLoading(show = true) {
  if (show) {
    submitBtn.style.display = "none";
    loader.style.display = "block";
  } else {
    submitBtn.style.display = "block";
    loader.style.display = "none";
  }
}

// Function to handle network errors
function handleNetworkError(error) {
  console.error("Network error:", error);
  showCustomAlert(
    "Connection Error",
    "Unable to connect to the server. Please check your internet connection and try again.",
    "error"
  );
}

// Function to clear form
function clearForm() {
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("remember-me").checked = false;
}

// Additional utility functions for background loader interaction
function updateLoadingText(text) {
  if (backgroundLoaderInstance) {
    backgroundLoaderInstance.updateLoadingText(text);
  }
}

function isBackgroundReady() {
  return backgroundLoaderInstance
    ? backgroundLoaderInstance.isBackgroundLoaded()
    : false;
}

function hideBackgroundLoader() {
  if (backgroundLoaderInstance) {
    backgroundLoaderInstance.hideLoading();
  }
}

// Add global error handler
window.addEventListener("error", function (e) {
  console.error("Global error:", e.error);
});

// Add unhandled promise rejection handler
window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled promise rejection:", e.reason);
});
