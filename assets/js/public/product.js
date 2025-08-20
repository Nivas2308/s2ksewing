function openSizeChart() {
  document.getElementById("sizeChartModal").style.display = "flex";
}

function closeSizeChart() {
  document.getElementById("sizeChartModal").style.display = "none";
}

// Review Starts

// Review System - Enhanced with single review per user functionality
document.addEventListener("DOMContentLoaded", function () {
  loadReviews();
  checkUserReviewStatus();
});

const productId =
  new URLSearchParams(window.location.search).get("id") || "default";
const API_URL =
  "https://script.google.com/macros/s/AKfycbxJSOLkj6RSe2pC0fZA9SA7sAZQpPZvNqzpNEtBxXhGMegnSYx65ieVJ2VeOBon4ks5/exec";

// Get current user identifier
function getCurrentUser() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    // Generate a more robust user ID
    userId =
      "user_" + Math.random().toString(36).substr(2, 12) + "_" + Date.now();
    localStorage.setItem("userId", userId);
    console.log("Generated new user ID:", userId);
  }
  return userId;
}

// Check if current user has already reviewed this product
function checkUserReviewStatus() {
  const currentUser = getCurrentUser();
  console.log(
    "Checking review status for user:",
    currentUser,
    "product:",
    productId
  );

  const script = document.createElement("script");
  const callbackName =
    "userStatusCallback_" + Math.floor(Math.random() * 1000000);

  window[callbackName] = function (data) {
    console.log("User review status data:", data);

    if (data && data.success) {
      const userHasReviewed = data.userHasReviewed || false;
      const userReview = data.userReview || null;

      toggleReviewForm(!userHasReviewed, userReview);
    } else {
      console.error("Error checking user review status:", data.error);
      // If there's an error, allow review submission
      toggleReviewForm(true, null);
    }

    // Clean up
    const scriptElement = document.getElementById("user-status-script");
    if (scriptElement) {
      document.body.removeChild(scriptElement);
    }
    delete window[callbackName];
  };

  script.id = "user-status-script";
  script.src = `${API_URL}?action=checkUserReview&productId=${encodeURIComponent(
    productId
  )}&userId=${encodeURIComponent(currentUser)}&callback=${callbackName}`;
  script.onerror = function () {
    console.error("Failed to load user status script");
    toggleReviewForm(true, null);
    delete window[callbackName];
  };

  document.body.appendChild(script);
}

// Toggle review form visibility based on user's review status
function toggleReviewForm(showForm, userReview) {
  const reviewForm = document.querySelector(".review-form");
  const reviewFormContainer = document.querySelector(".review-form-container");

  if (!reviewForm && !reviewFormContainer) {
    console.warn("Review form not found in DOM");
    return;
  }

  if (showForm) {
    // Show the review form
    if (reviewForm) reviewForm.style.display = "block";
    if (reviewFormContainer) reviewFormContainer.style.display = "block";

    // Remove any existing status message
    const existingStatus = document.getElementById("user-review-status");
    if (existingStatus) {
      existingStatus.remove();
    }
  } else {
    // Hide the review form and show user's existing review
    if (reviewForm) reviewForm.style.display = "none";
    if (reviewFormContainer) reviewFormContainer.style.display = "none";

    // Show message that user has already reviewed
    showUserReviewStatus(userReview);
  }
}

// Show user's existing review status
function showUserReviewStatus(userReview) {
  // Remove existing status container if it exists
  let statusContainer = document.getElementById("user-review-status");
  if (statusContainer) {
    statusContainer.remove();
  }

  statusContainer = document.createElement("div");
  statusContainer.id = "user-review-status";
  statusContainer.className = "user-review-status";

  // Insert after the review form or at the beginning of reviews section
  const reviewForm =
    document.querySelector(".review-form") ||
    document.querySelector(".review-form-container");
  const reviewsSection =
    document.querySelector("#reviews-container").parentNode;

  if (reviewForm) {
    reviewForm.parentNode.insertBefore(statusContainer, reviewForm.nextSibling);
  } else {
    reviewsSection.insertBefore(statusContainer, reviewsSection.firstChild);
  }

  if (userReview) {
    // Format the user's review date
    let dateString = "";
    if (userReview.timestamp) {
      try {
        const date = new Date(userReview.timestamp);
        dateString = date.toLocaleDateString();
      } catch (e) {
        console.warn("Invalid date format", userReview.timestamp);
      }
    }

    statusContainer.innerHTML = `
            <div class="user-existing-review">
                <h3>Your Review</h3>
                <p class="review-notice">You have already reviewed this product. Each user can only submit one review per product.</p>
                <div class="your-review">
                    <div class="review-header">
                        <span class="reviewer-name">${escapeHTML(
                          userReview.name || "You"
                        )}</span>
                        <span class="review-date">${dateString}</span>
                    </div>
                    <div class="rating">
                        ${"★".repeat(userReview.rating)}${"☆".repeat(
      5 - userReview.rating
    )}
                    </div>
                    <div class="review-comment">${escapeHTML(
                      userReview.comment || ""
                    )}</div>
                </div>
            </div>
        `;
  } else {
    statusContainer.innerHTML = `
            <div class="review-submitted-notice">
                <h3>Thank You!</h3>
                <p>You have already submitted a review for this product. Each user can only submit one review per product.</p>
            </div>
        `;
  }
}

