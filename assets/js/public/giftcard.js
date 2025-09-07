// Configuration - Replace with your actual Google Apps Script web app URL
const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbx7rPU1nhE2noekfopCgNxNBkOaDj975MhCIwbBMkGXEKqXZdTPTVmVK4qK_Gr3AM9S/exec";

// Gift cards data
let giftCards = [];
let currentCategory = "all";
let selectedCard = null;
let selectedPrice = 0;
let quantity = 1;

// Function to show error
function showError(message) {
  $("#errorMessage").text(message);
  $("#errorAlert").removeClass("hidden").fadeIn();

  setTimeout(() => {
    $("#errorAlert").fadeOut();
  }, 5000);
}

// Function to show success notification
function showNotification(message, type = "success") {
  // Create notification element if it doesn't exist
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.className = "notification";
    document.body.appendChild(notification);
  }

  // Set message and type
  notification.textContent = message;
  notification.className = `notification ${type} show`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// Function to fetch gift cards from Google Sheets
function fetchGiftCards() {
  $("#loadingOverlay").show();

  $.ajax({
    url: WEBAPP_URL,
    type: "GET",
    data: { action: "getCards" },
    success: function (response) {
      if (Array.isArray(response)) {
        giftCards = response;
        populateCategories();
        renderGiftCards();
      } else if (response.error) {
        showError(response.error);
        $("#giftCardsGrid").html(
          '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
        );
      } else {
        showError("Invalid response format from server");
        $("#giftCardsGrid").html(
          '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
        );
      }
    },
    error: function (xhr, status, error) {
      showError("Failed to connect to server: " + error);
      $("#giftCardsGrid").html(
        '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
      );
    },
    complete: function () {
      $("#loadingOverlay").hide();
    },
  });
}

// Function to populate category filters
function populateCategories() {
  const categories = [...new Set(giftCards.map((card) => card.category))];

  $('#categoryFilters button:not([data-category="all"])').remove();

  categories.forEach((category) => {
    if (category) {
      $("#categoryFilters").append(`
                <button class="category-filter bg-gray-100 text-gray-800 rounded-full px-4 py-2 hover:bg-indigo-100 transition-colors" data-category="${category}">
                    ${category}
                </button>
            `);
    }
  });

  $(".category-filter")
    .off("click")
    .on("click", function () {
      $(".category-filter")
        .removeClass("active bg-indigo-600 text-white")
        .addClass("bg-gray-100 text-gray-800");
      $(this)
        .removeClass("bg-gray-100 text-gray-800")
        .addClass("active bg-indigo-600 text-white");

      currentCategory = $(this).data("category");
      renderGiftCards();
    });
}

// Function to get price display for a card
function getPriceDisplay(card) {
  switch (card.pricingType) {
    case "fixed":
      return `$${parseFloat(card.fixedPrice || 0).toFixed(2)}`;
    case "custom":
      return `$${parseFloat(card.minPrice || 0).toFixed(
        2
      )} - $${parseFloat(card.maxPrice || 0).toFixed(2)}`;
    case "both":
      return `From $${parseFloat(card.fixedPrice || 0).toFixed(2)}`;
    default:
      return `$${parseFloat(card.fixedPrice || card.price || 0).toFixed(2)}`;
  }
}

// Function to render gift cards
function renderGiftCards() {
  const $grid = $("#giftCardsGrid");
  $grid.empty();

  const filteredCards =
    currentCategory === "all"
      ? giftCards
      : giftCards.filter((card) => card.category === currentCategory);

  if (filteredCards.length === 0) {
    $grid.html(
      '<div class="text-center text-gray-500 col-span-full py-12">No gift cards found for this category</div>'
    );
    return;
  }

  filteredCards.forEach((card) => {
    const imageUrl = card.imageUrl || "/api/placeholder/400/250";
    const priceDisplay = getPriceDisplay(card);

    $grid.append(`
                <div class="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 card-hover">
                    <img src="${imageUrl}" alt="${card.name}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h3 class="text-lg font-semibold mb-2">${card.name}</h3>
                        <div class="flex justify-between items-center mb-3">
                            <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">${card.category}</span>
                            <span class="font-bold text-white-600">${priceDisplay}</span>
                        </div>
                        <div class="flex justify-center">
                            <button class="view-details-btn w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors" data-id="${card.id}">
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>
            `);
  });

  $(".view-details-btn").on("click", function () {
    const cardId = $(this).data("id");
    showPurchaseModal(cardId);
  });
}

