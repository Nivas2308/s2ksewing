// Global variables
let cart = [];
let pricingConfig = {};
let orderTotal = 0;
let orderItems = [];
let selectedShipping = "domestic";
let card; // Square card instance
let payments; // Square payments instance
let orderDetails = {}; // To store all order details
let isGuestCheckout = false;

// Enhanced fetchAndCachePricingConfig function to ensure COD charges are fetched
async function fetchAndCachePricingConfig() {
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbz4u8iR1P5W_mysP3V9mp0CSVcKjIW8ujGdRZBzy39Ydcvr4PIgrj2IvxES9EFX_Eeecg/exec";

  try {
    console.log("Fetching pricing configuration...");
    const response = await fetch(`${scriptUrl}?action=getPricingConfig`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw pricing config response:", data);

    if (data.error) {
      throw new Error(data.error);
    }

    // Transform the response to match expected format
    const pricingConfig = {
      onlinePaymentEnabled: data.onlinePaymentEnabled !== false,
      codCharges: parseFloat(data.codCharges) || 0,
      vatPercentage: parseFloat(data.vatPercentage) || 10,
      freeShippingThreshold: parseFloat(data.freeShippingThreshold) || 100,

      // Convert shipping options to expected format
      shippingCosts: {},
      shippingOptions: data.shippingOptions || [],
      promoCodes: data.promoCodes || [],
    };

    // Build shippingCosts object from shippingOptions
    if (data.shippingOptions && Array.isArray(data.shippingOptions)) {
      data.shippingOptions.forEach((option) => {
        pricingConfig.shippingCosts[option.name] = parseFloat(option.cost) || 0;
      });
    }

    // Set defaults if no shipping options exist
    if (Object.keys(pricingConfig.shippingCosts).length === 0) {
      pricingConfig.shippingCosts = {
        domestic: 9.99,
        international: 19.99,
      };
    }

    console.log("Processed pricing config:", pricingConfig);

    // Cache the config
    sessionStorage.setItem("pricingConfig", JSON.stringify(pricingConfig));
    window.pricingConfig = pricingConfig;

    // Update UI based on config
    updatePaymentMethodAvailability();

    return pricingConfig;
  } catch (error) {
    console.error("Failed to fetch pricing config:", error);

    // Try to use cached version
    const stored = sessionStorage.getItem("pricingConfig");
    if (stored) {
      try {
        const cachedConfig = JSON.parse(stored);
        console.log("Using cached pricing config:", cachedConfig);
        window.pricingConfig = cachedConfig;
        updatePaymentMethodAvailability();
        return cachedConfig;
      } catch (parseError) {
        console.error("Error parsing cached config:", parseError);
      }
    }

    console.log("Using fallback pricing config:", fallbackConfig);
    sessionStorage.setItem("pricingConfig", JSON.stringify(fallbackConfig));
    window.pricingConfig = fallbackConfig;
    updatePaymentMethodAvailability();
    return fallbackConfig;
  }
}

// On DOMContentLoaded, always fetch fresh config
document.addEventListener("DOMContentLoaded", async function () {
  await fetchAndCachePricingConfig();
  // ...rest of your initialization code...
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", async function () {
  // Show loading overlay
  showLoading(true);

  try {
    console.log("Initializing checkout page...");

    // Check authentication status
    checkAuthenticationStatus();

    clearAppliedDiscountsOnRefresh();

    // Load pricing configuration first
    console.log("Loading pricing configuration...");
    pricingConfig = await loadPricingConfig();
    console.log("Pricing config loaded:", pricingConfig);

    // Load cart data and update summary
    console.log("Loading cart data...");
    loadCartData();

    // Initialize payment system
    console.log("Initializing payment system...");
    initializePaymentSystem();

    // Initialize form validation
    console.log("Initializing form validation...");
    initFormValidation();

    // Calculate order summary
    console.log("Calculating order summary...");
    calculateOrderSummary();

    // Update payment method availability
    updatePaymentMethodAvailability();

    console.log("Checkout initialization complete");
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Error loading checkout page. Please try again.", "error");
  } finally {
    // Hide loading overlay
    showLoading(false);
  }
});

// Check authentication status and determine checkout type
function checkAuthenticationStatus() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  isGuestCheckout = !isLoggedIn;

  // Update UI based on checkout type
  updateCheckoutUI();
}

// Update checkout UI based on user status
function updateCheckoutUI() {
  // Remove the guest checkout notice functionality
  // Just keep this function for potential future UI updates
  console.log("Checkout UI updated - guest checkout notice disabled");
}
// Load pricing configuration
async function loadPricingConfig() {
  try {
    // Always try to fetch fresh config first
    const freshConfig = await fetchAndCachePricingConfig();
    return freshConfig;
  } catch (error) {
    console.error("Error in loadPricingConfig:", error);

    // Try session storage
    const storedConfig = sessionStorage.getItem("pricingConfig");
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        console.log("Using stored pricing config");
        return config;
      } catch (parseError) {
        console.error("Error parsing stored config:", parseError);
      }
    }

    sessionStorage.setItem("pricingConfig", JSON.stringify(fallbackConfig));
    return fallbackConfig;
  }
}
// Load cart data from localStorage (handles both guest and user carts)
function loadCartData() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  // Load appropriate cart based on authentication status
  if (isLoggedIn) {
    cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
    console.log("Loaded user cart:", cart.length, "items");
  } else {
    cart = JSON.parse(localStorage.getItem("guestCart")) || [];
    console.log("Loaded guest cart:", cart.length, "items");
  }

  // Also check for checkout data from session storage
  const checkoutData = sessionStorage.getItem("checkoutCart");
  if (checkoutData) {
    try {
      const parsedCheckoutData = JSON.parse(checkoutData);
      if (parsedCheckoutData.cart && parsedCheckoutData.cart.length > 0) {
        cart = parsedCheckoutData.cart;
        isGuestCheckout = parsedCheckoutData.isGuestCheckout || false;
        console.log("Loaded cart from checkout data:", cart.length, "items");
      }
    } catch (error) {
      console.error("Error parsing checkout data:", error);
    }
  }

  // If cart is empty, redirect to cart page
  if (cart.length === 0) {
    showNotification(
      "Your cart is empty. Redirecting to cart page.",
      "warning"
    );
    setTimeout(() => {
      window.location.href = "cart.html";
    }, 2000);
    return;
  }

  selectedShipping = sessionStorage.getItem("selectedShipping") || "domestic";
  loadSummaryItems();

  // Handle different cart types with proper UI updates
  if (isGiftCardOnlyOrder()) {
    console.log("Gift card only order detected");

    // Use multiple timeouts to ensure DOM is ready
    setTimeout(() => hideShippingForGiftCards(), 100);
    setTimeout(() => {
      hideShippingForGiftCards();
      addGiftCardDeliveryNotice();
    }, 300);
    setTimeout(() => {
      // Final check to ensure shipping is hidden
      if (document.querySelector(".checkout-section:nth-child(2)")) {
        hideShippingForGiftCards();
      }
    }, 500);
  } else if (hasGiftCards()) {
    console.log("Mixed cart with gift cards detected");
    showShippingForRegularOrders();
    showMixedCartNotice();
  } else {
    console.log("Regular order - showing shipping section");
    showShippingForRegularOrders();
  }
}

// 4. NEW: Function to hide shipping section for gift card only orders
function hideShippingForGiftCards() {
  const shippingSection = document.querySelector(
    ".checkout-section:nth-child(2)"
  ); // Assuming shipping is 2nd section
  const shippingHeader =
    document.querySelector('h3[data-section="shipping"]') ||
    document.querySelector('h3:contains("Shipping Address")');

  // Alternative selector if specific class exists
  const shippingContainer =
    document.querySelector(".shipping-section") ||
    document.querySelector('[data-section="shipping"]');

  // Hide shipping section elements
  if (shippingSection) {
    // Check if this section contains shipping fields
    const hasShippingFields =
      shippingSection.querySelector("#address") ||
      shippingSection.querySelector("#city") ||
      shippingSection.querySelector("#state");

    if (hasShippingFields) {
      shippingSection.style.display = "none";
      shippingSection.classList.add("hidden-for-giftcard");
    }
  }

  if (shippingContainer) {
    shippingContainer.style.display = "none";
    shippingContainer.classList.add("hidden-for-giftcard");
  }

  // Hide shipping row in order summary
  const shippingRow = document.getElementById("shippingRow");
  if (shippingRow) {
    shippingRow.style.display = "none";
  }

  // Update shipping display to show digital delivery
  const shippingElement = document.getElementById("shipping");
  if (shippingElement) {
    shippingElement.innerHTML =
      '<span class="digital-only">Digital Delivery</span>';
  }

  console.log("Shipping section hidden for gift card only order");
}