// Submit a new review function
function submitReview() {
  const nameField = document.getElementById("reviewer-name");
  const commentField = document.getElementById("review-comment");
  const name = nameField.value.trim();
  const comment = commentField.value.trim();
  const rating = document.querySelectorAll(".star.selected").length;
  const currentUser = getCurrentUser();

  // Clear any previous error states
  clearFieldErrors();

  let hasErrors = false;

  // Validation with red border highlighting
  if (!name) {
    showFieldError(nameField, "Please provide your name.");
    hasErrors = true;
  }

  if (!comment) {
    showFieldError(commentField, "Please provide a comment.");
    hasErrors = true;
  }

  if (rating === 0) {
    showRatingError("Please select a rating.");
    hasErrors = true;
  }

  // Stop if there are validation errors
  if (hasErrors) {
    return;
  }

  const review = {
    productId,
    name,
    comment,
    rating,
    userId: currentUser,
    action: "submitReview",
  };

  console.log("Submitting review:", review);

  // Show loading state
  const submitButton = document.querySelector(".review-form button");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Submitting...";
  submitButton.disabled = true;

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(review),
  })
    .then(() => {
      console.log("Review submitted successfully");
      showSuccessMessage("Review submitted successfully!");

      // Clear form
      nameField.value = "";
      commentField.value = "";
      document
        .querySelectorAll(".star")
        .forEach((s) => s.classList.remove("selected"));

      // Hide the review form since user has now reviewed
      toggleReviewForm(false, review);

      // Reload reviews after short delay to allow backend to update
      setTimeout(() => {
        loadReviews();
        checkUserReviewStatus();
      }, 2000);
    })
    .catch((error) => {
      console.error("Error submitting review:", error);
      showErrorMessage("Failed to submit review. Please try again.");
    })
    .finally(() => {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

// Helper function to clear all field errors
function clearFieldErrors() {
  const fields = document.querySelectorAll("#reviewer-name, #review-comment");
  fields.forEach((field) => {
    field.style.border = "";
    field.classList.remove("error");
    // Remove any existing error messages
    const errorMsg = field.parentNode.querySelector(".error-message");
    if (errorMsg) {
      errorMsg.remove();
    }
  });

  // Clear rating error
  const ratingError = document.querySelector(".rating-error");
  if (ratingError) {
    ratingError.remove();
  }
}

// Helper function to show field error with red border
function showFieldError(field, message) {
  field.style.border = "2px solid #e74c3c";
  field.classList.add("error");
  field.focus();

  // Add error message below field
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.color = "#e74c3c";
  errorDiv.style.fontSize = "14px";
  errorDiv.style.marginTop = "5px";
  errorDiv.textContent = message;

  // Insert after the field
  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

// Helper function to show rating error
function showRatingError(message) {
  const starContainer =
    document.querySelector(".stars") || document.querySelector(".rating");
  if (starContainer) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "rating-error error-message";
    errorDiv.style.color = "#e74c3c";
    errorDiv.style.fontSize = "14px";
    errorDiv.style.marginTop = "5px";
    errorDiv.textContent = message;

    starContainer.parentNode.insertBefore(errorDiv, starContainer.nextSibling);
  }
}

// Helper function to show success message
function showSuccessMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "success-message";
  messageDiv.style.cssText = `
        background-color: #d4edda;
        color: #155724;
        padding: 10px 15px;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 14px;
    `;
  messageDiv.textContent = message;

  const form = document.querySelector(".review-form");
  form.insertBefore(messageDiv, form.firstChild);

  // Auto remove after 3 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}

// Helper function to show error message
function showErrorMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "error-message";
  messageDiv.style.cssText = `
        background-color: #f8d7da;
        color: #721c24;
        padding: 10px 15px;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 14px;
    `;
  messageDiv.textContent = message;

  const form = document.querySelector(".review-form");
  form.insertBefore(messageDiv, form.firstChild);

  // Auto remove after 5 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

// Load existing reviews
function loadReviews() {
  const container = document.getElementById("reviews-container");
  container.innerHTML = '<div class="loading">Loading reviews...</div>';

  console.log("Loading reviews for product ID:", productId);

  const script = document.createElement("script");
  const callbackName = "reviewCallback_" + Math.floor(Math.random() * 1000000);

  window[callbackName] = function (data) {
    console.log("Received reviews data:", data);

    if (data && data.success && data.reviews && data.reviews.length > 0) {
      container.innerHTML = "";

      console.log(
        `Found ${data.reviews.length} reviews for product ID: ${productId}`
      );

      // Sort reviews by timestamp (newest first)
      const reviews = data.reviews.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
      });

      // Display review summary
      displayReviewSummary(reviews);

      // Display limited reviews (3 most recent)
      const reviewsToShow = reviews.slice(0, 3);

      const reviewListContainer = document.createElement("div");
      reviewListContainer.className = "limited-reviews-list";
      container.appendChild(reviewListContainer);

      // Display review count information
      const reviewCountInfo = document.createElement("div");
      reviewCountInfo.className = "review-count-info";
      reviewCountInfo.textContent = `Showing ${Math.min(
        3,
        reviews.length
      )} of ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;
      container.appendChild(reviewCountInfo);

      // Display each review
      reviewsToShow.forEach((review) => {
        const reviewElement = document.createElement("div");
        reviewElement.className = "review-item";

        let dateString = "";
        if (review.timestamp) {
          try {
            const date = new Date(review.timestamp);
            dateString = date.toLocaleDateString();
          } catch (e) {
            console.warn("Invalid date format", review.timestamp);
          }
        }

        reviewElement.innerHTML = `
                    <div class="review-header">
                        <span class="reviewer-name">${escapeHTML(
                          review.name || "Anonymous"
                        )}</span>
                        <span class="review-date">${dateString}</span>
                    </div>
                    <div class="rating">
                        ${"★".repeat(review.rating)}${"☆".repeat(
          5 - review.rating
        )}
                    </div>
                    <div class="review-comment">${escapeHTML(
                      review.comment || ""
                    )}</div>
                `;

        reviewListContainer.appendChild(reviewElement);
      });

      // Add "View All Reviews" button if there are more than 3 reviews
      if (reviews.length > 3) {
        const viewAllButton = document.createElement("button");
        viewAllButton.className = "view-all-reviews-btn";
        viewAllButton.textContent = `View All ${reviews.length} Reviews`;
        viewAllButton.onclick = function () {
          showAllReviews(reviews);
        };
        container.appendChild(viewAllButton);
      }
    } else {
      displayReviewSummary([]);
      container.innerHTML =
        '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
      console.log("No reviews found for product ID:", productId);
    }

    // Clean up
    const scriptElement = document.getElementById("jsonp-script");
    if (scriptElement) {
      document.body.removeChild(scriptElement);
    }
    delete window[callbackName];
  };

  // Set timeout for script loading
  const timeout = setTimeout(() => {
    if (window[callbackName]) {
      container.innerHTML =
        '<p class="error">Failed to load reviews. Please try refreshing the page.</p>';
      delete window[callbackName];
    }
  }, 10000);

  script.id = "jsonp-script";
  script.src = `${API_URL}?action=getReviews&productId=${encodeURIComponent(
    productId
  )}&callback=${callbackName}`;
  script.onerror = function () {
    console.error("Failed to load reviews script");
    container.innerHTML =
      '<p class="error">Failed to load reviews. Please try refreshing the page.</p>';
    delete window[callbackName];
  };

  console.log("Review request URL:", script.src);
  document.body.appendChild(script);
}

// Helper function to safely escape HTML
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Handle star rating selection
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", function () {
      const value = parseInt(this.getAttribute("data-value"));

      document.querySelectorAll(".star").forEach((s, index) => {
        if (index < value) {
          s.classList.add("selected");
        } else {
          s.classList.remove("selected");
        }
      });
    });
  });
});

// Calculate average rating
function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) {
    return 0;
  }

  const sum = reviews.reduce(
    (total, review) => total + (parseInt(review.rating) || 0),
    0
  );
  return (sum / reviews.length).toFixed(1);
}

// Display review summary
// Display review summary - FIXED VERSION
function displayReviewSummary(reviews) {
  let summaryContainer = document.getElementById("review-summary");
  if (!summaryContainer) {
    summaryContainer = document.createElement("div");
    summaryContainer.id = "review-summary";

    const reviewsContainer = document.getElementById("reviews-container");
    reviewsContainer.parentNode.insertBefore(
      summaryContainer,
      reviewsContainer
    );
  }

  if (!reviews || reviews.length === 0) {
    summaryContainer.innerHTML = `
            <div class="review-summary-empty">
                <h3>No Reviews Yet</h3>
                <p>Be the first to leave a review for this product!</p>
            </div>
        `;
    return;
  }

  const avgRating = calculateAverageRating(reviews);

  // ratingCounts[0] = count of 1-star reviews
  // ratingCounts[1] = count of 2-star reviews
  // ratingCounts[2] = count of 3-star reviews
  // ratingCounts[3] = count of 4-star reviews
  // ratingCounts[4] = count of 5-star reviews
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach((review) => {
    const rating = parseInt(review.rating) || 0;
    if (rating >= 1 && rating <= 5) {
      ratingCounts[rating - 1]++;
    }
  });

  const percentages = ratingCounts.map((count) =>
    reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
  );

  summaryContainer.innerHTML = `
        <div class="review-summary">
            <div class="average-rating">
                <div class="big-rating">${avgRating}</div>
                <div class="rating big-stars">
                    ${"★".repeat(Math.round(avgRating))}${"☆".repeat(
    5 - Math.round(avgRating)
  )}
                </div>
                <div class="review-count">Based on ${reviews.length} review${
    reviews.length !== 1 ? "s" : ""
  }</div>
            </div>
            <div class="rating-breakdown">
                ${[5, 4, 3, 2, 1]
                  .map((starLevel) => {
                    const arrayIndex = starLevel - 1; // Convert star level to array index
                    const count = ratingCounts[arrayIndex];
                    const percentage = percentages[arrayIndex];
                    return `
                        <div class="rating-bar-row">
                            <span class="star-level">${starLevel} stars</span>
                            <div class="rating-bar-container">
                                <div class="rating-bar" style="width: ${percentage}%"></div>
                            </div>
                            <span class="rating-count">(${count})</span>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    `;
}
// Show all reviews in modal
function showAllReviews(reviews) {
  let modal = document.getElementById("all-reviews-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "all-reviews-modal";
    modal.className = "reviews-modal";

    modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>All Reviews (${reviews.length})</h2>
                <div class="all-reviews-container"></div>
            </div>
        `;

    document.body.appendChild(modal);

    modal.querySelector(".close-modal").onclick = function () {
      modal.style.display = "none";
    };

    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  const allReviewsContainer = modal.querySelector(".all-reviews-container");
  allReviewsContainer.innerHTML = "";

  reviews.forEach((review) => {
    const reviewElement = document.createElement("div");
    reviewElement.className = "review-item";

    let dateString = "";
    if (review.timestamp) {
      try {
        const date = new Date(review.timestamp);
        dateString = date.toLocaleDateString();
      } catch (e) {
        console.warn("Invalid date format", review.timestamp);
      }
    }

    reviewElement.innerHTML = `
            <div class="review-header">
                <span class="reviewer-name">${escapeHTML(
                  review.name || "Anonymous"
                )}</span>
                <span class="review-date">${dateString}</span>
            </div>
            <div class="rating">
                ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}
            </div>
            <div class="review-comment">${escapeHTML(
              review.comment || ""
            )}</div>
        `;

    allReviewsContainer.appendChild(reviewElement);
  });

  modal.style.display = "block";
}

// Debug function
function debugReviews() {
  const currentUser = getCurrentUser();
  console.log("Debug - Current User ID:", currentUser);
  console.log("Debug - Product ID:", productId);
  console.log("Debug - API URL:", API_URL);
}

// Reset user ID (for testing)
function resetUserId() {
  if (
    confirm(
      "This will reset your user ID and allow you to review products again. Are you sure?"
    )
  ) {
    localStorage.removeItem("userId");
    console.log("User ID reset");
    window.location.reload();
  }
}

// Review Ends

// RETRIVING FUNCTION STARTS

// Page Loading Function

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
    document.getElementById("content").style.display = "block";
  }, 4000);
});

// Fetch FAQs from Google Sheets or Admin Panel
document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbyF_vLCIJK7evShOw2P_BPepGx-6fBIsGlndqnmfSiojDqgogEkYVeCZd9iU-2dI9RT/exec"
  )
    // Home API

    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.faqs.length) {
        const faqContainer = document.getElementById("faq-container");
        data.faqs.forEach((faq) => {
          const faqItem = document.createElement("div");
          faqItem.classList.add("faq-item");
          faqItem.innerHTML = `
              <button class="faq-question">${faq.question}</button>
              <div class="faq-answer">${faq.answer}</div>
            `;
          faqContainer.appendChild(faqItem);
        });

        document.querySelectorAll(".faq-question").forEach((button) => {
          button.addEventListener("click", function () {
            this.nextElementSibling.classList.toggle("active");
            this.classList.toggle("active");
          });
        });
      }
    })
    .catch((error) => console.error("Error fetching FAQs:", error));
});

// Filter Overlay Function

function toggleFilter() {
  let sidebar = document.getElementById("categorySidebar");
  let overlay = document.getElementById("overlay");

  if (sidebar.style.left === "0px") {
    sidebar.style.left = "-320px"; // Hide sidebar
    overlay.style.display = "none"; // Hide overlay
  } else {
    sidebar.style.left = "0px"; // Show sidebar
    overlay.style.display = "block"; // Show overlay
  }
}

// Product Page

let product = null;
let complementaryProducts = [];
let selectedComplementaryItems = [];
let popupType = ""; // 'pattern' or 'fabrics'
let filteredProducts = [];

// Parse URL parameters to get product ID
function getProductIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// Fetch product data
async function fetchProductData() {
  const productId = getProductIdFromUrl();

  if (!productId) {
    showError("Product ID not found in URL");
    return;
  }

  const sheetURL =
    "https://script.google.com/macros/s/AKfycbwWZEWxIHLTQSLDcxE0ltmydCCWDVbv0feh2GnjnO2fvd0Ur78C0ztV8EJIJCXqmQQ8/exec";
  // Product API

  try {
    const response = await fetch(sheetURL);
    const data = await response.json();

    let products = [];

    // Check if data is in the expected format
    if (data.success && data.products) {
      products = data.products;
    } else {
      // Handle legacy format - directly use the array
      products = Array.isArray(data) ? data : [];
    }

    // Find the product with matching ID
    product = products.find((p) => p.id.toString() === productId.toString());

    if (product) {
      // Store all products for complementary items
      complementaryProducts = products.filter(
        (p) => p.id.toString() !== productId.toString()
      );
      renderProductPage(product);

      // Load custom fabrics after product page is rendered
      setTimeout(() => {
        addCustomFabricsToSelection();
      }, 200);

      // Load recommended products
      loadRecommendedProducts(products, product);
    } else {
      showError("Product not found");
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
    showError("Failed to load product information");
  }
}

// Display error message
function showError(message) {
  document.getElementById("loader").style.display = "none";
  document.getElementById("productContainer").style.display = "block";
  document.getElementById("productContainer").innerHTML = `
    <div style="text-align: center; padding: 50px;">
        <h2 style="color: #e74c3c;">Error</h2>
        <p>${message}</p>
    </div>
  `;
}

// Render the product page
function renderProductPage(product) {
  // Ensure images is an array
  const images = product.images || [
    product.mainImage || product.image || "https://via.placeholder.com/150",
  ];

  // Create the category-specific options HTML
  const categoryOptionsHTML = getCategoryOptionsHTML(product.category);

  // Create HTML content
  const html = `
      
    <div class="product-category">
      <div class="pro-cat">
          ${
            product.category
              ? `<span class="category-tag">${product.category} </span>`
              : ""
          }
             
          ${
            product.subCategory
              ? `<span class="category-tag">${product.subCategory}</span>`
              : ""
          }</div>

        <div><button onclick="openSizeChart()" id="Size-btn">Size Chart</button>
</div>


      </div>

    <div class="product-container">
    
      <div class="product-images">
          <img id="mainImage" src="${images[0]}" alt="${
    product.title
  }" class="main-image">
          ${
            images.length > 1
              ? `
              <div class="thumbnail-container">
                  ${images
                    .map(
                      (img, index) => `
                      <img src="${img}" alt="Thumbnail ${index + 1}" 
                           class="thumbnail ${index === 0 ? "active" : ""}" 
                           onclick="changeMainImage('${img}', this)">
                  `
                    )
                    .join("")}
              </div>
          `
              : ""
          }
          
          <!-- Container for selected patterns or fabrics preview -->
          <div id="selectedComplementaryContainer"></div>
      </div>
      
      <div class="product-info">
          <h1 class="product-title">${product.title}</h1>
            <p class="product-description">${product.description}</p>
          <div class="product-price">$${product.price}</div>
          
          <div class="stock-status ${
            product.inStock ? "in-stock" : "out-of-stock"
          }">
              ${product.inStock ? "In Stock" : "Out of Stock"}
          </div>
          
        
          
          <!-- Category-specific options -->
          ${categoryOptionsHTML}
          
          
          <button 
              class="add-to-cart-btn" 
              onclick="addToCart()"
              ${!product.inStock ? "disabled" : ""}
          >
              ${product.inStock ? "Add to Cart" : "Out of Stock"}
          </button>
      </div>
    </div>
    <div>
    ${
      product.details
        ? `
              <div class="product-details">
                  <h3>Product Details</h3>
                  <p>${product.details}</p>
              </div>
          `
        : ""
    }
      </div>
  `;

  // Update the DOM
  document.getElementById("loader").style.display = "none";
  document.getElementById("productContainer").style.display = "block";
  document.getElementById("productContainer").innerHTML = html;

  // Set page title
  document.title = product.title;

  // Add required indicator for fabric selection if this is a sewing pattern
  if (
    product.category &&
    product.category.toLowerCase() === "sewing patterns"
  ) {
    const fabricsBtn = document.getElementById("selectFabricsBtn");
    if (fabricsBtn) {
      fabricsBtn.innerHTML =
        "Select Fabrics <span class='required-indicator'>*</span>";

      // Add a note about fabric selection being required
      const categoryOptions = document.querySelector(".category-options");
      if (categoryOptions) {
        const requiredNote = document.createElement("div");
        requiredNote.className = "required-note";
        requiredNote.innerHTML =
          "<span class='required-indicator'>*</span> Fabric selection is required for this pattern";
        categoryOptions.appendChild(requiredNote);
      }
    }
  }
}

// Generate category-specific options HTML
function getCategoryOptionsHTML(category) {
  if (!category) return "";

  category = category.toLowerCase();

  if (category === "garments") {
    return `
      <div class="category-options">
        <div class="size-selector">
          <label for="garment-size">Select Size:</label>
          <select id="garment-size" name="garment-size">
            <option value="NIL">- No Size -</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
          </select>
        </div>
      </div>
    `;
  } else if (category === "fabrics") {
    return `
      <div class="category-options">
        <div class="size-input">
          <label for="fabrics-size">Size in Yard:</label>
          
          <input type="number" id="fabrics-size" name="fabrics-size" min="0.5" step="0.5" value="1">
        </div>
        <div class="pattern-selector">
          <label for="sewing-pattern">Need sewing patterns?</label>
          <button id="selectPatternsBtn" class="add-to-cart-btn" onclick="openPatternPopup()" style="width: 100%">Select Patterns</button>
        </div>
      </div>
    `;
  } else if (category === "sewing patterns") {
    return `
      <div class="category-options">
        <div class="fabrics-selector">
          <label for="suggested-fabrics">Need fabrics?</label>
          <button id="selectFabricsBtn" class="add-to-cart-btn" onclick="openFabricsPopup()" style="width: 100%">Select Fabrics</button>
        </div>
      </div>
    `;
  }

  return "";
}

// Function to open pattern selection popup
function openPatternPopup() {
  popupType = "pattern";
  document.getElementById("popupTitle").textContent = "Select Sewing Patterns";

  // Reset selected items
  selectedComplementaryItems = [];
  updateSelectedItemsView();

  // Populate subcategory filter with sewing pattern subcategories
  populateSubcategoryFilter();

  // Reset filter to all subcategories by default
  document.getElementById("subcategoryFilter").value = "all";

  // Filter and render products
  filterProducts();

  // Display the popup
  document.getElementById("popupOverlay").style.display = "flex";
}

// Function to open fabrics selection popup
function openFabricsPopup() {
  popupType = "fabrics";
  document.getElementById("popupTitle").textContent = "Select Fabrics";

  // Reset selected items
  selectedComplementaryItems = [];
  updateSelectedItemsView();

  // Add custom fabrics to selection
  addCustomFabricsToSelection();

  // Populate subcategory filter with fabric subcategories
  populateSubcategoryFilter();

  // Reset filter to all subcategories by default
  document.getElementById("subcategoryFilter").value = "all";

  // Filter and render products
  filterProducts();

  // Display the popup
  document.getElementById("popupOverlay").style.display = "flex";
}

// Populate subcategory filter dropdown based on current popup type
function populateSubcategoryFilter() {
  const subcategorySelect = document.getElementById("subcategoryFilter");

  // Clear existing options except for "All Subcategories"
  while (subcategorySelect.options.length > 1) {
    subcategorySelect.remove(1);
  }

  // Get the current category type based on popup type
  const categoryToFilter =
    popupType === "pattern" ? "sewing patterns" : "fabrics";

  // Filter products by the current category
  const categoryProducts = complementaryProducts.filter(
    (p) => p.category && p.category.toLowerCase() === categoryToFilter
  );

  // Extract unique subcategories
  const subcategories = new Set();
  categoryProducts.forEach((product) => {
    if (product.subCategory) {
      subcategories.add(product.subCategory);
    }
  });

  // Add subcategories to dropdown
  subcategories.forEach((subcategory) => {
    const option = document.createElement("option");
    option.value = subcategory.toLowerCase();
    option.textContent = subcategory;
    subcategorySelect.appendChild(option);
  });
}

// Filter products based on search input, subcategory filter, and popup type
function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const subcategoryFilter = document
    .getElementById("subcategoryFilter")
    .value.toLowerCase();

  // First, filter by category type (patterns or fabrics)
  const categoryToFilter =
    popupType === "pattern" ? "sewing patterns" : "fabrics";

  filteredProducts = complementaryProducts.filter((p) => {
    // Category filter - must match the current popup type
    const matchesCategory =
      p.category && p.category.toLowerCase() === categoryToFilter;

    // Search term filter
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm));

    // Subcategory filter
    const matchesSubcategory =
      subcategoryFilter === "all" ||
      (p.subCategory && p.subCategory.toLowerCase() === subcategoryFilter);

    return matchesCategory && matchesSearch && matchesSubcategory;
  });

  renderProductsGrid(filteredProducts);
}

// Render products in a grid layout
function renderProductsGrid(products) {
  const productGrid = document.getElementById("productGrid");

  if (!products || products.length === 0) {
    productGrid.innerHTML =
      '<div class="no-items-message">No products found matching your criteria</div>';
    return;
  }

  let html = "";

  // Add custom fabric card at the beginning only for fabrics popup
  if (popupType === "fabrics") {
    const productId = getProductIdFromUrl();
    html += `
      <div class="product-card custom-fabric-card">
        <span class="badge custom-badge">Custom Fabric</span>
        <div class="custom-fabric-image">
          <i class="fas fa-palette"></i>
        </div>
        <div class="product-card-body">
          <h4 class="product-card-title">Custom Fabric Design</h4>
          
          <p class="product-card-description">Create your own unique fabric design with our custom fabric service. Perfect for special projects and personal touches.</p>
          <button class="custom-fabric-btn" onclick="goToCustomFabric()">Design Custom Fabric</button>
        </div>
      </div>
    `;
  }

  products.forEach((item) => {
    const itemImage = item.images
      ? item.images[0]
      : item.mainImage || item.image || "https://via.placeholder.com/250";

    const isSelected = selectedComplementaryItems.some(
      (selected) => selected.id.toString() === item.id.toString()
    );

    const shortDescription = item.description
      ? item.description.length > 100
        ? item.description.substring(0, 100) + "..."
        : item.description
      : "";

    html += `
      <div class="product-card">
        <span class="badge">${item.category || "Product"}</span>
        <img src="${itemImage}" alt="${item.title}" class="product-card-img">
        <div class="product-card-body">
          <h4 class="product-card-title">${item.title}</h4>
          <div class="product-card-price">$${item.price}</div>
          <p class="product-card-description">${shortDescription}</p>
          ${
            isSelected
              ? `<button class="remove-item-btn" onclick="removeComplementaryItem('${item.id}')">Remove</button>`
              : `<button class="add-item-btn" onclick="addComplementaryItem('${item.id}')">Add</button>`
          }
        </div>
      </div>
    `;
  });

  productGrid.innerHTML = html;
}

// Add a complementary item to selection
function addComplementaryItem(itemId) {
  const item = filteredProducts.find(
    (p) => p.id.toString() === itemId.toString()
  );

  if (!item) return;

  // Check if already added
  if (
    selectedComplementaryItems.some(
      (selected) => selected.id.toString() === itemId.toString()
    )
  ) {
    return;
  }

  // Add with default values
  selectedComplementaryItems.push({
    ...item,
    size: item.category && item.category.toLowerCase() === "fabrics" ? 1 : null,
    notes: "", // Initialize with empty notes
  });

  // Update views
  updateSelectedItemsView();
  renderProductsGrid(filteredProducts);
}

// Remove a complementary item from selection
function removeComplementaryItem(itemId) {
  const removedItem = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );

  selectedComplementaryItems = selectedComplementaryItems.filter(
    (item) => item.id.toString() !== itemId.toString()
  );

  // If it's a custom fabric, also remove it from session storage
  if (removedItem && removedItem.isCustom) {
    try {
      const customFabrics = JSON.parse(
        sessionStorage.getItem("customFabrics") || "[]"
      );
      const updatedCustomFabrics = customFabrics.filter(
        (fabric) => fabric.id !== itemId
      );
      sessionStorage.setItem(
        "customFabrics",
        JSON.stringify(updatedCustomFabrics)
      );
      console.log("Custom fabric removed from session storage");
    } catch (error) {
      console.error(
        "Error removing custom fabric from session storage:",
        error
      );
    }
  }

  // Update views
  updateSelectedItemsView();
  renderProductsGrid(filteredProducts);

  // Update main product page view
  renderSelectedComplementaryItems();
}

// Update the selected items view in the popup
function updateSelectedItemsView() {
  const selectedItemsContainer = document.getElementById(
    "selectedItemsContainer"
  );
  const selectedItemsList = document.getElementById("selectedItemsList");
  const selectedItemsCount = document.getElementById("selectedItemsCount");

  // Update count
  selectedItemsCount.textContent = `${selectedComplementaryItems.length} items selected`;

  // If no items are selected, hide the container
  if (selectedComplementaryItems.length === 0) {
    selectedItemsContainer.style.display = "none";
    return;
  }

  // Show the container and render selected items
  selectedItemsContainer.style.display = "block";

  // Separate custom fabrics from complementary items
  const customFabrics = selectedComplementaryItems.filter(
    (item) => item.isCustom
  );
  const complementaryItems = selectedComplementaryItems.filter(
    (item) => !item.isCustom
  );

  let html = "";

  // Render custom fabrics section if any exist
  if (customFabrics.length > 0) {
    html += `<div class="custom-fabrics-section"><h4>Customized Fabrics</h4>`;

    customFabrics.forEach((item) => {
      const itemImage = item.images
        ? item.images[0]
        : item.mainImage || item.image || "https://via.placeholder.com/60";

      // Enhanced custom fabric information display for popup
      let customFabricDetails = `
        <div class="custom-fabric-details">
          <div class="custom-fabric-specs">
            <span class="spec-item"><strong>Color:</strong> ${
              item.color || "Not specified"
            }</span>
            <span class="spec-item"><strong>Material:</strong> ${
              item.material || "Not specified"
            }</span>
            <span class="spec-item"><strong>Size:</strong> ${
              item.size || 1
            } yard(s)</span>
          </div>
          ${
            item.description
              ? `<div class="custom-fabric-description"><strong>Description:</strong> ${item.description}</div>`
              : ""
          }
          ${
            item.sewingPatternNotes
              ? `<div class="custom-fabric-description"><strong>Pattern Notes:</strong> ${item.sewingPatternNotes}</div>`
              : ""
          }
        </div>
      `;

      // Fetch and use the default amount for custom fabrics
      fetchCustomFabricDefaultAmount().then((defaultAmount) => {
        const customPriceDisplay = `$${defaultAmount.toFixed(
          2
        )} (Custom Pricing)`;

        // Update the price display in the popup if it exists
        const priceElement = document.querySelector(
          `[data-id="${item.id}"] .selected-item-price`
        );
        if (priceElement) {
          priceElement.textContent = customPriceDisplay;
        }
      });

      html += `
        <div class="selected-item custom-fabric-item" data-id="${item.id}">
          <img src="${itemImage}" alt="${
        item.title
      }" class="selected-item-image">
          <div class="selected-item-info">
            <div class="selected-item-title">
              ${item.title}
              <span class="custom-fabric-indicator">Custom</span>
            </div>
            <div class="selected-item-price">$${1.0} (Custom Pricing)</div>
            ${customFabricDetails}
            <div class="selected-item-size">
              <label>Size in Yard:</label>
              <input type="number" min="0.5" step="0.5" value="${
                item.size || 1
              }" 
                     onchange="updateItemSize('${item.id}', this.value)">
            </div>
          </div>
          <div class="selected-item-actions">
            <button class="selected-item-preview" onclick="previewItem('${
              item.id
            }')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="selected-item-remove" onclick="removeComplementaryItem('${
              item.id
            }')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Render complementary items section if any exist
  if (complementaryItems.length > 0) {
    html += `<div class="complementary-items-section"><h4>Selected ${
      popupType === "pattern" ? "Sewing Patterns" : "Fabrics"
    }</h4>`;

    complementaryItems.forEach((item) => {
      const itemImage = item.images
        ? item.images[0]
        : item.mainImage || item.image || "https://via.placeholder.com/60";

      html += `
        <div class="selected-item" data-id="${item.id}">
          <img src="${itemImage}" alt="${
        item.title
      }" class="selected-item-image">
          <div class="selected-item-info">
            <div class="selected-item-title">
              ${item.title}
            </div>
            <div class="selected-item-price">$${item.price}</div>
            ${
              item.category && item.category.toLowerCase() === "fabrics"
                ? `<div class="selected-item-size">
                <label>Size in Yard:</label>
                <input type="number" min="0.5" step="0.5" value="${
                  item.size || 1
                }" 
                       onchange="updateItemSize('${item.id}', this.value)">
              </div>`
                : ""
            }
            <div class="selected-item-notes">
              <label>Notes:</label>
              <textarea placeholder="Add notes here..." onchange="updateItemNotes('${
                item.id
              }', this.value)">${item.notes || ""}</textarea>
            </div>
          </div>
          <div class="selected-item-actions">
            <button class="selected-item-edit" onclick="editItemDetails('${
              item.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="selected-item-preview" onclick="previewItem('${
              item.id
            }')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="selected-item-remove" onclick="removeComplementaryItem('${
              item.id
            }')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  selectedItemsList.innerHTML = html;
}

// Edit item details function
function editItemDetails(itemId) {
  const item = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );

  if (!item) return;

  // Create a popup for editing
  const editPopupHTML = `
    <div id="editItemPopup" class="edit-popup-overlay">
      <div class="edit-popup-content">
        <h3>Edit ${item.title}</h3>
        <div class="edit-form">
          ${
            item.category && item.category.toLowerCase() === "fabrics"
              ? `<div class="edit-field">
                  <label>Size (Yards):</label>
                  <input type="number" id="editSize" min="0.5" step="0.5" value="${
                    item.size || 1
                  }">
                </div>`
              : ""
          }
          <div class="edit-field">
            <label>Notes:</label>
            <textarea id="editNotes" rows="4">${item.notes || ""}</textarea>
          </div>
          <div class="edit-buttons">
            <button onclick="saveItemEdits('${itemId}')">Save</button>
            <button onclick="closeEditPopup()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Append to body
  document.body.insertAdjacentHTML("beforeend", editPopupHTML);
}

// Save edits
function saveItemEdits(itemId) {
  const item = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );

  if (!item) return;

  // Get values from form
  if (item.category && item.category.toLowerCase() === "fabrics") {
    const sizeInput = document.getElementById("editSize");
    if (sizeInput) {
      item.size = parseFloat(sizeInput.value);
    }
  }

  const notesInput = document.getElementById("editNotes");
  if (notesInput) {
    item.notes = notesInput.value;
  }

  // Close popup
  closeEditPopup();

  // Update views
  updateSelectedItemsView();
  renderSelectedComplementaryItems();
}

// Close edit popup
function closeEditPopup() {
  const popup = document.getElementById("editItemPopup");
  if (popup) {
    popup.remove();
  }
}

// Preview item function
function previewItem(itemId) {
  const item = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );

  if (!item) return;

  // Prepare item details
  const images = item.images || [
    item.mainImage || item.image || "https://via.placeholder.com/300",
  ];

  // Calculate price based on fabric size if applicable
  let priceDisplay = `$${item.price}`;
  if (item.isCustom) {
    // Fetch and use the default amount for custom fabrics
    fetchCustomFabricDefaultAmount().then((defaultAmount) => {
      const customPriceDisplay = `$${defaultAmount.toFixed(
        2
      )} (Amount differs based on market price)`;

      // Update the price display in the popup if it exists
      const priceElement = document.querySelector(".preview-price");
      if (priceElement) {
        priceElement.textContent = customPriceDisplay;
      }
    });

    // Set initial display with default $1.00, will be updated when fetch completes
    priceDisplay = `$${1.0} (Amount differs based on market price)`;
  } else if (
    item.category &&
    item.category.toLowerCase() === "fabrics" &&
    item.size
  ) {
    priceDisplay = `$${(item.price * item.size).toFixed(2)} (${
      item.size
    } yard × $${item.price})`;
  }

  // Create a popup for preview
  const previewPopupHTML = `
    <div id="previewItemPopup" class="preview-popup-overlay">
      <div class="preview-popup-content">
        <div class="preview-header">
          <h2>${item.title}</h2>
          <button class="preview-close-btn" onclick="closePreviewPopup()">×</button>
        </div>
        
        <div class="preview-body">
          <div class="preview-images">
            <img src="${images[0]}" alt="${
    item.title
  }" class="preview-main-image">
            ${
              images.length > 1
                ? `<div class="preview-thumbnails">
                ${images
                  .map(
                    (img, index) =>
                      `<img src="${img}" alt="Preview ${
                        index + 1
                      }" class="preview-thumbnail" 
                   onclick="changePreviewImage(this)">`
                  )
                  .join("")}
              </div>`
                : ""
            }
          </div>
          
          <div class="preview-details">
            <div class="preview-category">
              ${
                item.category
                  ? `<span class="preview-tag">${item.category}</span>`
                  : ""
              }
              ${
                item.subCategory
                  ? `<span class="preview-tag">${item.subCategory}</span>`
                  : ""
              }
            </div>
            
            <div class="preview-price">${priceDisplay}</div>
            
            ${
              item.inStock !== undefined
                ? `<div class="preview-stock ${
                    item.inStock ? "in-stock" : "out-of-stock"
                  }">
                ${item.inStock ? "In Stock" : "Out of Stock"}
              </div>`
                : ""
            }
            
            ${
              !item.isCustom
                ? `<div class="preview-description">
                <h4>Description</h4>
                <p>${item.description || "No description available."}</p>
              </div>`
                : ""
            }
            
            ${
              item.details
                ? `<div class="preview-extra-details">
                <h4>Product Details</h4>
               <div>${formatProductDetails(item.details)}</div>
              </div>`
                : ""
            }
            
            ${
              item.size && !item.isCustom
                ? `<div class="preview-size">
                <h4>Size</h4>
                <p>${item.size} Yard</p>
              </div>`
                : ""
            }
            
            ${
              item.notes && !item.isCustom
                ? `<div class="preview-notes">
                <h4>Your Notes</h4>
                <p>${item.notes}</p>
              </div>`
                : ""
            }
            
            ${
              item.isCustom
                ? `<div class="preview-custom-fabric-details">
                <h4>Custom Fabric Details</h4>
                <div class="custom-fabric-specs">
                  ${
                    item.color
                      ? `<div class="custom-spec"><strong>Color:</strong> ${item.color}</div>`
                      : ""
                  }
                  ${
                    item.material
                      ? `<div class="custom-spec"><strong>Material:</strong> ${item.material}</div>`
                      : ""
                  }
                  ${
                    item.size
                      ? `<div class="custom-spec"><strong>Size:</strong> ${item.size} yard(s)</div>`
                      : ""
                  }
                  ${
                    item.description
                      ? `<div class="custom-spec"><strong>Description:</strong> ${item.description}</div>`
                      : ""
                  }
                  ${
                    item.sewingPatternNotes
                      ? `<div class="custom-spec"><strong>Pattern Notes:</strong> ${item.sewingPatternNotes}</div>`
                      : ""
                  }
                </div>
              </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `;

  // Append to body
  document.body.insertAdjacentHTML("beforeend", previewPopupHTML);
}

// Close preview popup
function closePreviewPopup() {
  const popup = document.getElementById("previewItemPopup");
  if (popup) {
    popup.remove();
  }
}

// Change preview image when clicking thumbnails
function changePreviewImage(thumbnail) {
  const mainImage = document.querySelector(".preview-main-image");
  mainImage.src = thumbnail.src;

  // Update active state
  const allThumbnails = document.querySelectorAll(".preview-thumbnail");
  allThumbnails.forEach((thumb) => thumb.classList.remove("active"));
  thumbnail.classList.add("active");
}

// Update fabrics size
function updateItemSize(itemId, size) {
  const item = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );
  if (item) {
    item.size = parseFloat(size);
    renderSelectedComplementaryItems(); // Update the main page view as well
  }
}

// Update item notes
function updateItemNotes(itemId, notes) {
  const item = selectedComplementaryItems.find(
    (item) => item.id.toString() === itemId.toString()
  );
  if (item) {
    item.notes = notes;
    renderSelectedComplementaryItems(); // Update the main page view as well
  }
}

// Close the popup
function closePopup() {
  document.getElementById("popupOverlay").style.display = "none";
  // Check if we need to update the button text after closing
  updateComplementaryButtonStatus();
}

// Confirm selections and return to product page
function confirmSelections() {
  // Update the selected complementary items display on the main product page
  renderSelectedComplementaryItems();

  // Update the button text
  updateComplementaryButtonStatus();

  // Close popup
  closePopup();
}

// Update the button text based on selections
function updateComplementaryButtonStatus() {
  // Update the select buttons to show status
  if (popupType === "pattern") {
    const patternsButton = document.getElementById("selectPatternsBtn");
    if (patternsButton) {
      const patternCount = selectedComplementaryItems.filter(
        (item) =>
          item.category && item.category.toLowerCase() === "sewing patterns"
      ).length;

      if (patternCount > 0) {
        patternsButton.textContent = `Selected Patterns (${patternCount})`;
        patternsButton.classList.add("has-selection");
      } else {
        patternsButton.textContent = "Select Patterns";
        patternsButton.classList.remove("has-selection");
      }
    }
  } else if (popupType === "fabrics") {
    const fabricsButton = document.getElementById("selectFabricsBtn");
    if (fabricsButton) {
      const fabricsCount = selectedComplementaryItems.filter(
        (item) => item.category && item.category.toLowerCase() === "fabrics"
      ).length;

      if (fabricsCount > 0) {
        fabricsButton.textContent = `Selected Fabrics (${fabricsCount})`;
        fabricsButton.classList.add("has-selection");
      } else {
        fabricsButton.textContent = "Select Fabrics";
        fabricsButton.classList.remove("has-selection");
      }
    }
  }
}

// Render selected complementary items on the main product page
function renderSelectedComplementaryItems() {
  const container = document.getElementById("selectedComplementaryContainer");

  // Check if container exists
  if (!container) {
    console.warn("selectedComplementaryContainer not found");
    return;
  }

  if (!selectedComplementaryItems.length) {
    container.innerHTML = "";
    // Update button status
    updateComplementaryButtonStatus();
    return;
  }

  // Separate custom fabrics from complementary items
  const customFabrics = selectedComplementaryItems.filter(
    (item) => item.isCustom
  );
  const complementaryItems = selectedComplementaryItems.filter(
    (item) => !item.isCustom
  );

  let html = "";

  // Render custom fabrics section if any exist
  if (customFabrics.length > 0) {
    html += `
      <div class="selected-customized">
        <h3 class="selected-customized-title">
          Customized Fabrics
        </h3>
    `;

    customFabrics.forEach((item) => {
      const itemImage = item.images
        ? item.images[0]
        : item.mainImage || item.image || "https://via.placeholder.com/60";

      // Fetch and use the default amount for custom fabrics
      fetchCustomFabricDefaultAmount().then((defaultAmount) => {
        const customPriceDisplay = `$${defaultAmount.toFixed(
          2
        )} (Custom Pricing)`;

        // Update the price display in the main page if it exists
        const priceElement = document.querySelector(
          `[data-id="${item.id}"] .selected-item-price`
        );
        if (priceElement) {
          priceElement.textContent = customPriceDisplay;
        }
      });

      // Set initial display with default $1.00, will be updated when fetch completes
      let priceText = `$${1.0} (Custom Pricing)`;

      // Enhanced custom fabric information display
      let customFabricDetails = `
        <div class="custom-fabric-details">
          <div class="custom-fabric-specs">
            <span class="spec-item"><strong>Color:</strong> ${
              item.color || "Not specified"
            }</span>
            <span class="spec-item"><strong>Material:</strong> ${
              item.material || "Not specified"
            }</span>
            <span class="spec-item"><strong>Size:</strong> ${
              item.size || 1
            } yard(s)</span>
          </div>
          ${
            item.description
              ? `<div class="custom-fabric-description"><strong>Description:</strong> ${item.description}</div>`
              : ""
          }
          ${
            item.sewingPatternNotes
              ? `<div class="custom-fabric-description"><strong>Pattern Notes:</strong> ${item.sewingPatternNotes}</div>`
              : ""
          }
        </div>
      `;

      html += `
        <div class="selected-item custom-fabric-item" data-id="${item.id}">
          <img src="${itemImage}" alt="${item.title}" class="selected-item-image">
          <div class="selected-item-info">
            <div class="selected-item-title">
             Custom Fabric Details
              <span class="custom-fabric-indicator">Custom</span>
            </div>
            <div class="selected-item-price">${priceText}</div>
            ${customFabricDetails}
          </div>
          <div class="selected-item-actions">
            <button class="selected-item-preview" onclick="previewItem('${item.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="selected-item-delete" onclick="removeComplementaryItem('${item.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Render complementary items section if any exist
  if (complementaryItems.length > 0) {
    html += `
      <div class="selected-complementary">
        <h3 class="selected-complementary-title">
          Selected ${popupType === "pattern" ? "Sewing Patterns" : "Fabrics"}
        </h3>
    `;

    complementaryItems.forEach((item) => {
      const itemImage = item.images
        ? item.images[0]
        : item.mainImage || item.image || "https://via.placeholder.com/60";

      let priceText = `$${item.price}`;
      if (
        item.category &&
        item.category.toLowerCase() === "fabrics" &&
        item.size
      ) {
        priceText = `$${(item.price * item.size).toFixed(2)} (${
          item.size
        } yard × $${item.price})`;
      }

      html += `
        <div class="selected-item" data-id="${item.id}">
          <img src="${itemImage}" alt="${
        item.title
      }" class="selected-item-image">
          <div class="selected-item-info">
            <div class="selected-item-title">
              ${item.title}
            </div>
            <div class="selected-item-price">${priceText}</div>
            ${
              item.sewingPatternNotes
                ? `<div class="selected-item-notes"><small>Pattern Notes: ${item.sewingPatternNotes}</small></div>`
                : ""
            }
          </div>
          <div class="selected-item-actions">
            <button class="selected-item-edit" onclick="editItemDetails('${
              item.id
            }')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="selected-item-preview" onclick="previewItem('${
              item.id
            }')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="selected-item-delete" onclick="removeComplementaryItem('${
              item.id
            }')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;

  // Update button status
  updateComplementaryButtonStatus();
}

// Change the main image when clicking on thumbnails
function changeMainImage(imageUrl, thumbnail) {
  // Update main image
  document.getElementById("mainImage").src = imageUrl;

  // Update active thumbnail
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumb) => {
    thumb.classList.remove("active");
  });

  thumbnail.classList.add("active");
}

// Function to format product details to preserve line breaks
function formatProductDetails(details) {
  if (!details) return "";

  // Replace newlines with <br> tags to preserve formatting
  return details.replace(/\n/g, "<br>");
}

// Modify the renderProductPage function to preserve details formatting
function renderProductPage(product) {
  // Ensure images is an array
  const images = product.images || [
    product.mainImage || product.image || "https://via.placeholder.com/150",
  ];

  // Create the category-specific options HTML
  const categoryOptionsHTML = getCategoryOptionsHTML(product.category);

  // Format the details to preserve line breaks
  const formattedDetails = formatProductDetails(product.details);

  // Create HTML content
  const html = `
      
    <div class="product-category">
      <div class="pro-cat">
          ${
            product.category
              ? `<span class="category-tag">${product.category} </span>`
              : ""
          }
             
          ${
            product.subCategory
              ? `<span class="category-tag">${product.subCategory}</span>`
              : ""
          }</div>

        <div><button onclick="openSizeChart()" id="Size-btn">Size Chart</button>
</div>


      </div>

    <div class="product-container">
    
      <div class="product-images">
          <img id="mainImage" src="${images[0]}" alt="${
    product.title
  }" class="main-image">
          ${
            images.length > 1
              ? `
              <div class="thumbnail-container">
                  ${images
                    .map(
                      (img, index) => `
                      <img src="${img}" alt="Thumbnail ${index + 1}" 
                           class="thumbnail ${index === 0 ? "active" : ""}" 
                           onclick="changeMainImage('${img}', this)">
                  `
                    )
                    .join("")}
              </div>
          `
              : ""
          }
          
          <!-- Container for selected patterns or fabrics preview -->
          <div id="selectedComplementaryContainer"></div>
      </div>
      
      <div class="product-info">
          <h1 class="product-title">${product.title}</h1>
            <p class="product-description">${product.description}</p>
          <div class="product-price">$${product.price}</div>
          
          <div class="stock-status ${
            product.inStock ? "in-stock" : "out-of-stock"
          }">
              ${product.inStock ? "In Stock" : "Out of Stock"}
          </div>
          
        
          
          <!-- Category-specific options -->
          ${categoryOptionsHTML}
          
          
          <button 
              class="add-to-cart-btn" 
              onclick="addToCart()"
              ${!product.inStock ? "disabled" : ""}
          >
              ${product.inStock ? "Add to Cart" : "Out of Stock"}
          </button>
      </div>
    </div>
    <div>
    ${
      product.details
        ? `
              <div class="product-details">
                  <h3>Product Details</h3>
                  <div>${formattedDetails}</div>
              </div>
          `
        : ""
    }
      </div>
  `;

  // Update the DOM
  document.getElementById("loader").style.display = "none";
  document.getElementById("productContainer").style.display = "block";
  document.getElementById("productContainer").innerHTML = html;

  // Set page title
  document.title = product.title;

  // Add required indicator for fabric selection if this is a sewing pattern
  if (
    product.category &&
    product.category.toLowerCase() === "sewing patterns"
  ) {
    const fabricsBtn = document.getElementById("selectFabricsBtn");
    if (fabricsBtn) {
      fabricsBtn.innerHTML =
        "Select Fabrics <span class='required-indicator'>*</span>";

      // Add a note about fabric selection being required
      const categoryOptions = document.querySelector(".category-options");
      if (categoryOptions) {
        const requiredNote = document.createElement("div");
        requiredNote.className = "required-note";
        requiredNote.innerHTML =
          "<span class='required-indicator'>*</span> Fabric selection is required for this pattern";
        categoryOptions.appendChild(requiredNote);
      }
    }
  }
}

// Modified functions to avoid using localStorage for cart data

// ================ MAIN CART FUNCTIONALITY ================

// Modified addToCart function with guest cart support
function addToCart() {
  // Get selected options
  let options = {};
  if (product.category) {
    const category = product.category.toLowerCase();
    if (category === "garments") {
      const sizeSelect = document.getElementById("garment-size");
      options.size = sizeSelect ? sizeSelect.value : null;
    } else if (category === "fabrics") {
      const fabricsSize = document.getElementById("fabrics-size");
      options.size = fabricsSize ? parseFloat(fabricsSize.value) : 1;
    }
  }

  // Check if this is a sewing pattern and requires fabric
  if (
    product.category &&
    product.category.toLowerCase() === "sewing patterns"
  ) {
    const fabricItems = selectedComplementaryItems.filter(
      (item) => item.category && item.category.toLowerCase() === "fabrics"
    );

    if (fabricItems.length === 0) {
      alert("Please select at least one fabric for this sewing pattern.");
      return; // Stop the function and don't add to cart
    }
  }

  // Get the image URL
  const imageUrl = product.images
    ? product.images[0]
    : product.mainImage || product.image || "https://via.placeholder.com/150";

  // Create cart item
  const cartItem = {
    id: product.id,
    title: product.title,
    price: product.price,
    quantity: 1, // Default quantity for new items
    image: imageUrl,
    options: options,
    complementaryItems: selectedComplementaryItems.map((item) => {
      // Base item structure
      const cartComplementaryItem = {
        id: item.id,
        title: item.title,
        price: item.price,
        size: item.size || null,
        notes: item.notes || "",
        image: item.images
          ? item.images[0]
          : item.mainImage || item.image || "https://via.placeholder.com/60",
      };

      // If this is a custom fabric, add custom-specific details
      if (item.isCustom) {
        cartComplementaryItem.isCustom = true;
        cartComplementaryItem.color = item.color || "";
        cartComplementaryItem.material = item.material || "";
        cartComplementaryItem.description = item.description || "";
        cartComplementaryItem.sewingPatternNotes =
          item.sewingPatternNotes || "";
        cartComplementaryItem.category = item.category || "fabrics";
        cartComplementaryItem.subCategory = item.subCategory || "Custom Fabric";
        // Set custom pricing display
        cartComplementaryItem.priceDisplay = "Custom Pricing";
      }

      return cartComplementaryItem;
    }),
  };

  // Get user information from sessionStorage
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn) {
    // User is logged in, check for duplicates and send to server with proper userId
    addOrUpdateCartItem(cartItem, userId);
  } else {
    // User is not logged in - store as guest cart
    addToGuestCart(cartItem);
  }

  clearCustomFabricsAfterAddToCart();
}

// New function to handle guest cart storage
function addToGuestCart(cartItem) {
  // Show loading indicator
  const addToCartBtn = document.querySelector(".add-to-cart-btn");
  const originalBtnText = addToCartBtn
    ? addToCartBtn.textContent
    : "Add to Cart";
  if (addToCartBtn) {
    addToCartBtn.textContent = "Adding...";
    addToCartBtn.disabled = true;
  }

  try {
    // Get existing guest cart from localStorage
    let guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");

    // Check for duplicates in guest cart
    let duplicateFound = false;

    for (let i = 0; i < guestCart.length; i++) {
      const existingItem = guestCart[i];

      // Compare product ID, options, and complementary items
      if (existingItem.id === cartItem.id) {
        const sameOptions = areOptionsEqual(
          existingItem.options,
          cartItem.options
        );
        const sameComplementary = areComplementaryItemsEqual(
          existingItem.complementaryItems,
          cartItem.complementaryItems
        );

        if (sameOptions && sameComplementary) {
          // Update quantity instead of adding new item
          guestCart[i].quantity = (guestCart[i].quantity || 1) + 1;
          duplicateFound = true;
          break;
        }
      }
    }

    // If no duplicates found, add new item
    if (!duplicateFound) {
      // Generate a temporary guest cart item ID
      cartItem.guestCartItemId = generateGuestCartItemId();
      guestCart.push(cartItem);
    }

    // Save updated guest cart to localStorage
    localStorage.setItem("guestCart", JSON.stringify(guestCart));

    // Reset button
    if (addToCartBtn) {
      addToCartBtn.textContent = originalBtnText;
      addToCartBtn.disabled = false;
    }

    // Update cart count
    updateCartCount();
  } catch (error) {
    // Reset button
    if (addToCartBtn) {
      addToCartBtn.textContent = originalBtnText;
      addToCartBtn.disabled = false;
    }

    console.error("Error adding to guest cart:", error);
  }

  clearCustomFabricsAfterAddToCart();
}

// Generate a unique guest cart item ID
function generateGuestCartItemId() {
  const prefix = "GUEST";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}${timestamp}${random}`;
}

// Modified function to check for duplicates and update quantity or add new item
function addOrUpdateCartItem(cartItem, userId) {
  // Show loading indicator immediately
  const addToCartBtn = document.querySelector(".add-to-cart-btn");
  const originalBtnText = addToCartBtn
    ? addToCartBtn.textContent
    : "Add to Cart";
  if (addToCartBtn) {
    addToCartBtn.textContent = "Adding...";
    addToCartBtn.disabled = true;
  }

  // First check if the item already exists in the cart
  loadCartFromServer(userId)
    .then((serverCart) => {
      // Flag to check if we found a duplicate
      let duplicateFound = false;

      // Check for duplicates based on product ID and options
      for (let i = 0; i < serverCart.length; i++) {
        const existingItem = serverCart[i];

        // Compare product ID first
        if (existingItem.id === cartItem.id) {
          // For options, check if they're equivalent (same size, etc.)
          const sameOptions = areOptionsEqual(
            existingItem.options,
            cartItem.options
          );

          // For complementary items, check if they're the same
          const sameComplementary = areComplementaryItemsEqual(
            existingItem.complementaryItems,
            cartItem.complementaryItems
          );

          // If product ID, options, and complementary items match, it's a duplicate
          if (sameOptions && sameComplementary) {
            // Update quantity instead of adding a new item
            let updatedItem = JSON.parse(JSON.stringify(existingItem)); // Make a deep copy
            updatedItem.quantity = (updatedItem.quantity || 1) + 1;
            duplicateFound = true;

            // Update item on server
            return updateCartItemOnServer(
              existingItem.cartItemId,
              updatedItem,
              userId
            );
          }
        }
      }

      // If no duplicates found, add new item
      if (!duplicateFound) {
        return saveCartToServer(cartItem, userId);
      }
    })
    .then((data) => {
      // Reset button
      if (addToCartBtn) {
        addToCartBtn.textContent = originalBtnText;
        addToCartBtn.disabled = false;
      }

      if (data && data.success) {
        // Show success message

        // Update cart count
        updateCartCount();
        clearCustomFabricsAfterAddToCart();
      } else {
        // Show error message
        alert("Error updating cart: " + (data?.message || "Unknown error"));
      }
    })
    .catch((error) => {
      // Reset button
      if (addToCartBtn) {
        addToCartBtn.textContent = originalBtnText;
        addToCartBtn.disabled = false;
      }

      // Show error message
      alert("Error updating cart. Please try again.");
      console.error("Error:", error);
    });
}

// Helper function to compare options objects
function areOptionsEqual(options1, options2) {
  // Handle null/undefined cases
  if (!options1 && !options2) return true;
  if (!options1 || !options2) return false;

  // Compare size if it exists
  if (options1.size !== options2.size) return false;

  // Add more comparisons for other option properties as needed

  return true;
}

// Helper function to compare complementary items
function areComplementaryItemsEqual(items1, items2) {
  // Handle null/undefined cases
  if (!items1 && !items2) return true;
  if (!items1 || !items2) return false;

  // If different number of items, they're not equal
  if (items1.length !== items2.length) return false;

  // Sort items by ID for consistent comparison
  const sortedItems1 = [...items1].sort((a, b) => a.id.localeCompare(b.id));
  const sortedItems2 = [...items2].sort((a, b) => a.id.localeCompare(b.id));

  // Compare each item
  for (let i = 0; i < sortedItems1.length; i++) {
    const item1 = sortedItems1[i];
    const item2 = sortedItems2[i];

    // Compare basic properties
    if (item1.id !== item2.id) return false;
    if (item1.title !== item2.title) return false;
    if (item1.price !== item2.price) return false;
    if (item1.size !== item2.size) return false;
    if (item1.notes !== item2.notes) return false;

    // For custom fabrics, compare custom-specific properties
    if (item1.isCustom || item2.isCustom) {
      if (item1.isCustom !== item2.isCustom) return false;

      if (item1.isCustom) {
        // Compare custom fabric properties
        if (item1.color !== item2.color) return false;
        if (item1.material !== item2.material) return false;
        if (item1.description !== item2.description) return false;
        if (item1.sewingPatternNotes !== item2.sewingPatternNotes) return false;
        if (item1.category !== item2.category) return false;
        if (item1.subCategory !== item2.subCategory) return false;
      }
    }
  }

  return true;
}

// ================ SERVER COMMUNICATION ================
// Improved function to update an existing cart item on the server
function updateCartItemOnServer(cartItemId, updatedItem, userId) {
  if (!cartItemId || !userId) {
    console.error("Missing cartItemId or userId");
    return Promise.reject(new Error("Missing cartItemId or userId"));
  }

  // API endpoint URL
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbxrQrGtswF2tkxMjtWGqWgCH7C0ewQuoMKb2YVfTc5FVe0kdsQoYjwToq_PiVbtxEQ/exec";
  // Login Detail API

  // Create form data for the POST request
  const formData = new FormData();
  formData.append("action", "updateCartItem");
  formData.append("userId", userId);
  formData.append("cartItemId", cartItemId);
  formData.append("cartItem", JSON.stringify(updatedItem));

  // Send request to server
  return fetch(apiUrl, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Server responded with an error: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        return {
          success: true,
          message: "Cart updated! Quantity increased.",
          cartItemId: cartItemId,
        };
      } else {
        throw new Error(data.message || "Unknown server error");
      }
    });
}

