// --- CONFIGURATION ---
const API_URL =
  "https://script.google.com/macros/s/AKfycbxGcDUEGutIXawSapOrWVGC9BcXgJTFSDnYml7HaGFcefQ3DolGTnzRWkyuSaO-hQ/exec";

// --- UTILITY FUNCTIONS ---
function formatDate(dateString) {
  if (!dateString) return "Not available";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(price) {
  return `$${parseFloat(price || 0).toFixed(2)}`;
}

function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function showError(message) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("error-container").style.display = "block";
  document.getElementById("error-message").textContent = message;
}

function showLookupForm() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("lookup-container").style.display = "block";
}

// --- MAIN ORDER LOADING FUNCTION ---
async function loadOrderDetails(retryCount = 0) {
  const orderId = getUrlParameter("orderId");
  const maxRetries = 2;

  if (!orderId) {
    showLookupForm();
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}?action=getOrderDetails&orderId=${orderId}`
    );

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.success) {
      throw new Error(data?.message || "Failed to retrieve order data");
    }

    renderOrderDetails(data.order);
  } catch (error) {
    console.error("Error loading order details:", error);
    if (retryCount < maxRetries) {
      setTimeout(() => loadOrderDetails(retryCount + 1), 1000);
    } else {
      showError(
        `Unable to load order details. Please try again later or contact customer support. (Error: ${error.message})`
      );
    }
  }
}

// --- DATA NORMALIZATION ---
// Add this field to the return object in your normalizeOrderData function:
function normalizeOrderData(order) {
  // If the backend returned a nested order object, flatten it
  if (order.order && typeof order.order === "object") {
    const customer = order.customer;
    order = {
      ...order.order,
      customer,
      id: order.id,
      date: order.date,
      status: order.status,
      lastUpdated: order.lastUpdated || order["Last Updated"],
      courier: order.courier || order["Courier"] || "",
      trackingId: order.trackingId || order["Tracking ID"] || "",
      comments: order["Comments"] || order.comments || "",
      // Always extract Payment Method from the sheet row if present
      paymentMethod:
        order["Payment Method"] || order.paymentMethod || "Credit Card",
      // Add Extra Amount field
      extraAmount: order["Extra Amount"] || order.extraAmount || 0,
    };
  }
  // Normalize all possible fields
  return {
    id: order.id || order["Order ID"],
    date: order.date || order.Date,
    status: order.status || order["Order Status"] || "Pending",
    lastUpdated: order.lastUpdated || order["Last Updated"],
    courier: order.courier || order["Courier"] || "",
    trackingId: order.trackingId || order["Tracking ID"] || "",
    customer: extractCustomerInfo(order),
    address:
      (order.customer && order.customer.address) ||
      order.address ||
      order["Address"] ||
      "",
    city:
      (order.customer && order.customer.city) ||
      order.city ||
      order["City"] ||
      "",
    state:
      (order.customer && order.customer.state) ||
      order.state ||
      order["State"] ||
      "",
    zip:
      (order.customer && order.customer.zip) || order.zip || order["ZIP"] || "",
    country:
      (order.customer && order.customer.country) ||
      order.country ||
      order["Country"] ||
      "",
    items: extractItems(order),
    complementaryItems: extractComplementaryItems(order),
    subtotal: parseFloat(order.subtotal || order["Subtotal"] || 0),
    tax: parseFloat(order.tax || order["Tax"] || 0),
    shipping: parseFloat(order.shipping || order["Shipping"] || 0),
    discount: parseFloat(order.discount || order["Discount"] || 0),
    codCharges: parseFloat(order.codCharges || order["COD Charges"] || 0),
    extraAmount: parseFloat(order.extraAmount || order["Extra Amount"] || 0), // Add this line
    total: parseFloat(order.total || order["Total"] || 0),
    paymentMethod:
      order["Payment Method"] || order.paymentMethod || "Credit Card",
    paymentLastFour: order.paymentLastFour || "0000",
    processingTimestamp:
      order["Processing Timestamp"] || order.processingTimestamp,
    shippedTimestamp: order["Shipped Timestamp"] || order.shippedTimestamp,
    deliveredTimestamp:
      order["Delivered Timestamp"] || order.deliveredTimestamp,
    comments: order["Comments"] || order.comments || "",
  };
}

function extractCustomerInfo(order) {
  if (order.customer) return order.customer;
  let firstName = "",
    lastName = "";
  if (order["Customer Name"]) {
    const nameParts = order["Customer Name"].split(" ");
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }
  return {
    firstName,
    lastName,
    email: order["Email"] || "",
    phone: order["Phone"] || "",
    address: order["Address"] || "",
    city: order["City"] || "",
    state: order["State"] || "",
    zip: order["ZIP"] || "",
    country: order["Country"] || "",
    notes: order["Notes"] || order.notes || "",
  };
}

function extractItems(order) {
  let items = [];
  if (order.items && Array.isArray(order.items)) {
    items = order.items;
  } else if (
    order.order &&
    order.order.items &&
    Array.isArray(order.order.items)
  ) {
    items = order.order.items;
  } else if (order["Items JSON"]) {
    try {
      const parsedItems = JSON.parse(order["Items JSON"]);
      if (Array.isArray(parsedItems)) items = parsedItems;
    } catch (e) {
      console.error("Error parsing Items JSON:", e);
    }
  }
  return items.map((item) => {
    const imageUrl =
      item.imageUrl ||
      item.image ||
      item.img ||
      item.imagePath ||
      item["Image URL"] ||
      item["Image"] ||
      item["Product Image"];
    let processedImageUrl = imageUrl;
    if (imageUrl && !imageUrl.includes("://") && !imageUrl.startsWith("/")) {
      processedImageUrl = `/images/${imageUrl}`;
    }
    return {
      ...item,
      name: item.name || item["Item Name"] || "Unnamed Item",
      price: item.price || item["Price"] || 0,
      quantity: parseInt(item.quantity || item["Quantity"] || item.qty || 1),
      imageUrl: processedImageUrl || "https://placehold.co/80x80",
      sku: item.sku || item["Product ID"] || "",
      options: item.options || item["Options"] || {},
      subtotal: item.subtotal || item.price * (item.quantity || 1),
    };
  });
}

function extractComplementaryItems(order) {
  if (order.complementaryItems && Array.isArray(order.complementaryItems)) {
    return order.complementaryItems;
  }
  if (
    order.order &&
    order.order.complementaryItems &&
    Array.isArray(order.order.complementaryItems)
  ) {
    return order.order.complementaryItems;
  }
  return [];
}

// --- HELPER FUNCTIONS TO CHECK ITEM TYPES ---
function isCustomFabric(item) {
  const itemName = (item.name || "").toLowerCase();
  const itemNotes = (item.notes || "").toLowerCase();
  return (
    itemName.includes("custom fabric") || itemNotes.includes("custom fabric")
  );
}

function isPattern(item) {
  const itemName = (item.name || "").toLowerCase();
  const itemNotes = (item.notes || "").toLowerCase();
  return itemName.includes("pattern") || itemNotes.includes("pattern");
}

// --- RENDERING FUNCTIONS ---
function renderOrderDetails(order) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("order-content").style.display = "block";
  const processedOrder = normalizeOrderData(order);
  document.getElementById(
    "order-id"
  ).textContent = `Order #${processedOrder.id}`;
  document.getElementById("order-date").textContent = `Placed on: ${formatDate(
    processedOrder.date
  )}`;
  updateOrderStatus(processedOrder);
  renderOrderItems(processedOrder);
  updateShippingInfo(processedOrder);
  updatePaymentSummary(processedOrder);
  // Set up event listeners for action buttons
  document
    .getElementById("print-receipt")
    .addEventListener("click", () => window.print());
  document.getElementById(
    "contact-support"
  ).href = `mailto:support@s2ksewing.com?subject=Question about Order ${processedOrder.id}`;
  document.getElementById("continue-shopping").href = "/";
}