// Enhanced function to show shipping section for regular/mixed orders
function showShippingForRegularOrders() {
  const shippingSection = document.querySelector(
    ".checkout-section:nth-child(2)"
  );
  const shippingContainer =
    document.querySelector(".shipping-section") ||
    document.querySelector('[data-section="shipping"]');

  // Show shipping section elements
  if (
    shippingSection &&
    shippingSection.classList.contains("hidden-for-giftcard")
  ) {
    shippingSection.style.display = "block";
    shippingSection.classList.remove("hidden-for-giftcard");
  }

  if (
    shippingContainer &&
    shippingContainer.classList.contains("hidden-for-giftcard")
  ) {
    shippingContainer.style.display = "block";
    shippingContainer.classList.remove("hidden-for-giftcard");
  }

  // Show shipping row in order summary
  const shippingRow = document.getElementById("shippingRow");
  if (shippingRow) {
    shippingRow.style.display = "flex";
  }

  console.log("Shipping section shown for regular order");
}

// 6. NEW: Function to add gift card delivery notice
function addGiftCardDeliveryNotice() {
  const checkoutContainer = document.querySelector(".checkout-container");
  if (checkoutContainer) {
    const notice = document.createElement("div");
    notice.className = "gift-card-delivery-notice";
    notice.innerHTML = `
      <div class="notice-content">
        <i class="fas fa-gift"></i>
        <div class="notice-text">
          <strong>Digital Gift Card Delivery</strong>
          <p>Your gift cards will be delivered instantly via email after payment confirmation. No physical shipping required.</p>
        </div>
      </div>
    `;
    checkoutContainer.insertBefore(notice, checkoutContainer.firstChild);
  }
}

// 5. NEW: Function to show notice for mixed carts
function showMixedCartNotice() {
  const checkoutContainer = document.querySelector(".checkout-container");
  if (checkoutContainer) {
    const notice = document.createElement("div");
    notice.className = "mixed-cart-notice";
    notice.innerHTML = `
      <div class="notice-content">
        <i class="fas fa-info-circle"></i>
        <div class="notice-text">
          <strong>Mixed Order Notice</strong>
          <p>Your order contains both physical items and gift cards. Gift cards will be delivered via email, while physical items will be shipped to your address.</p>
        </div>
      </div>
    `;
    checkoutContainer.insertBefore(notice, checkoutContainer.firstChild);
  }
}

// Load summary items
function loadSummaryItems() {
  const summaryItems = document.getElementById("summaryItems");
  let summaryHTML = "";

  // Generate order items array for processing
  orderItems = [];

  cart.forEach((item) => {
    // Handle gift cards separately
    if (item.type === "giftcard" && item.giftCardDetails) {
      const giftCardPrice = parseFloat(
        item.giftCardDetails.selectedPrice || item.price
      );
      const itemImage = item.image || "https://via.placeholder.com/60";

      // Add gift card to summary HTML with special styling
      summaryHTML += `
        <div class="summary-item gift-card-summary-item">
          <div class="gift-card-badge">
            <i class="fas fa-gift"></i> Gift Card
          </div>
          <img src="${itemImage}" alt="${
        item.title
      }" class="summary-item-image">
          <div class="summary-item-details">
            <div class="summary-item-title">${item.title}</div>
            <div class="summary-item-meta">
              <div class="gift-card-meta">
                <div class="gift-card-amount">Amount: $${giftCardPrice.toFixed(
                  2
                )}</div>
                <div class="gift-card-recipient">To: ${
                  item.giftCardDetails.recipientName
                }</div>
                <div class="gift-card-email">Email: ${
                  item.giftCardDetails.recipientEmail
                }</div>
                ${
                  item.giftCardDetails.personalMessage
                    ? `<div class="gift-card-message">Message: "${item.giftCardDetails.personalMessage}"</div>`
                    : ""
                }
                ${
                  item.giftCardDetails.validityDays
                    ? `<div class="gift-card-validity">Valid for: ${item.giftCardDetails.validityDays} days</div>`
                    : '<div class="gift-card-validity">No expiration</div>'
                }
                <div class="gift-card-category">Category: ${
                  item.giftCardDetails.category || "General"
                }</div>
              </div>
              ${item.quantity > 1 ? `Qty: ${item.quantity}` : ""}
            </div>
          </div>
          <div class="summary-item-price">$${(
            giftCardPrice * (item.quantity || 1)
          ).toFixed(2)}</div>
        </div>
      `;

      // Add to order items array with gift card details
      orderItems.push({
        id: item.id || generateItemId(item.title),
        name: item.title,
        type: "giftcard",
        quantity: item.quantity || 1,
        price: giftCardPrice,
        subtotal: giftCardPrice * (item.quantity || 1),
        image: item.image || "https://via.placeholder.com/60",
        giftCardDetails: {
          recipientName: item.giftCardDetails.recipientName,
          recipientEmail: item.giftCardDetails.recipientEmail,
          personalMessage: item.giftCardDetails.personalMessage || "",
          validityDays: item.giftCardDetails.validityDays || null,
          category: item.giftCardDetails.category || "General",
          selectedPrice: giftCardPrice,
          isDigitalDelivery: true,
        },
        options: {
          isGiftCard: true,
          digitalDelivery: true,
        },
      });

      return; // Skip regular item processing for gift cards
    }

    // Regular product processing (existing code)
    let itemPrice = item.price;
    if (
      item.options &&
      item.options.size &&
      typeof item.options.size === "number"
    ) {
      itemPrice = item.price * item.options.size;
    }

    const itemImage = item.image || "https://via.placeholder.com/60";

    summaryHTML += `
      <div class="summary-item">
        <img src="${itemImage}" alt="${item.title}" class="summary-item-image">
        <div class="summary-item-details">
          <div class="summary-item-title">${item.title}</div>
          <div class="summary-item-meta">
            ${
              item.options && item.options.size
                ? `Size: ${item.options.size}${
                    typeof item.options.size === "number" ? " Yard" : ""
                  }`
                : ""
            }
            ${item.quantity > 1 ? ` • Qty: ${item.quantity}` : ""}
          </div>
        </div>
        <div class="summary-item-price">$${(
          itemPrice * (item.quantity || 1)
        ).toFixed(2)}</div>
      </div>
    `;

    // Add to order items array
    orderItems.push({
      id: item.id || generateItemId(item.title),
      name: item.title,
      type: item.type || "physical",
      quantity: item.quantity || 1,
      price: itemPrice,
      options: item.options || {},
      subtotal: itemPrice * (item.quantity || 1),
      image: item.image || "https://via.placeholder.com/60",
    });
  });

  // Add complementary items to summary if they exist (existing code)
  cart.forEach((item) => {
    // Skip gift cards as they don't have complementary items
    if (item.type === "giftcard") return;

    if (item.complementaryItems && item.complementaryItems.length > 0) {
      summaryHTML += `<div class="summary-section-divider">Selected Items for ${item.title}</div>`;

      item.complementaryItems.forEach((comp) => {
        let compPrice = 0;
        if (comp.isCustom) {
          compPrice = 1.0;
        } else if (comp.size && typeof comp.size === "number") {
          compPrice = comp.price * comp.size;
        } else {
          compPrice = typeof comp.price === "number" ? comp.price : 0;
        }

        const patternNotes =
          comp.PatternNotes ||
          comp.patternNotes ||
          comp.customPatternNotes ||
          comp.sewingPatternNotes ||
          comp.fabricPatternNotes ||
          comp.notes ||
          null;

        summaryHTML += `
          <div class="summary-item complementary-summary-item">
            <img src="${comp.image || "https://via.placeholder.com/60"}" 
                 alt="${comp.title}" class="summary-item-image">
            <div class="summary-item-details">
              <div class="summary-item-title">${comp.title}</div>
              <div class="summary-item-meta">
                ${
                  comp.size
                    ? `Size: ${comp.size}${
                        typeof comp.size === "number" ? " Yard" : ""
                      }`
                    : ""
                }
                ${
                  patternNotes && patternNotes.trim() !== ""
                    ? `<div class="item-notes"><i class="fas fa-scissors"></i> Pattern Notes: ${patternNotes}</div>`
                    : ""
                }
                ${
                  comp.color
                    ? `<div class="item-color"><i class="fas fa-palette"></i> Color: ${comp.color}</div>`
                    : ""
                }
              </div>
            </div>
            <div class="summary-item-price">$${compPrice.toFixed(2)}</div>
          </div>
        `;
      });
    }
  });

  // Update summary items HTML
  if (summaryItems) {
    summaryItems.innerHTML = summaryHTML;
  }
}

