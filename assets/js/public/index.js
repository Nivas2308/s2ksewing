document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("reviewToggle");
  const content = document.getElementById("reviewContent");

  toggle.addEventListener("click", function () {
    if (content.style.display === "block") {
      content.style.display = "none";
      toggle.classList.remove("active");
    } else {
      content.style.display = "block";
      toggle.classList.add("active");
    }
  });

  document
    .getElementById("reviewForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const rating = document.querySelector('input[name="rating"]:checked');
      const reviewText = document.getElementById("reviewText").value;

      // Reset form
      this.reset();

      // Close dropdown
      content.style.display = "none";
      toggle.classList.remove("active");
    });
});

let products = [];
let categories = [];

document.addEventListener("DOMContentLoaded", function () {
  // Fetch products
  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec?action=getProducts"
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.products.length) {
        products = data.products;
      }
    })
    .catch((error) => console.error("Error fetching products:", error));

  // Fetch categories
  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec?action=getCategories"
  )
    .then((response) => response.json())
    .then((data) => {
      const fetchedCategories = Array.isArray(data)
        ? data
        : data.success && data.categories
        ? data.categories
        : [];
      // Extract unique subcategories with their main categories
      const subcategoryMap = new Map();
      fetchedCategories.forEach((item) => {
        const mainCategory = item.category ? item.category.toLowerCase() : "";
        const subCategory = item.subCategory ? item.subCategory : "";
        if (mainCategory && subCategory && !subcategoryMap.has(subCategory)) {
          subcategoryMap.set(subCategory, {
            name: subCategory,
            mainCategory: mainCategory,
            image:
              item.images && item.images.length > 0
                ? item.images[0]
                : item.image || "",
          });
        }
      });
      categories = Array.from(subcategoryMap.values());
    })
    .catch((error) => console.error("Error fetching categories:", error));
});

function redirectToShopPage() {
  window.location.href = "/public/shop.html";
}

function searchProducts() {
  let input = document.getElementById("searchBar").value.toLowerCase().trim();
  let resultsDiv = document.getElementById("searchResults");

  if (input.length < 2) {
    resultsDiv.style.display = "none";
    return;
  }

  // Search in products
  let filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(input) ||
      product.category.toLowerCase().includes(input) ||
      (product.description && product.description.toLowerCase().includes(input))
  );

  // Search in subcategories
  let filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(input) ||
      category.mainCategory.toLowerCase().includes(input)
  );

  // Limit results: up to 5 categories and up to 5 products (if both exist), otherwise up to 10 of one type
  let maxTotal = 10;
  let maxEach = 5;
  let showCategories = Math.min(filteredCategories.length, maxEach);
  let showProducts = Math.min(filteredProducts.length, maxEach);
  if (filteredCategories.length === 0)
    showProducts = Math.min(filteredProducts.length, maxTotal);
  if (filteredProducts.length === 0)
    showCategories = Math.min(filteredCategories.length, maxTotal);

  // Clear previous results
  resultsDiv.innerHTML = "";

  let hasResults = false;

  // Add subcategories section
  if (showCategories > 0) {
    hasResults = true;
    let categoryHeader = document.createElement("div");
    categoryHeader.className = "search-section-header";
    categoryHeader.innerHTML = "<strong>Categories</strong>";
    resultsDiv.appendChild(categoryHeader);

    filteredCategories.slice(0, showCategories).forEach((category) => {
      let div = document.createElement("div");
      div.className = "search-result-item category-item";
      div.innerHTML = `
        <div class="search-item-content">
          <div class="search-item-image">
            <img src="${category.image || "placeholder.jpg"}" alt="${
        category.name
      }" onerror="this.src='placeholder.jpg';">
          </div>
          <div class="search-item-details">
            <div class="search-item-title">${category.name}</div>
            <div class="search-item-subtitle">in ${category.mainCategory}</div>
          </div>
          <div class="search-item-type">Category</div>
        </div>
      `;
      div.onclick = () => {
        window.location.href = `/public/shop.html?category=${
          category.mainCategory
        }&subcategory=${encodeURIComponent(category.name)}`;
        resultsDiv.style.display = "none";
      };
      resultsDiv.appendChild(div);
    });
  }

  // Add products section
  if (showProducts > 0) {
    hasResults = true;
    let productHeader = document.createElement("div");
    productHeader.className = "search-section-header";
    productHeader.innerHTML = "<strong>Products</strong>";
    resultsDiv.appendChild(productHeader);

    filteredProducts.slice(0, showProducts).forEach((product) => {
      let div = document.createElement("div");
      div.className = "search-result-item product-item";
      // Get product image
      let productImage = "";
      if (product.images && product.images.length > 0) {
        productImage = product.images[0];
      } else if (product.image) {
        productImage = product.image;
      }
      div.innerHTML = `
        <div class="search-item-content">
          <div class="search-item-image">
            <img src="${productImage || "placeholder.jpg"}" alt="${
        product.name
      }" onerror="this.src='placeholder.jpg';">
          </div>
          <div class="search-item-details">
            <div class="search-item-title">${product.name}</div>
            <div class="search-item-subtitle">${product.category || ""}</div>
            <div class="search-item-price">₹${product.price || "N/A"}</div>
          </div>
          <div class="search-item-type">Product</div>
        </div>
      `;
      div.onclick = () => {
        window.location.href = `/public/productpage.html?id=${product.id}`;
        resultsDiv.style.display = "none";
      };
      resultsDiv.appendChild(div);
    });
  }

  // Show results or no results message
  if (hasResults) {
    resultsDiv.style.display = "block";
  } else {
    resultsDiv.innerHTML =
      '<div class="search-no-results">No products or categories found</div>';
    resultsDiv.style.display = "block";
  }
}