// Improved function to save cart to server
function saveCartToServer(cartItem, userId) {
  // Check if userId is valid
  if (!userId) {
    console.error("Missing userId - cannot add to cart");
    return Promise.reject(new Error("Missing userId"));
  }

  // API endpoint URL
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbxrQrGtswF2tkxMjtWGqWgCH7C0ewQuoMKb2YVfTc5FVe0kdsQoYjwToq_PiVbtxEQ/exec";
  // Login Detail API

  // Add user identification to the cart item
  cartItem.userId = userId;

  // Ensure cart item has quantity
  if (!cartItem.quantity) {
    cartItem.quantity = 1;
  }

  // Convert cart item to JSON string
  const cartItemJson = JSON.stringify(cartItem);

  // Create form data for the POST request
  const formData = new FormData();
  formData.append("action", "addToCart");
  formData.append("userId", userId);
  formData.append("cartItem", cartItemJson);

  // Send request to server
  return fetch(apiUrl, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Server responded with an error: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        return {
          success: true,
          message: "Item added to cart!",
          cartItemId: data.cartItemId,
        };
      } else {
        throw new Error(
          data.message || "Unknown server error when adding to cart"
        );
      }
    });
}

// Enhanced function to load the cart from server for logged in users
function loadCartFromServer(userId) {
  if (!userId) {
    console.error("Missing userId - cannot load cart");
    return Promise.reject(new Error("Missing userId"));
  }

  // API endpoint URL
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbxrQrGtswF2tkxMjtWGqWgCH7C0ewQuoMKb2YVfTc5FVe0kdsQoYjwToq_PiVbtxEQ/exec";
  // Login Detail API

  // Add query parameters
  const url = `${apiUrl}?action=getCart&userId=${encodeURIComponent(userId)}`;

  // Send request to server
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Process and return cart items with proper format for consistency
        const cartItems = data.cartItems || [];
        return cartItems.map((item) => {
          // Make sure all items have consistent structure
          return {
            id: item.id || item.productId,
            cartItemId: item.cartItemId,
            title: item.title,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity || 1),
            image: item.image,
            options: item.options || {},
            complementaryItems: Array.isArray(item.complementaryItems)
              ? item.complementaryItems
              : [],
          };
        });
      } else {
        console.error("Error loading cart:", data.message);
        return [];
      }
    });
}