// Generate a unique ID for items without one
function generateItemId(title) {
  return (
    title.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 1000)
  );
}

// Enhanced function to get complementary items with proper custom fabric pattern notes mapping
function getComplementaryItems() {
  let complementaryItems = [];

  cart.forEach((item) => {
    if (item.complementaryItems && item.complementaryItems.length > 0) {
      item.complementaryItems.forEach((comp) => {
        // Enhanced complementary item with proper parent product ID mapping
        const complementaryItem = {
          id: comp.id || comp.productId || generateItemId(comp.title),
          productId: comp.productId || comp.id || generateItemId(comp.title),

          // FIX: Ensure parent product information is properly captured
          parentProductId:
            item.id || item.productId || generateItemId(item.title),
          parentItem: item.title,
          parentItemId: item.id || item.productId || generateItemId(item.title),

          name: comp.title,
          price: comp.price,
          size: comp.size,
          notes: comp.notes,
          subtotal:
            comp.size && typeof comp.size === "number"
              ? comp.price * comp.size
              : comp.price,
          image: comp.image || "https://via.placeholder.com/60",

          // Custom fabric specific details with proper pattern notes mapping
          isCustomFabric: comp.isCustom || comp.isCustomFabric || false,
          customFabricDetails:
            comp.isCustom || comp.isCustomFabric
              ? {
                  color: comp.color || comp.fabricColor || "Not specified",
                  material:
                    comp.material || comp.fabricMaterial || "Not specified",

                  // FIX: Proper pattern notes mapping - check multiple possible property names
                  pattern:
                    comp.PatternNotes ||
                    comp.patternNotes ||
                    comp.pattern ||
                    comp.fabricPattern ||
                    comp.sewingPattern ||
                    comp.customPatternNotes ||
                    "Not specified",

                  description:
                    comp.description ||
                    comp.fabricDescription ||
                    "Custom fabric selection",

                  // FIX: Map pattern notes from multiple possible sources
                  patternNotes:
                    comp.PatternNotes ||
                    comp.patternNotes ||
                    comp.customPatternNotes ||
                    comp.sewingPatternNotes ||
                    comp.fabricPatternNotes ||
                    comp.notes ||
                    "No additional notes",

                  customPrice: comp.customPrice || comp.price || 1.0,
                  fabricType: comp.fabricType || "Custom",
                  finish: comp.finish || comp.fabricFinish || "Standard",
                  weight: comp.weight || comp.fabricWeight || "Not specified",
                  width: comp.width || comp.fabricWidth || "Standard width",

                  // Additional pattern-specific fields
                  sewingInstructions:
                    comp.sewingInstructions || comp.instructions || null,
                  patternSize: comp.patternSize || comp.size || null,
                  difficulty: comp.difficulty || comp.patternDifficulty || null,
                }
              : null,

          // Additional metadata with proper parent product references
          itemType:
            comp.isCustom || comp.isCustomFabric ? "custom_fabric" : "standard",
          addedDate: new Date().toISOString(),
          specifications: comp.specifications || {},

          // FIX: Add flattened fields for easier sheet processing
          fabricPatternNotes:
            comp.PatternNotes ||
            comp.patternNotes ||
            comp.customPatternNotes ||
            comp.sewingPatternNotes ||
            comp.fabricPatternNotes ||
            comp.notes ||
            null,

          // FIX: Add parent product information at multiple levels for redundancy
          parentProductInfo: {
            id: item.id || item.productId || generateItemId(item.title),
            name: item.title,
            price: item.price,
            category: item.category || "Not specified",
          },
        };

        complementaryItems.push(complementaryItem);
      });
    }
  });

  return complementaryItems;
}

// Enhanced calculateOrderSummary function with COD charges support
function calculateOrderSummary() {
  console.log("Calculating order summary with gift cards...", {
    pricingConfig,
    cart,
    orderItems,
  });

  // Separate physical and digital items
  let physicalSubtotal = 0;
  let digitalSubtotal = 0;
  let hasPhysicalItems = false;
  let hasDigitalItems = false;

  // Calculate subtotal from order items
  orderItems.forEach((item) => {
    const itemTotal = item.subtotal;

    if (item.type === "giftcard") {
      digitalSubtotal += itemTotal;
      hasDigitalItems = true;
    } else {
      physicalSubtotal += itemTotal;
      hasPhysicalItems = true;
    }
  });

  // Add complementary items (these are always physical)
  let complementaryTotal = 0;
  cart.forEach((item) => {
    // Skip gift cards for complementary items
    if (item.type === "giftcard") return;

    if (item.complementaryItems && item.complementaryItems.length > 0) {
      item.complementaryItems.forEach((comp) => {
        let compPrice = 0;
        if (comp.isCustom) {
          compPrice = 1.0;
        } else if (comp.size && typeof comp.size === "number") {
          compPrice = comp.price * comp.size;
        } else {
          compPrice = typeof comp.price === "number" ? comp.price : 0;
        }
        complementaryTotal += compPrice;
        hasPhysicalItems = true;
      });
    }
  });

  const fullSubtotal = physicalSubtotal + digitalSubtotal + complementaryTotal;

  // Apply discount if any
  let discount = 0;
  try {
    const appliedPromoCode = JSON.parse(
      sessionStorage.getItem("appliedPromoCode")
    );

    if (appliedPromoCode) {
      const discountAmount =
        appliedPromoCode.amount || appliedPromoCode.discount || 0;

      if (appliedPromoCode.type === "percentage") {
        if (appliedPromoCode.applyTo === "shipping") {
          let shippingCost = getShippingCost();
          discount = shippingCost * (discountAmount / 100);
        } else {
          discount = fullSubtotal * (discountAmount / 100);
        }
      } else if (
        appliedPromoCode.type === "flat" ||
        appliedPromoCode.type === "fixed"
      ) {
        discount = Math.min(fullSubtotal, discountAmount);
      }
    }
  } catch (e) {
    console.error("Error parsing promo code:", e);
    sessionStorage.removeItem("appliedPromoCode");
  }

  // Calculate shipping cost (only for physical items)
  let shippingCost = 0;
  if (hasPhysicalItems) {
    shippingCost = getShippingCost();

    // Check for free shipping threshold (only applies to physical items)
    if (
      pricingConfig.freeShippingThreshold &&
      physicalSubtotal >= pricingConfig.freeShippingThreshold
    ) {
      shippingCost = 0;
    }

    // Apply shipping discount if applicable
    try {
      const appliedPromoCode = JSON.parse(
        sessionStorage.getItem("appliedPromoCode")
      );
      if (
        appliedPromoCode &&
        appliedPromoCode.applyTo === "shipping" &&
        appliedPromoCode.type === "percentage"
      ) {
        const discountAmount =
          appliedPromoCode.amount || appliedPromoCode.discount || 0;
        const shippingDiscount = shippingCost * (discountAmount / 100);
        shippingCost -= shippingDiscount;
      }
    } catch (e) {
      console.error("Error applying shipping discount:", e);
    }
  }

  // Calculate COD charges if COD payment method is selected (only for physical items)
  let codCharges = 0;
  const isCODSelected = document
    .getElementById("codPayment")
    ?.classList.contains("active");

  if (isCODSelected && pricingConfig.codCharges && hasPhysicalItems) {
    codCharges = parseFloat(pricingConfig.codCharges) || 0;
    console.log("COD charges applied:", codCharges);
  }

  // Calculate the amount to tax
  const taxableAmount = fullSubtotal - discount + shippingCost + codCharges;

  // Calculate VAT/tax based on the taxable amount
  const vatPercentage = parseFloat(pricingConfig.vatPercentage) || 10;
  const tax = taxableAmount * (vatPercentage / 100);

  // Calculate total
  orderTotal = fullSubtotal + tax + shippingCost + codCharges - discount;

  console.log("Order calculation with gift cards:", {
    physicalSubtotal,
    digitalSubtotal,
    fullSubtotal,
    discount,
    shippingCost,
    codCharges,
    tax,
    orderTotal,
    hasPhysicalItems,
    hasDigitalItems,
  });

  // Update order summary display with gift card awareness
  updateOrderSummaryDisplay(
    fullSubtotal,
    discount,
    shippingCost,
    codCharges,
    tax,
    vatPercentage,
    orderTotal,
    hasPhysicalItems,
    hasDigitalItems
  );

  // Store order details for submission
  orderDetails = {
    items: orderItems,
    complementaryItems: getComplementaryItems(),
    subtotal: fullSubtotal,
    physicalSubtotal: physicalSubtotal,
    digitalSubtotal: digitalSubtotal,
    discount: discount,
    taxableAmount: taxableAmount,
    tax: tax,
    shipping: shippingCost,
    codCharges: codCharges,
    total: orderTotal,
    shippingMethod: selectedShipping,
    hasPhysicalItems: hasPhysicalItems,
    hasDigitalItems: hasDigitalItems,
    giftCards: orderItems.filter((item) => item.type === "giftcard"),
  };
}