function renderOrderItems(order) {
  const container = document.getElementById("order-items-container");
  container.innerHTML = "";
  const items = order.items || [];
  if (items.length === 0) {
    container.innerHTML = "<p>No items found in this order.</p>";
    return;
  }
  items.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "product-item";
    const imageUrl =
      item.imageUrl || item.image || "https://via.placeholder.com/80";
    const price = parseFloat(item.price || 0);
    const quantity = parseInt(item.quantity || 1, 10);
    const subtotal = parseFloat(item.subtotal || price * quantity);
    let optionsText = "";
    if (item.options) {
      if (typeof item.options === "string") {
        optionsText = item.options;
      } else if (typeof item.options === "object") {
        const optionPairs = [];
        for (const [key, value] of Object.entries(item.options)) {
          optionPairs.push(`${key}: ${value}`);
        }
        optionsText = optionPairs.join(", ");
      }
    }
    itemElement.innerHTML = `
      <img src="${imageUrl}" alt="${item.name}" class="product-image">
      <div class="product-info">
          <div class="product-name">${item.name || "Unknown Item"}</div>
          <div class="product-meta">
              ${item.sku ? `SKU: ${item.sku}` : ""}
              ${optionsText ? ` | Options: ${optionsText}` : ""}
          </div>
          <div class="product-meta">Qty: ${quantity}</div>
      </div>
      <div class="product-price">${formatPrice(subtotal)}</div>
    `;
    container.appendChild(itemElement);
  });
  // Add complementary items
  const complementaryItems = order.complementaryItems || [];
  if (complementaryItems.length > 0) {
    const separator = document.createElement("div");
    separator.className = "complementary-items-separator";
    separator.innerHTML = "<h4>Additional Items</h4>";
    container.appendChild(separator);
    complementaryItems.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "product-item complementary-item";
      const imageUrl =
        item.imageUrl || item.image || "https://via.placeholder.com/80";
      const productId = item.id || item.productId || "N/A";

      // Check item type
      const isCustom = isCustomFabric(item);
      const isPatternItem = isPattern(item);

      let priceDisplay = "";
      if (isCustom) {
        priceDisplay = "$1.00 Custom";
      } else if (isPatternItem) {
        const price = parseFloat(item.price || 0);
        priceDisplay = formatPrice(price);
      } else {
        const price = parseFloat(item.price || 0);
        // Check if size exists and is not null/undefined/empty
        if (
          item.size &&
          item.size !== null &&
          item.size !== undefined &&
          item.size !== ""
        ) {
          priceDisplay = `${formatPrice(price)} * ${item.size}Yard(s)`;
        } else {
          priceDisplay = formatPrice(price);
        }
      }

      itemElement.innerHTML = `
        <img src="${imageUrl}" alt="${item.name}" class="product-image">
        <div class="product-info">
            <div class="product-name">${item.name || "Complementary Item"}</div>
            <div class="product-meta">
                ${item.notes ? `Notes: ${item.notes}` : ""}
                ${
                  item.size && !isCustom && !isPatternItem
                    ? ` | Size: ${item.size}`
                    : ""
                }
                ${item.parentItem ? ` | With: ${item.parentItem}` : ""}
            </div>
            <div class="product-meta">
                Qty: 1
                
            </div>
        </div>
        <div class="product-price">${priceDisplay}</div>
      `;
      container.appendChild(itemElement);
    });
  }
}

