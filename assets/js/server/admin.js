/**
 * Admin Panel JavaScript
 * Handles authentication, user profile display, and panel initialization
 */

// Check if user is logged in on page load
document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.getItem("isAdminLoggedIn") !== "true") {
    // Redirect to login page
    window.location.href = "adminlogin.html";
  } else {
    // Initialize admin panel
    initializeAdminPanel();
  }
});

/**
 * Profile Image & Employee Data Functions
 */

// Function to fetch the employee image and data
function fetchEmployeeImageAndData(employeeRowId) {
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbz9bZGkGfRtTve5cYyFZmrkCK0eHpk-Nd63An2OKn5x4s-rpRA0QZ8keVNrwmwnC_-d/exec";

  // First try to get detailed employee data including image URL
  fetch(scriptUrl + "?action=getEmployeeById&id=" + employeeRowId)
    .then((response) => response.json())
    .then((employee) => {
      if (employee && employee.imageUrl) {
        // Store the image URL directly
        localStorage.setItem("adminProfileImage", employee.imageUrl);

        // Also store employee name if available
        if (employee.firstName || employee.lastName) {
          localStorage.setItem(
            "adminName",
            `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
          );
        }
      } else {
        throw new Error("Employee data incomplete");
      }
    })
    .catch((error) => {
      console.log("Error in fetching employee data:", error);

      // Try getting all employees and filter for the one we need
      return fetch(scriptUrl + "?action=getEmployees")
        .then((response) => response.json())
        .then((allEmployees) => {
          const employee = allEmployees.find((emp) => emp.id === employeeRowId);

          if (employee && employee.imageUrl) {
            localStorage.setItem("adminProfileImage", employee.imageUrl);

            // Also store name if available
            if (employee.firstName || employee.lastName) {
              localStorage.setItem(
                "adminName",
                `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
              );
            }
            return;
          }

          // If we still don't have an image, mark as no image
          localStorage.setItem("adminProfileImage", "No Image");
        })
        .catch((err) => {
          console.error("Error in fetching employees list:", err);
          localStorage.setItem("adminProfileImage", "No Image");
        });
    })
    .finally(() => {
      // Initialize admin panel when done
      initializeAdminPanel();
    });
}

/**
 * Enhanced function to create a default avatar with initials
 *
 * @param {HTMLImageElement} imgElement - The image element to update
 * @param {boolean} isSuperAdmin - Whether the user is a super admin
 * @param {string} userName - User's full name
 * @param {string} userEmail - User's email address
 */
function createInitialsAvatar(imgElement, isSuperAdmin, userName, userEmail) {
  // Create a canvas element to generate the avatar
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const size = 40;
  canvas.width = size;
  canvas.height = size;

  // Set background color - green for super admin, lighter green for regular admin
  ctx.fillStyle = isSuperAdmin ? "#4caf50" : "#66bb6a";
  ctx.fillRect(0, 0, size, size);

  // Get initials
  let initials;
  if (userName && userName.trim() !== "") {
    // Get initials from name
    initials = userName
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  } else if (userEmail && userEmail.includes("@")) {
    // Get first letter of email address (before @)
    initials = userEmail.split("@")[0].charAt(0).toUpperCase();
  } else if (userEmail) {
    // Fallback to first letter of whatever is in the email field
    initials = userEmail.charAt(0).toUpperCase();
  } else {
    // Ultimate fallback
    initials = "?";
  }

  // Draw text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Inter, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, size / 2, size / 2);

  // Convert to data URL and set as image source
  try {
    const dataUrl = canvas.toDataURL("image/png");
    imgElement.src = dataUrl;
    imgElement.style.display = "block";
  } catch (e) {
    console.error("Error creating canvas avatar:", e);
    // Ultimate fallback - create a data URL for an SVG
    const color = isSuperAdmin ? "4caf50" : "66bb6a";
    imgElement.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23${color}'/%3E%3Ctext x='20' y='26' font-family='Inter,Arial' font-size='18' font-weight='bold' fill='white' text-anchor='middle'%3E${initials}%3C/text%3E%3C/svg%3E`;
  }
}