// Enhanced updateOrderSummaryDisplay function
function updateOrderSummaryDisplay(
  fullSubtotal,
  discount,
  shippingCost,
  codCharges,
  tax,
  vatPercentage,
  orderTotal,
  hasPhysicalItems = true,
  hasDigitalItems = false
) {
  const subtotalElement = document.getElementById("subtotal");
  if (subtotalElement) {
    subtotalElement.textContent = `$${fullSubtotal.toFixed(2)}`;
  }

  const taxElement = document.getElementById("tax");
  if (taxElement) {
    taxElement.textContent = `$${tax.toFixed(2)} (${vatPercentage}%)`;
  }

  // Enhanced shipping display logic for mixed carts
  const shippingElement = document.getElementById("shipping");
  if (shippingElement) {
    if (!hasPhysicalItems) {
      // Digital-only cart
      shippingElement.innerHTML =
        '<span class="digital-only">Digital Delivery Only</span>';
    } else if (shippingCost === 0) {
      shippingElement.innerHTML =
        '<span class="free-shipping"><i class="fas fa-gift"></i> FREE</span>';
    } else {
      let shippingText = `$${shippingCost.toFixed(2)}`;
      if (hasDigitalItems) {
        shippingText += " (Physical Items Only)";
      }
      shippingElement.textContent = shippingText;
    }
  }

  // Show/hide COD charges row (only for physical items)
  const codChargesElement = document.getElementById("codCharges");
  const codChargesRow = document.getElementById("codChargesRow");

  if (codCharges > 0 && hasPhysicalItems) {
    if (codChargesElement) {
      codChargesElement.textContent = `$${codCharges.toFixed(2)}`;
    }
    if (codChargesRow) {
      codChargesRow.style.display = "flex";
    }
  } else {
    if (codChargesRow) {
      codChargesRow.style.display = "none";
    }
  }

  const totalElement = document.getElementById("total");
  if (totalElement) {
    totalElement.textContent = `$${orderTotal.toFixed(2)}`;
  }

  // Handle discount row visibility
  if (discount > 0) {
    const discountElement = document.getElementById("discountValue");
    if (discountElement) {
      discountElement.textContent = `-$${discount.toFixed(2)}`;
    }
    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.style.display = "flex";
    }
  } else {
    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.style.display = "none";
    }
  }

  // Add delivery information for mixed carts
  updateDeliveryInformation(hasPhysicalItems, hasDigitalItems);
}

// Function to update delivery information based on cart composition
function updateDeliveryInformation(hasPhysicalItems, hasDigitalItems) {
  const deliveryElement = document.getElementById("deliveryInfo");

  if (!deliveryElement) {
    // Create delivery info element if it doesn't exist
    const summaryContainer = document.querySelector(".order-summary");
    if (summaryContainer) {
      const deliveryInfo = document.createElement("div");
      deliveryInfo.id = "deliveryInfo";
      deliveryInfo.className = "delivery-information";
      summaryContainer.appendChild(deliveryInfo);
    }
  }

  const deliveryInfoElement = document.getElementById("deliveryInfo");

  if (deliveryInfoElement) {
    let deliveryHTML = "";

    if (hasDigitalItems && hasPhysicalItems) {
      // Mixed cart
      deliveryHTML = `
        <div class="delivery-notice mixed-cart">
          <h4><i class="fas fa-info-circle"></i> Delivery Information</h4>
          <div class="delivery-details">
            <div class="digital-delivery">
              <i class="fas fa-download"></i>
              <span>Gift cards will be delivered instantly via email</span>
            </div>
            <div class="physical-delivery">
              <i class="fas fa-truck"></i>
              <span>Physical items will be shipped separately</span>
            </div>
          </div>
        </div>
      `;
    } else if (hasDigitalItems) {
      // Digital-only cart
      deliveryHTML = `
        <div class="delivery-notice digital-only">
          <h4><i class="fas fa-download"></i> Digital Delivery</h4>
          <p>Your gift cards will be delivered instantly via email after payment confirmation.</p>
        </div>
      `;
    } else {
      // Physical-only cart
      deliveryHTML = `
        <div class="delivery-notice physical-only">
          <h4><i class="fas fa-truck"></i> Shipping Information</h4>
          <p>Your items will be shipped to the address provided above.</p>
        </div>
      `;
    }

    deliveryInfoElement.innerHTML = deliveryHTML;
  }
}

// Function to get gift card details for order processing
function getGiftCardDetails() {
  const giftCardItems = orderItems.filter((item) => item.type === "giftcard");

  return giftCardItems.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    amount: item.price,
    totalAmount: item.subtotal,
    recipientName: item.giftCardDetails.recipientName,
    recipientEmail: item.giftCardDetails.recipientEmail,
    personalMessage: item.giftCardDetails.personalMessage,
    validityDays: item.giftCardDetails.validityDays,
    category: item.giftCardDetails.category,
    purchaseDate: new Date().toISOString(),
    deliveryMethod: "email",
    status: "pending_delivery",
  }));
}

// Helper function to get shipping cost
function getShippingCost() {
  if (!pricingConfig || !pricingConfig.shippingCosts) {
    console.warn(
      "Pricing config or shipping costs not available, using default"
    );
    return 9.99; // Default fallback
  }

  const cost = pricingConfig.shippingCosts[selectedShipping];
  if (cost !== undefined) {
    return parseFloat(cost) || 0;
  }

  // Try to find in shippingOptions
  if (pricingConfig.shippingOptions) {
    const option = pricingConfig.shippingOptions.find(
      (opt) => opt.name === selectedShipping
    );
    if (option) {
      return parseFloat(option.cost) || 0;
    }
  }

  // Fallback to first available shipping option or default
  if (
    pricingConfig.shippingOptions &&
    pricingConfig.shippingOptions.length > 0
  ) {
    return parseFloat(pricingConfig.shippingOptions[0].cost) || 9.99;
  }

  return 9.99; // Final fallback
}