// Close search results when clicking outside
// (This must be outside DOMContentLoaded to work globally)
document.addEventListener("click", function (event) {
  let searchBar = document.getElementById("searchBar");
  let resultsDiv = document.getElementById("searchResults");
  if (!searchBar.contains(event.target) && !resultsDiv.contains(event.target)) {
    resultsDiv.style.display = "none";
  }
});

// Handle keyboard navigation
// (This must be outside DOMContentLoaded to avoid duplicate listeners)
document
  .getElementById("searchBar")
  .addEventListener("keydown", function (event) {
    let resultsDiv = document.getElementById("searchResults");
    let items = resultsDiv.querySelectorAll(".search-result-item");
    let currentSelected = resultsDiv.querySelector(
      ".search-result-item.selected"
    );
    let currentIndex = currentSelected
      ? Array.from(items).indexOf(currentSelected)
      : -1;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (currentSelected) currentSelected.classList.remove("selected");
      currentIndex = (currentIndex + 1) % items.length;
      if (items[currentIndex]) items[currentIndex].classList.add("selected");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (currentSelected) currentSelected.classList.remove("selected");
      currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      if (items[currentIndex]) items[currentIndex].classList.add("selected");
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (currentSelected) {
        currentSelected.click();
      }
    } else if (event.key === "Escape") {
      resultsDiv.style.display = "none";
    }
  });

// Clear selection when mouse enters the results
document
  .getElementById("searchResults")
  .addEventListener("mouseenter", function () {
    let selected = this.querySelector(".search-result-item.selected");
    if (selected) selected.classList.remove("selected");
  });

// Add hover effect for mouse users
document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("mouseover", function (event) {
    if (event.target.closest(".search-result-item")) {
      let item = event.target.closest(".search-result-item");
      let siblings = item.parentNode.querySelectorAll(".search-result-item");
      siblings.forEach((sibling) => sibling.classList.remove("hover"));
      item.classList.add("hover");
    }
  });
});

// Page Loading Function

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
    document.getElementById("content").style.display = "block";
  }, 4000);
});

// RETRIVE FUNCTION

document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbyF_vLCIJK7evShOw2P_BPepGx-6fBIsGlndqnmfSiojDqgogEkYVeCZd9iU-2dI9RT/exec?action=getHomeData"
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched Data:", data);

      if (data.success) {
        // Set text content
        document.getElementById("header-title").textContent =
          data.headerTitle || "Default Header";
        document.getElementById("highlighted-title").textContent =
          data.highlightedTitle || "Default Highlighted Title";
        document.getElementById("scrolling-text").textContent =
          data.scrollingTitle || "Default Scrolling Offer";
        document.getElementById("newsletter-text").textContent =
          data.newsletterText ||
          "Subscribe to our newsletter for latest updates!";

        // Get image elements
        let headerImg = document.getElementById("header-image");
        let highlightImg = document.getElementById("highlighted-image");

        // Show banner skeletons while loading
        showBannerSkeleton("header-container", "header");
        showBannerSkeleton("highhead-container", "highlighted");

        // Set image URLs directly without conversion
        if (data.headerImage) {
          // Force HTTPS and add cachebuster parameter
          let imageUrl = ensureHttps(data.headerImage);
          headerImg.src =
            imageUrl +
            (imageUrl.includes("?") ? "&" : "?") +
            "cb=" +
            new Date().getTime();
          console.log("Applied header image URL:", headerImg.src);

          // Hide skeleton when image loads
          headerImg.onload = () => {
            hideBannerSkeleton("header-container");
          };
        } else {
          // Hide skeleton immediately if no image
          hideBannerSkeleton("header-container");
        }

        if (data.highlightedImage) {
          // Force HTTPS and add cachebuster parameter
          let imageUrl = ensureHttps(data.highlightedImage);
          highlightImg.src =
            imageUrl +
            (imageUrl.includes("?") ? "&" : "?") +
            "cb=" +
            new Date().getTime();
          console.log("Applied highlighted image URL:", highlightImg.src);

          // Hide skeleton when image loads
          highlightImg.onload = () => {
            hideBannerSkeleton("highhead-container");
          };
        } else {
          // Hide skeleton immediately if no image
          hideBannerSkeleton("highhead-container");
        }
      }
    })
    .catch((error) => console.error("Error fetching home data:", error));
});