// Function to load guest cart from localStorage
function loadGuestCart() {
  try {
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    return guestCart.map((item) => {
      // Ensure consistent structure
      return {
        id: item.id,
        guestCartItemId: item.guestCartItemId,
        title: item.title,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity || 1),
        image: item.image,
        options: item.options || {},
        complementaryItems: Array.isArray(item.complementaryItems)
          ? item.complementaryItems
          : [],
      };
    });
  } catch (error) {
    console.error("Error loading guest cart:", error);
    return [];
  }
}

// ================ CART DISPLAY AND MANAGEMENT ================
// Enhanced function to update the cart count
function updateCartCount() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn) {
    loadCartFromServer(userId)
      .then((cartItems) => {
        // Calculate total quantity
        let totalQuantity = 0;
        cartItems.forEach((item) => {
          totalQuantity += parseInt(item.quantity) || 1;
        });

        // Update cart count display
        updateCartCountDisplay(totalQuantity);

        // Store the cart in local storage for the cart page to use
        localStorage.setItem("shoppingCart", JSON.stringify(cartItems));
      })
      .catch((error) => {
        console.error("Error updating cart count:", error);
        updateCartCountDisplay(0);
      });
  } else {
    // For guest users, load from guest cart
    const guestCart = loadGuestCart();
    let totalQuantity = 0;
    guestCart.forEach((item) => {
      totalQuantity += parseInt(item.quantity) || 1;
    });

    updateCartCountDisplay(totalQuantity);
    // Store guest cart as shopping cart for cart page
    localStorage.setItem("shoppingCart", JSON.stringify(guestCart));
  }
}