// Helper function to update order summary display
function updateOrderSummaryDisplay(
  fullSubtotal,
  discount,
  shippingCost,
  codCharges,
  tax,
  vatPercentage,
  orderTotal
) {
  const subtotalElement = document.getElementById("subtotal");
  if (subtotalElement) {
    subtotalElement.textContent = `$${fullSubtotal.toFixed(2)}`;
  }

  const taxElement = document.getElementById("tax");
  if (taxElement) {
    taxElement.textContent = `$${tax.toFixed(2)} (${vatPercentage}%)`;
  }

  // Set shipping text with or without icon
  const shippingElement = document.getElementById("shipping");
  if (shippingElement) {
    if (shippingCost === 0) {
      shippingElement.innerHTML =
        '<span class="free-shipping"><i class="fas fa-gift"></i> FREE</span>';
    } else {
      shippingElement.textContent = `$${shippingCost.toFixed(2)}`;
    }
  }

  // Show/hide COD charges row
  const codChargesElement = document.getElementById("codCharges");
  const codChargesRow = document.getElementById("codChargesRow");

  if (codCharges > 0) {
    if (codChargesElement) {
      codChargesElement.textContent = `$${codCharges.toFixed(2)}`;
    }
    if (codChargesRow) {
      codChargesRow.style.display = "flex";
    }
  } else {
    if (codChargesRow) {
      codChargesRow.style.display = "none";
    }
  }

  const totalElement = document.getElementById("total");
  if (totalElement) {
    totalElement.textContent = `$${orderTotal.toFixed(2)}`;
  }

  // Handle discount row visibility
  if (discount > 0) {
    const discountElement = document.getElementById("discountValue");
    if (discountElement) {
      discountElement.textContent = `-$${discount.toFixed(2)}`;
    }
    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.style.display = "flex";
    }
  } else {
    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.style.display = "none";
    }
  }

  // Handle additional cost for custom fabrics
  const { additionalCost, hasCustomFabrics } = calculateAdditionalCost();
  const additionalCostElement = document.getElementById("additionalCost");
  const additionalCostRow = document.getElementById("additionalCostRow");

  if (hasCustomFabrics) {
    if (additionalCostElement) {
      additionalCostElement.textContent = `$${additionalCost.toFixed(2)}`;
    }
    if (additionalCostRow) {
      additionalCostRow.style.display = "flex";
    }
  } else {
    if (additionalCostRow) {
      additionalCostRow.style.display = "none";
    }
  }
}

// Replace the initializeSquarePayment function with this simplified version
function initializePaymentSystem() {
  // Create simplified payment form instead of Square
  const cardContainer = document.getElementById("card-container");
  if (cardContainer) {
    cardContainer.innerHTML = `
       <div class="simplified-card-form">
         <div class="form-row">
           <div class="form-column">
             <div class="form-group">
               <label for="cardNumber">Card Number *</label>
               <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19" data-validate="card" />
               <div class="error-message" id="cardNumberError">Please enter a valid card number</div>
             </div>
           </div>
         </div>
         <div class="form-row">
           <div class="form-column">
             <div class="form-group">
               <label for="cardExpiry">Expiration Date *</label>
               <input type="text" id="cardExpiry" placeholder="MM/YY" maxlength="5" data-validate="expiry" />
               <div class="error-message" id="cardExpiryError">Please enter a valid expiry date</div>
             </div>
           </div>
           <div class="form-column">
             <div class="form-group">
               <label for="cardCvv">CVV *</label>
               <input type="text" id="cardCvv" placeholder="123" maxlength="4" data-validate="cvv" />
               <div class="error-message" id="cardCvvError">Please enter a valid CVV</div>
             </div>
           </div>
         </div>
         <div class="form-row">
           <div class="form-column">
             <div class="form-group">
               <label for="cardName">Cardholder Name *</label>
               <input type="text" id="cardName" placeholder="Name as it appears on card" data-validate="required" />
               <div class="error-message" id="cardNameError">Please enter the cardholder name</div>
             </div>
           </div>
         </div>
       </div>
     `;

    // Add card input formatting
    const cardNumberInput = document.getElementById("cardNumber");
    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        let formattedValue = "";
        for (let i = 0; i < value.length; i++) {
          if (i > 0 && i % 4 === 0) {
            formattedValue += " ";
          }
          formattedValue += value[i];
        }
        e.target.value = formattedValue;
      });
    }

    const cardExpiryInput = document.getElementById("cardExpiry");
    if (cardExpiryInput) {
      cardExpiryInput.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 2) {
          e.target.value = value.substring(0, 2) + "/" + value.substring(2);
        } else {
          e.target.value = value;
        }
      });
    }
  }

  // Add CSS for the simplified card form
  const style = document.createElement("style");
  style.textContent = `
     .simplified-card-form {
       background-color: #f9f9f9;
       border-radius: 8px;
       padding: 15px;
       margin-bottom: 20px;
       border: 1px solid #e0e0e0;
     }
     .simplified-card-form input {
       font-size: 16px;
       letter-spacing: 0.5px;
     }
     #cardNumber {
       font-family: monospace;
     }
     .guest-checkout-notice {
       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
       color: white;
       padding: 15px;
       border-radius: 8px;
       margin-bottom: 20px;
       box-shadow: 0 2px 10px rgba(0,0,0,0.1);
     }
     .notice-content {
       display: flex;
       align-items: center;
       gap: 15px;
     }
     .notice-content i {
       font-size: 24px;
       color: rgba(255,255,255,0.9);
     }
     .notice-text strong {
       display: block;
       font-size: 16px;
       margin-bottom: 5px;
     }
     .notice-text p {
       margin: 0;
       font-size: 14px;
       opacity: 0.9;
     }
   `;
  document.head.appendChild(style);

  // Add additional validation methods
  addPaymentValidation();
}

// Add specialized validation for payment fields
function addPaymentValidation() {
  // Extend validateField function to handle card fields
  const originalValidateField = window.validateField || function () {};

  window.validateField = function (field) {
    const validationType = field.getAttribute("data-validate");
    const fieldId = field.id;
    const errorElement = document.getElementById(`${fieldId}Error`);
    let isValid = true;

    // Reset field style
    field.classList.remove("input-error");
    if (errorElement) {
      errorElement.style.display = "none";
    }

    // For payment specific validations
    if (validationType === "card") {
      // Simple card validation (just check length for demo)
      const cardNumber = field.value.replace(/\s/g, "");
      isValid = cardNumber.length >= 13 && cardNumber.length <= 19;
    } else if (validationType === "expiry") {
      // Simple expiry validation
      const expiry = field.value;
      const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      isValid = regex.test(expiry);

      if (isValid) {
        // Check if date is in the future
        const parts = expiry.split("/");
        const month = parseInt(parts[0], 10);
        const year = parseInt("20" + parts[1], 10);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        isValid =
          year > currentYear || (year === currentYear && month >= currentMonth);
      }
    } else if (validationType === "cvv") {
      // Simple CVV validation (3-4 digits)
      const cvv = field.value;
      isValid = /^[0-9]{3,4}$/.test(cvv);
    } else {
      // Use the original validation logic for other fields
      return originalValidateField(field);
    }

    // Show error if invalid
    if (!isValid && field.value.trim() !== "") {
      field.classList.add("input-error");
      if (errorElement) {
        errorElement.style.display = "block";
      }
    }

    return isValid;
  };
}

// Initialize form validation
function initFormValidation() {
  // Add input event listeners to all required fields
  const requiredFields = document.querySelectorAll("[data-validate]");

  requiredFields.forEach((field) => {
    field.addEventListener("input", function () {
      validateField(this);
    });

    field.addEventListener("blur", function () {
      validateField(this);
    });
  });
}