// Helper function to ensure URLs use HTTPS
function ensureHttps(url) {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

// Fetch FAQs from Google Sheets or Admin Panel
document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbzpa6hUbVxXZfzTgNpoU2CfeoAz7UACmF39MoNUQNqmmVRWT5Fy8fAbmreRw3NQ0NI/exec"
  )
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

document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec?action=getCategories"
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched Category Data:", data);

      // Check if data is an array directly (based on your console output)
      const categories = Array.isArray(data)
        ? data
        : data.success && data.categories
        ? data.categories
        : [];

      // Map category names to your HTML container IDs
      const categoryMap = {
        fabrics: "1",
        garments: "2",
        "sewing patterns": "3",
      };

      // Group by subcategory within each main category
      const groupedByCategory = {};

      categories.forEach((item) => {
        const mainCategory = item.category ? item.category.toLowerCase() : "";
        const subCategory = item.subCategory ? item.subCategory : "Other"; // Use subCategory (capital C)
        if (mainCategory && categoryMap[mainCategory]) {
          if (!groupedByCategory[mainCategory])
            groupedByCategory[mainCategory] = {};
          if (!groupedByCategory[mainCategory][subCategory])
            groupedByCategory[mainCategory][subCategory] = [];
          groupedByCategory[mainCategory][subCategory].push(item);
        }
      });

      // Now render subcategory cards
      Object.keys(groupedByCategory).forEach((mainCategory) => {
        const containerID = categoryMap[mainCategory];
        const categoryContainer = document.getElementById(
          `category-${containerID}-subcategories`
        );
        if (!categoryContainer) return;

        // Hide skeleton loading first
        hideSkeletonLoading(`category-${containerID}-subcategories`);

        // Clear previous content
        categoryContainer.innerHTML = "";

        Object.keys(groupedByCategory[mainCategory]).forEach((subCategory) => {
          const productsInSub = groupedByCategory[mainCategory][subCategory];
          // Use the first product's image as a sample
          const sampleImage =
            productsInSub[0].images && productsInSub[0].images.length > 0
              ? productsInSub[0].images[0]
              : productsInSub[0].image || "placeholder.jpg";

          let subcategoryItem = document.createElement("div");
          subcategoryItem.classList.add("subcategory-item");
          subcategoryItem.innerHTML = `
                        <div class="subcategory-img-container">
                            <img src="${sampleImage}" alt="${subCategory}" class="subcategory-img" onerror="this.src='placeholder.jpg';">
                        </div>
                        <h3 class="subcategory-title">${subCategory}</h3>
                    `;
          subcategoryItem.addEventListener("click", function () {
            window.location.href = `/public/shop.html?category=${mainCategory}&subcategory=${encodeURIComponent(
              subCategory
            )}`;
          });
          categoryContainer.appendChild(subcategoryItem);
        });
      });
    })
    .catch((error) => console.error("❌ Error fetching category data:", error));

  // Add some basic CSS for the image count indicator
  const style = document.createElement("style");
  style.textContent = `
        .subcategory-img-container {
            position: relative;
            width: 100%;
            height: auto;
            overflow: hidden;
        }
        .image-count {
            position: absolute;
            bottom: 5px;
            right: 5px;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 12px;
        }
    `;
  document.head.appendChild(style);
});

// Change this timeout function
setTimeout(() => {
  document.querySelectorAll(".subcategory-container").forEach((container) => {
    if (container) {
      // Add this check
      container.style.display = "flex";
    }
  });
}, 1000);

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

// Reviews Section

const googleScriptURL =
  "https://script.google.com/macros/s/AKfycbwLwHFHSXNvDsRf1PedwaF3Rf0nhJZbC1O-aOZYKmo03xNI3HzJJ5rh3mEsswE5Ot8uvg/exec";
let reviews = [];
const scrollAmount = 330; // Scroll amount in pixels

