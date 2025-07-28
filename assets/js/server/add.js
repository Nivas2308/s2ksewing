// Global variables
window.selectedImages = [];

// API endpoint
const API_URL =
  "https://script.google.com/macros/s/AKfycby9ucXgMhxRaUyVIP_k-8cela5CJlYrWG7y5YOD3zShvf0OYW2HkeAwr4o4zo0zMC1S/exec";

// DOM elements
let productForm, successMessage, errorMessage, loadingIndicator, submitBtn;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements
  productForm = document.getElementById("product-form");
  successMessage = document.getElementById("success-message");
  errorMessage = document.getElementById("error-message");
  loadingIndicator = document.getElementById("loading");
  submitBtn = document.getElementById("submit-btn");

  // Add event listeners
  if (productForm) {
    productForm.addEventListener("submit", handleProductSubmit);
  }

  const imageInput = document.getElementById("product-image");
  if (imageInput) {
    imageInput.addEventListener("change", handleImageSelection);
  }

  console.log("Form initialized successfully");
});

// Show/hide messages
function showMessage(type, message) {
  hideAllMessages();

  if (type === "success" && successMessage) {
    successMessage.textContent = message;
    successMessage.classList.add("show");
    setTimeout(() => {
      successMessage.classList.remove("show");
    }, 5000);
  } else if (type === "error" && errorMessage) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
    setTimeout(() => {
      errorMessage.classList.remove("show");
    }, 5000);
  }
}

function hideAllMessages() {
  if (successMessage) successMessage.classList.remove("show");
  if (errorMessage) errorMessage.classList.remove("show");
}

function showLoading() {
  if (loadingIndicator) loadingIndicator.classList.add("show");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding Product...";
  }
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.classList.remove("show");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Product";
  }
}

// Handle form submission
async function handleProductSubmit(e) {
  e.preventDefault();

  console.log("Form submitted");
  hideAllMessages();

  // Validate images
  if (window.selectedImages.length === 0) {
    showMessage("error", "Please select at least one image.");
    return;
  }

  // Validate form fields
  const title = document.getElementById("product-title").value.trim();
  const price = document.getElementById("product-price").value;
  const category = document.getElementById("product-category").value;
  const subcategory = document
    .getElementById("product-subcategory")
    .value.trim();
  const description = document
    .getElementById("product-description")
    .value.trim();
  const details = document.getElementById("product-detail").value.trim();

  if (
    !title ||
    !price ||
    !category ||
    !subcategory ||
    !description ||
    !details
  ) {
    showMessage("error", "Please fill in all required fields.");
    return;
  }

  showLoading();

  try {
    // Convert images to base64 array
    const base64Images = window.selectedImages.map((img) => img.base64);

    // Create product object
    const product = {
      action: "add",
      title: title,
      price: parseFloat(price),
      images: base64Images,
      category: category,
      subCategory: subcategory,
      description: description,
      details: details,
    };

    console.log("Sending product data:", product);

    // Submit to Google Apps Script
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    // Since we're using no-cors, we can't read the response
    // We'll assume success if no error was thrown
    console.log("Product submission completed");

    // Show success message
    showMessage("success", "Product added successfully!");

    // Reset form
    resetForm();
  } catch (error) {
    console.error("Error adding product:", error);
    showMessage("error", "Error adding product: " + error.message);
  } finally {
    hideLoading();
  }
}

// Reset form to initial state
function resetForm() {
  if (productForm) {
    productForm.reset();
  }

  // Reset images
  window.selectedImages = [];
  const previewContainer = document.getElementById("product-image-preview");
  if (previewContainer) {
    previewContainer.innerHTML = "";
  }

  // Reset product detail to default
  const productDetail = document.getElementById("product-detail");
  if (productDetail) {
    productDetail.value = "Material: Cotton";
  }
}

// Handle image selection
function handleImageSelection(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const previewContainer = document.getElementById("product-image-preview");

  files.forEach((file) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showMessage("error", "Please select a valid image file.");
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const imageIndex = window.selectedImages.length + 1;
      const imageData = {
        id: Date.now() + Math.random(),
        file: file,
        base64: e.target.result.split(",")[1],
        preview: e.target.result,
        name: file.name,
      };

      window.selectedImages.push(imageData);

      // Create preview element
      const preview = document.createElement("div");
      preview.className = "image-preview-item";
      preview.dataset.imageId = imageData.id;
      preview.innerHTML = `
              <img src="${e.target.result}" alt="Product Preview ${imageIndex}">
              <span class="image-number">${imageIndex}</span>
              <span class="remove-image" data-image-id="${imageData.id}">×</span>
            `;

      previewContainer.appendChild(preview);

      // Add remove functionality
      const removeButton = preview.querySelector(".remove-image");
      removeButton.addEventListener("click", function () {
        removeImage(this.dataset.imageId);
      });

      updateImageNumbers();
    };
    reader.onerror = function () {
      showMessage("error", "Error reading image file.");
    };
    reader.readAsDataURL(file);
  });

  // Clear the input so the same file can be selected again if needed
  e.target.value = "";
}

// Remove image from selection
function removeImage(imageId) {
  console.log("Removing image with ID:", imageId);

  // Remove from array
  window.selectedImages = window.selectedImages.filter(
    (img) => img.id != imageId
  );

  // Remove from DOM
  const imageElement = document.querySelector(
    `.image-preview-item[data-image-id="${imageId}"]`
  );
  if (imageElement) {
    imageElement.remove();
  }

  // Update image numbers
  updateImageNumbers();
}

// Update image numbers after removal
function updateImageNumbers() {
  const previewItems = document.querySelectorAll(".image-preview-item");
  previewItems.forEach((item, index) => {
    const numberSpan = item.querySelector(".image-number");
    if (numberSpan) {
      numberSpan.textContent = index + 1;
    }
  });
}

// Test API connection
async function testAPI() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "test" }),
    });
    console.log("API test completed");
  } catch (error) {
    console.error("API test failed:", error);
  }
}

// Test API on page load
setTimeout(testAPI, 1000);