// Validate a single field - consolidated version
function validateField(field) {
  const validationType = field.getAttribute("data-validate");
  const fieldId = field.id;
  const errorElement = document.getElementById(`${fieldId}Error`);
  let isValid = true;

  // Reset field style
  field.classList.remove("input-error");
  if (errorElement) {
    errorElement.style.display = "none";
  }

  // Perform validation based on type
  switch (validationType) {
    case "required":
      isValid = field.value.trim() !== "";
      break;

    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(field.value);
      break;

    case "phone":
      const phoneRegex = /^\+?[0-9\s\-()]{8,}$/;
      isValid = phoneRegex.test(field.value);
      break;

    case "card":
      // Simple card validation
      const cardNumber = field.value.replace(/\s/g, "");
      isValid = cardNumber.length >= 13 && cardNumber.length <= 19;
      break;

    case "expiry":
      // Simple expiry validation
      const expiry = field.value;
      const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      isValid = regex.test(expiry);

      if (isValid) {
        // Check if date is in the future
        const parts = expiry.split("/");
        const month = parseInt(parts[0], 10);
        const year = parseInt("20" + parts[1], 10);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        isValid =
          year > currentYear || (year === currentYear && month >= currentMonth);
      }
      break;

    case "cvv":
      // Simple CVV validation (3-4 digits)
      const cvv = field.value;
      isValid = /^[0-9]{3,4}$/.test(cvv);
      break;
  }

  // Show error if invalid
  if (!isValid && field.value.trim() !== "") {
    field.classList.add("input-error");
    if (errorElement) {
      errorElement.style.display = "block";
    }
  }

  return isValid;
}

// Validate all form fields
function validateForm() {
  const requiredFields = document.querySelectorAll("[data-validate]");
  const isGiftCardOnly = isGiftCardOnlyOrder();
  let isValid = true;
  const invalidFields = [];

  requiredFields.forEach((field) => {
    // Skip shipping fields for gift card only orders
    if (
      isGiftCardOnly &&
      (field.id === "address" ||
        field.id === "city" ||
        field.id === "state" ||
        field.id === "zip" ||
        field.id === "country")
    ) {
      return; // Skip validation for these fields
    }

    // Skip card payment fields if COD is selected
    const isCODSelected = document
      .getElementById("codPayment")
      ?.classList.contains("active");
    if (
      !isCODSelected &&
      (field.id === "cardNumber" ||
        field.id === "cardExpiry" ||
        field.id === "cardCvv" ||
        field.id === "cardName")
    ) {
      return;
    }

    // Only validate if the field is visible (not in collapsed section)
    const parent = field.closest(".toggle-content");
    if (!parent || parent.classList.contains("active")) {
      if (!validateField(field)) {
        isValid = false;
        invalidFields.push(field.id);
      }
    }
  });

  if (!isValid && invalidFields.length > 0) {
    console.log("Validation failed for fields:", invalidFields);
  }

  return isValid;
}

// Toggle section visibility
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const button = section.previousElementSibling;

  section.classList.toggle("active");
  button.classList.toggle("active");
}

// Select payment method
function selectPaymentMethod(method) {
  // Remove active class from all payment methods
  document.querySelectorAll(".payment-method").forEach((el) => {
    el.classList.remove("active");
  });

  // Add active class to selected method
  const selectedPayment = document.getElementById(`${method}Payment`);
  if (selectedPayment) {
    selectedPayment.classList.add("active");
  }

  // Show/hide payment forms based on selection
  if (method === "card") {
    const cardForm = document.getElementById("cardPaymentForm");
    const codForm = document.getElementById("codPaymentForm");
    if (cardForm) cardForm.style.display = "block";
    if (codForm) codForm.style.display = "none";
  } else if (method === "cod") {
    const cardForm = document.getElementById("cardPaymentForm");
    const codForm = document.getElementById("codPaymentForm");
    if (cardForm) cardForm.style.display = "none";
    if (codForm) codForm.style.display = "block";
  }
}

/**
 * Enhanced placeOrder function with comprehensive payment handling,
 * user authentication, and improved error handling
 */
async function placeOrder() {
  try {
    // Determine which payment method is selected
    const isCardPayment = !document
      .getElementById("codPayment")
      ?.classList.contains("active");

    // Validate form with conditional payment field validation
    let isFormValid = true;
    const requiredFields = document.querySelectorAll("[data-validate]");
    const invalidFields = [];

    requiredFields.forEach((field) => {
      // Skip card payment fields if COD is selected
      if (
        !isCardPayment &&
        (field.id === "cardNumber" ||
          field.id === "cardExpiry" ||
          field.id === "cardCvv" ||
          field.id === "cardName")
      ) {
        return;
      }

      // Only validate if the field is visible and active
      const parent = field.closest(".toggle-content");
      if (!parent || parent.classList.contains("active")) {
        if (!validateField(field)) {
          isFormValid = false;
          invalidFields.push(field.id);
        }
      }
    });

    // Show specific validation errors
    if (!isFormValid) {
      const errorMessage =
        invalidFields.length > 0
          ? `Please correct the following fields: ${invalidFields.join(", ")}`
          : "Please fill in all required fields correctly.";

      showNotification(errorMessage, "error");

      // Focus on first invalid field
      if (invalidFields.length > 0) {
        const firstInvalidField = document.getElementById(invalidFields[0]);
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
      }
      return;
    }

    // Show loading state
    showLoading(true);

    // Get current user information
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const userId = userInfo.id || userInfo.userId || null;

    // Optional: Check if user login is required
    const requireLogin = false; // Set to true if login is mandatory
    if (requireLogin && !userId) {
      showNotification("Please log in to place an order.", "error");
      showLoading(false);
      return;
    }

    // Collect and validate customer information
    const customerInfo = {
      firstName: document.getElementById("firstName")?.value?.trim() || "",
      lastName: document.getElementById("lastName")?.value?.trim() || "",
      email: document.getElementById("email")?.value?.trim() || "",
      phone: document.getElementById("phone")?.value?.trim() || "",
      address: document.getElementById("address")?.value?.trim() || "",
      city: document.getElementById("city")?.value?.trim() || "",
      state: document.getElementById("state")?.value?.trim() || "",
      zip: document.getElementById("zip")?.value?.trim() || "",
      country: document.getElementById("country")?.value?.trim() || "",
      notes: document.getElementById("orderNotes")?.value?.trim() || "",
      userId: userId, // Include user ID if available
    };

    // Validate email format
    if (customerInfo.email && !isValidEmail(customerInfo.email)) {
      showNotification("Please enter a valid email address.", "error");
      showLoading(false);
      return;
    }

    // Determine payment method and collect payment details
    let paymentMethod = "card";
    let paymentDetails = null;

    if (document.getElementById("codPayment")?.classList.contains("active")) {
      paymentMethod = "cod";
    } else {
      // Validate and collect card payment details
      const cardNumber =
        document.getElementById("cardNumber")?.value?.replace(/\s/g, "") || "";
      const cardExpiry = document.getElementById("cardExpiry")?.value || "";
      const cardCvv = document.getElementById("cardCvv")?.value || "";
      const cardName = document.getElementById("cardName")?.value?.trim() || "";

      // Basic card validation
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        showNotification("Please enter a valid card number.", "error");
        showLoading(false);
        return;
      }

      if (!cardExpiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
        showNotification("Please enter a valid expiry date (MM/YY).", "error");
        showLoading(false);
        return;
      }

      if (cardCvv.length < 3 || cardCvv.length > 4) {
        showNotification("Please enter a valid CVV.", "error");
        showLoading(false);
        return;
      }

      paymentDetails = {
        cardHolder: cardName,
        // Store last 4 digits only for security
        cardNumber: "*".repeat(12) + cardNumber.slice(-4),
        expiry: cardExpiry,
        // Never store CVV
        cvvProvided: true,
      };
    }

    // Validate order details exist
    if (
      !orderDetails ||
      !orderDetails.items ||
      orderDetails.items.length === 0
    ) {
      showNotification(
        "Your cart is empty. Please add items before placing an order.",
        "error"
      );
      showLoading(false);
      return;
    }

    // Get enhanced complementary items with custom fabric details
    const complementaryItems = getComplementaryItems();

    // Validate custom fabric data if present
    if (complementaryItems.some((item) => item.isCustomFabric)) {
      validateCustomFabricData(complementaryItems);
    }

    // Update order details to include enhanced complementary items
    orderDetails = {
      ...orderDetails,
      complementaryItems: complementaryItems,
    };

    // Create comprehensive order object with enhanced data structure
    const order = {
      id: generateOrderNumber(),
      date: new Date().toISOString(),
      userId: userId, // Include user ID at top level
      customer: customerInfo,
      order: {
        ...orderDetails,
        items: orderDetails.items.map((item) => ({
          ...item,
          imageUrl:
            item.image || item.imageUrl || "https://via.placeholder.com/60",
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
        })),
        complementaryItems: complementaryItems,
        orderSource: "web",
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: Date.now(),
        },
        // Add custom fabric flags for easy identification
        hasCustomFabrics: complementaryItems.some(
          (item) => item.isCustomFabric
        ),
        customFabricCount: complementaryItems.filter(
          (item) => item.isCustomFabric
        ).length,
      },
      paymentMethod: paymentMethod,
      paymentDetails: paymentDetails,
      status: paymentMethod === "cod" ? "pending_cod" : "pending_payment",
      tracking: {
        ipAddress: null, // This would be set server-side
        sessionId: sessionStorage.getItem("sessionId") || generateSessionId(),
        referrer: document.referrer || null,
      },
    };

    // Log order attempt (for debugging)
    console.log("Attempting to place order:", {
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      itemCount: order.order.items.length,
      complementaryItemCount: order.order.complementaryItems.length,
      customFabricCount: order.order.customFabricCount,
      totalAmount: order.order.total,
    });

    // Process the order with enhanced custom fabric handling
    await processOrder(order);

    // Clear cart and session data after successful order
    clearCartSimple();

    // Show success message and redirect
    showOrderSuccess(order);

    // Optional: Track successful order for analytics
    if (typeof trackOrderPlaced === "function") {
      trackOrderPlaced(order);
    }
  } catch (error) {
    console.error("Order processing error:", error);

    // Show user-friendly error message based on error type
    let errorMessage = "Order processing failed. Please try again.";

    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      errorMessage =
        "Network error. Please check your connection and try again.";
    } else if (error.message.includes("payment")) {
      errorMessage =
        "Payment processing failed. Please verify your payment details.";
    } else if (error.message.includes("inventory")) {
      errorMessage =
        "Some items are no longer available. Please review your cart.";
    } else if (error.message.includes("custom fabric")) {
      errorMessage =
        "There was an issue processing your custom fabric selections. Please review and try again.";
    }

    showNotification(errorMessage, "error");

    // Optional: Send error to monitoring service
    if (typeof logError === "function") {
      logError("Order placement failed", error);
    }
  } finally {
    showLoading(false);
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to get current user ID
 */
function getCurrentUserId() {
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  return userInfo.id || userInfo.userId || null;
}

/**
 * Helper function to generate session ID if not exists
 */
function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

/**
 * Enhanced order success handler
 */
function showOrderSuccess(order) {
  // Show success notification
  showNotification(
    `Order #${order.id} placed successfully! You will receive a confirmation email shortly.`,
    "success"
  );

  // Optional: Redirect to order confirmation page
  setTimeout(() => {
    window.location.href = `order-confirmation.html?orderId=${order.id}`;
  }, 2000);
}

/**
 * Alternative version for anonymous orders (no login required)
 */
async function placeOrderAnonymous() {
  // This is essentially the same function but with requireLogin set to false
  // and without user authentication checks
  return placeOrder();
}
// Show loading overlay
function showLoading(show) {
  document.getElementById("loadingOverlay").style.display = show
    ? "flex"
    : "none";
}

// Show notification
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  const notificationMessage = document.getElementById("notificationMessage");

  // Set message and type
  notificationMessage.textContent = message;
  notification.className = "notification";
  notification.classList.add(type);

  // Show notification
  notification.classList.add("show");

  // Hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 5000);
}