document
  .getElementById("reviewForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    let rating = document.querySelector('input[name="rating"]:checked');
    let reviewText = document.getElementById("reviewText").value;

    if (!rating) {
      alert("Please select a star rating.");
      return;
    }

    // Show loading state
    const submitButton = this.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Submitting...";
    submitButton.disabled = true;

    // Format data to match the Apps Script expectations
    // The Apps Script expects rating and review fields
    // JavaScript for the custom alert
    function showAlert() {
      const alert = document.getElementById("customAlert");
      alert.style.display = "flex";

      // Auto close after 3 seconds
      setTimeout(() => {
        closeAlert();
      }, 3000);
    }

    function closeAlert() {
      const alert = document.getElementById("customAlert");
      alert.style.display = "none";
    }

    // Example of how to use it when submitting the form
    document
      .getElementById("reviewForm")
      .addEventListener("submit", function (e) {
        e.preventDefault();

        // Form validation here...

        // Show the custom alert instead of using alert()
        showAlert();

        // Reset form
        this.reset();

        // Additional code as needed
        // JavaScript for the custom error alert
        function showErrorAlert() {
          const alert = document.getElementById("errorAlert");
          alert.style.display = "flex";

          // Auto close after 4 seconds
          setTimeout(() => {
            closeErrorAlert();
          }, 4000);
        }

        function closeErrorAlert() {
          const alert = document.getElementById("errorAlert");
          alert.style.display = "none";
        }

        // Example of how to use it when there's an error submitting the form
        function handleFormError() {
          // Show the custom error alert instead of using alert()
          showErrorAlert();
        }

        // Example implementation in your form submission handler:
      });
    fetch(googleScriptURL, {
      method: "POST",
      mode: "no-cors", // Required for Google Apps Script
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: rating.value,
        review: reviewText,
      }),
    })
      .then(() => {
        showAlert();
        document.getElementById("reviewForm").reset();
        loadReviews(); // Reload reviews after submission
      })
      .catch((error) => {
        showErrorAlert();
        console.error("Error submitting review:", error);
      })
      .finally(() => {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      });
  });

function loadReviews() {
  // Show loading indicator
  const reviewContainer = document.getElementById("allReviews");
  reviewContainer.innerHTML =
    '<div class="empty-state">Loading reviews...</div>';

  // Use fetch with no special options to get the reviews
  // The Apps Script returns an array of objects with timestamp, rating, and review properties
  fetch(googleScriptURL)
    .then((response) => {
      // Handle the response appropriately
      // If response.json() doesn't work directly due to CORS, we use the fallback data
      try {
        return response.json();
      } catch (e) {
        console.warn("Couldn't parse JSON response, using sample data instead");
        throw new Error("JSON parse error");
      }
    })
    .then((data) => {
      reviews = data.map((item) => ({
        rating: Number(item.rating),
        review: item.review,
        date: formatDate(new Date(item.timestamp)),
      }));
      renderAllReviews();
      updateAverageRating();
    })
    .catch((error) => {
      console.error("Error loading reviews:", error);
      // For demonstration or if fetch fails due to CORS, load sample data
      loadSampleReviews();
    });
}

function formatDate(date) {
  // Check if date is valid
  if (!(date instanceof Date) || isNaN(date)) {
    return "Recently";
  }

  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    return diffHours <= 1 ? "Just now" : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function loadSampleReviews() {
  // Sample reviews for demonstration or testing
  reviews = [
    {
      rating: 5,
      review: "Excellent service, couldn't be happier with my purchase!",
      date: "20 hours ago",
    },
    {
      rating: 5,
      review: "Great quality fabric and attention to detail.",
      date: "5 days ago",
    },
    {
      rating: 4,
      review: "Great value for customers and prompt delivery.",
      date: "07/03/2025",
    },
    {
      rating: 4,
      review: "The items arrived well-packaged and in perfect condition.",
      date: "13/03/2025",
    },
    {
      rating: 5,
      review: "I love the quality and the service.",
      date: "25/02/2025",
    },
    {
      rating: 3,
      review: "Delivery took longer than expected. Otherwise satisfied.",
      date: "01/03/2025",
    },
    {
      rating: 5,
      review: "Amazing selection and the customer service is top-notch!",
      date: "20/03/2025",
    },
  ];

  renderAllReviews();
  updateAverageRating();
}

function renderAllReviews() {
  let reviewContainer = document.getElementById("allReviews");
  reviewContainer.innerHTML = "";

  if (reviews.length === 0) {
    reviewContainer.innerHTML =
      '<div class="empty-state">No reviews yet. Be the first to leave a review!</div>';
    return;
  }

  reviews.forEach((review, index) => {
    let reviewSlide = document.createElement("div");
    reviewSlide.className = "review-slide";

    // Create star rating display with filled and empty stars
    let starDisplay = "";
    for (let i = 1; i <= 5; i++) {
      starDisplay += i <= review.rating ? "★" : "☆";
    }

    // Format review text with line breaks for better readability
    let formattedReview = review.review.replace(/\n/g, "<br>");

    reviewSlide.innerHTML = `
                    <div class="review-header">
                        <div class="review-rating">${starDisplay}</div>
                        <div class="review-date">${
                          review.date || "Recently"
                        }</div>
                    </div>
                    <div class="review-content">${formattedReview}</div>
                    <a class="action-button" data-index="${index}">Read more</a>
                `;

    reviewContainer.appendChild(reviewSlide);
  });

  document.getElementById(
    "totalReviews"
  ).textContent = `${reviews.length} reviews`;

  // Add event listeners to "Read more" buttons
  document.querySelectorAll(".action-button").forEach((button) => {
    button.addEventListener("click", function () {
      const index = this.getAttribute("data-index");
      showReviewModal(index);
    });
  });
}

// Function to display the review in a modal with transition
function showReviewModal(index) {
  const review = reviews[index];
  const modal = document.getElementById("reviewModal");
  const modalStars = document.getElementById("modalStars");
  const modalContent = document.getElementById("modalReviewContent");
  const modalDate = document.getElementById("modalDate");

  // Generate stars for modal
  let starDisplay = "";
  for (let i = 1; i <= 5; i++) {
    starDisplay += i <= review.rating ? "★" : "☆";
  }

  // Format review text with line breaks
  let formattedReview = review.review.replace(/\n/g, "<br>");

  modalStars.innerHTML = starDisplay;
  modalContent.innerHTML = formattedReview;
  modalDate.textContent = review.date || "Recently";

  // Show the modal with transition
  modal.style.display = "block";
  // Force reflow to ensure the transition works
  void modal.offsetWidth;
  // Add class to trigger transition
  modal.classList.add("show");

  // Close modal when clicking the X
  document.querySelector(".close-modal").onclick = function () {
    closeModal();
  };

  // Close modal when clicking outside
  window.onclick = function (event) {
    if (event.target === modal) {
      closeModal();
    }
  };

  // Close modal on ESC key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.style.display === "block") {
      closeModal();
    }
  });
}