// Function to setup pricing options
function setupPricingOptions(card) {
  const $pricingOptions = $("#pricingOptions");
  $pricingOptions.empty();

  if (card.pricingType === "fixed") {
    // Fixed price only
    const price = parseFloat(card.fixedPrice || 0);
    $pricingOptions.append(`
                <div class="price-option selected" data-price="${price}">
                    <div class="flex justify-between items-center">
                        <span>Fixed Price</span>
                        <span class="font-bold">$${price.toFixed(2)}</span>
                    </div>
                </div>
            `);
    selectedPrice = price;
  } else if (card.pricingType === "custom") {
    // Custom price with suggested options
    const minPrice = parseFloat(card.minPrice || 0);
    const maxPrice = parseFloat(card.maxPrice || 100);
    const suggestedPrices = card.suggestedPrices || [];

    // Add suggested price options
    if (suggestedPrices.length > 0) {
      suggestedPrices.forEach((price, index) => {
        $pricingOptions.append(`
                        <div class="price-option ${
                          index === 0 ? "selected" : ""
                        }" data-price="${price}">
                            <div class="flex justify-between items-center">
                                <span>Suggested Amount</span>
                                <span class="font-bold">$${parseFloat(
                                  price
                                ).toFixed(2)}</span>
                            </div>
                        </div>
                    `);
      });
      selectedPrice = parseFloat(suggestedPrices[0]);
    }

    // Add custom amount option
    $pricingOptions.append(`
                <div class="price-option" data-price="custom">
                    <div class="flex justify-between items-center">
                        <span>Custom Amount</span>
                        <span class="text-sm text-gray-600">$${minPrice.toFixed(
                          2
                        )} - $${maxPrice.toFixed(2)}</span>
                    </div>
                    <input type="number" class="custom-price-input" id="customPriceInput" 
                           min="${minPrice}" max="${maxPrice}" step="0.01" 
                           placeholder="Enter custom amount" style="display: none;">
                </div>
            `);
  } else if (card.pricingType === "both") {
    // Both fixed and custom options
    const fixedPrice = parseFloat(card.fixedPrice || 0);
    const minPrice = parseFloat(card.minPrice || 0);
    const maxPrice = parseFloat(card.maxPrice || 100);
    const suggestedPrices = card.suggestedPrices || [];

    // Fixed price option
    $pricingOptions.append(`
                <div class="price-option selected" data-price="${fixedPrice}">
                    <div class="flex justify-between items-center">
                        <span>Standard Amount</span>
                        <span class="font-bold">$${fixedPrice.toFixed(2)}</span>
                    </div>
                </div>
            `);
    selectedPrice = fixedPrice;

    // Suggested custom amounts
    if (suggestedPrices.length > 0) {
      suggestedPrices.forEach((price) => {
        $pricingOptions.append(`
                        <div class="price-option" data-price="${price}">
                            <div class="flex justify-between items-center">
                                <span>Suggested Amount</span>
                                <span class="font-bold">$${parseFloat(
                                  price
                                ).toFixed(2)}</span>
                            </div>
                        </div>
                    `);
      });
    }

    // Custom amount option
    $pricingOptions.append(`
                <div class="price-option" data-price="custom">
                    <div class="flex justify-between items-center">
                        <span>Custom Amount</span>
                        <span class="text-sm text-gray-600">$${minPrice.toFixed(
                          2
                        )} - $${maxPrice.toFixed(2)}</span>
                    </div>
                    <input type="number" class="custom-price-input" id="customPriceInput" 
                           min="${minPrice}" max="${maxPrice}" step="0.01" 
                           placeholder="Enter custom amount" style="display: none;">
                </div>
            `);
  }

  // Set up price option click handlers
  $(".price-option")
    .off("click")
    .on("click", function () {
      $(".price-option").removeClass("selected");
      $(this).addClass("selected");

      const price = $(this).data("price");

      if (price === "custom") {
        $("#customPriceInput").show().focus();
        selectedPrice = 0; // Will be set when user enters amount
      } else {
        $("#customPriceInput").hide();
        selectedPrice = parseFloat(price);
      }

      updateTotalAmount();
    });

  // Handle custom price input
  $("#customPriceInput")
    .off("input")
    .on("input", function () {
      const value = parseFloat($(this).val());
      if (!isNaN(value) && value > 0) {
        selectedPrice = value;
        updateTotalAmount();
      }
    });
}

