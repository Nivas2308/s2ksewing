// Web app URL from Google Apps Script - REPLACE THIS with your actual URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbwaMYn1wOQVin4FvrbcgERC2i9JbyyyE7LxnPBuMdeSZk-mGfrfYPnAup9Hj-XgK_4GEQ/exec";

// DOM elements
const testimonialsList = document.getElementById("testimonials-list");
const addTestimonialBtn = document.getElementById("add-testimonial-btn");
const testimonialModal = document.getElementById("testimonial-modal");
const closeModalBtn = document.getElementById("close-modal");
const testimonialForm = document.getElementById("testimonial-form");
const cancelBtn = document.getElementById("cancel-btn");
const modalTitle = document.getElementById("modal-title");
const testimonialIdInput = document.getElementById("testimonial-id");
const photoUrlInput = document.getElementById("photo-url");
const previewImg = document.getElementById("preview-img");
const clientNameInput = document.getElementById("client-name");
const clientPositionInput = document.getElementById("client-position");
const testimonialTextInput = document.getElementById("testimonial-text");
const confirmModal = document.getElementById("confirm-modal");
const closeConfirmModalBtn = document.getElementById("close-confirm-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const refreshBtn = document.getElementById("refresh-btn");
const statusMessage = document.getElementById("status-message");
const paginationContainer = document.getElementById("pagination");

// Variables
let testimonials = [];
let isLoading = false;
let currentPage = 1;
const itemsPerPage = 5; // Number of testimonials per page
let filteredTestimonials = [];

// Show status message
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${isError ? "error" : "success"}`;
  statusMessage.style.display = "block";

  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 3000);
}

// Fetch all testimonials
async function fetchTestimonials() {
  try {
    isLoading = true;
    testimonialsList.innerHTML =
      '<div style="text-align: center; padding: 20px;"><div class="loading-spinner"></div>Loading testimonials...</div>';

    // Use JSONP for cross-domain requests
    const script = document.createElement("script");
    const callbackName = "adminCallback_" + Math.floor(Math.random() * 10000);

    // Create global callback function
    window[callbackName] = function (data) {
      testimonials = data;
      filteredTestimonials = [...testimonials]; // Copy for filtering
      isLoading = false;
      displayPaginatedTestimonials();
      // Clean up
      delete window[callbackName];
      document.body.removeChild(script);
    };

    script.src = `${API_URL}?action=getAllTestimonials&callback=${callbackName}`;
    document.body.appendChild(script);

    // Set timeout for error handling
    setTimeout(() => {
      if (isLoading) {
        isLoading = false;
        testimonialsList.innerHTML =
          "<p>Error loading testimonials. Please try again later.</p>";
        showStatus(
          "Failed to load testimonials. Check your connection and API URL.",
          true
        );
      }
    }, 10000);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    isLoading = false;
    testimonialsList.innerHTML =
      "<p>Error loading testimonials. Please try again later.</p>";
    showStatus("Failed to load testimonials: " + error.message, true);
  }
}

// Submit JSONP request via hidden iframe
function submitJSONPRequest(action, data, callback) {
  const callbackName = `${action}Callback_${Math.floor(Math.random() * 10000)}`;

  // Create global callback function
  window[callbackName] = function (result) {
    callback(result);
    // Clean up
    delete window[callbackName];
  };

  // Create and submit form via hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  // Add action parameter
  const actionInput = document.createElement("input");
  actionInput.type = "hidden";
  actionInput.name = "action";
  actionInput.value = action;
  form.appendChild(actionInput);

  // Add data parameters
  for (const [key, value] of Object.entries(data)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = typeof value === "object" ? JSON.stringify(value) : value;
    form.appendChild(input);
  }

  // Add callback parameter
  const callbackInput = document.createElement("input");
  callbackInput.type = "hidden";
  callbackInput.name = "callback";
  callbackInput.value = callbackName;
  form.appendChild(callbackInput);

  iframe.contentDocument.body.appendChild(form);
  form.submit();

  // Clean up after a timeout
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 60000);
}

// Add a new testimonial
async function addNewTestimonial(testimonial) {
  showStatus("Adding new testimonial...");

  const callbackName = "addCallback_" + Math.floor(Math.random() * 10000);

  window[callbackName] = function (result) {
    if (result && result.success) {
      testimonial.id = result.id;
      testimonials.push(testimonial);
      filteredTestimonials = [...testimonials];
      displayPaginatedTestimonials();
      hideModal();
      showStatus("Testimonial added successfully!");
    } else {
      showStatus(
        "Failed to add testimonial: " + (result.error || "Unknown error"),
        true
      );
    }
    delete window[callbackName];
  };

  submitJSONPRequest("addTestimonial", { testimonial }, function (result) {
    if (result && result.success) {
      testimonial.id = result.id;
      testimonials.push(testimonial);
      filteredTestimonials = [...testimonials];
      displayPaginatedTestimonials();
      hideModal();
      showStatus("Testimonial added successfully!");
    } else {
      showStatus(
        "Failed to add testimonial: " + (result.error || "Unknown error"),
        true
      );
    }
  });
}

// Update an existing testimonial
async function updateExistingTestimonial(testimonial) {
  showStatus("Updating testimonial...");

  const callbackName = "updateCallback_" + Math.floor(Math.random() * 10000);

  window[callbackName] = function (result) {
    if (result && result.success) {
      const index = testimonials.findIndex((t) => t.id === testimonial.id);
      if (index !== -1) {
        testimonials[index] = testimonial;
      }
      filteredTestimonials = [...testimonials];
      displayPaginatedTestimonials();
      hideModal();
      showStatus("Testimonial updated successfully!");
    } else {
      showStatus(
        "Failed to update testimonial: " + (result.error || "Unknown error"),
        true
      );
    }
    delete window[callbackName];
  };

  submitJSONPRequest("updateTestimonial", { testimonial }, function (result) {
    if (result && result.success) {
      const index = testimonials.findIndex((t) => t.id === testimonial.id);
      if (index !== -1) {
        testimonials[index] = testimonial;
      }
      filteredTestimonials = [...testimonials];
      displayPaginatedTestimonials();
      hideModal();
      showStatus("Testimonial updated successfully!");
    } else {
      showStatus(
        "Failed to update testimonial: " + (result.error || "Unknown error"),
        true
      );
    }
  });
}

// Delete a testimonial
async function deleteTestimonialById(id) {
  showStatus("Deleting testimonial...");

  submitJSONPRequest("deleteTestimonial", { id }, function (result) {
    if (result && result.success) {
      testimonials = testimonials.filter((t) => t.id !== id);
      filteredTestimonials = [...testimonials];
      displayPaginatedTestimonials();
      hideConfirmModal();
      showStatus("Testimonial deleted successfully!");
    } else {
      showStatus(
        "Failed to delete testimonial: " + (result.error || "Unknown error"),
        true
      );
      hideConfirmModal();
    }
  });
}

// Display testimonials with pagination
function displayPaginatedTestimonials(page = 1) {
  currentPage = page;
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = filteredTestimonials.slice(start, end);

  displayTestimonials(paginatedItems);
  renderPaginationControls();
}

// Render pagination controls
function renderPaginationControls() {
  const totalPages = Math.ceil(filteredTestimonials.length / itemsPerPage);
  paginationContainer.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "«";
    prevBtn.addEventListener("click", () =>
      displayPaginatedTestimonials(currentPage - 1)
    );
    paginationContainer.appendChild(prevBtn);
  }

  // Page buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener("click", () => displayPaginatedTestimonials(i));
    paginationContainer.appendChild(pageBtn);
  }

  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "»";
    nextBtn.addEventListener("click", () =>
      displayPaginatedTestimonials(currentPage + 1)
    );
    paginationContainer.appendChild(nextBtn);
  }
}

// Display testimonials
function displayTestimonials(testimonialsToDisplay) {
  testimonialsList.innerHTML = "";

  if (testimonialsToDisplay.length === 0) {
    testimonialsList.innerHTML = "<p>No testimonials found.</p>";
    return;
  }

  testimonialsToDisplay.forEach((testimonial) => {
    const testimonialItem = document.createElement("div");
    testimonialItem.className = "testimonial-item";

    // Function to get initials
    function getInitials(name) {
      if (!name) return "U"; // Default for unknown names
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (
          parts[0].charAt(0).toUpperCase() +
          parts[parts.length - 1].charAt(0).toUpperCase()
        );
      }
      return parts[0].charAt(0).toUpperCase();
    }

    // Decide what to show: image OR initials avatar
    const avatarHTML =
      testimonial.photo && testimonial.photo.trim() !== ""
        ? `<img src="${testimonial.photo}" alt="${testimonial.name}" class="testimonial-img" onerror="this.src='https://via.placeholder.com/80?text=User'">`
        : `<div class="testimonial-avatar">${getInitials(
            testimonial.name
          )}</div>`;

    testimonialItem.innerHTML = `
      ${avatarHTML}
      <div class="testimonial-content">
          <h3 class="testimonial-name">${testimonial.name}</h3>
          <p class="testimonial-position">${testimonial.position}</p>
          <p class="testimonial-text">${testimonial.text}</p>
      </div>
      <div class="testimonial-actions">
          <button class="btn edit-btn" data-id="${testimonial.id}">Edit</button>
          <button class="btn btn-danger delete-btn" data-id="${testimonial.id}">Delete</button>
      </div>
    `;

    testimonialsList.appendChild(testimonialItem);
  });

  // Edit button handler
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      editTestimonial(id);
    });
  });

  // Delete button handler
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      showDeleteConfirmation(id);
    });
  });
}

// Show the modal for adding a new testimonial
function showAddModal() {
  modalTitle.textContent = "Add New Testimonial";
  testimonialIdInput.value = "";
  testimonialForm.reset();
  previewImg.style.display = "none";
  testimonialModal.style.display = "flex";
}

// Show the modal for editing a testimonial
function editTestimonial(id) {
  const testimonial = testimonials.find((t) => t.id === id);
  if (!testimonial) return;

  modalTitle.textContent = "Edit Testimonial";
  testimonialIdInput.value = testimonial.id;
  clientNameInput.value = testimonial.name;
  clientPositionInput.value = testimonial.position;
  testimonialTextInput.value = testimonial.text;

  // Handle photo display
  if (testimonial.photo) {
    photoUrlInput.value = testimonial.photo;
    previewImg.src = testimonial.photo;
    previewImg.style.display = "block";
  } else {
    previewImg.style.display = "none";
  }

  testimonialModal.style.display = "flex";
}

// Hide the modal
function hideModal() {
  testimonialModal.style.display = "none";
  testimonialForm.reset();
  previewImg.style.display = "none";
  testimonialIdInput.value = "";
}

// Show delete confirmation modal
function showDeleteConfirmation(id) {
  confirmDeleteBtn.setAttribute("data-id", id);
  confirmModal.style.display = "flex";
}

// Hide delete confirmation modal
function hideConfirmModal() {
  confirmModal.style.display = "none";
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  fetchTestimonials();

  // Add testimonial button
  addTestimonialBtn.addEventListener("click", showAddModal);

  // Refresh button
  refreshBtn.addEventListener("click", fetchTestimonials);

  // Close modal buttons
  closeModalBtn.addEventListener("click", hideModal);
  cancelBtn.addEventListener("click", hideModal);

  // Close confirm modal buttons
  closeConfirmModalBtn.addEventListener("click", hideConfirmModal);
  cancelDeleteBtn.addEventListener("click", hideConfirmModal);

  // Confirm delete button
  confirmDeleteBtn.addEventListener("click", async function () {
    const id = parseInt(this.getAttribute("data-id"));
    try {
      await deleteTestimonialById(id);
      hideConfirmModal();
      showStatus("Testimonial deleted successfully!");
    } catch (error) {
      showStatus("Error deleting testimonial", true);
    }
  });

  // Form submission
  testimonialForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = testimonialIdInput.value
      ? parseInt(testimonialIdInput.value)
      : null;
    const testimonial = {
      id,
      name: clientNameInput.value,
      position: clientPositionInput.value,
      text: testimonialTextInput.value,
      photo: photoUrlInput.value,
      timestamp: new Date().toISOString(),
    };

    try {
      if (id) {
        await updateExistingTestimonial(testimonial);
      } else {
        await addNewTestimonial(testimonial);
      }

      // Clear form and hide modal
      testimonialForm.reset();
      hideModal();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      showStatus("Error saving testimonial. Please try again.", true);
    }
  });

  // Preview image when URL is entered
  photoUrlInput.addEventListener("input", function () {
    if (this.value) {
      previewImg.src = this.value;
      previewImg.style.display = "block";
    } else {
      previewImg.style.display = "none";
    }
  });
});