// Function to close modal with transition
function closeModal() {
  const modal = document.getElementById("reviewModal");

  // Remove class to trigger out transition
  modal.classList.remove("show");

  // Wait for transition to complete before hiding
  setTimeout(() => {
    modal.style.display = "none";
  }, 300); // Match this with the CSS transition time
}

function updateAverageRating() {
  if (reviews.length === 0) {
    document.getElementById("averageRating").textContent = "0.00";
    document.getElementById("averageStars").innerHTML = "☆☆☆☆☆";
    document.querySelector(".rating-label").textContent = "No Ratings";
    return;
  }

  const total = reviews.reduce(
    (sum, review) => sum + parseInt(review.rating),
    0
  );
  const average = (total / reviews.length).toFixed(2);

  document.getElementById("averageRating").textContent = average;

  // Generate stars based on rating
  let starsHTML = "";

  // Add full stars
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(average)) {
      starsHTML += "★"; // Full star
    } else if (i - 0.5 <= average) {
      starsHTML += "★"; // Rounded up for values ≥ x.5
    } else {
      starsHTML += "☆"; // Empty star
    }
  }

  document.getElementById("averageStars").innerHTML = starsHTML;

  // Set rating label based on average
  const ratingLabel = document.querySelector(".rating-label");
  if (average >= 4.5) ratingLabel.textContent = "Excellent";
  else if (average >= 4) ratingLabel.textContent = "Very Good";
  else if (average >= 3) ratingLabel.textContent = "Good";
  else if (average >= 2) ratingLabel.textContent = "Fair";
  else ratingLabel.textContent = "Poor";
}

// Navigation buttons functionality
document.getElementById("prevButton").addEventListener("click", () => {
  document.getElementById("allReviews").scrollLeft -= scrollAmount;
});

document.getElementById("nextButton").addEventListener("click", () => {
  document.getElementById("allReviews").scrollLeft += scrollAmount;
});

// Check if we're on a touch device and enhance scrolling
function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

if (!isTouchDevice()) {
  // Add scroll on mouse wheel for desktop
  document.getElementById("allReviews").addEventListener(
    "wheel",
    function (e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    },
    { passive: false }
  );
}

// Add keyboard navigation
document.addEventListener("keydown", function (e) {
  if (document.activeElement.tagName !== "TEXTAREA") {
    if (e.key === "ArrowLeft") {
      document.getElementById("allReviews").scrollLeft -= scrollAmount;
    } else if (e.key === "ArrowRight") {
      document.getElementById("allReviews").scrollLeft += scrollAmount;
    }
  }
});

// Auto-hide navigation buttons if all reviews are visible
function checkNavButtonsVisibility() {
  const review = document.getElementById("allReviews");
  const maxScroll = container.scrollWidth - container.clientWidth;

  if (maxScroll <= 0) {
    document.querySelector(".navigation-buttons").style.display = "none";
  } else {
    document.querySelector(".navigation-buttons").style.display = "flex";
  }
}

// Check on load and resize
window.addEventListener("resize", checkNavButtonsVisibility);
setTimeout(checkNavButtonsVisibility, 500); // Check after initial render

// Initial load
loadReviews();

// Testimonials adding section