// Function to show purchase modal
function showPurchaseModal(cardId) {
  selectedCard = giftCards.find((card) => card.id === cardId);
  if (!selectedCard) return;

  // Populate modal with card details
  $("#modalCardImage").attr(
    "src",
    selectedCard.imageUrl || "/api/placeholder/400/250"
  );
  $("#modalCardTitle").text(selectedCard.name);
  $("#modalCardCategory").text(selectedCard.category);
  $("#modalCardValidity").text(`${selectedCard.validityDays} days`);
  $("#modalCardDescription").text(
    selectedCard.description || "No description available"
  );

  // Setup pricing options
  setupPricingOptions(selectedCard);

  // Reset form
  $("#purchaseForm")[0].reset();
  quantity = 1;
  $("#quantity").val(quantity);

  updateTotalAmount();
  $("#purchaseModal").removeClass("hidden");
}

// Function to update total amount
function updateTotalAmount() {
  const total = selectedPrice * quantity;
  $("#totalAmount").text(`$${total.toFixed(2)}`);
}

// Function to generate unique gift card item ID
function generateGiftCardItemId() {
  return (
    "GC-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substr(2, 5).toUpperCase()
  );
}

// Function to add gift card to cart
function addGiftCardToCart() {
  if (!selectedCard || selectedPrice <= 0 || quantity <= 0) {
    showError("Please select a gift card and valid amount");
    return;
  }

  const form = $("#purchaseForm")[0];
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Check if user is logged in
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  // Create gift card item for cart
  const giftCardItem = {
    id: generateGiftCardItemId(),
    title: selectedCard.name,
    price: selectedPrice,
    image: selectedCard.imageUrl || "/api/placeholder/400/250",
    quantity: quantity,
    type: "giftcard",
    giftCardDetails: {
      originalCardId: selectedCard.id,
      category: selectedCard.category,
      validityDays: selectedCard.validityDays,
      description: selectedCard.description,
      pricingType: selectedCard.pricingType,
      selectedPrice: selectedPrice,
      recipientName: $("#recipientName").val(),
      recipientEmail: $("#recipientEmail").val(),
      personalMessage: $("#personalMessage").val(),
    },
    inStock: true,
    addedAt: new Date().toISOString(),
  };

  // Add to appropriate cart
  try {
    if (isLoggedIn) {
      // Add to logged-in user cart
      const userCart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
      userCart.push(giftCardItem);
      localStorage.setItem("shoppingCart", JSON.stringify(userCart));
    } else {
      // Add to guest cart
      const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      guestCart.push(giftCardItem);
      localStorage.setItem("guestCart", JSON.stringify(guestCart));
    }

    // Update cart count
    updateCartCount();

    // Show success message
    showNotification("Gift card added to cart successfully!", "success");

    // Close modal
    $("#purchaseModal").addClass("hidden");

    // Show cart confirmation
    showCartConfirmation(giftCardItem);

  } catch (error) {
    console.error("Error adding gift card to cart:", error);
    showError("Failed to add gift card to cart. Please try again.");
  }
}

