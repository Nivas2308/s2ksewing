// Script URL for Google Sheets API
const scriptURL = "https://script.google.com/macros/s/AKfycbxc4MiWDTvcSA6JhNo1hIgntv7ZRebLO11IZHMhSHtqiGhSEnpiOENG3Fbhx4JUOatueA/exec";

// DOM Elements
const profileForm = document.getElementById("profileForm");
const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formInputs = document.querySelectorAll("#profileForm input:not(#username), #profileForm select");
const logoutBtn = document.getElementById("logoutBtn");
const notification = document.getElementById("notification");
const loadingContainer = document.getElementById("loadingContainer");
const mainContent = document.getElementById("mainContent");

// User data object
const userData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  countryCode: "+1",
  birthday: "",
  address: "",
  username: "",
};

// Original form values for reset functionality
const originalValues = {};

// Format date for display
function formatBirthday(dateString) {
  if (!dateString) return "Not specified";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
}

// Format phone number for display
function formatPhoneNumber(phone) {
  if (!phone) return "Not specified";
  // Format as XXX-XXX-XXXX if it's 10 digits
  if (/^\d{10}$/.test(phone)) {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  return phone;
}

// Update welcome section
function updateWelcomeSection() {
  document.getElementById("welcomeFirstName").textContent = userData.firstName || "User";
  document.getElementById("welcomeEmail").textContent = userData.email || "No email provided";
  document.getElementById("welcomePhone").textContent = (userData.countryCode || "+1") + " " + formatPhoneNumber(userData.phone);
  document.getElementById("welcomeBirthday").textContent = formatBirthday(userData.birthday);
}

// Store original form values
function storeOriginalValues() {
  formInputs.forEach((input) => {
    originalValues[input.id] = input.value;
  });
  // Also store username separately (since it's not included in formInputs)
  originalValues["username"] = document.getElementById("username").value;
}

// Reset form to original values
function resetForm() {
  formInputs.forEach((input) => {
    if (originalValues[input.id] !== undefined) {
      input.value = originalValues[input.id];
      input.style.borderColor = ""; // Reset any validation styling
    }
  });
}

// Toggle form edit state
function setFormEditState(isEditable) {
  formInputs.forEach((input) => {
    input.disabled = !isEditable;
  });
  saveBtn.style.display = isEditable ? "block" : "none";
  cancelBtn.style.display = isEditable ? "block" : "none";
  editBtn.style.display = isEditable ? "none" : "block";
}

// Form validation
function validateForm() {
  let isValid = true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/; // Simple 10-digit phone validation
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  
  // Clear previous error styling
  [email, phone, firstName, lastName].forEach((field) => {
    field.style.borderColor = "";
  });
  
  // Validate first name (not empty)
  if (!firstName.value.trim()) {
    firstName.style.borderColor = "red";
    isValid = false;
  }
  
  // Validate last name (not empty)
  if (!lastName.value.trim()) {
    lastName.style.borderColor = "red";
    isValid = false;
  }
  
  // Validate email
  if (!emailRegex.test(email.value)) {
    email.style.borderColor = "red";
    isValid = false;
  }
  
  // Validate phone - only if it's not empty
  if (phone.value.trim() && !phoneRegex.test(phone.value.replace(/\D/g, ""))) {
    phone.style.borderColor = "red";
    isValid = false;
  }
  
  return isValid;
}

// Show notification message
function showNotification(message, isSuccess = true) {
  notification.textContent = message;
  notification.style.backgroundColor = isSuccess ? "#4CAF50" : "#f44336";
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// Check if user is logged in
function checkLoginStatus() {
  // Show loading
  loadingContainer.style.display = "block";
  mainContent.style.display = "none";
  
  // Check sessionStorage first (current tab)
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const username = sessionStorage.getItem("username");
  
  // If not in sessionStorage, check localStorage (persistent across tabs)
  if (!isLoggedIn || !username) {
    const persistentLogin = localStorage.getItem("isLoggedIn") === "true";
    const persistentUsername = localStorage.getItem("username");
    
    if (persistentLogin && persistentUsername) {
      // Copy from localStorage to sessionStorage
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("username", persistentUsername);
      // Continue with the persistent username
      fetchUserData(persistentUsername);
      return;
    }
    
    // If not logged in at all, redirect to login page
    window.location.href = "login.html?redirect=cp.html";
    return;
  }
  
  // User is logged in, fetch their data
  fetchUserData(username);
}

// Fetch user data from Google Sheets
async function fetchUserData(username) {
  try {
    // Show loading state
    loadingContainer.style.display = "block";
    mainContent.style.display = "none";
    
    // Make sure we're using the correct username parameter in the request
    const response = await fetch(`${scriptURL}?action=getUserData&username=${encodeURIComponent(username)}`);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Add error handling for empty response
    if (!text || text.trim() === "") {
      throw new Error("Empty response from server");
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid response format from server");
    }
    
    if (data.success) {
      // We found user data
      userData.username = username;
      userData.firstName = data.userData.firstName || "";
      userData.lastName = data.userData.lastName || "";
            userData.email = data.userData.email || "";
      userData.phone = data.userData.phone || "";
      userData.countryCode = data.userData.countryCode || "+1";
      userData.birthday = data.userData.birthday || "";
      userData.address = data.userData.address || "";
      
      // Populate form with user data
      document.getElementById("username").value = userData.username;
      document.getElementById("firstName").value = userData.firstName;
      document.getElementById("lastName").value = userData.lastName;
      document.getElementById("email").value = userData.email;
      document.getElementById("phone").value = userData.phone;
      document.getElementById("countryCode").value = userData.countryCode;
      document.getElementById("birthday").value = userData.birthday;
      document.getElementById("address").value = userData.address;
      
      // Update welcome section
      updateWelcomeSection();
      
      // Show welcome notification
      if (userData.firstName) {
        showNotification(`Welcome back, ${userData.firstName}!`);
      } else {
        showNotification(`Welcome back, ${username}!`);
      }
    } else {
      // New user or error, initialize with empty form
      userData.username = username;
      // Set the username in the form
      document.getElementById("username").value = username;
      showNotification("Welcome! Please complete your profile information.", true);
      // For new users, automatically enter edit mode
      setTimeout(() => {
        setFormEditState(true);
      }, 500);
    }
    
    // Store original values
    storeOriginalValues();
  } catch (error) {
    console.error("Error fetching user data:", error);
    showNotification("Error loading your profile. Please try again later.", false);
    // Initialize with at least the username
    userData.username = username;
    document.getElementById("username").value = username;
  } finally {
    // Show main content regardless of success/failure
    loadingContainer.style.display = "none";
    mainContent.style.display = "grid";
  }
}

// Prepare form data for submission
function prepareFormData() {
  const formData = new FormData();
  formData.append("action", "saveUserData");
  formData.append("username", userData.username);
  
  // Get values from form fields
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const countryCode = document.getElementById("countryCode").value;
  const birthday = document.getElementById("birthday").value;
  const address = document.getElementById("address").value.trim();
  
  // Append values to formData
  formData.append("firstName", firstName);
  formData.append("lastName", lastName);
  formData.append("email", email);
  formData.append("phone", phone);
  formData.append("countryCode", countryCode);
  formData.append("birthday", birthday);
  formData.append("address", address);
  
  return formData;
}

// Save user data to Google Sheets
async function saveUserData() {
  try {
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    
    // Prepare form data
    const formData = prepareFormData();
    
    // Send data to Google Sheets
    const response = await fetch(scriptURL, {
      method: "POST",
      body: formData,
    });
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Validate response
    if (!text || text.trim() === "") {
      throw new Error("Empty response from server");
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid response format from server");
    }
    
    if (data.success) {
      // Update user data object
      userData.firstName = document.getElementById("firstName").value;
      userData.lastName = document.getElementById("lastName").value;
      userData.email = document.getElementById("email").value;
      userData.phone = document.getElementById("phone").value;
      userData.countryCode = document.getElementById("countryCode").value;
      userData.birthday = document.getElementById("birthday").value;
      userData.address = document.getElementById("address").value;
      
      // Update welcome section
      updateWelcomeSection();
      
      // Update original values
      storeOriginalValues();
      
      // Exit edit mode
      setFormEditState(false);
      
      showNotification("Profile updated successfully!");
    } else {
      // Show error message from server if available
      const errorMessage = data.message || "Error saving profile. Please try again.";
      showNotification(errorMessage, false);
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    showNotification("Error saving profile. Please try again.", false);
  } finally {
    // Reset button state
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

// Log out the user
function logoutUser() {
  {
    // Clear all storage
    sessionStorage.clear();
    localStorage.clear();
    
    // Reset profile icon
    const profileIcon = document.getElementById('profile-icon');
    if (profileIcon) {
      profileIcon.className = 'fa fa-user-circle';
    }
    
    // Show notification and redirect
    showNotification("Logging out...");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }
}




// Phone number formatting (optional, can be added to improve UX)
function formatPhoneInput(input) {
  // Strip all non-digits
  let cleaned = input.value.replace(/\D/g, "");
  // Enforce max length
  if (cleaned.length > 10) {
    cleaned = cleaned.substring(0, 10);
  }
  // Format as user is typing (XXX-XXX-XXXX)
  let formatted = cleaned;
  if (cleaned.length > 6) {
    formatted = `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length > 3) {
    formatted = `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
  }
  // Update the input value
  input.value = formatted;
}

// Initialize phone input formatting
function initPhoneFormatting() {
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      formatPhoneInput(this);
    });
  }
}

// Event Listeners for profile management
document.addEventListener("DOMContentLoaded", function () {
  // Initialize profile management if elements exist
  if (profileForm && editBtn && saveBtn && cancelBtn) {
    // Check login status when page loads
    checkLoginStatus();
    
    // Initialize optional phone formatting
    initPhoneFormatting();
    
    // Edit button event
    editBtn.addEventListener("click", function () {
      setFormEditState(true);
    });
    
    // Cancel button event
    cancelBtn.addEventListener("click", function () {
      resetForm();
      setFormEditState(false);
    });
    
    // Form submission event
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (validateForm()) {
        saveUserData();
      } else {
        showNotification("Please check the highlighted fields and try again.", false);
      }
    });
    
   // Logout button event
if (logoutBtn) {
  logoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    logoutUser();
  });
}

    // Handle pressing Enter in form fields (don't submit form on every field)
    document.querySelectorAll("#profileForm input").forEach((input) => {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && this.id !== "address") {
          e.preventDefault();
          const nextElement = this.parentElement.nextElementSibling;
          if (nextElement) {
            const nextInput = nextElement.querySelector("input, select");
            if (nextInput) nextInput.focus();
          }
        }
      });
    });
  }
});

const sidebarToggleBtn = document.getElementById("sidebarToggle");
const sidebar = document.querySelector(".sidebar");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

if (sidebarToggleBtn && sidebar) {
  sidebarToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });
}

if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener("click", () => {
    sidebar.classList.remove("show");
  });
}