// Web app URL from Google Apps Script - REPLACE THIS with your actual URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbwaMYn1wOQVin4FvrbcgERC2i9JbyyyE7LxnPBuMdeSZk-mGfrfYPnAup9Hj-XgK_4GEQ/exec";

// DOM elements
const testimonialsContainer = document.getElementById("testimonials-container");
const navContainer = document.getElementById("testimonial-nav");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

// Variables
let testimonials = [];
let displayCount = getDisplayCount();
let currentIndex = 0;

// Determine how many testimonials to display based on screen width
function getDisplayCount() {
  if (window.innerWidth > 992) return 3;
  if (window.innerWidth > 768) return 2;
  return 1;
}

// Fetch testimonials from Google Sheets
async function fetchTestimonials() {
  try {
    // Show loading state
    testimonialsContainer.innerHTML =
      '<div class="loading-spinner"><div></div><div></div><div></div></div>';

    // Fetch data using JSONP approach for cross-domain requests
    const script = document.createElement("script");
    const callbackName =
      "testimonialCallback_" + Math.floor(Math.random() * 10000);

    // Create global callback function
    window[callbackName] = function (data) {
      testimonials = data;
      renderTestimonials();
      // Clean up
      delete window[callbackName];
      document.body.removeChild(script);
    };

    script.src = `${API_URL}?action=getAllTestimonials&callback=${callbackName}`;
    document.body.appendChild(script);

    // Set timeout for fallback
    setTimeout(() => {
      if (testimonials.length === 0) {
        useDefaultTestimonials();
      }
    }, 5000);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    useDefaultTestimonials();
  }
}

// Use default testimonials if API fails

// Create testimonial cards
function renderTestimonials() {
  testimonialsContainer.innerHTML = "";
  navContainer.innerHTML = "";

  if (testimonials.length === 0) {
    testimonialsContainer.innerHTML =
      '<p class="no-testimonials">No testimonials available at this time.</p>';
    return;
  }

  for (let i = 0; i < displayCount; i++) {
    const index = (currentIndex + i) % testimonials.length;
    const testimonial = testimonials[index];

    const card = document.createElement("div");
    card.className = "testimonial-card";
    // Function to generate initials from full name
    function getInitials(name) {
      if (!name) return "U"; // Default letter if name is missing
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (
          parts[0].charAt(0).toUpperCase() +
          parts[parts.length - 1].charAt(0).toUpperCase()
        );
      }
      return parts[0].charAt(0).toUpperCase();
    }

    // Generate avatar if no photo provided
    const avatarHTML =
      testimonial.photo && testimonial.photo.trim() !== ""
        ? `<img src="${testimonial.photo}" alt="${testimonial.name}" class="profile-img" onerror="this.src='https://via.placeholder.com/70?text=User'">`
        : `<div class="name-avatar">${getInitials(testimonial.name)}</div>`;

    card.innerHTML = `
  <div class="profile-header">
      <div class="profile-img-container">
          ${avatarHTML}
      </div>
      <div class="client-info">
          <h4 class="client-name">${testimonial.name}</h4>
          <p class="client-position">${testimonial.position || ""}</p>
      </div>
  </div>
  <p class="testimonial-text">${testimonial.text}</p>
  <div class="testimonial-rating">
      <i class="fas fa-star"></i>
      <i class="fas fa-star"></i>
      <i class="fas fa-star"></i>
      <i class="fas fa-star"></i>
      <i class="fas fa-star"></i>
  </div>
`;
    testimonialsContainer.appendChild(card);
  }

  // Create navigation dots
  const totalPages = Math.ceil(testimonials.length / displayCount);
  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement("div");
    dot.className = `nav-dot ${
      i === Math.floor(currentIndex / displayCount) ? "active" : ""
    }`;
    dot.addEventListener("click", () => {
      currentIndex = i * displayCount;
      renderTestimonials();
    });
    navContainer.appendChild(dot);
  }
}

// Navigation functions
function goToPrev() {
  currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
  renderTestimonials();
}

function goToNext() {
  currentIndex = (currentIndex + 1) % testimonials.length;
  renderTestimonials();
}

// Event listeners
prevBtn.addEventListener("click", goToPrev);
nextBtn.addEventListener("click", goToNext);

// Check if we need to refresh data (every 5 minutes)
function setupRefreshInterval() {
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  setInterval(fetchTestimonials, REFRESH_INTERVAL);
}

// Initialize
fetchTestimonials();
setupRefreshInterval();

// Responsive handling
window.addEventListener("resize", () => {
  const newDisplayCount = getDisplayCount();
  if (newDisplayCount !== displayCount) {
    displayCount = newDisplayCount;
    renderTestimonials();
  }
});

// Auto rotate testimonials every 7 seconds
let autoRotateInterval;

function startAutoRotate() {
  autoRotateInterval = setInterval(() => {
    if (testimonials.length > 0) {
      goToNext();
    }
  }, 7000);
}