// Helper function to update the cart count display
function updateCartCountDisplay(itemCount) {
  const counter = document.getElementById("cart-count");
  if (counter) {
    counter.textContent = itemCount;
    // Hide counter when empty
    counter.style.display = itemCount > 0 ? "flex" : "none";
  }
}

// ================ SESSION MANAGEMENT ================
// Check for pending cart items on page load
document.addEventListener("DOMContentLoaded", () => {
  if (typeof fetchProductData === "function") {
    fetchProductData();
  }

  updateCartCount(); // Update cart count on page load
  processPendingCartItems(); // Process any pending cart items

  // Check login status and update UI accordingly
  checkLoginStatus();
});

// Improved function to handle pending cart items after login
function processPendingCartItems() {
  const pendingCartItem = sessionStorage.getItem("pendingCartItem");
  if (pendingCartItem) {
    // Get the user ID from sessionStorage
    const userId = sessionStorage.getItem("userId");

    if (userId) {
      // Parse the pending item
      try {
        const cartItem = JSON.parse(pendingCartItem);

        // Add item to cart with duplicate checking
        addOrUpdateCartItem(cartItem, userId);

        // Clear the pending item
        sessionStorage.removeItem("pendingCartItem");
      } catch (e) {
        console.error("Error processing pending cart item:", e);
        sessionStorage.removeItem("pendingCartItem");
      }
    }
  }
}