function updateOrderStatus(order) {
  const status = order.status;
  const orderDate = new Date(order.date);
  const lastUpdated = order.lastUpdated || order["Last Updated"];
  // Format dates
  const placedDate = formatDate(orderDate);
  document.getElementById("placed-date").textContent = placedDate;
  // Reset all steps to pending first
  document.getElementById("step-placed").classList.remove("step-pending");
  document.getElementById("step-processing").classList.remove("step-pending");
  document.getElementById("step-shipped").classList.remove("step-pending");
  document.getElementById("step-delivered").classList.remove("step-pending");
  // Set processing date based on actual status and last updated date
  let processingDate = "Pending";
  if (["Processing", "Shipped", "Delivered"].includes(status)) {
    if (order.processingTimestamp) {
      processingDate = formatDate(order.processingTimestamp);
    } else if (lastUpdated) {
      processingDate = formatDate(lastUpdated);
    } else {
      const processDate = new Date(orderDate);
      processDate.setHours(processDate.getHours() + 2);
      processingDate = formatDate(processDate);
    }
  } else {
    document.getElementById("step-processing").classList.add("step-pending");
  }
  document.getElementById("processing-date").textContent = processingDate;
  // Set shipped date based on actual status and last updated date
  let shippedDate = "Pending";
  if (["Shipped", "Delivered"].includes(status)) {
    if (order.shippedTimestamp) {
      shippedDate = formatDate(order.shippedTimestamp);
    } else if (lastUpdated) {
      shippedDate = formatDate(lastUpdated);
    } else {
      const shipDate = new Date(orderDate);
      shipDate.setDate(shipDate.getDate() + 1);
      shippedDate = formatDate(shipDate);
    }
  } else {
    document.getElementById("step-shipped").classList.add("step-pending");
  }
  document.getElementById("shipped-date").textContent = shippedDate;
  // Set delivered date
  let deliveredDate = "Pending";
  if (status === "Delivered") {
    if (order.deliveredTimestamp) {
      deliveredDate = formatDate(order.deliveredTimestamp);
    } else if (lastUpdated) {
      deliveredDate = formatDate(lastUpdated);
    } else {
      const delivDate = new Date(orderDate);
      delivDate.setDate(delivDate.getDate() + 2);
      deliveredDate = formatDate(delivDate);
    }
    // Change the success message to indicate delivery
    const successMsgP = document.querySelector(".success-message p");
    if (successMsgP) {
      successMsgP.textContent = "Your order has been delivered.";
    }
  } else {
    document.getElementById("step-delivered").classList.add("step-pending");
  }
  document.getElementById("delivered-date").textContent = deliveredDate;
  updateProgressLine(status);
  if (order.status === "Processing") {
    const shippingMeta = document.querySelector(".shipping-meta");
    if (shippingMeta) shippingMeta.style.display = "none";
  }
}