// Function to show cart confirmation
function showCartConfirmation(item) {
  // Create and show a confirmation popup
  const confirmationHtml = `
    <div id="cartConfirmation" class="fixed top-4 right-4 bg-white border-l-4 border-green-500 shadow-lg rounded-lg p-4 z-50 max-w-md">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">Added to Cart!</p>
          <p class="text-sm text-gray-700 mt-1">${item.title} - $${item.price.toFixed(2)}</p>
          <div class="mt-3 flex space-x-3">
            <button onclick="goToCart()" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
              View Cart
            </button>
            <button onclick="closeCartConfirmation()" class="text-sm text-gray-500 hover:text-gray-700">
              Continue Shopping
            </button>
          </div>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button onclick="closeCartConfirmation()" class="text-gray-400 hover:text-gray-600">
            <span class="sr-only">Close</span>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Remove any existing confirmation
  $("#cartConfirmation").remove();

  // Add new confirmation
  $("body").append(confirmationHtml);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    closeCartConfirmation();
  }, 5000);
}

// Function to close cart confirmation
function closeCartConfirmation() {
  $("#cartConfirmation").fadeOut(300, function() {
    $(this).remove();
  });
}

// Function to go to cart
function goToCart() {
  window.location.href = "cart.html";
}

// Function to update cart count in header
function updateCartCount() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let totalQuantity = 0;

  if (isLoggedIn) {
    // For logged-in users
    const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
    cart.forEach((item) => {
      totalQuantity += parseInt(item.quantity) || 1;
    });
  } else {
    // For guest users
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    guestCart.forEach((item) => {
      totalQuantity += parseInt(item.quantity) || 1;
    });
  }

  // Update cart count display
  const counter = document.getElementById("cart-count");
  if (counter) {
    counter.textContent = totalQuantity;
    counter.style.display = totalQuantity > 0 ? "flex" : "none";
  }
}

// Initialize the application
$(document).ready(function () {
  // Initialize cart count on page load
  updateCartCount();

  // Fetch gift cards on page load
  fetchGiftCards();

  // Modal event handlers
  $("#closePurchaseBtn, #cancelPurchaseBtn").on("click", function () {
    $("#purchaseModal").addClass("hidden");
  });

  $("#confirmDoneBtn").on("click", function () {
    $("#purchaseConfirmModal").addClass("hidden");
  });

  // Quantity controls
  $("#increaseQty").on("click", function () {
    if (quantity < 99) {
      quantity++;
      $("#quantity").val(quantity);
      updateTotalAmount();
    }
  });

  $("#decreaseQty").on("click", function () {
    if (quantity > 1) {
      quantity--;
      $("#quantity").val(quantity);
      updateTotalAmount();
    }
  });

  $("#quantity").on("change", function () {
    const newQty = parseInt($(this).val());
    if (newQty >= 1 && newQty <= 99) {
      quantity = newQty;
      updateTotalAmount();
    } else {
      $(this).val(quantity);
    }
  });

  // Purchase form submission - now adds to cart instead of processing payment
  $("#purchaseForm").on("submit", function (e) {
    e.preventDefault();
    addGiftCardToCart();
  });

  // Close modal when clicking outside
  $("#purchaseModal").on("click", function (e) {
    if (e.target === this) {
      $(this).addClass("hidden");
    }
  });

  $("#purchaseConfirmModal").on("click", function (e) {
    if (e.target === this) {
      $(this).addClass("hidden");
    }
  });

  // Newsletter subscription
  $(".sub-btn").on("click", function () {
    const email = $(".email-btn").val();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Simulate newsletter subscription
      alert("Thank you for subscribing to our newsletter!");
      $(".email-btn").val("");
    } else {
      alert("Please enter a valid email address");
    }
  });

  // Handle Enter key in email input
  $(".email-btn").on("keypress", function (e) {
    if (e.which === 13) {
      $(".sub-btn").click();
    }
  });

  // Load site configuration (if available)
  loadSiteConfig();
});

// Function to load site configuration
function loadSiteConfig() {
  // This would typically load from a configuration endpoint
  // For now, we'll set defaults
  $("#site-logo").attr(
    "src",
    "https://via.placeholder.com/120x40/4f46e5/ffffff?text=S2K+SEWING"
  );
  $("#newsletter-text").text(
    "Subscribe to our newsletter for latest updates and exclusive offers!"
  );

  // Update scrolling text
  $("#scrolling-text").text(
    "Welcome to S2K Sewing - Your premier destination for gift cards! 🎁 Free delivery on orders over $100!"
  );
}

// Utility function to handle API errors gracefully
function handleApiError(xhr, textStatus, errorThrown) {
  console.error("API Error:", {
    status: xhr.status,
    statusText: xhr.statusText,
    responseText: xhr.responseText,
    textStatus: textStatus,
    errorThrown: errorThrown,
  });

  let errorMessage = "An unexpected error occurred. Please try again.";

  if (xhr.status === 0) {
    errorMessage =
      "Unable to connect to the server. Please check your internet connection.";
  } else if (xhr.status >= 500) {
    errorMessage = "Server error. Please try again later.";
  } else if (xhr.status === 404) {
    errorMessage = "Service not found. Please contact support.";
  }

  return errorMessage;
}

// Function to retry failed requests
function retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
  let retries = 0;

  function attempt() {
    return requestFunction().catch((error) => {
      retries++;
      if (retries < maxRetries) {
        console.log(`Retry attempt ${retries}/${maxRetries}`);
        return new Promise((resolve) => {
          setTimeout(() => resolve(attempt()), delay * retries);
        });
      } else {
        throw error;
      }
    });
  }

  return attempt();
}

// Add loading states for better UX
function setButtonLoading(buttonSelector, loading = true) {
  const $button = $(buttonSelector);
  if (loading) {
    $button.prop("disabled", true);
    const originalText = $button.text();
    $button.data("original-text", originalText);
    $button.html(
      '<span class="spinner-border spinner-border-sm mr-2"></span>Loading...'
    );
  } else {
    $button.prop("disabled", false);
    $button.text($button.data("original-text") || "Submit");
  }
}

// Enhanced error handling with user-friendly messages
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error("Global error:", {
    message: msg,
    source: url,
    line: lineNo,
    column: columnNo,
    error: error,
  });

  // Don't show technical errors to users, but log them
  return false;
};

// Service worker registration for offline functionality (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // Uncomment if you have a service worker
    // navigator.serviceWorker.register('/sw.js');
  });
}

// Make functions globally available
window.closeCartConfirmation = closeCartConfirmation;
window.goToCart = goToCart;