// Enhanced function to sync guest cart with server cart after login
function syncCartAfterLogin(userId) {
  // Safety check
  if (!userId) {
    console.error("Cannot sync cart: missing userId");
    return Promise.resolve(false);
  }

  // Get guest cart from localStorage
  const guestCart = loadGuestCart();

  // If guest cart is empty, just load from server
  if (guestCart.length === 0) {
    return loadCartFromServer(userId)
      .then((serverCart) => {
        if (serverCart.length > 0) {
          localStorage.setItem("shoppingCart", JSON.stringify(serverCart));
        }
        // Clear guest cart
        localStorage.removeItem("guestCart");
        return true;
      })
      .catch((error) => {
        console.error("Error loading server cart:", error);
        return false;
      });
  }

  // First, get the server cart to check for duplicates
  return loadCartFromServer(userId)
    .then((serverCart) => {
      // If server cart is empty but guest has items, just push all guest items
      if (serverCart.length === 0 && guestCart.length > 0) {
        const savePromises = guestCart.map((item) => {
          // Remove guest-specific properties before saving to server
          const serverItem = { ...item };
          delete serverItem.guestCartItemId;
          return saveCartToServer(serverItem, userId);
        });
        return Promise.all(savePromises);
      }

      // Both have items - merge carefully without deleting anything
      let mergedCart = [...serverCart];

      // For each guest item, check if it exists in server
      const syncPromises = guestCart.map((guestItem) => {
        // Check if item already exists in merged cart
        const existingItemIndex = mergedCart.findIndex((serverItem) => {
          return (
            serverItem.id === guestItem.id &&
            areOptionsEqual(serverItem.options, guestItem.options) &&
            areComplementaryItemsEqual(
              serverItem.complementaryItems,
              guestItem.complementaryItems
            )
          );
        });

        if (existingItemIndex >= 0) {
          // If item exists, update quantity
          const updatedItem = { ...mergedCart[existingItemIndex] };
          updatedItem.quantity =
            (parseInt(updatedItem.quantity) || 1) +
            (parseInt(guestItem.quantity) || 1);

          // Update on server and in merged cart
          mergedCart[existingItemIndex] = updatedItem;
          return updateCartItemOnServer(
            updatedItem.cartItemId,
            updatedItem,
            userId
          );
        } else {
          // If item doesn't exist in server cart, add it
          const serverItem = { ...guestItem };
          delete serverItem.guestCartItemId; // Remove guest-specific ID

          return saveCartToServer(serverItem, userId).then((result) => {
            if (result && result.success) {
              // Add the new item to our merged cart with its server ID
              serverItem.cartItemId = result.cartItemId;
              mergedCart.push(serverItem);
            }
            return result;
          });
        }
      });

      // Wait for all sync operations to complete
      return Promise.all(syncPromises).then(() => {
        // Update local storage with merged cart
        localStorage.setItem("shoppingCart", JSON.stringify(mergedCart));
        // Clear guest cart after successful sync
        localStorage.removeItem("guestCart");
        console.log(
          "Cart synced successfully, total items:",
          mergedCart.length
        );
        return true;
      });
    })
    .catch((error) => {
      console.error("Error syncing cart:", error);
      return false;
    });
}