// Apply promo code
async function applyPromoCode() {
  const promoInput = document.getElementById("promoCodeInput");
  const code = promoInput.value.trim().toUpperCase();

  if (!code) {
    showNotification("Please enter a promo code", "error");
    return false;
  }

  // Ensure we have the latest pricing config with promo codes
  if (!pricingConfig.promoCodes) {
    try {
      pricingConfig = await fetchAndCachePricingConfig();
    } catch (error) {
      console.error("Error refreshing pricing config:", error);
    }
  }

  // Find promo code in config
  const foundPromo = pricingConfig.promoCodes?.find(
    (promo) => promo.code === code
  );

  if (foundPromo) {
    // Store the whole promo object in session storage
    sessionStorage.setItem("appliedPromoCode", JSON.stringify(foundPromo));

    // Show applied promo message
    document.getElementById("promoApplied").style.display = "block";
    document.getElementById(
      "appliedPromoMessage"
    ).textContent = `Promo code "${code}" applied!`;

    // Disable input
    promoInput.disabled = true;

    // Recalculate order summary
    calculateOrderSummary();

    showNotification(`Promo code '${code}' applied successfully!`, "success");
    return true;
  } else {
    showNotification("Invalid promo code.", "error");
    return false;
  }
}

// Remove promo code
function removePromoCode() {
  sessionStorage.removeItem("appliedPromoCode");

  // Hide applied message and enable input
  document.getElementById("promoApplied").style.display = "none";
  document.getElementById("promoCodeInput").disabled = false;
  document.getElementById("promoCodeInput").value = "";

  // Recalculate order summary which will hide discount row
  calculateOrderSummary();

  showNotification("Promo code removed.", "success");
}

// Change shipping method
function changeShippingMethod(method) {
  selectedShipping = method;
  sessionStorage.setItem("selectedShipping", method);
  calculateOrderSummary();
}

// Generate order number
function generateOrderNumber() {
  return (
    "ORD-" +
    new Date().getTime().toString().slice(-6) +
    "-" +
    Math.floor(Math.random() * 1000)
  );
}