/**
 * Function to display logged in user and profile image with proper fallback
 */
function displayLoggedInUser() {
  const userEmail = localStorage.getItem("adminEmail") || "Unknown User";
  const userName = localStorage.getItem("adminName") || "";
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const userEmailElement = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");
  const loggedInUserElement = document.getElementById("logged-in-user");
  const userRoleElement = document.getElementById("user-role");

  // Set user email in header
  userEmailElement.textContent = userEmail;

  // Set logged in user name in sidebar
  if (userName && userName.trim() !== "") {
    loggedInUserElement.textContent = userName;
  } else {
    loggedInUserElement.textContent = userEmail;
  }

  // Set user role in sidebar
  userRoleElement.textContent = isSuperAdmin ? "Super Admin" : "Employee";

  // Get profile image from storage
  const profileImage = localStorage.getItem("adminProfileImage");

  // Create an image handler function for errors
  const handleImageError = () => {
    console.log("Profile image failed to load, using initials avatar");
    createInitialsAvatar(userAvatar, isSuperAdmin, userName, userEmail);
  };

  // If there is a profile image URL in storage, try to load it
  if (profileImage && profileImage !== "No Image") {
    // First set error handler
    userAvatar.onerror = handleImageError;

    // Try to load the profile image
    userAvatar.src = profileImage;
  } else {
    // No profile image available, create initials avatar immediately
    handleImageError();
  }
}

/**
 * Admin Panel Initialization & Display Functions
 */

// Function to initialize admin panel
function initializeAdminPanel() {
  // Display user information
  displayLoggedInUser();
  // Apply role-based access restrictions
  applyRoleBasedAccess();
  // Handle notification bell for super admin
  setupNotificationBell();
  // Set up navigation and sidebar
  setupNavigation();
  // Add loading states
  setupLoadingStates();
}

/**
 * Role-Based Access Control Functions
 */

// Function to apply role-based access restrictions
function applyRoleBasedAccess() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // Get all elements with role-based classes
  const superAdminElements = document.querySelectorAll(".super-admin-only");

  if (isSuperAdmin) {
    // Show all super admin elements
    superAdminElements.forEach((element) => {
      element.style.display =
        element.tagName.toLowerCase() === "div"
          ? "block"
          : element.classList.contains("nav-item")
          ? "flex"
          : element.style.display || "block";
    });
  } else {
    // Hide all super admin elements for regular employees
    superAdminElements.forEach((element) => {
      element.style.display = "none";
    });
  }
}

/**
 * Notification System Functions
 */

// Function to setup notification bell for super admin
function setupNotificationBell() {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  if (isSuperAdmin) {
    // Initialize notification count
    updateNotificationCount();

    // Set up periodic check for new notifications (every 30 seconds)
    setInterval(updateNotificationCount, 30000);

    // Add click handler for notification bell
    const notificationBell = document.getElementById("notification-bell");
    if (notificationBell) {
      notificationBell.addEventListener("click", handleNotificationClick);
    }
  }
}

// Function to update notification count
function updateNotificationCount() {
  // This would typically fetch from your backend
  // For now, we'll simulate with a random number for demonstration
  const notificationCount = Math.floor(Math.random() * 5);
  const badge = document.getElementById("notification-count");

  if (badge) {
    badge.textContent = notificationCount;
    badge.style.display = notificationCount > 0 ? "flex" : "none";
  }
}

