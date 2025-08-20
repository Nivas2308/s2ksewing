const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxUjqSYA336aC9VbvcYRCDh86CeO1c51w-bqe1awiJkvXPJE7np2Z5PztwCDK-rfnqt/exec";

// Store contact info locally to ensure persistence
let contactInfoCache = {
  customerSupport: "",
  mainOffice: "",
};

// Global variables
let autoRefreshInterval;
let isRefreshing = false;

// Tab functionality
document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    const targetTab = this.getAttribute("data-tab");

    // Update active tab
    document
      .querySelectorAll(".nav-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    this.classList.add("active");
    document.getElementById(targetTab).classList.add("active");

    // Restore contact info when switching to contact-info tab
    if (targetTab === "contact-info") {
      restoreContactInfo();
    }
  });
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("Initializing S2K Sewing Admin...");
  loadSubmissions();
  loadContactInfo();
  initializeContactForm();
  initializeModal();
  startAutoRefresh();

  // Add keyboard shortcuts
  initializeKeyboardShortcuts();

  console.log("S2K Sewing Contact Admin initialized successfully");
});

// Load contact submissions with improved error handling
async function loadSubmissions() {
  if (isRefreshing) {
    console.log("Already refreshing, skipping...");
    return;
  }

  isRefreshing = true;
  const container = document.getElementById("submissionsTableContainer");
  const countElement = document.getElementById("submissionCount");
  const refreshBtn = document.querySelector(".refresh-btn");

  // Update button state
  if (refreshBtn) {
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;

    // Restore button state after operation completes
    setTimeout(() => {
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }, 2000);
  }

  container.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner"></i>
      <p>Loading contact submissions...</p>
    </div>
  `;

  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=get_submissions&timestamp=${Date.now()}`
    );
    const text = await response.text();

    // Log the raw response for debugging
    console.log("Raw response:", text.substring(0, 200) + "...");

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid JSON response from server");
    }

    if (data.success) {
      // Handle both possible response structures
      const submissions = data.submissions || data.data?.submissions || [];
      displaySubmissions(submissions);
      countElement.textContent = `${submissions.length} submission${
        submissions.length !== 1 ? "s" : ""
      }`;

      showNotification(`Loaded ${submissions.length} submissions`);
    } else {
      throw new Error(
        data.message || data.error || "Failed to load submissions"
      );
    }
  } catch (error) {
    console.error("Error loading submissions:", error);
    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
        <p>Error loading submissions: ${error.message}</p>
        <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
          Please check your internet connection and try again.
        </p>
        <button onclick="retryLoadSubmissions()" style="
          margin-top: 15px;
          padding: 10px 20px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    countElement.textContent = "Error loading";
    showNotification("Error loading submissions: " + error.message, true);
  } finally {
    isRefreshing = false;
  }
}

// Retry function for failed loads
function retryLoadSubmissions() {
  console.log("Retrying to load submissions...");
  loadSubmissions();
}