function stopAutoRotate() {
  clearInterval(autoRotateInterval);
}

// Start auto-rotation
startAutoRotate();

// Pause auto-rotation when user interacts with testimonials
testimonialsContainer.addEventListener("mouseenter", stopAutoRotate);
testimonialsContainer.addEventListener("mouseleave", startAutoRotate);
prevBtn.addEventListener("mouseenter", stopAutoRotate);
prevBtn.addEventListener("mouseleave", startAutoRotate);
nextBtn.addEventListener("mouseenter", stopAutoRotate);
nextBtn.addEventListener("mouseleave", startAutoRotate);
navContainer.addEventListener("mouseenter", stopAutoRotate);
navContainer.addEventListener("mouseleave", startAutoRotate);

// Add keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    goToPrev();
  } else if (e.key === "ArrowRight") {
    goToNext();
  }
});

// Add touch swipe support
let touchStartX = 0;
let touchEndX = 0;

testimonialsContainer.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoRotate();
  },
  { passive: true }
);

testimonialsContainer.addEventListener(
  "touchend",
  (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoRotate();
  },
  { passive: true }
);

function handleSwipe() {
  const swipeThreshold = 50;
  if (touchEndX < touchStartX - swipeThreshold) {
    // Swiped left
    goToNext();
  } else if (touchEndX > touchStartX + swipeThreshold) {
    // Swiped right
    goToPrev();
  }
}