function updateProgressLine(status) {
  const statusLine = document.querySelector(".status-line");
  if (!statusLine) return;
  let progressWidth = "0%";
  switch (status) {
    case "Pending":
    case "Order Placed":
      progressWidth = "0%";
      break;
    case "Processing":
      progressWidth = "33%";
      break;
    case "Shipped":
      progressWidth = "66%";
      break;
    case "Delivered":
      progressWidth = "100%";
      break;
    default:
      progressWidth = "0%";
  }
  let progressFill = statusLine.querySelector(".status-line-fill");
  if (!progressFill) {
    progressFill = document.createElement("div");
    progressFill.className = "status-line-fill";
    statusLine.appendChild(progressFill);
  }
  progressFill.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${progressWidth};
    background-color: var(--primary-color);
    transition: width 0.5s ease-in-out;
    z-index: 1;
  `;
}

function updateShippingInfo(order) {
  let customerName = "";
  if (order.customer) {
    customerName = `${order.customer.firstName || ""} ${
      order.customer.lastName || ""
    }`.trim();
  }
  document.getElementById("customer-name").textContent =
    customerName || "Customer";
  document.getElementById("address-line1").textContent = order.address;
  document.getElementById(
    "address-line2"
  ).textContent = `${order.city}, ${order.state} ${order.zip}`;
  document.getElementById("address-country").textContent = order.country;

  // Remove Estimated Delivery and show Comment instead
  const shippingMeta = document.querySelector(".shipping-meta");
  if (shippingMeta) {
    shippingMeta.innerHTML = `
      <div class="shipping-meta-item">
        
        <div>
          <strong>Delivery Notes:</strong> <span id="order-comment">${
            order.comments ? order.comments : "No comment provided."
          }</span>
        </div>
      </div>
      <div class="shipping-meta-item">
        
        <div>
          <strong>Courier:</strong> <span id="carrier">${
            order.courier || "Not available"
          }</span></div>
      </div>
      <div class="shipping-meta-item">
        
        <div>
          <strong>Tracking ID:</strong> <span id="tracking-number">${
            order.trackingId
              ? `<a href=\"https://track.aftership.com/${order.courier}/${order.trackingId}\" target=\"_blank\" style=\"color: var(--primary-color);\">${order.trackingId}</a>`
              : "Not available"
          }</span>
        </div>
      </div>
    `;
  }
}

function updatePaymentSummary(order) {
  const paymentSummaryContainer = document.getElementById(
    "payment-summary-container"
  );
  paymentSummaryContainer.innerHTML = "";
  const subtotal = order.subtotal || 0;
  const discount = order.discount || 0;
  const tax = order.tax || 0;
  const shipping = order.shipping || 0;
  const codCharges = order.codCharges || 0;
  const extraAmount = order.extraAmount || order["Extra Amount"] || 0; // Get extra amount from sheet
  const total = order.total || 0;

  // Subtotal
  const subtotalRow = document.createElement("div");
  subtotalRow.className = "summary-row";
  subtotalRow.innerHTML = `
    <div>Subtotal</div>
    <div>${formatPrice(subtotal)}</div>
  `;
  paymentSummaryContainer.appendChild(subtotalRow);

  // Discount
  if (discount > 0) {
    const discountRow = document.createElement("div");
    discountRow.className = "summary-row";
    discountRow.innerHTML = `
      <div>Discount</div>
      <div class="discount">-${formatPrice(discount)}</div>
    `;
    paymentSummaryContainer.appendChild(discountRow);
  }

  // Tax
  if (tax > 0) {
    const taxRow = document.createElement("div");
    taxRow.className = "summary-row";
    taxRow.innerHTML = `
      <div>Tax</div>
      <div>${formatPrice(tax)}</div>
    `;
    paymentSummaryContainer.appendChild(taxRow);
  }

  // Shipping
  if (shipping > 0) {
    const shippingRow = document.createElement("div");
    shippingRow.className = "summary-row";
    shippingRow.innerHTML = `
      <div>Shipping</div>
      <div>${formatPrice(shipping)}</div>
    `;
    paymentSummaryContainer.appendChild(shippingRow);
  }

  // COD Charges
  if (codCharges > 0) {
    const codChargesRow = document.createElement("div");
    codChargesRow.className = "summary-row";
    codChargesRow.innerHTML = `
      <div>COD Charges</div>
      <div>${formatPrice(codCharges)}</div>
    `;
    paymentSummaryContainer.appendChild(codChargesRow);
  }

  // Extra Amount - Display before total
  if (extraAmount > 0) {
    const extraAmountRow = document.createElement("div");
    extraAmountRow.className = "summary-row";
    extraAmountRow.innerHTML = `
      <div>Extra Amount</div>
      <div>${formatPrice(extraAmount)}</div>
    `;
    paymentSummaryContainer.appendChild(extraAmountRow);
  }

  // Calculate final total including extra amount
  const finalTotal = total;

  // Total
  const totalRow = document.createElement("div");
  totalRow.className = "summary-row total-row";
  totalRow.innerHTML = `
    <div>Total</div>
    <div>${formatPrice(finalTotal)}</div>
  `;
  paymentSummaryContainer.appendChild(totalRow);

  // Payment Method
  const paymentMethodRow = document.createElement("div");
  paymentMethodRow.className = "payment-method";
  let paymentMethodText = "";
  if (order.paymentMethod && order.paymentMethod.toLowerCase() === "cod") {
    paymentMethodText = "Cash on Delivery";
  } else {
    paymentMethodText = "Online Payment";
  }
  paymentMethodRow.innerHTML = `
    <div class="payment-icon">
      <i class="fas fa-credit-card"></i>
    </div>
    <div>${paymentMethodText}</div>
  `;
  paymentSummaryContainer.appendChild(paymentMethodRow);

  // Action Buttons
  const actionButtons = document.createElement("div");
  actionButtons.className = "action-buttons";
  actionButtons.innerHTML = `
    <button class="btn btn-primary" id="print-receipt">
      <i class="fas fa-print"></i> Print Receipt
    </button>
    <a href="contact.html" class="btn btn-secondary" id="contact-support">
      <i class="fas fa-envelope"></i> Contact Support
    </a>
    <a href="index.html" class="btn btn-secondary" id="continue-shopping">
      <i class="fas fa-shopping-cart"></i> Continue Shopping
    </a>
  `;
  paymentSummaryContainer.appendChild(actionButtons);
}

function setupOrderLookupForm() {
  const form = document.getElementById("order-lookup-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const orderId = document.getElementById("order-id-input").value.trim();
      if (orderId) {
        window.location.href = `?orderId=${orderId}`;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupOrderLookupForm();
  loadOrderDetails();
});
