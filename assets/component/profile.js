// Profile icon update functionality
document.addEventListener("DOMContentLoaded", function () {
  // Get the profile icon element
  const profileIcon = document.getElementById("profile-icon");
  const profileLink = document.getElementById("profile-link");

  // Enhanced function to check if user is truly logged in
  function isUserLoggedIn() {
    // Check both localStorage and sessionStorage
    const localStorageLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const sessionStorageLoggedIn =
      sessionStorage.getItem("isLoggedIn") === "true";

    // Get user info from both storages
    const localUserInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const sessionUserInfo = JSON.parse(
      sessionStorage.getItem("userInfo") || "{}"
    );

    // Check if we have valid user data
    const hasValidLocalUser =
      localUserInfo && localUserInfo.name && localUserInfo.userId;
    const hasValidSessionUser =
      sessionUserInfo && sessionUserInfo.name && sessionUserInfo.userId;

    // User is logged in if:
    // 1. localStorage says logged in AND has valid user info
    // 2. OR sessionStorage says logged in AND has valid user info
    return (
      (localStorageLoggedIn && hasValidLocalUser) ||
      (sessionStorageLoggedIn && hasValidSessionUser)
    );
  }

  // Enhanced function to get user info from available storage
  function getUserInfo() {
    // Try sessionStorage first (most recent), then localStorage
    let userInfo = JSON.parse(sessionStorage.getItem("userInfo") || "{}");

    if (!userInfo || !userInfo.name) {
      userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    }

    return userInfo;
  }

  // Enhanced function to sync storage data
  function syncStorageData() {
    const localUserInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const localIsLoggedIn = localStorage.getItem("isLoggedIn");
    const localUserId = localStorage.getItem("userId");
    const localUsername = localStorage.getItem("username");

    // If localStorage has valid data but sessionStorage doesn't, sync it
    if (localUserInfo && localUserInfo.name && localIsLoggedIn === "true") {
      const sessionUserInfo = JSON.parse(
        sessionStorage.getItem("userInfo") || "{}"
      );

      if (!sessionUserInfo || !sessionUserInfo.name) {
        // Restore session data from localStorage
        sessionStorage.setItem("userInfo", JSON.stringify(localUserInfo));
        sessionStorage.setItem("isLoggedIn", "true");

        if (localUserId) {
          sessionStorage.setItem("userId", localUserId);
        }

        if (localUsername) {
          sessionStorage.setItem("username", localUsername);
        }

        console.log("Restored session data from localStorage");
      }
    }
  }

  // Check if user is logged in and update profile icon
  function checkLoginStatus() {
    // First, try to sync storage data
    syncStorageData();

    // Check if user is logged in
    if (isUserLoggedIn()) {
      const userInfo = getUserInfo();

      if (userInfo && userInfo.name) {
        // User is logged in - replace icon with first letter of name
        const firstLetter = userInfo.name.charAt(0).toUpperCase();

        // Remove the Font Awesome icon
        profileIcon.classList.remove("fa", "fa-user-circle");

        // Create a styled initial in place of the icon
        profileIcon.innerHTML = firstLetter;
        profileIcon.classList.add("user-initial");

        // Update href to point to account page instead of login
        profileLink.href = "cp.html"; // Customer profile/account page

        console.log(`Profile updated for logged-in user: ${userInfo.name}`);
        return;
      }
    }

    // User is not logged in - ensure icon is displayed
    profileIcon.innerHTML = "";
    profileIcon.classList.add("fa", "fa-user-circle");
    profileIcon.classList.remove("user-initial");

    // Set link to login page
    profileLink.href = "login.html";

    console.log("Profile updated for guest user");
  }

  // Enhanced logout function
  function performLogout() {
    // Clear all stored data from both storages
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("username");

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userInfo");
    sessionStorage.removeItem("username");

    // Clear cart data if needed
    localStorage.removeItem("shoppingCart");
    sessionStorage.removeItem("shoppingCart");

    // Update the UI immediately
    checkLoginStatus();

    // Trigger storage event for other tabs
    localStorage.setItem("logoutEvent", Date.now().toString());
    localStorage.removeItem("logoutEvent");

    console.log("User logged out completely");
  }

  // Add required CSS for the user initial display
  function addProfileIconStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .user-initial {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background-color: #4caf50;
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
          text-decoration: none;
          font-style: initial;
        }
        
        /* Add hover effect */
        .user-initial:hover {
          background-color: #3d9c40;
        }

        /* Cart counter styling */
        .cart-counter {
          position: absolute;
          top: -8px;
          right: -8px;
          background-color: #4caf50;
          color: white;
          border-radius: 50%;
          min-width: 18px;
          height: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 12px;
          font-weight: bold;
          padding: 0 2px;
          box-sizing: border-box;
        }
      `;
    document.head.appendChild(style);
  }

  // Initialize
  addProfileIconStyles();
  checkLoginStatus();

  // Enhanced storage event listener
  window.addEventListener("storage", function (e) {
    // React to userInfo changes, logout events, or login status changes
    if (
      e.key === "userInfo" ||
      e.key === "logoutEvent" ||
      e.key === "isLoggedIn"
    ) {
      setTimeout(checkLoginStatus, 100); // Small delay to ensure storage is updated
    }
  });

  // Add logout functionality to any logout buttons on the page
  const logoutButtons = document.querySelectorAll('[data-action="logout"]');
  logoutButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        performLogout();

        alert("You have been logged out successfully");

        // Redirect if needed
        if (this.dataset.redirect) {
          window.location.href = this.dataset.redirect;
        } else {
          // Default redirect to login page
          window.location.href = "login.html";
        }
      }
    });
  });

  // Add a periodic check to ensure consistency (runs every 30 seconds)
  setInterval(function () {
    checkLoginStatus();
  }, 30000);
});

// ENHANCED CART COUNT MANAGEMENT
function updateCartCount() {
  // Enhanced user check
  function isUserAuthenticated() {
    const sessionUserId = sessionStorage.getItem("userId");
    const localUserId = localStorage.getItem("userId");
    const sessionLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const localLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    return (sessionUserId && sessionLoggedIn) || (localUserId && localLoggedIn);
  }

  const isLoggedIn = isUserAuthenticated();
  let totalQuantity = 0;

  if (isLoggedIn) {
    // For logged-in users, load from localStorage (persistent cart)
    const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
    cart.forEach((item) => {
      totalQuantity += parseInt(item.quantity) || 1;
    });
  } else {
    // For guest users, load from guest cart
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    guestCart.forEach((item) => {
      totalQuantity += parseInt(item.quantity) || 1;
    });
  }

  // Update cart count display
  updateCartCountDisplay(totalQuantity);
}

function updateCartCountDisplay(itemCount) {
  const counter = document.getElementById("cart-count");
  if (counter) {
    counter.textContent = itemCount;
    // Hide counter when empty
    counter.style.display = itemCount > 0 ? "flex" : "none";
  }
}

// Enhanced initialization
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure all storage operations are complete
  setTimeout(function () {
    updateCartCount();
  }, 100);

  // Update cart count when storage changes
  window.addEventListener("storage", function (e) {
    if (
      e.key === "shoppingCart" ||
      e.key === "guestCart" ||
      e.key === "isLoggedIn"
    ) {
      setTimeout(updateCartCount, 100);
    }
  });

  // Also update cart count when the window regains focus
  window.addEventListener("focus", function () {
    updateCartCount();
  });
});