// Function to handle notification bell click
function handleNotificationClick() {
  // Navigate to notifications page or show dropdown
  loadContent("notifications.html");

  // Reset notification counter
  const badge = document.getElementById("notification-count");
  if (badge) {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

/**
 * Navigation & Sidebar Functions
 */

// Function to setup navigation and sidebar functionality
function setupNavigation() {
  // Setup sidebar toggle for mobile
  const toggleButton = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");

  if (toggleButton && sidebar) {
    toggleButton.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", function (event) {
      if (window.innerWidth <= 992) {
        if (
          !sidebar.contains(event.target) &&
          !toggleButton.contains(event.target)
        ) {
          sidebar.classList.remove("active");
        }
      }
    });
  }

  // Setup navigation items click handlers
  const navItems = document.querySelectorAll(".nav-item[src]");
  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const src = this.getAttribute("src");
      if (src) {
        loadContent(src);
        setActiveNavItem(this);

        // Always close sidebar after selection
        sidebar.classList.remove("active");
      }
    });
  });

  // Setup submenu toggle
  const otherToggle = document.getElementById("other-toggle");
  const otherSubmenu = document.getElementById("other-submenu");

  if (otherToggle && otherSubmenu) {
    otherToggle.addEventListener("click", function (e) {
      e.preventDefault();
      const isVisible = otherSubmenu.style.display !== "none";
      otherSubmenu.style.display = isVisible ? "none" : "block";

      // Rotate the icon
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = isVisible ? "rotate(0deg)" : "rotate(90deg)";
      }
    });
  }
}

// Function to load content in iframe
function loadContent(src) {
  const contentFrame = document.getElementById("content-frame");
  const contentArea = document.getElementById("content-area");

  if (contentFrame && contentArea) {
    // Add loading state
    contentArea.classList.add("loading");

    // Set new source
    contentFrame.src = src;

    // Remove loading state when loaded
    contentFrame.onload = function () {
      contentArea.classList.remove("loading");
    };

    // Handle load errors
    contentFrame.onerror = function () {
      contentArea.classList.remove("loading");
      console.error("Failed to load:", src);
    };
  }
}

// Function to set active navigation item
function setActiveNavItem(clickedItem) {
  // Remove active class from all nav items
  const allNavItems = document.querySelectorAll(".nav-item");
  allNavItems.forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to clicked item
  clickedItem.classList.add("active");
}

/**
 * Loading States & UI Enhancement Functions
 */

// Function to setup loading states
function setupLoadingStates() {
  // Add loading states to buttons that might take time
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      if (!this.classList.contains("no-loading")) {
        this.classList.add("loading");

        // Remove loading state after 2 seconds (adjust as needed)
        setTimeout(() => {
          this.classList.remove("loading");
        }, 2000);
      }
    });
  });
}

/**
 * Authentication Functions
 */

// Function to handle admin logout
function logoutAdmin() {
  // Show confirmation dialog
  if (confirm("Are you sure you want to logout?")) {
    // Clear all admin-related localStorage data
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminProfileImage");
    localStorage.removeItem("isSuperAdmin");
    localStorage.removeItem("adminRowId");

    // Redirect to login page
    window.location.href = "adminlogin.html";
  }
}

/**
 * Utility Functions
 */

// Function to handle window resize
window.addEventListener("resize", function () {
  const sidebar = document.getElementById("sidebar");

  // Hide sidebar on desktop when resizing from mobile
  if (window.innerWidth > 992 && sidebar) {
    sidebar.classList.remove("active");
  }
});

// Function to handle escape key to close sidebar on mobile
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && window.innerWidth <= 992) {
      sidebar.classList.remove("active");
    }
  }
});

/**
 * Error Handling & Debugging Functions
 */

// Global error handler for debugging
window.addEventListener("error", function (event) {
  console.error("Global error:", event.error);
});

// Function to log admin panel state for debugging
function debugAdminPanel() {
  console.log("Admin Panel Debug Info:");
  console.log("- Is Admin Logged In:", localStorage.getItem("isAdminLoggedIn"));
  console.log("- Admin Email:", localStorage.getItem("adminEmail"));
  console.log("- Is Super Admin:", localStorage.getItem("isSuperAdmin"));
  console.log("- Admin Name:", localStorage.getItem("adminName"));
  console.log("- Profile Image:", localStorage.getItem("adminProfileImage"));
}

// Expose debug function to global scope for console access
window.debugAdminPanel = debugAdminPanel;