// Display submissions in table
function displaySubmissions(submissions) {
  const container = document.getElementById("submissionsTableContainer");

  if (!submissions || submissions.length === 0) {
    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-inbox"></i>
        <p>No contact submissions found.</p>
        <p style="margin-top: 10px; font-size: 0.9rem; color: #999;">Submissions will appear here when customers contact you through your website.</p>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th><i class="fas fa-calendar"></i> Date</th>
          <th><i class="fas fa-user"></i> Name</th>
          <th><i class="fas fa-envelope"></i> Email</th>
          <th><i class="fas fa-tag"></i> Subject</th>
          <th><i class="fas fa-comment"></i> Message</th>
          <th><i class="fas fa-cogs"></i> Actions</th>
        </tr>
      </thead>
      <tbody>
        ${submissions
          .map(
            (submission) => `
          <tr>
            <td>${formatDate(submission.timestamp)}</td>
            <td>${submission.name || "N/A"}</td>
            <td>${submission.email || "N/A"}</td>
            <td>${submission.subject || "No subject"}</td>
            <td class="message-preview">${
              submission.message || "No message"
            }</td>
            <td>
              <button class="action-btn tooltip" onclick="viewMessage('${
                submission.id
              }')">
                <i class="fas fa-eye"></i> View
                <span class="tooltiptext">View Details</span>
              </button>
              <button class="action-btn delete tooltip" onclick="deleteSubmission('${
                submission.id
              }')">
                <i class="fas fa-trash"></i> Delete
                <span class="tooltiptext">Delete Message</span>
              </button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

// Format date for display
function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

// View message details
async function viewMessage(submissionId) {
  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=get_submission_details&id=${submissionId}`
    );
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error("Invalid JSON response from server");
    }

    if (data.success) {
      const submission = data.submission || data.data?.submission;
      if (submission) {
        const detailsHTML = `
          <div class="message-detail">
            <strong><i class="fas fa-user"></i> Name:</strong> ${
              submission.name || "Not provided"
            }
          </div>
          <div class="message-detail">
            <strong><i class="fas fa-envelope"></i> Email:</strong> ${
              submission.email || "Not provided"
            }
          </div>
          <div class="message-detail">
            <strong><i class="fas fa-phone"></i> Phone:</strong> ${
              submission.phone || "Not provided"
            }
          </div>
          <div class="message-detail">
            <strong><i class="fas fa-tag"></i> Subject:</strong> ${
              submission.subject || "No subject"
            }
          </div>
          <div class="message-detail">
            <strong><i class="fas fa-calendar"></i> Date:</strong> ${formatDate(
              submission.timestamp
            )}
          </div>
          <div class="message-detail">
            <strong><i class="fas fa-comment"></i> Message:</strong><br>
            ${(submission.message || "No message").replace(/\n/g, "<br>")}
          </div>
        `;

        document.getElementById("messageDetails").innerHTML = detailsHTML;
        document.getElementById("messageModal").style.display = "block";
      } else {
        throw new Error("No submission data received");
      }
    } else {
      throw new Error(
        data.message || data.error || "Failed to load message details"
      );
    }
  } catch (error) {
    console.error("Error viewing message:", error);
    showNotification("Error loading message details: " + error.message, true);
  }
}

// Delete submission with enhanced feedback
async function deleteSubmission(submissionId) {
  const confirmation = confirm(
    "Are you sure you want to delete this submission?\n\n" +
      "This action cannot be undone and the message will be permanently removed."
  );

  if (!confirmation) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append("action", "delete_submission");
    formData.append("id", submissionId);

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error("Invalid JSON response from server");
    }

    if (data.success) {
      showNotification("Submission deleted successfully");
      loadSubmissions(); // Reload the table
    } else {
      throw new Error(
        data.message || data.error || "Failed to delete submission"
      );
    }
  } catch (error) {
    console.error("Error deleting submission:", error);
    showNotification("Error deleting submission: " + error.message, true);
  }
}

