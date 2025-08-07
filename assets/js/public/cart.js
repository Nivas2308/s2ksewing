// ================ ENHANCED GUEST CART & CHECKOUT SYSTEM ================
// Unified cart system supporting both guest and logged-in users

// 1. INITIALIZATION AND CONFIGURATION
document.addEventListener("DOMContentLoaded", async function () {
  // First check login status
  checkLoginStatus();

  // Get user info
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  // If user is logged in, sync cart with server
  if (isLoggedIn) {
    const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
    try {
      await syncCartWithServer(userInfo.userId);
    } catch (error) {
      console.error("Failed to sync cart with server:", error);
    }
  }
  // If no user is logged in, ensure guest cart is available
  else {
    // Make sure guest cart exists (even if empty)
    if (!localStorage.getItem("guestCart")) {
      localStorage.setItem("guestCart", JSON.stringify([]));
    }
  }

  // Fetch pricing configuration
  await fetchPricingConfig();

  // Load and display cart
  loadCart();

  // Update cart count
  updateCartCount();
});

// 2. PRICING CONFIGURATION
async function fetchPricingConfig() {
  try {
    // Replace with your deployed Web App URL
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbxFQGWg83k7nTxCRfqezwQUNl5fU85tGpEVd1m1ARqOiPxskPzmPiLD1oi7giX5v5syRw/exec";

    // // Show loading indicator
    // showNotification("Loading pricing information...", "info");

    const response = await fetch(`${scriptUrl}?action=getPricingConfig`);
    if (!response.ok) {
      throw new Error("Failed to fetch pricing configuration");
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Save pricing config to session storage
    sessionStorage.setItem("pricingConfig", JSON.stringify(data));
    console.log("Pricing configuration loaded:", data);

    // Set default shipping option if not already selected
    if (!sessionStorage.getItem("selectedShipping")) {
      sessionStorage.setItem("selectedShipping", "domestic");
    }

    return data;
  } catch (error) {
    console.error("Error fetching pricing config:", error);
    showNotification("Using default pricing. " + error.message, "warning");

    sessionStorage.setItem("pricingConfig", JSON.stringify(defaultPricing));
    return defaultPricing;
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

// 3. CART LOADING AND DISPLAY
function loadCart() {
  const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];

  if (isLoggedIn && userInfo.userId) {
    // Load cart for logged-in users
    cart = JSON.parse(localStorage.getItem(`shoppingCart`) || "[]");
  } else {
    // Load guest cart from localStorage
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
  }

  const cartContent = document.getElementById("cartContent");
  const cartCount = document.getElementById("cartCount");
  const cartSummary = document.getElementById("cartSummary");

  // Update cart count
  if (cartCount) {
    cartCount.textContent = `${cart.length} ${
      cart.length === 1 ? "item" : "items"
    }`;
  }

  // If cart is empty, show empty message
  if (cart.length === 0) {
    if (cartContent) {
      cartContent.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-cart"></i>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added any items to your cart yet. Browse our products and find something you'll love!</p>
          <a href="/index.html" class="btn">Start Shopping</a>
        </div>
      `;
    }
    if (cartSummary) {
      cartSummary.style.display = "none";
    }
    return;
  }

  // Add guest user notice if not logged in
  let guestNoticeHTML = "";
  if (!isLoggedIn) {
    guestNoticeHTML = `
      <div class="guest-cart-notice">
        <div class="notice-content">
          <i class="fas fa-info-circle"></i>
          <div class="notice-text">
            <strong>Shopping as Guest</strong>
            <p>Your cart will be saved locally. <a href="login.html" class="login-link">Sign in</a> to sync across devices and save order history.</p>
          </div>
        </div>
      </div>
    `;
  }

  // Build cart HTML
  let cartHTML = guestNoticeHTML;

  cart.forEach((item, index) => {
    // Main product image
    const itemImage = item.image || "https://via.placeholder.com/150";

    // Size display for garments or fabrics
    let sizeDisplay = "";
    if (item.options && item.options.size) {
      if (
        item.title.toLowerCase().includes("fabric") ||
        (item.options.size && typeof item.options.size === "number")
      ) {
        sizeDisplay = `<div class="cart-item-options"><i class="fas fa-ruler"></i> ${item.options.size} yard</div>`;
      } else {
        sizeDisplay = `<div class="cart-item-options"><i class="fas fa-tshirt"></i> Size: ${item.options.size}</div>`;
      }
    }

    // Calculate item price based on size if applicable
    let itemPrice = item.price;
    if (
      item.options &&
      item.options.size &&
      typeof item.options.size === "number"
    ) {
      itemPrice = (item.price * item.options.size).toFixed(2);
    }

    // Stock status
    const stockStatus =
      item.inStock !== undefined
        ? `<span class="status-badge ${
            item.inStock ? "in-stock" : "out-of-stock"
          }">
      ${item.inStock ? "In Stock" : "Out of Stock"}
    </span>`
        : "";

    // Create the cart item HTML
    cartHTML += `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item-main">
          <img src="${itemImage}" alt="${item.title}" class="cart-item-image">
          <div class="cart-item-details">
            <h3 class="cart-item-title">${item.title} ${stockStatus}</h3>
            <div class="cart-item-meta">
              ${sizeDisplay}
            </div>
            <div class="item-price-qty">
              <div class="cart-item-price">$${itemPrice}</div>
              <div class="cart-item-qty">
                <div class="qty-controls">
                  <button class="qty-btn" onclick="updateQuantity(${index}, -1)"><i class="fas fa-minus"></i></button>
                  <input type="text" class="qty-input" value="${
                    item.quantity || 1
                  }" 
                    onchange="updateQuantity(${index}, 0, this.value)" 
                    oninput="handleQuantityInput(${index}, this)" min="1">
                  <button class="qty-btn" onclick="updateQuantity(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="remove-btn" onclick="removeItem(${index})" title="Remove item">
          <i class="fas fa-trash-alt"></i>
        </button>
    `;

    // Process complementary items
    if (item.complementaryItems && item.complementaryItems.length > 0) {
      const isPattern =
        item.title.toLowerCase().includes("cotton") ||
        (item.complementaryItems[0].image &&
          item.complementaryItems[0].image.includes("jacket"));

      cartHTML += `
        <div class="cart-complementary">
          <div class="complementary-label">
            <i class="${isPattern ? "fas fa-cut" : "fas fa-scroll"}"></i>
            ${isPattern ? "Selected Patterns" : "Selected Fabrics"} (${
        item.complementaryItems.length
      })
          </div>
          <div class="complementary-items">
      `;

      item.complementaryItems.forEach((complementary, compIndex) => {
        let compPrice = complementary.price;
        let priceDisplay = "";

        // Handle custom fabrics differently
        if (complementary.isCustom) {
          // Fetch and use the default amount for custom fabrics
          fetchCustomFabricDefaultAmount().then((defaultAmount) => {
            const customPriceDisplay = `$${defaultAmount.toFixed(
              2
            )} (Custom Pricing)`;

            // Update the price display in the cart if it exists
            const priceElement = document.querySelector(
              `[data-item-id="${complementary.id}"] .complementary-price`
            );
            if (priceElement) {
              priceElement.innerHTML = customPriceDisplay;
            }
          });

          // Set initial display with default $1.00, will be updated when fetch completes
          priceDisplay = `$${1.0} (Custom Pricing)`;

          // Create custom fabric details HTML
          let customDetailsHTML = "";
          if (
            complementary.color ||
            complementary.material ||
            complementary.description ||
            complementary.sewingPatternNotes
          ) {
            customDetailsHTML = `
                    <div class="custom-fabric-details">
                      ${
                        complementary.color
                          ? `<div class="custom-detail"><strong>Color:</strong> ${complementary.color}</div>`
                          : ""
                      }
                      ${
                        complementary.material
                          ? `<div class="custom-detail"><strong>Material:</strong> ${complementary.material}</div>`
                          : ""
                      }
                      ${
                        complementary.size
                          ? `<div class="custom-detail"><strong>Size:</strong> ${complementary.size} yard(s)</div>`
                          : ""
                      }
                      ${
                        complementary.description
                          ? `<div class="custom-detail"><strong>Description:</strong> ${complementary.description}</div>`
                          : ""
                      }
                      ${
                        complementary.sewingPatternNotes
                          ? `<div class="custom-detail"><strong>Pattern Notes:</strong> ${complementary.sewingPatternNotes}</div>`
                          : ""
                      }
                    </div>
                  `;
          }

          cartHTML += `
                  <div class="complementary-item custom-fabric-item" data-item-id="${
                    complementary.id
                  }">
                    <div class="custom-fabric-badge">Custom Fabric</div>
                    <img src="${
                      complementary.image || "https://via.placeholder.com/60"
                    }" 
                         alt="${
                           complementary.title
                         }" class="complementary-image">
                    <h4 class="complementary-title">${complementary.title}</h4>
                    <div class="complementary-price">${priceDisplay}</div>
                    ${customDetailsHTML}
                  </div>
                `;
        } else {
          // Handle regular complementary items
          if (complementary.size && typeof complementary.size === "number") {
            compPrice = (complementary.price * complementary.size).toFixed(2);
            priceDisplay = `$${compPrice} <small>(${complementary.size} yard × $${complementary.price})</small>`;
          } else {
            priceDisplay = `$${compPrice}`;
          }

          const notesId = `notes-${index}-${compIndex}`;
          const textareaId = `textarea-${index}-${compIndex}`;

          let notesHTML = "";
          if (complementary.notes) {
            notesHTML = `
              <div class="complementary-notes" id="${notesId}-display">
                <div class="notes-text" title="${complementary.notes}">
                  <i class="fas fa-sticky-note"></i> ${complementary.notes}
                </div>
                <button class="edit-notes-btn" onclick="showNotesEditor(${index}, ${compIndex})">
                  <i class="fas fa-pencil-alt"></i> Edit
                </button>
              </div>
            `;
          } else {
            notesHTML = `
              <div class="complementary-notes" id="${notesId}-display">
                <span class="notes-text"></span>
                <button class="edit-notes-btn" onclick="showNotesEditor(${index}, ${compIndex})">
                  <i class="fas fa-plus"></i> Add Notes
                </button>
              </div>
            `;
          }

          notesHTML += `
            <div id="${notesId}-editor" style="display: none;">
              <textarea class="notes-textarea" id="${textareaId}" placeholder="Add special instructions or notes here...">${
            complementary.notes || ""
          }</textarea>
              <div class="notes-actions">
                <button class="btn btn-sm btn-outline" onclick="hideNotesEditor(${index}, ${compIndex})">Cancel</button>
                <button class="btn btn-sm" onclick="saveNotes(${index}, ${compIndex})">Save</button>
              </div>
            </div>
          `;

          cartHTML += `
              <div class="complementary-item">
                <img src="${
                  complementary.image || "https://via.placeholder.com/60"
                }" 
                     alt="${complementary.title}" class="complementary-image">
                <h4 class="complementary-title">${complementary.title}</h4>
                <div class="complementary-price">${priceDisplay}</div>
                ${notesHTML}
              </div>
            `;
        }
      });

      cartHTML += `
          </div>
        </div>
      `;
    }

    cartHTML += `</div>`;
  });

  if (cartContent) {
    cartContent.innerHTML = cartHTML;
  }
  if (cartSummary) {
    cartSummary.style.display = "block";
  }

  // Update shipping dropdown selection
  const shippingSelect = document.getElementById("shippingSelect");
  if (shippingSelect) {
    const selectedShipping =
      sessionStorage.getItem("selectedShipping") || "domestic";
    shippingSelect.value = selectedShipping;
  }

  // Calculate and update summary amounts
  updateCartSummary();
}

// 4. CART SUMMARY CALCULATIONS
function updateCartSummary() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];

  if (isLoggedIn) {
    cart = JSON.parse(localStorage.getItem(`shoppingCart`) || "[]");
  } else {
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
  }

  const subtotalElement = document.getElementById("subtotal");
  const taxElement = document.getElementById("tax");
  const shippingElement = document.getElementById("shipping");
  const totalElement = document.getElementById("total");
  const deliveryElement = document.getElementById("deliveryDate");

  // Check if summary elements exist
  if (!subtotalElement || !taxElement || !shippingElement || !totalElement) {
    console.warn("Cart summary elements not found");
    return;
  }

  // Calculate subtotal
  let subtotal = 0;
  cart.forEach((item) => {
    let itemPrice = item.price;
    if (
      item.options &&
      item.options.size &&
      typeof item.options.size === "number"
    ) {
      itemPrice = item.price * item.options.size;
    }
    subtotal += itemPrice * (item.quantity || 1);

    // Add complementary items if any
    if (item.complementaryItems && item.complementaryItems.length > 0) {
      item.complementaryItems.forEach((comp) => {
        let compPrice = comp.price;

        // Handle custom fabrics with fetched default amount
        if (comp.isCustom) {
          // Use cached amount if available, otherwise use $1.00 as fallback
          const cachedAmount = sessionStorage.getItem(
            "customFabricDefaultAmount"
          );
          compPrice = cachedAmount ? parseFloat(cachedAmount) : 1.0;
        } else if (comp.size && typeof comp.size === "number") {
          compPrice = comp.price * comp.size;
        }

        subtotal += compPrice;
      });
    }
  });

  // Get pricing configuration from session storage
  const pricingConfig = JSON.parse(sessionStorage.getItem("pricingConfig")) || {
    vatPercentage: 10,
    shippingCosts: { domestic: 9.99 },
    freeShippingThreshold: 100,
    deliveryTimes: { domestic: 5 },
  };

  // Get selected shipping type and calculate cost
  const shippingType = sessionStorage.getItem("selectedShipping") || "domestic";
  let shipping =
    subtotal >= pricingConfig.freeShippingThreshold
      ? 0
      : pricingConfig.shippingCosts[shippingType] || 9.99;

  // First calculate the pre-tax total (subtotal + shipping)
  const preTaxTotal = subtotal + shipping;

  // Calculate tax based on Tax percentage from config on the pre-tax total
  const taxRate = pricingConfig.vatPercentage / 100 || 0.1;
  const tax = preTaxTotal * taxRate;

  // Calculate final total
  const total = preTaxTotal + tax;

  // Update summary display with smooth transitions
  subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
  taxElement.textContent = `$${tax.toFixed(2)}`;

  // Set shipping text with or without icon
  if (shipping === 0) {
    shippingElement.innerHTML =
      '<span class="free-shipping"><i class="fas fa-gift"></i> FREE</span>';
  } else {
    shippingElement.textContent = `$${shipping.toFixed(2)}`;
  }

  // Update delivery date if element exists
  if (deliveryElement) {
    // Calculate delivery date based on selected shipping
    const deliveryDays = pricingConfig.deliveryTimes[shippingType] || 5;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    // Format the delivery date
    const options = { weekday: "long", month: "long", day: "numeric" };
    const formattedDeliveryDate = deliveryDate.toLocaleDateString(
      "en-US",
      options
    );

    deliveryElement.textContent = formattedDeliveryDate;
  }

  totalElement.textContent = `$${total.toFixed(2)}`;

  // Add visual feedback with subtle animation
  [subtotalElement, taxElement, shippingElement, totalElement].forEach(
    (element) => {
      if (element) {
        element.style.transition = "all 0.3s ease";
        element.style.transform = "scale(1.05)";
        setTimeout(() => {
          element.style.transform = "scale(1)";
        }, 200);
      }
    }
  );
}

// 5. QUANTITY MANAGEMENT
function updateQuantity(index, change, newValue = null) {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];
  let cartKey = "";

  if (isLoggedIn) {
    // Verify user is logged in for server cart
    const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
    if (!userInfo.userId) {
      showNotification("Please log in to update your cart", "warning");
      return;
    }
    cart = JSON.parse(localStorage.getItem(`shoppingCart`) || "[]");
    cartKey = `shoppingCart`;
  } else {
    // Guest cart
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    cartKey = "guestCart";
  }

  if (cart[index]) {
    let updatedQuantity;

    if (newValue !== null) {
      // Direct value input
      const value = parseInt(newValue);
      if (!isNaN(value) && value > 0) {
        cart[index].quantity = value;
        updatedQuantity = value;
      } else {
        // If invalid value, restore previous quantity
        const qtyInput = document.querySelector(`input[onchange*="${index}"]`);
        if (qtyInput) {
          qtyInput.value = cart[index].quantity || 1;
        }
        return;
      }
    } else {
      // Increment or decrement
      const newQty = (cart[index].quantity || 1) + change;
      if (newQty > 0) {
        cart[index].quantity = newQty;
        updatedQuantity = newQty;
      } else {
        return; // Don't allow quantity below 1
      }
    }

    // Save to localStorage immediately
    localStorage.setItem(cartKey, JSON.stringify(cart));

    // Update the quantity input field immediately (for visual feedback)
    const qtyInput = document.querySelector(`input[onchange*="${index}"]`);
    if (qtyInput && qtyInput.value != updatedQuantity) {
      qtyInput.value = updatedQuantity;
    }

    // Update the order summary immediately
    updateCartSummary();

    // Update cart count in header
    updateCartCount();

    // For logged-in users, sync with server in background
    if (isLoggedIn && cart[index].cartItemId) {
      const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
      pushCartItemToServer(userInfo.userId, cart[index]).catch((error) => {
        console.error("Failed to update server cart:", error);
        showNotification("Failed to sync with server", "warning");
      });
    }

    // Show success notification
    showNotification("Quantity updated", "success");
  }
}

function handleQuantityInput(index, inputElement) {
  // Clear any existing timeout
  if (inputElement.quantityTimeout) {
    clearTimeout(inputElement.quantityTimeout);
  }

  // Set a new timeout to update after user stops typing
  inputElement.quantityTimeout = setTimeout(() => {
    const newValue = inputElement.value;
    updateQuantity(index, 0, newValue);
  }, 500); // Wait 500ms after user stops typing
}

// 6. ITEM REMOVAL
function removeItem(index) {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];
  let cartKey = "";

  if (isLoggedIn) {
    const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
    cart = JSON.parse(localStorage.getItem(`shoppingCart`) || "[]");
    cartKey = `shoppingCart`;
  } else {
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    cartKey = "guestCart";
  }

  if (confirm("Are you sure you want to remove this item from your cart?")) {
    // If item has server ID and user is logged in, remove from server
    if (isLoggedIn && cart[index] && cart[index].cartItemId) {
      const userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbzYiyFNWIHk5mwHT5b5Mc0JlHDW_jbgGTqzGJR9EqpgSXaeoIrj--PS_0H7elnj06Bl/exec";

      // Remove from server in background
      fetch(
        `${scriptUrl}?action=removeFromCart&userId=${userInfo.userId}&cartItemId=${cart[index].cartItemId}`
      ).catch((error) => {
        console.error("Failed to remove item from server cart:", error);
      });
    }

    // Remove from local cart
    cart.splice(index, 1);
    localStorage.setItem(cartKey, JSON.stringify(cart));
    loadCart();
    updateCartCount();
    showNotification("Item removed from cart", "success");
  }
}

// 7. CART COUNT MANAGEMENT
function updateCartCount() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let totalQuantity = 0;

  if (isLoggedIn) {
    // For logged-in users, load from server or localStorage
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

// 8. CHECKOUT PROCESS
// Custom popup function for guest checkout notice
function showGuestCheckoutPopup(onContinue, onSignIn) {
  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.className = "popup-content";
  popup.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    font-family: Arial, sans-serif;
  `;

  popup.innerHTML = `
    <div style="color: #ff6b35; font-size: 24px; margin-bottom: 15px;">⚠️</div>
    <h3 style="color: #333; margin-bottom: 20px; font-size: 20px;">Guest Checkout Notice</h3>
    <div style="text-align: left; margin-bottom: 25px; color: #666; line-height: 1.6;">
      <p style="margin-bottom: 15px;">You are checking out as a guest. Please note:</p>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Your order history will NOT be saved to an account</li>
        <li>You cannot track your order status online</li>
        <li>No order confirmation will be saved to your profile</li>
        <li>You'll only receive email confirmation (if provided)</li>
      </ul>
    </div>
    <div style="display: flex; gap: 15px; justify-content: center;">
      <button id="continueGuest" style="
        background: #28a745;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Continue as Guest</button>
      <button id="signInInstead" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Sign In Instead</button>
    </div>
  `;

  // Add event listeners
  const continueBtn = popup.querySelector("#continueGuest");
  const signInBtn = popup.querySelector("#signInInstead");

  continueBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    onContinue();
  });

  signInBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    onSignIn();
  });

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // Add to page
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// 8. CHECKOUT MANAGEMENT
function checkout() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];
  let userInfo = {};

  if (isLoggedIn) {
    // Get user info and cart data for logged-in users
    userInfo = JSON.parse(localStorage.getItem(`userInfo`) || "{}");
    cart = JSON.parse(localStorage.getItem(`shoppingCart`) || "[]");
  } else {
    // Get guest cart
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    userInfo = { userId: null, name: "Guest", email: "" };
  }

  // Check if cart is empty
  if (cart.length === 0) {
    showNotification(
      "Your cart is empty. Add some items before checkout.",
      "warning"
    );
    return;
  }

  // Show custom popup for guest checkout
  if (!isLoggedIn) {
    showGuestCheckoutPopup(
      // Continue as guest callback
      () => {
        proceedWithCheckout(cart, userInfo, isLoggedIn);
      },
      // Sign in instead callback
      () => {
        sessionStorage.setItem("redirectAfterLogin", "cart.html");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 500);
      }
    );
    return;
  }

  // If logged in, proceed directly
  proceedWithCheckout(cart, userInfo, isLoggedIn);
}