// Enhanced function to check login status and update UI
function checkLoginStatus() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true" && userId;

  // Update UI based on login status
  const loginButtons = document.querySelectorAll(".login-btn");
  const logoutButtons = document.querySelectorAll(".logout-btn");
  const profileElements = document.querySelectorAll(".profile-element");

  if (isLoggedIn) {
    // User is logged in
    loginButtons.forEach((btn) => (btn.style.display = "none"));
    logoutButtons.forEach((btn) => (btn.style.display = "block"));
    profileElements.forEach((el) => (el.style.display = "block"));

    // Sync guest cart with server cart if there's a guest cart
    const guestCart = loadGuestCart();
    if (guestCart.length > 0) {
      syncCartAfterLogin(userId).then(() => {
        updateCartCount();
      });
    } else {
      updateCartCount();
    }
  } else {
    // User is not logged in
    loginButtons.forEach((btn) => (btn.style.display = "block"));
    logoutButtons.forEach((btn) => (btn.style.display = "none"));
    profileElements.forEach((el) => (el.style.display = "none"));

    // Update cart count from guest cart
    updateCartCount();
  }
}

// Cart Function Ends

// Recommended Products JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Insert the recommended section before the FAQ section
  const faqSection = document.getElementById("faq-section");
  const recommendedSectionHTML = `
    <section id="recommended-section" class="recommended-products">
      <div class="container">
        <h2>Recommended Products</h2>
        <div id="recommended-slider" class="product-slider">
          <div id="recommended-container" class="product-slider-container">
            <!-- Products will be loaded here dynamically -->
          </div>
        </div>
      </div>
    </section>
  `;

  if (faqSection) {
    faqSection.insertAdjacentHTML("beforebegin", recommendedSectionHTML);
  }
});