// Add loading animation
function addLoadingAnimation() {
  const style = document.createElement("style");
  style.textContent = `
        .loading-spinner {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            width: 100%;
            gap: 10px;
        }
        
        .loading-spinner div {
            width: 12px;
            height: 12px;
            background-color: #4361ee;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .loading-spinner div:nth-child(1) {
            animation-delay: -0.32s;
        }
        
        .loading-spinner div:nth-child(2) {
            animation-delay: -0.16s;
        }
        
        @keyframes bounce {
            0%, 80%, 100% { 
                transform: scale(0);
            } 40% { 
                transform: scale(1);
            }
        }
        
        .no-testimonials {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
        }
        
        .testimonial-card {
            opacity: 0;
            animation: fadeIn 0.5s forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
  document.head.appendChild(style);
}

// Add animation for testimonial transitions
function addTransitionAnimations() {
  const style = document.createElement("style");
  style.textContent = `
        .testimonials-container {
            position: relative;
        }
        
        .testimonial-card {
            animation-delay: calc(var(--index) * 0.1s);
        }
    `;
  document.head.appendChild(style);
}

// Add accessibility features
function enhanceAccessibility() {
  // Add proper ARIA attributes
  prevBtn.setAttribute("aria-label", "Previous testimonial");
  nextBtn.setAttribute("aria-label", "Next testimonial");

  // Make navigation dots accessible
  navContainer.setAttribute("role", "tablist");
  navContainer.setAttribute("aria-label", "Testimonial navigation");

  // Update the renderTestimonials function to add ARIA attributes to dots
  const originalRender = renderTestimonials;
  renderTestimonials = function () {
    originalRender();

    // Add ARIA attributes to navigation dots
    const dots = navContainer.querySelectorAll(".nav-dot");
    dots.forEach((dot, index) => {
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", dot.classList.contains("active"));
      dot.setAttribute("aria-label", `Testimonial page ${index + 1}`);
      dot.setAttribute(
        "tabindex",
        dot.classList.contains("active") ? "0" : "-1"
      );
    });
  };
}

// Initialize additional features
addLoadingAnimation();
addTransitionAnimations();
enhanceAccessibility();

// Skeleton Loading Functions
function createSkeletonCard(cardType = "default") {
  const skeletonCard = document.createElement("div");
  skeletonCard.className = `product-card-skeleton loading skeleton-${cardType}-card`;

  skeletonCard.innerHTML = `
    <div class="skeleton-image"></div>
    <div class="skeleton-content">
      <div class="skeleton-badge"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-price"></div>
      <div class="skeleton-description"></div>
      <div class="skeleton-description"></div>
      <div class="skeleton-button"></div>
    </div>
  `;

  return skeletonCard;
}

function createSubcategorySkeletonCard(cardType = "default") {
  const skeletonCard = document.createElement("div");
  skeletonCard.className = `subcategory-skeleton loading skeleton-${cardType}-card`;

  skeletonCard.innerHTML = `
    <div class="subcategory-skeleton-image"></div>
    <div class="subcategory-skeleton-title"></div>
  `;

  return skeletonCard;
}

function createBannerSkeleton(bannerType = "header") {
  const skeletonBanner = document.createElement("div");
  skeletonBanner.className = `banner-skeleton loading ${bannerType}-skeleton`;

  skeletonBanner.innerHTML = `
    <div class="banner-skeleton-image">
      <div class="banner-skeleton-content">
        <div class="banner-skeleton-title"></div>
        <div class="banner-skeleton-subtitle"></div>
      </div>
    </div>
  `;

  return skeletonBanner;
}

function showBannerSkeleton(bannerId, bannerType = "header") {
  const banner = document.getElementById(bannerId);
  if (!banner) return;

  // Store original content
  banner.setAttribute("data-original-content", banner.innerHTML);

  // Clear and show skeleton
  banner.innerHTML = "";
  const skeletonBanner = createBannerSkeleton(bannerType);
  banner.appendChild(skeletonBanner);
}

function hideBannerSkeleton(bannerId) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;

  // Restore original content
  const originalContent = banner.getAttribute("data-original-content");
  if (originalContent) {
    banner.innerHTML = originalContent;
    banner.removeAttribute("data-original-content");
  }

  // Remove skeleton
  const skeletonBanner = banner.querySelector(".banner-skeleton");
  if (skeletonBanner) {
    skeletonBanner.remove();
  }
}

function showSkeletonLoading(containerId, count = 8, cardType = "default") {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear existing content
  container.innerHTML = "";

  // Check if this is a subcategory container
  const isSubcategoryContainer = container.classList.contains(
    "subcategory-container"
  );

  if (isSubcategoryContainer) {
    // Add subcategory skeleton grid class
    container.classList.add("subcategory-skeleton-grid");

    // Create subcategory skeleton cards
    for (let i = 0; i < count; i++) {
      const skeletonCard = createSubcategorySkeletonCard(cardType);
      container.appendChild(skeletonCard);
    }
  } else {
    // Add skeleton grid class
    container.classList.add("skeleton-grid");

    // Create skeleton cards
    for (let i = 0; i < count; i++) {
      const skeletonCard = createSkeletonCard(cardType);
      container.appendChild(skeletonCard);
    }
  }
}

function hideSkeletonLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Check if this is a subcategory container
  const isSubcategoryContainer = container.classList.contains(
    "subcategory-container"
  );

  if (isSubcategoryContainer) {
    // Remove subcategory skeleton grid class
    container.classList.remove("subcategory-skeleton-grid");

    // Remove all subcategory skeleton cards
    const skeletonCards = container.querySelectorAll(".subcategory-skeleton");
    skeletonCards.forEach((card) => card.remove());
  } else {
    // Remove skeleton grid class
    container.classList.remove("skeleton-grid");

    // Remove all skeleton cards
    const skeletonCards = container.querySelectorAll(".product-card-skeleton");
    skeletonCards.forEach((card) => card.remove());
  }
}

// Enhanced loading with skeleton for different sections
function loadCategoryWithSkeleton(categoryId, cardType = "default") {
  const container = document.getElementById(categoryId);
  if (!container) return;

  // Show skeleton loading
  showSkeletonLoading(categoryId, 4, cardType);

  // Simulate loading delay (remove this in production)
  setTimeout(() => {
    hideSkeletonLoading(categoryId);
    // Your actual content loading logic here
  }, 2000);
}

// Skeleton loading for search results
function showSearchSkeleton() {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;

  searchResults.innerHTML = "";
  searchResults.style.display = "block";

  // Create skeleton search results
  for (let i = 0; i < 3; i++) {
    const skeletonItem = document.createElement("div");
    skeletonItem.className = "search-result-item skeleton-loading";
    skeletonItem.innerHTML = `
      <div class="search-item-content">
        <div class="search-item-image">
          <div class="skeleton-image" style="width: 60px; height: 60px; border-radius: 8px;"></div>
        </div>
        <div class="search-item-details">
          <div class="skeleton-title" style="width: 70%; height: 16px; margin-bottom: 8px;"></div>
          <div class="skeleton-description" style="width: 50%; height: 12px;"></div>
        </div>
      </div>
    `;
    searchResults.appendChild(skeletonItem);
  }
}

// Add skeleton loading to existing functions
function enhanceSearchWithSkeleton() {
  const searchBar = document.getElementById("searchBar");
  if (!searchBar) return;

  let searchTimeout;

  searchBar.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.length < 2) {
      document.getElementById("searchResults").style.display = "none";
      return;
    }

    // Show skeleton loading
    showSearchSkeleton();

    // Simulate search delay
    searchTimeout = setTimeout(() => {
      // Your actual search logic here
      searchProducts();
    }, 500);
  });
}

// Initialize skeleton loading
document.addEventListener("DOMContentLoaded", function () {
  // Add skeleton loading to search
  enhanceSearchWithSkeleton();

  // Show skeleton loading for categories on page load
  const categoryContainers = document.querySelectorAll(
    ".subcategory-container"
  );
  categoryContainers.forEach((container, index) => {
    const cardType =
      index === 0 ? "fabric" : index === 1 ? "pattern" : "garment";
    showSkeletonLoading(container.id, 4, cardType);
  });
});