function proceedWithCheckout(cart, userInfo, isLoggedIn) {
  // Show notification for guest checkout
  if (!isLoggedIn) {
    showNotification(
      "Proceeding with guest checkout. Order history will not be saved.",
      "warning"
    );
  }

  // Get pricing configuration and selected shipping
  const pricingConfig = JSON.parse(sessionStorage.getItem("pricingConfig")) || {
    vatPercentage: 10,
    shippingCosts: { domestic: 9.99 },
    freeShippingThreshold: 100,
  };

  // Calculate cart totals
  let subtotal = 0;
  cart.forEach((item) => {
    let itemPrice = item.price;
    if (
      item.options &&
      item.options.size &&
      typeof item.options.size === "number"
    ) {
      itemPrice = item.price * item.options.size;
    }
    subtotal += itemPrice * (item.quantity || 1);

    // Add complementary items if any
    if (item.complementaryItems && item.complementaryItems.length > 0) {
      item.complementaryItems.forEach((comp) => {
        let compPrice = comp.price;

        // Handle custom fabrics with fetched default amount
        if (comp.isCustom) {
          // Use cached amount if available, otherwise use $1.00 as fallback
          const cachedAmount = sessionStorage.getItem(
            "customFabricDefaultAmount"
          );
          compPrice = cachedAmount ? parseFloat(cachedAmount) : 1.0;
        } else if (comp.size && typeof comp.size === "number") {
          compPrice = comp.price * comp.size;
        }

        subtotal += compPrice;
      });
    }
  });

  // Get selected shipping type and calculate cost
  const shippingType = sessionStorage.getItem("selectedShipping") || "domestic";
  let shipping =
    subtotal >= pricingConfig.freeShippingThreshold
      ? 0
      : pricingConfig.shippingCosts[shippingType] || 9.99;

  // Calculate tax
  const taxRate = pricingConfig.vatPercentage / 100 || 0.1;
  const tax = (subtotal + shipping) * taxRate;

  // Calculate total
  const total = subtotal + shipping + tax;

  // Save checkout information to session storage
  const checkoutData = {
    cart: cart,
    userId: userInfo.userId,
    userName: userInfo.name,
    email: userInfo.email,
    isGuestCheckout: !isLoggedIn,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    shippingType: shippingType,
    total: total.toFixed(2),
    timestamp: new Date().toISOString(),
  };

  sessionStorage.setItem("checkoutCart", JSON.stringify(checkoutData));

  // Show processing notification
  showNotification("Processing your order...", "info");

  // Redirect to checkout page after short delay
  setTimeout(() => {
    window.location.href = "checkout.html";
  }, 1000);
}
// 9. NOTES MANAGEMENT
function showNotesEditor(itemIndex, compIndex) {
  const displayElement = document.getElementById(
    `notes-${itemIndex}-${compIndex}-display`
  );
  const editorElement = document.getElementById(
    `notes-${itemIndex}-${compIndex}-editor`
  );

  if (displayElement && editorElement) {
    displayElement.style.display = "none";
    editorElement.style.display = "block";
    // Focus on the textarea
    document.getElementById(`textarea-${itemIndex}-${compIndex}`).focus();
  }
}