// --------------------------------------------------------------------------------------
// Load recommended products
function loadRecommendedProducts(allProducts, currentProduct) {
  // Wait for the DOM to be fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      initRecommended(allProducts, currentProduct)
    );
  } else {
    initRecommended(allProducts, currentProduct);
  }
}

// Initialize the recommended products section - same category only
function initRecommended(allProducts, currentProduct) {
  const recommendedContainer = document.getElementById("recommended-container");
  if (!recommendedContainer) return;

  console.log("Current product:", currentProduct); // Debug log
  console.log("All products count:", allProducts.length); // Debug log

  let recommendedProducts = [];

  // Only get products from the same category (excluding current product)
  if (currentProduct.category) {
    const sameCategoryProducts = allProducts.filter(
      (product) =>
        product.id.toString() !== currentProduct.id.toString() &&
        product.category &&
        product.category.toLowerCase().trim() ===
          currentProduct.category.toLowerCase().trim()
    );

    console.log("Same category products found:", sameCategoryProducts.length);

    if (sameCategoryProducts.length > 0) {
      // Shuffle the products for variety
      const shuffledProducts = sameCategoryProducts.sort(
        () => 0.5 - Math.random()
      );

      // Take up to 10 products (or all if less than 10)
      recommendedProducts = shuffledProducts.slice(0, 10);

      console.log("Final recommended products:", recommendedProducts.length);
      console.log(
        "Recommended products categories:",
        recommendedProducts.map(
          (p) => `${p.category} - ${p.subCategory || "No subcategory"}`
        )
      );
    } else {
      console.log("No products found in the same category");
    }
  } else {
    console.log("Current product has no category");
  }

  // Render recommended products (will show "no products" message if empty)
  renderRecommendedProducts(recommendedProducts);

  // Initialize slider functionality only if there are products
  if (recommendedProducts.length > 0) {
    initializeSlider(recommendedProducts.length);
  }
}

// Render the recommended products
function renderRecommendedProducts(recommendedProducts) {
  const recommendedContainer = document.getElementById("recommended-container");
  if (!recommendedContainer) return;

  if (recommendedProducts.length === 0) {
    recommendedContainer.innerHTML =
      "<p>No similar products available in this category.</p>";
    return;
  }

  let html = "";
  recommendedProducts.forEach((product) => {
    const productImage = product.images
      ? product.images[0]
      : product.mainImage ||
        product.image ||
        "https://via.placeholder.com/220x180";

    html += `
      <div class="recommended-product-card">
        <a href="productpage.html?id=${product.id}" class="product-link">
          <img src="${productImage}" alt="${
      product.title
    }" class="recommended-product-img">
          <div class="recommended-product-body">
            <h4 class="recommended-product-title">${product.title}</h4>
            <div class="recommended-product-price">$${product.price}</div>
            <div class="recommended-product-category">${product.category}${
      product.subCategory ? ` - ${product.subCategory}` : ""
    }</div>
            <button class="view-product-btn">View Product</button>
          </div>
        </a>
      </div>
    `;
  });

  recommendedContainer.innerHTML = html;
}

// Initialize the slider controls
function initializeSlider(productCount) {
  const slider = document.getElementById("recommended-container");
  const prevBtn = document.getElementById("prev-recommended");
  const nextBtn = document.getElementById("next-recommended");

  if (slider && prevBtn && nextBtn) {
    let position = 0;
    const cardWidth = 240; // card width + gap

    prevBtn.addEventListener("click", () => {
      // Calculate number of visible items based on screen width
      const containerWidth = slider.parentElement.offsetWidth;
      const visibleItems = Math.max(1, Math.floor(containerWidth / cardWidth));

      position += cardWidth * visibleItems;
      position = Math.min(position, 0); // Don't go beyond first slide
      slider.style.transform = `translateX(${position}px)`;
    });

    nextBtn.addEventListener("click", () => {
      // Calculate number of visible items based on screen width
      const containerWidth = slider.parentElement.offsetWidth;
      const visibleItems = Math.max(1, Math.floor(containerWidth / cardWidth));

      const maxPosition = -(
        Math.max(0, productCount - visibleItems) * cardWidth
      );
      position -= cardWidth * visibleItems;
      position = Math.max(position, maxPosition); // Don't go beyond last slide
      slider.style.transform = `translateX(${position}px)`;
    });

    // Make product cards clickable
    setTimeout(() => {
      document.querySelectorAll(".recommended-product-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.classList.contains("view-product-btn")) {
            const link = card.querySelector(".product-link");
            if (link) {
              window.location.href = link.href;
            }
          }
        });
      });
    }, 100);
  }
}

function toggleSection(id) {
  const section = document.getElementById(id);
  if (section.classList.contains("show")) {
    section.classList.remove("show");
  } else {
    // Optionally close others
    document
      .querySelectorAll(".dropdown-content")
      .forEach((div) => div.classList.remove("show"));
    section.classList.add("show");
  }
}

// Function to navigate to custom fabric page
function goToCustomFabric() {
  const productId = getProductIdFromUrl();
  if (productId) {
    window.location.href = `custom.html?id=${productId}`;
  } else {
    window.location.href = `custom.html`;
  }
}

// Function to load custom fabrics from session storage
function loadCustomFabrics() {
  try {
    const customFabrics = JSON.parse(
      sessionStorage.getItem("customFabrics") || "[]"
    );
    return customFabrics;
  } catch (error) {
    console.error("Error loading custom fabrics:", error);
    return [];
  }
}

// Function to add custom fabrics to selected items
function addCustomFabricsToSelection() {
  const customFabrics = loadCustomFabrics();

  customFabrics.forEach((fabric) => {
    // Check if this custom fabric is already selected
    const isAlreadySelected = selectedComplementaryItems.some(
      (item) => item.id === fabric.id
    );

    if (!isAlreadySelected) {
      // Add custom fabric to selected items
      selectedComplementaryItems.push({
        ...fabric,
        size: fabric.size || 1,
        notes:
          fabric.notes || `Custom fabric: ${fabric.color} ${fabric.material}`,
        sewingPatternNotes: fabric.sewingPatternNotes || "",
        image:
          fabric.image ||
          "https://via.placeholder.com/250x200/4caf50/ffffff?text=Custom+Fabric",
      });
    }
  });

  // Update the display
  if (customFabrics.length > 0) {
    renderSelectedComplementaryItems();
    updateComplementaryButtonStatus();
  }
}

// Function to fetch default amount for customized products
async function fetchCustomFabricDefaultAmount() {
  try {
    // Try to get from session storage first
    const storedAmount = sessionStorage.getItem("customFabricDefaultAmount");
    if (storedAmount) {
      console.log("Using cached custom fabric default amount:", storedAmount);
      return parseFloat(storedAmount);
    }

    console.log("Fetching custom fabric default amount from server...");

    // Fetch from server
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbxFQGWg83k7nTxCRfqezwQUNl5fU85tGpEVd1m1ARqOiPxskPzmPiLD1oi7giX5v5syRw/exec";
    const response = await fetch(
      `${scriptUrl}?action=getCustomFabricDefaultAmount`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const defaultAmount = parseFloat(data.defaultAmount || 1.0);
    console.log("Fetched custom fabric default amount:", defaultAmount);

    // Save to session storage for future use
    sessionStorage.setItem(
      "customFabricDefaultAmount",
      defaultAmount.toString()
    );

    return defaultAmount;
  } catch (error) {
    console.error("Error fetching custom fabric default amount:", error);
    console.log("Using fallback default amount of $1.00");
    // Return default amount of $1.00 if fetch fails
    return 1.0;
  }
}

// Function to clear custom fabrics after adding to cart
function clearCustomFabricsAfterAddToCart() {
  try {
    // Check if there were any custom fabrics in the cart item
    const hasCustomFabrics = selectedComplementaryItems.some(
      (item) => item.isCustom
    );

    if (hasCustomFabrics) {
      sessionStorage.removeItem("customFabrics");
      sessionStorage.removeItem("customFabricDefaultAmount");
      console.log(
        "Custom fabrics cleared from session storage after adding to cart"
      );

      // Clear custom fabrics from selectedComplementaryItems as well
      selectedComplementaryItems = selectedComplementaryItems.filter(
        (item) => !item.isCustom
      );

      // Update the display
      renderSelectedComplementaryItems();
      updateComplementaryButtonStatus();
    }
  } catch (error) {
    console.error("Error clearing custom fabrics after add to cart:", error);
  }
}