// Load contact information with improved persistence
async function loadContactInfo() {
  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=get_admin_contact_info&timestamp=${Date.now()}`
    );
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing contact info JSON:", parseError);
      // If there's a parse error, try to use cached data
      restoreContactInfo();
      return;
    }

    if (data.success) {
      const info = data.contactInfo || data.data?.contactInfo || {};

      // Update cache with server data
      contactInfoCache.customerSupport = info.customerSupport || "";
      contactInfoCache.mainOffice = info.mainOffice || "";

      // Update form fields with server data
      restoreContactInfo();

      console.log("Contact info loaded successfully");
    } else {
      console.warn(
        "Failed to load contact info from server:",
        data.message || data.error
      );
      // Use cached data if server fails
      restoreContactInfo();
    }
  } catch (error) {
    console.error("Error loading contact info:", error);
    // Use cached data if there's an error
    restoreContactInfo();
  }
}

// Restore contact info from cache to form fields
function restoreContactInfo() {
  const customerSupportField = document.getElementById("customerSupport");
  const mainOfficeField = document.getElementById("mainOffice");

  if (customerSupportField) {
    customerSupportField.value = contactInfoCache.customerSupport;
  }
  if (mainOfficeField) {
    mainOfficeField.value = contactInfoCache.mainOffice;
  }
}

// Initialize contact form
function initializeContactForm() {
  const form = document.getElementById("contactInfoForm");
  if (form) {
    // Remove any existing event listeners
    form.removeEventListener("submit", handleContactInfoSubmit);
    // Add the event listener
    form.addEventListener("submit", handleContactInfoSubmit);

    // Also listen for input changes to update cache
    const customerSupportField = document.getElementById("customerSupport");
    const mainOfficeField = document.getElementById("mainOffice");

    if (customerSupportField) {
      customerSupportField.addEventListener("input", function () {
        contactInfoCache.customerSupport = this.value;
      });
    }

    if (mainOfficeField) {
      mainOfficeField.addEventListener("input", function () {
        contactInfoCache.mainOffice = this.value;
      });
    }

    console.log("Contact form initialized successfully");
  } else {
    console.error("Contact form not found!");
  }
}

// Handle contact info form submission - FIXED FUNCTION
async function handleContactInfoSubmit(event) {
  event.preventDefault();
  console.log("Handling contact info submit...");

  const submitBtn = document.querySelector(".save-btn");
  const originalText = submitBtn.innerHTML;
  const successMessage = document.getElementById("contactSuccessMessage");
  const errorMessage = document.getElementById("contactErrorMessage");

  // Hide previous messages
  successMessage.style.display = "none";
  errorMessage.style.display = "none";

  // Update cache with current form values
  const customerSupportField = document.getElementById("customerSupport");
  const mainOfficeField = document.getElementById("mainOffice");

  if (customerSupportField) {
    contactInfoCache.customerSupport = customerSupportField.value;
  }
  if (mainOfficeField) {
    contactInfoCache.mainOffice = mainOfficeField.value;
  }

  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  submitBtn.disabled = true;

  try {
    const formData = new FormData();
    // FIXED: Changed from "update_admin_contact_info" to "update_contact_info"
    formData.append("action", "update_contact_info");
    formData.append("customerSupport", contactInfoCache.customerSupport);
    formData.append("mainOffice", contactInfoCache.mainOffice);

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error("Invalid JSON response from server");
    }

    if (data.success) {
      successMessage.textContent = "Contact information saved successfully!";
      successMessage.style.display = "block";

      showNotification("Contact information saved successfully!");

      // Scroll to success message
      successMessage.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      // Hide success message after 5 seconds
      setTimeout(() => {
        successMessage.style.display = "none";
      }, 5000);
    } else {
      throw new Error(
        data.message || data.error || "Failed to save contact information"
      );
    }
  } catch (error) {
    console.error("Error saving contact info:", error);
    const errorMsg = "Error saving contact information: " + error.message;
    errorMessage.textContent = errorMsg;
    errorMessage.style.display = "block";

    showNotification(errorMsg, true);

    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Hide error message after 8 seconds
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 8000);
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Initialize modal functionality
function initializeModal() {
  const modal = document.getElementById("messageModal");
  const closeBtn = document.querySelector(".close");

  // Close modal when clicking the X button
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }

  // Close modal when clicking outside of it
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.style.display === "block") {
      modal.style.display = "none";
    }
  });
}

// Utility function to show notifications
function showNotification(message, isError = false) {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll(
    ".notification-toast"
  );
  existingNotifications.forEach((notification) => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  });

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "notification-toast";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 350px;
    word-wrap: break-word;
  `;

  notification.style.backgroundColor = isError ? "#dc3545" : "#4caf50";
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Remove after delay
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Auto-refresh functionality
function startAutoRefresh() {
  // Clear any existing interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  // Refresh every 5 minutes
  autoRefreshInterval = setInterval(() => {
    if (
      document
        .querySelector('.nav-tab[data-tab="submissions"]')
        .classList.contains("active")
    ) {
      console.log("Auto-refreshing submissions...");
      loadSubmissions();
    }
  }, 300000); // 5 minutes

  console.log("Auto-refresh started (5 minutes interval)");
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log("Auto-refresh stopped");
  }
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
  document.addEventListener("keydown", function (event) {
    // Ctrl/Cmd + R for refresh (in addition to default browser refresh)
    if ((event.ctrlKey || event.metaKey) && event.key === "r") {
      if (
        document
          .querySelector('.nav-tab[data-tab="submissions"]')
          .classList.contains("active")
      ) {
        event.preventDefault();
        loadSubmissions();
      }
    }

    // Ctrl/Cmd + S for save contact info
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      if (
        document
          .querySelector('.nav-tab[data-tab="contact-info"]')
          .classList.contains("active")
      ) {
        event.preventDefault();
        const form = document.getElementById("contactInfoForm");
        if (form) {
          handleContactInfoSubmit(event);
        }
      }
    }
  });
}

// Page visibility change handler
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", function () {
  stopAutoRefresh();
});

// Export functions for global access (for onclick handlers)
window.loadSubmissions = loadSubmissions;
window.retryLoadSubmissions = retryLoadSubmissions;
window.viewMessage = viewMessage;
window.deleteSubmission = deleteSubmission;
window.handleContactInfoSubmit = handleContactInfoSubmit;