function hideNotesEditor(itemIndex, compIndex) {
  const displayElement = document.getElementById(
    `notes-${itemIndex}-${compIndex}-display`
  );
  const editorElement = document.getElementById(
    `notes-${itemIndex}-${compIndex}-editor`
  );

  if (displayElement && editorElement) {
    displayElement.style.display = "block";
    editorElement.style.display = "none";
  }
}

function saveNotes(itemIndex, compIndex) {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  let cart = [];
  let cartKey = "";

  if (isLoggedIn) {
    cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
    cartKey = "shoppingCart";
  } else {
    cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    cartKey = "guestCart";
  }

  const textareaElement = document.getElementById(
    `textarea-${itemIndex}-${compIndex}`
  );

  if (
    cart[itemIndex] &&
    cart[itemIndex].complementaryItems &&
    cart[itemIndex].complementaryItems[compIndex] &&
    textareaElement
  ) {
    // Update the notes in the cart
    cart[itemIndex].complementaryItems[compIndex].notes = textareaElement.value;

    // Save to localStorage
    localStorage.setItem(cartKey, JSON.stringify(cart));

    // Reload the cart to show updated notes
    loadCart();

    // Show a small notification
    showNotification("Notes saved successfully!", "success");
  }
}

// 10. SHIPPING SELECTION
function selectShippingOption(shippingType) {
  sessionStorage.setItem("selectedShipping", shippingType);
  // Update cart summary with new shipping cost
  updateCartSummary();
}