// Use the same generateOrderId function as in the Apps Script
function generateOrderId() {
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${timestamp}-${random}`;
}

// Show order success

function showOrderSuccess(order) {
  // Show a brief success message
  showNotification("Order placed successfully! Redirecting...", "success");

  // Short delay before redirect (to let the notification show)
  setTimeout(() => {
    // Redirect to confirmation page with order ID
    window.location.href = `confirmation.html?id=${order.id}`;
  }, 2000);
}

// ORDER SUBMISSION
async function processOrder(order) {
  try {
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbxgr_s7tcbvGu9gWc1jf7B8kd_c0RDPHZpi4XSZlXNT5KRCLQZ1n9iUNguHW61Tlej4/exec";

    // Enhanced order standardization with gift card support
    const standardizedOrder = {
      ...order,
      order: {
        ...order.order,
        items: order.order.items.map((item) => ({
          ...item,
          imageUrl:
            item.imageUrl || item.image || "https://via.placeholder.com/60",
          image: undefined,
          productId:
            item.id ||
            item.productId ||
            generateItemId(item.name || item.title),
          id:
            item.id ||
            item.productId ||
            generateItemId(item.name || item.title),

          // Enhanced gift card details
          ...(item.type === "giftcard" && {
            giftCardDetails: item.giftCardDetails,
            isDigitalDelivery: true,
            deliveryMethod: "email",
          }),
        })),

        // Add gift card summary
        giftCards: getGiftCardDetails(),
        hasGiftCards: orderItems.some((item) => item.type === "giftcard"),
        giftCardCount: orderItems.filter((item) => item.type === "giftcard")
          .length,

        // Enhanced complementary items
        complementaryItems: (order.order.complementaryItems || []).map(
          (item) => ({
            ...item,
            imageUrl:
              item.imageUrl || item.image || "https://via.placeholder.com/60",
            image: undefined,
            parentProductId: item.parentProductId || item.parentItemId || null,
            parentItem: item.parentItem || "",
            parentItemId: item.parentItemId || item.parentProductId || null,
            productId: item.productId || item.id || generateItemId(item.name),
            id: item.id || item.productId || generateItemId(item.name),
            // ... rest of complementary item processing
          })
        ),
      },
    };

    // Create the order data structure for Google Sheets
    const orderData = {
      action: "submitOrder",
      order: {
        id: standardizedOrder.id,
        date: standardizedOrder.date,
        customer: standardizedOrder.customer,
        paymentMethod: standardizedOrder.paymentMethod,
        status: standardizedOrder.status,
        shippingMethod: selectedShipping,
        order: {
          ...standardizedOrder.order,
          shippingMethod: selectedShipping,

          // Add delivery flags
          hasPhysicalItems: standardizedOrder.order.hasPhysicalItems,
          hasDigitalItems: standardizedOrder.order.hasDigitalItems,
          hasGiftCards: standardizedOrder.order.hasGiftCards,
          requiresShipping: standardizedOrder.order.hasPhysicalItems,
          requiresEmailDelivery: standardizedOrder.order.hasDigitalItems,
        },
      },
    };

    console.log(
      "Submitting order with gift card support:",
      JSON.stringify(orderData, null, 2)
    );

    // Store order in localStorage as backup
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    orders.push(standardizedOrder);
    localStorage.setItem("orders", JSON.stringify(orders));

    // Submit to Google Sheets
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
      mode: "no-cors",
    });

    return standardizedOrder;
  } catch (error) {
    console.error("Error submitting order with gift cards:", error);
    return order;
  }
}

function clearCartSimple() {
  // Get user info
  const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  // Clear appropriate cart based on login status
  if (isLoggedIn && userInfo.userId) {
    // Clear logged-in user's cart
    localStorage.removeItem(`shoppingCart`);

    // Clear server cart if user is logged in
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbwZAY2t1QhVdNqX8Wsd1gTu1j7-ChXF-xpydhZzzaGcpI29chwKt5e0IxCS8uTdiHk/exec";

    fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `action=clearCart&userId=${encodeURIComponent(userInfo.userId)}`,
    }).catch((error) => {
      console.error("Failed to clear server cart:", error);
    });

    console.log("Logged-in user cart cleared");
  } else {
    // Clear guest cart
    localStorage.removeItem("guestCart");
    console.log("Guest cart cleared");
  }

  // Update UI if cart display functions are available
  if (typeof loadCart === "function") {
    loadCart();
  }
  if (typeof updateCartCount === "function") {
    updateCartCount();
  }

  console.log("Cart cleared successfully");
}

// Helper to get the current online payment status (from sessionStorage or global)
function getOnlinePaymentStatus() {
  let config = null;
  try {
    const stored = sessionStorage.getItem("pricingConfig");
    if (stored) {
      config = JSON.parse(stored);
    } else if (typeof pricingConfig === "object") {
      config = pricingConfig;
    }
  } catch (e) {
    config = null;
  }
  return config && config.onlinePaymentEnabled !== false;
}

// Update payment method UI based on online payment status
function updatePaymentMethodAvailability() {
  const onlinePaymentEnabled = getOnlinePaymentStatus();
  const cardPayment = document.getElementById("cardPayment");
  const cardPaymentForm = document.getElementById("cardPaymentForm");
  let infoMsg = document.getElementById("onlinePaymentDisabledInfo");
  if (!onlinePaymentEnabled) {
    if (cardPayment) cardPayment.classList.add("disabled");
    if (cardPaymentForm) cardPaymentForm.style.display = "none";
    if (!infoMsg) {
      infoMsg = document.createElement("div");
      infoMsg.id = "onlinePaymentDisabledInfo";
      infoMsg.className = "payment-method-disabled-info";
      infoMsg.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Online payment is temporarily unavailable due to a technical issue. Please choose another payment method or try again later.';
      const paymentSection = document.querySelector(".payment-methods");
      if (paymentSection)
        paymentSection.parentNode.insertBefore(
          infoMsg,
          paymentSection.nextSibling
        );
    }
    if (document.getElementById("cardPayment")?.classList.contains("active")) {
      selectPaymentMethod("cod");
    }
  } else {
    if (cardPayment) cardPayment.classList.remove("disabled");
    if (cardPaymentForm) cardPaymentForm.style.display = "block";
    if (infoMsg) infoMsg.remove();
  }
}

// Enhanced selectPaymentMethod function with COD charges

window.selectPaymentMethod = function (method) {
  // Remove active class from all payment methods
  document.querySelectorAll(".payment-method").forEach((el) => {
    el.classList.remove("active");
  });

  // Add active class to selected method
  const selectedPayment = document.getElementById(`${method}Payment`);
  if (selectedPayment) {
    selectedPayment.classList.add("active");
  }

  // Show/hide payment forms based on selection
  const cardForm = document.getElementById("cardPaymentForm");
  const codForm = document.getElementById("codPaymentForm");

  if (method === "card") {
    if (cardForm) cardForm.style.display = "block";
    if (codForm) codForm.style.display = "none";
  } else if (method === "cod") {
    if (cardForm) cardForm.style.display = "none";
    if (codForm) codForm.style.display = "block";
  }

  // Recalculate order summary with COD charges if applicable
  calculateOrderSummary();
};

// Patch calculateOrderSummary to include COD charges if needed
const originalCalculateOrderSummary = window.calculateOrderSummary;
window.calculateOrderSummary = function () {
  originalCalculateOrderSummary && originalCalculateOrderSummary();
  // If COD is selected, add COD charges to total
  const totalElement = document.getElementById("total");
  if (totalElement) {
    totalElement.textContent = `$${orderTotal.toFixed(2)}`;
  }
};

// Helper function to generate custom fabric summary
function generateCustomFabricSummary(complementaryItems) {
  const customFabrics = complementaryItems.filter(
    (item) => item.isCustomFabric
  );

  if (customFabrics.length === 0) {
    return null;
  }

  return customFabrics.map((fabric) => ({
    name: fabric.name,
    color: fabric.fabricColor,
    material: fabric.fabricMaterial,
    pattern: fabric.fabricPattern,
    price: fabric.price,

    // FIX: Ensure pattern notes are included in summary
    notes: fabric.fabricPatternNotes,
    patternNotes: fabric.fabricPatternNotes,

    parentItem: fabric.parentItem,
  }));
}

// Function to validate custom fabric data before submission
function validateCustomFabricData(complementaryItems) {
  const customFabrics = complementaryItems.filter(
    (item) => item.isCustomFabric
  );

  for (const fabric of customFabrics) {
    if (!fabric.customFabricDetails) {
      console.warn(`Custom fabric ${fabric.name} missing detailed information`);
      continue;
    }

    const details = fabric.customFabricDetails;

    // Log custom fabric details for verification
    console.log(`Custom Fabric Details for ${fabric.name}:`, {
      color: details.color,
      material: details.material,
      pattern: details.pattern,
      description: details.description,
      patternNotes: details.patternNotes,
      price: details.customPrice,
    });
  }

  return true;
}

// Function to calculate additional cost from custom fabrics
function calculateAdditionalCost() {
  let additionalCost = 0;
  let hasCustomFabrics = false;

  cart.forEach((item) => {
    if (item.complementaryItems && item.complementaryItems.length > 0) {
      item.complementaryItems.forEach((comp) => {
        if (comp.isCustom || comp.isCustomFabric) {
          hasCustomFabrics = true;
          // Add any additional processing costs for custom fabrics
          additionalCost += 0; // Currently $0, but can be modified as needed
        }
      });
    }
  });

  return { additionalCost, hasCustomFabrics };
}

// Function to clear any applied discounts on page refresh
function clearAppliedDiscountsOnRefresh() {
  // Check if this is a page refresh (not coming from cart.html)
  const referrer = document.referrer;
  const isFromCart = referrer && referrer.includes("cart.html");

  // If not coming from cart, clear any applied promo codes
  if (!isFromCart) {
    console.log("Page refreshed - clearing applied promo codes");

    // Remove from session storage
    sessionStorage.removeItem("appliedPromoCode");

    // Update UI elements
    const promoApplied = document.getElementById("promoApplied");
    const promoInput = document.getElementById("promoCodeInput");
    const discountRow = document.getElementById("discountRow");

    if (promoApplied) {
      promoApplied.style.display = "none";
    }

    if (promoInput) {
      promoInput.disabled = false;
      promoInput.value = "";
    }

    if (discountRow) {
      discountRow.style.display = "none";
    }

    console.log("Promo codes cleared due to page refresh");
  } else {
    console.log("Coming from cart.html - preserving promo codes");
  }
}

function isGiftCardOnlyOrder() {
  return (
    cart && cart.length > 0 && cart.every((item) => item.type === "giftcard")
  );
}

function hasGiftCards() {
  return cart && cart.some((item) => item.type === "giftcard");
}