// 11. USER AUTHENTICATION (continued from where it was cut off)
function checkLoginStatus() {
  // Check both session storage and localStorage for auth status
  const userIdSession = sessionStorage.getItem("userId");
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isLoggedInSession = sessionStorage.getItem("isLoggedIn") === "true";

  // If we have user info in localStorage but not in session storage, restore it
  if (userInfo.userId && !userIdSession && userInfo.isLoggedIn) {
    sessionStorage.setItem("userId", userInfo.userId);
    sessionStorage.setItem("isLoggedIn", "true");
    console.log("Restored login status from localStorage");
  }

  // If session indicates logged in but no user info, clear the session
  if (isLoggedInSession && !userInfo.userId) {
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("isLoggedIn");
    console.log("Cleared invalid session data");
  }
}

// 12. CART SYNCHRONIZATION WITH SERVER
async function syncCartWithServer(userId) {
  if (!userId) {
    console.warn("No user ID provided for cart sync");
    return;
  }

  try {
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbzYiyFNWIHk5mwHT5b5Mc0JlHDW_jbgGTqzGJR9EqpgSXaeoIrj--PS_0H7elnj06Bl/exec";

    // Fetch server cart
    const response = await fetch(
      `${scriptUrl}?action=getCart&userId=${userId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch server cart");
    }

    const serverData = await response.json();
    if (serverData.error) {
      throw new Error(serverData.error);
    }

    // Get local cart
    const localCart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");

    // Merge carts (server takes precedence)
    const serverCart = serverData.cart || [];

    // If server cart is empty but local cart has items, push local to server
    if (serverCart.length === 0 && localCart.length > 0) {
      console.log("Syncing local cart to server");
      for (const item of localCart) {
        await pushCartItemToServer(userId, item);
      }
    } else {
      // Use server cart as source of truth
      localStorage.setItem("shoppingCart", JSON.stringify(serverCart));
      console.log("Synced cart from server");
    }
  } catch (error) {
    console.error("Cart sync failed:", error);
    // Continue with local cart if sync fails
  }
}

async function pushCartItemToServer(userId, cartItem) {
  try {
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbzYiyFNWIHk5mwHT5b5Mc0JlHDW_jbgGTqzGJR9EqpgSXaeoIrj--PS_0H7elnj06Bl/exec";

    const formData = new FormData();
    formData.append("action", "updateCartItem");
    formData.append("userId", userId);
    formData.append("cartItemData", JSON.stringify(cartItem));

    const response = await fetch(scriptUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to update server cart");
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to push cart item to server:", error);
    throw error;
  }
}

// 13. GUEST CART MIGRATION
async function migrateGuestCartToUser(userId) {
  const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");

  if (guestCart.length === 0) {
    return; // No guest cart to migrate
  }

  try {
    // Push each guest cart item to server
    for (const item of guestCart) {
      await pushCartItemToServer(userId, item);
    }

    // Move guest cart to user cart in localStorage
    localStorage.setItem("shoppingCart", JSON.stringify(guestCart));

    // Clear guest cart
    localStorage.removeItem("guestCart");

    // Reload cart display
    loadCart();

    showNotification(
      `${guestCart.length} items moved from guest cart`,
      "success"
    );
  } catch (error) {
    console.error("Failed to migrate guest cart:", error);
    showNotification("Failed to migrate guest cart", "warning");
  }
}

// 14. UTILITY FUNCTIONS
function showNotification(message, type = "info") {
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 15. EVENT LISTENERS
document.addEventListener("DOMContentLoaded", function () {
  // Shipping selection dropdown
  const shippingSelect = document.getElementById("shippingSelect");
  if (shippingSelect) {
    shippingSelect.addEventListener("change", function () {
      selectShippingOption(this.value);
    });
  }

  // Checkout button
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkout);
  }

  // Clear cart button (if exists)
  const clearCartBtn = document.getElementById("clearCartBtn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", function () {
      if (confirm("Are you sure you want to clear your entire cart?")) {
        clearCart();
      }
    });
  }
});

// 16. ADDITIONAL CART OPERATIONS
function clearCart() {
  const userId = sessionStorage.getItem("userId");
  const isLoggedIn = userId && sessionStorage.getItem("isLoggedIn") === "true";

  if (isLoggedIn) {
    localStorage.removeItem("shoppingCart");
    // Also clear from server
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    if (userInfo.userId) {
      clearServerCart(userInfo.userId);
    }
  } else {
    localStorage.removeItem("guestCart");
  }

  loadCart();
  updateCartCount();
  showNotification("Cart cleared", "success");
}

async function clearServerCart(userId) {
  try {
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbzYiyFNWIHk5mwHT5b5Mc0JlHDW_jbgGTqzGJR9EqpgSXaeoIrj--PS_0H7elnj06Bl/exec";
    await fetch(`${scriptUrl}?action=clearCart&userId=${userId}`);
  } catch (error) {
    console.error("Failed to clear server cart:", error);
  }
}

// 17. CART PERSISTENCE CHECK
function ensureCartPersistence() {
  // Check if localStorage is available
  if (typeof Storage === "undefined") {
    showNotification(
      "Local storage not supported. Cart may not persist.",
      "warning"
    );
    return false;
  }

  // Test localStorage functionality
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch (error) {
    showNotification(
      "Unable to save cart data. Please check browser settings.",
      "warning"
    );
    return false;
  }
}

// Initialize cart persistence check
ensureCartPersistence();

// Export functions for global access
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.checkout = checkout;
window.showNotesEditor = showNotesEditor;
window.hideNotesEditor = hideNotesEditor;
window.saveNotes = saveNotes;
window.selectShippingOption = selectShippingOption;
window.handleQuantityInput = handleQuantityInput;
window.migrateGuestCartToUser = migrateGuestCartToUser;
