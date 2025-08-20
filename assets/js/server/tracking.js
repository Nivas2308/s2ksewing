// Global variables
let currentOrders = [];
let selectedOrderId = null;
let currentTab = "all";
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz250emrafVgqhfloBssH0lKrzHcKCbyRjL2LkU1tNzV_m5EwgAes3486G6YuO8Xbv2/exec";
const PRODUCTS_API_URL =
  "https://script.google.com/macros/s/AKfycby9ucXgMhxRaUyVIP_k-8cela5CJlYrWG7y5YOD3zShvf0OYW2HkeAwr4o4zo0zMC1S/exec";

// Initialize the page
window.onload = function () {
  // Set up the tabs
  setupTabs();

  // Load orders from the API
  loadOrders();

  // Set up event listeners
  document
    .getElementById("updateStatusForm")
    .addEventListener("submit", updateOrderStatus);
  document
    .getElementById("orderSearch")
    .addEventListener("input", filterOrders);
};

// Set up the tab navigation
function setupTabs() {
  // Create tab navigation HTML
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "tabs-container";
  tabsContainer.innerHTML = `
<ul class="tabs">
<li class="tab-item active" data-tab="all">All Orders <span class="tab-counter" id="count-all">0</span></li>
<li class="tab-item" data-tab="new">New Orders <span class="tab-counter" id="count-new">0</span></li>
<li class="tab-item" data-tab="processing">Processing <span class="tab-counter" id="count-processing">0</span></li>
<li class="tab-item" data-tab="shipped">Shipped <span class="tab-counter" id="count-shipped">0</span></li>
<li class="tab-item" data-tab="delivered">Delivered <span class="tab-counter" id="count-delivered">0</span></li>
</ul>
`;

  // Insert after header
  const header = document.querySelector(".header");
  header.parentNode.insertBefore(tabsContainer, header.nextSibling);

  // Add event listeners to tabs
  const tabs = document.querySelectorAll(".tab-item");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all tabs
      tabs.forEach((t) => t.classList.remove("active"));

      // Add active class to clicked tab
      this.classList.add("active");

      // Update current tab and refresh display
      currentTab = this.getAttribute("data-tab");
      currentPage = 1; // Reset to first page when changing tabs
      displayFilteredOrders();
    });
  });

  // Create pagination container
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination";
  paginationContainer.id = "pagination";

  // Insert after orders list
  const ordersList = document.querySelector(".orders-list");
  ordersList.parentNode.insertBefore(
    paginationContainer,
    ordersList.nextSibling
  );
}

// Load orders from API - UPDATED to use getAllOrders
function loadOrders() {
  showLoading("Loading orders...");

  // Changed from getOrders to getAllOrders to fetch all orders regardless of user
  fetch(`${APPS_SCRIPT_URL}?action=getAllOrders&limit=1000`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentOrders = data.orders;

        // FIXED: Sort orders by date (newest first)
        currentOrders.sort((a, b) => {
          const dateA = new Date(a["Date"] || a.date || 0);
          const dateB = new Date(b["Date"] || b.date || 0);
          return dateB.getTime() - dateA.getTime(); // Newest first
        });

        console.log("Loaded all orders:", currentOrders); // Debug log
        console.log("Total orders loaded:", currentOrders.length); // Debug log
        updateTabCounters(currentOrders);
        displayFilteredOrders();
      } else {
        showError("Error loading orders: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showError("Network error when loading orders. Please try again.");
    });
}

// Update the counters in the tabs
function updateTabCounters(orders) {
  // Count orders by status
  const counts = {
    all: orders.length,
    new: orders.filter(
      (order) =>
        order["Order Status"] === "Order Placed" ||
        !order["Order Status"] ||
        order["Order Status"] === "" // Handle undefined/empty status as new
    ).length,
    processing: orders.filter((order) => order["Order Status"] === "Processing")
      .length,
    shipped: orders.filter((order) => order["Order Status"] === "Shipped")
      .length,
    delivered: orders.filter((order) => order["Order Status"] === "Delivered")
      .length,
  };

  console.log("Order status counts:", counts); // Debug log

  // Update the counter displays
  Object.keys(counts).forEach((status) => {
    const counterElement = document.getElementById(`count-${status}`);
    if (counterElement) {
      counterElement.textContent = counts[status];
    }
  });
}

// Display filtered orders based on current tab and search
function displayFilteredOrders() {
  let filteredOrders = [...currentOrders]; // Create a copy to avoid mutating original

  // Apply search filter if any
  const searchTerm = document.getElementById("orderSearch").value.toLowerCase();
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(
      (order) =>
        (order["Order ID"] &&
          order["Order ID"].toLowerCase().includes(searchTerm)) ||
        (order["Customer Name"] &&
          order["Customer Name"].toLowerCase().includes(searchTerm)) ||
        (order["Email"] && order["Email"].toLowerCase().includes(searchTerm)) ||
        (order["User ID"] &&
          order["User ID"].toLowerCase().includes(searchTerm))
    );
  }

  // Apply tab filter
  if (currentTab !== "all") {
    const statusMap = {
      new: "Order Placed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
    };

    filteredOrders = filteredOrders.filter((order) => {
      const orderStatus = order["Order Status"] || "Order Placed";
      return orderStatus === statusMap[currentTab];
    });
  }

  // FIXED: Ensure filtered orders maintain date sorting (newest first)
  filteredOrders.sort((a, b) => {
    const dateA = new Date(a["Date"] || a.date || 0);
    const dateB = new Date(b["Date"] || b.date || 0);
    return dateB.getTime() - dateA.getTime(); // Newest first
  });

  console.log(
    `Filtered orders for tab "${currentTab}":`,
    filteredOrders.length
  ); // Debug log

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Display the orders
  displayOrders(paginatedOrders);

  // Update pagination controls
  updatePagination(currentPage, totalPages, filteredOrders.length);
}

function showCustomItemDetails(itemIndex) {
  if (!fullOrderData || !fullOrderData.order || !fullOrderData.order.items) {
    alert("No custom item details found.");
    return;
  }

  const fullItem = fullOrderData.order.items[itemIndex];
  if (!fullItem) {
    alert("Custom item not found.");
    return;
  }

  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.id = "product-details-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex;
    justify-content: center; align-items: center; z-index: 10000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.id = "product-details-popup";
  popup.style.cssText = `
    background: white; border-radius: 8px; padding: 20px;
    max-width: 500px; max-height: 80vh; overflow-y: auto;
    position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  const details = [];
  if (fullItem.material)
    details.push(`<strong>Material:</strong> ${fullItem.material}`);
  if (fullItem.color) details.push(`<strong>Color:</strong> ${fullItem.color}`);
  if (fullItem.size) details.push(`<strong>Size:</strong> ${fullItem.size}`);
  if (fullItem.sewingPatternNotes)
    details.push(
      `<strong>Pattern Notes:</strong> ${fullItem.sewingPatternNotes}`
    );
  if (fullItem.notes) details.push(`<strong>Notes:</strong> ${fullItem.notes}`);
  if (fullItem.description)
    details.push(`<strong>Description:</strong> ${fullItem.description}`);
  if (fullItem.options) {
    Object.keys(fullItem.options).forEach((key) => {
      if (fullItem.options[key]) {
        details.push(`<strong>${key}:</strong> ${fullItem.options[key]}`);
      }
    });
  }

  popup.innerHTML = `
    <button onclick="closeProductDetails()" style="
      position: absolute; top: 10px; right: 15px;
      background: none; border: none; font-size: 20px;
      cursor: pointer; color: #666;">&times;</button>
    <h3 style="margin-bottom: 15px; color: #28a745;">Custom Item Details</h3>
    ${
      details.length
        ? details
            .map((d) => `<div style="margin-bottom: 5px;">${d}</div>`)
            .join("")
        : "<em>No extra details available.</em>"
    }
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// Display orders in the table - UPDATED to show User ID
function displayOrders(orders) {
  const ordersTable = document.getElementById("ordersTable");

  if (!orders || orders.length === 0) {
    ordersTable.innerHTML =
      '<tr><td colspan="7" class="no-data">No orders found</td></tr>';
    return;
  }

  let html = "";
  orders.forEach((order) => {
    const status = order["Order Status"] || "Order Placed";
    const statusClass = getStatusClass(status);
    const orderDate = order["Date"] ? formatDate(order["Date"]) : "N/A";
    const orderTotal = getOrderTotal(order);
    const userId = order["User ID"] || "GUEST";
    const customerName = order["Customer Name"] || "N/A";

    html += `
<tr>
<td>${order["Order ID"] || "N/A"}</td>
<td>${orderDate}</td>
<td>${customerName}</td>
<td><span class="user-id">${userId}</span></td>
<td>${orderTotal}</td>
<td><span class="status ${statusClass}">${status}</span></td>
<td>
  <button class="btn btn-primary" onclick="viewOrderDetail('${
    order["Order ID"]
  }')">View Details</button>
</td>
</tr>
`;
  });

  ordersTable.innerHTML = html;
}

// Helper function to get order total with proper fallbacks
function getOrderTotal(order) {
  // Try different possible fields for total
  if (typeof order["Total"] === "number") {
    return "$" + order["Total"].toFixed(2);
  } else if (order.order && typeof order.order.total === "number") {
    return "$" + order.order.total.toFixed(2);
  } else if (typeof order.total === "number") {
    return "$" + order.total.toFixed(2);
  }
  return "N/A";
}

// Update pagination controls
function updatePagination(currentPage, totalPages, totalItems) {
  const paginationElement = document.getElementById("pagination");

  if (totalPages <= 1) {
    paginationElement.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
<button class="pagination-btn" ${
    currentPage === 1 ? "disabled" : ""
  } onclick="changePage(${currentPage - 1})">
Previous
</button>
`;

  // Page numbers
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  // Adjust startPage if we're at the end
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
<button class="pagination-btn ${
      i === currentPage ? "active" : ""
    }" onclick="changePage(${i})">
${i}
</button>
`;
  }

  // Next button
  paginationHTML += `
<button class="pagination-btn" ${
    currentPage === totalPages ? "disabled" : ""
  } onclick="changePage(${currentPage + 1})">
Next
</button>
`;

  // Page info
  paginationHTML += `
<div class="pagination-info">
Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1} to ${Math.min(
    currentPage * ITEMS_PER_PAGE,
    totalItems
  )} of ${totalItems} orders
</div>
`;

  paginationElement.innerHTML = paginationHTML;
}

// Change current page
function changePage(pageNumber) {
  currentPage = pageNumber;
  displayFilteredOrders();

  // Scroll to top of the orders list
  document.querySelector(".orders-list").scrollIntoView({ behavior: "smooth" });
}

// Format date for display
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid date
    }
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
}

// Show loading message
function showLoading(message) {
  const ordersTable = document.getElementById("ordersTable");
  ordersTable.innerHTML = `<tr><td colspan="7" class="loading">${message}</td></tr>`;
}

// Show error message
function showError(message) {
  const ordersTable = document.getElementById("ordersTable");
  ordersTable.innerHTML = `<tr><td colspan="7" class="error">${message}</td></tr>`;
}

// Get CSS class for status display
function getStatusClass(status) {
  switch (status) {
    case "Order Placed":
      return "status-placed";
    case "Processing":
      return "status-processing";
    case "Shipped":
      return "status-shipped";
    case "Delivered":
      return "status-delivered";
    default:
      return "status-placed";
  }
}

// Filter orders based on search input
function filterOrders() {
  currentPage = 1; // Reset to first page when filtering
  displayFilteredOrders();
}

// MODIFIED: View order details - Now uses local data instead of API call to avoid access restrictions
function viewOrderDetail(orderId) {
  if (!orderId || orderId === "N/A") {
    alert("Invalid order ID");
    return;
  }

  // Find the order in the current orders array instead of making an API call
  const order = currentOrders.find((o) => o["Order ID"] === orderId);

  if (!order) {
    alert("Order not found in current data. Please refresh and try again.");
    return;
  }

  // Display the order details directly from local data
  displayOrderDetail(order);
}

// Show loading in the details section
function showDetailLoading() {
  // Show order detail section with loading indicator
  document.getElementById("orderDetail").style.display = "block";
  document.getElementById("detailOrderId").textContent = "Loading...";
  document.getElementById("detailItemsBody").innerHTML =
    '<tr><td colspan="5" class="loading">Loading order details...</td></tr>';
}

// Display order details with improved data handling - UPDATED to show User ID and Custom Fabric Details
// Enhanced function to display order details with improved custom fabric handling
function displayOrderDetail(order) {
  console.log("Displaying order detail:", order);

  // Show order detail section
  document.getElementById("orderDetail").style.display = "block";
  selectedOrderId = order["Order ID"] || order.id;

  // Fill in order information with fallbacks
  document.getElementById("detailOrderId").textContent =
    selectedOrderId || "N/A";
  document.getElementById("detailOrderDate").textContent = formatDate(
    order["Date"] || order.date || new Date()
  );
  document.getElementById("detailPaymentMethod").textContent =
    order["Payment Method"] || order.paymentMethod || "N/A";
  document.getElementById("detailOrderStatus").textContent =
    order["Order Status"] || order.status || "Order Placed";

  // ADD USER ID DISPLAY
  const userIdElement = document.getElementById("detailUserId");
  if (userIdElement) {
    userIdElement.textContent = order["User ID"] || "GUEST";
  } else {
    // If element doesn't exist, create it
    const orderInfoSection = document.querySelector(".order-info");
    if (orderInfoSection) {
      const userIdRow = document.createElement("div");
      userIdRow.innerHTML = `<strong>User ID:</strong> <span id="detailUserId">${
        order["User ID"] || "GUEST"
      }</span>`;
      orderInfoSection.appendChild(userIdRow);
    }
  }

  // Fill in customer information
  const customerName =
    order["Customer Name"] ||
    (order.customer
      ? `${order.customer.firstName || ""} ${
          order.customer.lastName || ""
        }`.trim()
      : "") ||
    "N/A";
  document.getElementById("detailCustomerName").textContent = customerName;

  const customerEmail =
    order["Email"] || (order.customer ? order.customer.email : "") || "N/A";
  document.getElementById("detailCustomerEmail").textContent = customerEmail;

  const customerPhone =
    order["Phone"] || (order.customer ? order.customer.phone : "") || "N/A";
  document.getElementById("detailCustomerPhone").textContent = customerPhone;

  // Build address
  const addressParts = [];
  const address =
    order["Address"] || (order.customer ? order.customer.address : "");
  const city = order["City"] || (order.customer ? order.customer.city : "");
  const state = order["State"] || (order.customer ? order.customer.state : "");
  const zip = order["ZIP"] || (order.customer ? order.customer.zip : "");
  const country =
    order["Country"] || (order.customer ? order.customer.country : "");

  if (address) addressParts.push(address);
  if (city) addressParts.push(city);
  if (state) addressParts.push(state);
  if (zip) addressParts.push(zip);
  if (country) addressParts.push(country);

  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "N/A";
  document.getElementById("detailCustomerAddress").textContent = fullAddress;

  // Enhanced Custom Fabric Details Handling
  let items = [];
  let fullOrderData = null;

  // Store fullOrderData globally for custom item details popup
  window.fullOrderData = null;

  // Try to get full order data from multiple sources
  if (
    order["Full Order JSON"] &&
    typeof order["Full Order JSON"] === "string"
  ) {
    try {
      fullOrderData = JSON.parse(order["Full Order JSON"]);
      window.fullOrderData = fullOrderData;
      console.log("Parsed full order data:", fullOrderData);
    } catch (e) {
      console.error("Error parsing Full Order JSON:", e);
    }
  }

  // If Full Order JSON not available, try Items JSON or other sources
  if (
    !fullOrderData &&
    order["Items JSON"] &&
    typeof order["Items JSON"] === "string"
  ) {
    try {
      const itemsData = JSON.parse(order["Items JSON"]);
      fullOrderData = { order: { items: itemsData } };
      window.fullOrderData = fullOrderData;
      console.log("Created full order data from Items JSON:", fullOrderData);
    } catch (e) {
      console.error("Error parsing Items JSON:", e);
    }
  }

  // Get items from various sources
  if (order.items && Array.isArray(order.items)) {
    items = order.items;
  } else if (
    order.order &&
    order.order.items &&
    Array.isArray(order.order.items)
  ) {
    items = order.order.items;
  } else if (typeof order["Items JSON"] === "string") {
    try {
      items = JSON.parse(order["Items JSON"]);
    } catch (e) {
      console.error("Error parsing Items JSON:", e);
    }
  }

  console.log("Items found:", items);

  // Fill in order items with enhanced custom fabric support
  const itemsBody = document.getElementById("detailItemsBody");
  if (!items || items.length === 0) {
    itemsBody.innerHTML =
      '<tr><td colspan="6">No items found for this order</td></tr>';
  } else {
    let itemsHtml = "";

    items.forEach((item, index) => {
      const itemName = item["Item Name"] || item.name || item.itemName || "N/A";
      const productId =
        item["Product ID"] || item.productId || item.id || item["ID"] || "N/A";

      let price = 0;
      if (typeof item["Price"] === "number") {
        price = item["Price"];
      } else if (typeof item.price === "number") {
        price = item.price;
      } else if (typeof item["Price"] === "string") {
        price = parseFloat(item["Price"]) || 0;
      } else if (typeof item.price === "string") {
        price = parseFloat(item.price) || 0;
      }

      const quantities = item["Quantity"] || item.quantity || 1;

      let subtotal = 0;
      if (typeof item["Subtotal"] === "number") {
        subtotal = item["Subtotal"];
      } else if (typeof item.subtotal === "number") {
        subtotal = item.subtotal;
      } else {
        subtotal = price * quantities;
      }

      // Enhanced Custom Fabric Detection
      const isCustomFabric = detectCustomFabric(
        item,
        itemName,
        fullOrderData,
        index
      );

      // If custom and price is 0, set it to $1
      if (isCustomFabric && price === 0) {
        price = 1;
        subtotal = price * quantities;
      }

      const productUrl =
        productId !== "N/A"
          ? `../public/productpage.html?id=${productId}`
          : null;

      // Get custom fabric details
      let customFabricDetails = "";
      if (isCustomFabric) {
        customFabricDetails = buildCustomFabricDetailsHTML(
          item,
          fullOrderData,
          index
        );
      }

      itemsHtml += `
        <tr>
          <td>
            <div>
              ${itemName}
              
            </div>
            ${customFabricDetails}
          </td>
          <td>${
            isCustomFabric
              ? `<span class="product-id-link" onclick="showCustomItemDetails(${index})" style="color: #28a745; cursor: pointer; text-decoration: underline;">${productId}</span>`
              : productId !== "N/A"
              ? `<span class="product-id-link" onclick="showProductDetailsFromUrl('${productUrl}')" style="color: #007bff; cursor: pointer; text-decoration: underline;">${productId}</span>`
              : productId
          }</td>
          <td>$${price.toFixed(2)}</td>
          <td>${quantities}</td>
          <td>$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    });

    itemsBody.innerHTML = itemsHtml;
  }

  // Fill in order totals
  fillOrderTotals(order);

  // Set up update form
  setupUpdateForm(order);

  // Scroll to details
  document.getElementById("orderDetail").scrollIntoView({ behavior: "smooth" });
}

// Enhanced function to detect custom fabric items
function detectCustomFabric(item, itemName, fullOrderData, index) {
  // Method 1: Check item name for custom fabric keywords
  const nameIndicators = [
    "custom fabric",
    "custom",
    "fabric",
    "personalized",
    "bespoke",
    "custom design",
    "made to order",
    "tailored",
  ];

  const nameHasCustomIndicator = nameIndicators.some((indicator) =>
    itemName.toLowerCase().includes(indicator.toLowerCase())
  );

  // Method 2: Check if item has custom properties
  const customProperties = [
    "material",
    "color",
    "size",
    "sewingPatternNotes",
    "notes",
    "description",
    "isCustomFabric",
    "customization",
    "fabric",
  ];

  const hasCustomProperties = customProperties.some(
    (prop) => item[prop] && item[prop] !== "" && item[prop] !== null
  );

  // Method 3: Check if fullOrderData has custom details for this item
  let hasFullOrderCustomDetails = false;
  if (
    fullOrderData &&
    fullOrderData.order &&
    fullOrderData.order.items &&
    fullOrderData.order.items[index]
  ) {
    const fullItem = fullOrderData.order.items[index];
    hasFullOrderCustomDetails = customProperties.some(
      (prop) =>
        fullItem[prop] && fullItem[prop] !== "" && fullItem[prop] !== null
    );

    // Also check options object
    if (fullItem.options && typeof fullItem.options === "object") {
      hasFullOrderCustomDetails =
        hasFullOrderCustomDetails ||
        Object.keys(fullItem.options).some(
          (key) =>
            fullItem.options[key] &&
            fullItem.options[key] !== "" &&
            fullItem.options[key] !== null
        );
    }
  }

  // Method 4: Check for explicit custom fabric flag
  const hasCustomFlag = item.isCustomFabric === true || item.custom === true;

  // Return true if any method indicates this is a custom fabric item
  const isCustom =
    nameHasCustomIndicator ||
    hasCustomProperties ||
    hasFullOrderCustomDetails ||
    hasCustomFlag;

  console.log(`Item ${index} "${itemName}" custom detection:`, {
    nameHasCustomIndicator,
    hasCustomProperties,
    hasFullOrderCustomDetails,
    hasCustomFlag,
    isCustom,
  });

  return isCustom;
}

// Enhanced function to build custom fabric details HTML
function buildCustomFabricDetailsHTML(item, fullOrderData, index) {
  const details = [];

  // Get details from the item itself
  const itemProperties = [
    "material",
    "color",
    "size",
    "sewingPatternNotes",
    "notes",
    "description",
    "fabric",
  ];
  itemProperties.forEach((prop) => {
    if (item[prop] && item[prop] !== "" && item[prop] !== null) {
      const label =
        prop.charAt(0).toUpperCase() + prop.slice(1).replace(/([A-Z])/g, " $1");
      details.push(`${label}: ${item[prop]}`);
    }
  });

  // Get details from fullOrderData if available
  if (
    fullOrderData &&
    fullOrderData.order &&
    fullOrderData.order.items &&
    fullOrderData.order.items[index]
  ) {
    const fullItem = fullOrderData.order.items[index];

    itemProperties.forEach((prop) => {
      if (fullItem[prop] && fullItem[prop] !== "" && fullItem[prop] !== null) {
        const label =
          prop.charAt(0).toUpperCase() +
          prop.slice(1).replace(/([A-Z])/g, " $1");
        const detailText = `${label}: ${fullItem[prop]}`;

        // Avoid duplicates
        if (!details.includes(detailText)) {
          details.push(detailText);
        }
      }
    });

    // Check options object
    if (fullItem.options && typeof fullItem.options === "object") {
      Object.keys(fullItem.options).forEach((key) => {
        if (
          fullItem.options[key] &&
          fullItem.options[key] !== "" &&
          fullItem.options[key] !== null
        ) {
          const label =
            key.charAt(0).toUpperCase() +
            key.slice(1).replace(/([A-Z])/g, " $1");
          const detailText = `${label}: ${fullItem.options[key]}`;

          // Avoid duplicates
          if (!details.includes(detailText)) {
            details.push(detailText);
          }
        }
      });
    }
  }

  // Remove duplicates and sort
  const uniqueDetails = [...new Set(details)].sort();

  // if (uniqueDetails.length > 0) {
  //   return `
  //     <div class="custom-fabric-details" style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
  //       <strong>Custom Fabric Details:</strong><br>
  //       ${uniqueDetails
  //         .map(
  //           (detail) =>
  //             `<span style="display: block; margin: 2px 0; font-size: 12px; color: #666;">${detail}</span>`
  //         )
  //         .join("")}
  //     </div>
  //   `;
  // }

  return `
    <div class="custom-fabric-details" style=" display: none; margin-top: 10px; padding: 8px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <strong>Custom Item:</strong><br>
      <span style="display: block; margin: 2px 0; font-size: 12px; color: #856404; font-style: italic;">Click Product ID to view details</span>
    </div>
  `;
}

// Enhanced function to show custom item details in popup
function showCustomItemDetails(itemIndex) {
  console.log("Showing custom item details for index:", itemIndex);

  if (
    !window.fullOrderData ||
    !window.fullOrderData.order ||
    !window.fullOrderData.order.items
  ) {
    alert("No custom item details found in order data.");
    return;
  }

  const fullItem = window.fullOrderData.order.items[itemIndex];
  if (!fullItem) {
    alert("Custom item not found at index " + itemIndex);
    return;
  }

  console.log("Full item data:", fullItem);

  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.id = "product-details-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex;
    justify-content: center; align-items: center; z-index: 10000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.id = "product-details-popup";
  popup.style.cssText = `
    background: white; border-radius: 8px; padding: 20px;
    max-width: 500px; max-height: 80vh; overflow-y: auto;
    position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  // Collect all available details
  const details = [];

  // Standard properties
  const standardProps = {
    name: "Item Name",
    itemName: "Item Name",
    "Item Name": "Item Name",
    material: "Material",
    color: "Color",
    size: "Size",
    fabric: "Fabric Type",
    sewingPatternNotes: "Sewing Pattern Notes",
    notes: "Notes",
    description: "Description",
    customization: "Customization",
    Price: "Price",
    price: "Price",
    Quantity: "Quantity",
    quantity: "Quantity",
  };

  Object.keys(standardProps).forEach((key) => {
    if (fullItem[key] && fullItem[key] !== "" && fullItem[key] !== null) {
      const value =
        typeof fullItem[key] === "number"
          ? key.toLowerCase().includes("price")
            ? `$${fullItem[key].toFixed(2)}`
            : fullItem[key]
          : fullItem[key];
      details.push(`<strong>${standardProps[key]}:</strong> ${value}`);
    }
  });

  // Options object
  if (fullItem.options && typeof fullItem.options === "object") {
    Object.keys(fullItem.options).forEach((key) => {
      if (
        fullItem.options[key] &&
        fullItem.options[key] !== "" &&
        fullItem.options[key] !== null
      ) {
        const label =
          key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
        details.push(`<strong>${label}:</strong> ${fullItem.options[key]}`);
      }
    });
  }

  // Any other properties not covered above
  Object.keys(fullItem).forEach((key) => {
    if (
      !standardProps[key] &&
      key !== "options" &&
      fullItem[key] &&
      fullItem[key] !== "" &&
      fullItem[key] !== null &&
      typeof fullItem[key] !== "object"
    ) {
      const label =
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
      const value =
        typeof fullItem[key] === "number"
          ? key.toLowerCase().includes("price")
            ? `$${fullItem[key].toFixed(2)}`
            : fullItem[key]
          : fullItem[key];
      details.push(`<strong>${label}:</strong> ${value}`);
    }
  });

  popup.innerHTML = `
    <button onclick="closeProductDetails()" style="
      position: absolute; top: 10px; right: 15px;
      background: none; border: none; font-size: 20px;
      cursor: pointer; color: #666;">&times;</button>
    <h3 style="margin-bottom: 15px; color: #28a745;">
      <i class="fas fa-cut" style="margin-right: 8px;"></i>
      Custom Fabric Item Details
    </h3>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      ${
        details.length
          ? details
              .map(
                (d) =>
                  `<div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #e9ecef; last-child:border-bottom: none;">${d}</div>`
              )
              .join("")
          : '<em style="color: #6c757d;">No specific details available for this custom item.</em>'
      }
    </div>
    <div style="text-align: center; margin-top: 15px;">
      <small style="color: #6c757d; font-style: italic;">
        Custom fabric items are made to order based on the specifications above.
      </small>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// Helper function to fill order totals - FIXED to always recalculate total with COD charges
function fillOrderTotals(order) {
  let subtotal = 0,
    tax = 0,
    shipping = 0,
    total = 0;

  // Try to get subtotal
  if (typeof order["Subtotal"] === "number") {
    subtotal = order["Subtotal"];
  } else if (order.order && typeof order.order.subtotal === "number") {
    subtotal = order.order.subtotal;
  } else if (typeof order.subtotal === "number") {
    subtotal = order.subtotal;
  }

  // Try to get tax
  if (typeof order["Tax"] === "number") {
    tax = order["Tax"];
  } else if (order.order && typeof order.order.tax === "number") {
    tax = order.order.tax;
  } else if (typeof order.tax === "number") {
    tax = order.tax;
  }

  // Try to get shipping
  if (typeof order["Shipping"] === "number") {
    shipping = order["Shipping"];
  } else if (order.order && typeof order.order.shipping === "number") {
    shipping = order.order.shipping;
  } else if (typeof order.shipping === "number") {
    shipping = order.shipping;
  }

  // Handle Additional Cost (separate from COD Charges)
  let additionalCost = 0;
  if (typeof order["Additional Cost"] === "number") {
    additionalCost = order["Additional Cost"];
  } else if (order.order && typeof order.order.additionalCost === "number") {
    additionalCost = order.order.additionalCost;
  } else if (typeof order.additionalCost === "number") {
    additionalCost = order.additionalCost;
  }

  // Handle COD Charges (separate from Additional Cost)
  let codCharges = 0;
  if (typeof order["COD Charges"] === "number") {
    codCharges = order["COD Charges"];
  } else if (order.order && typeof order.order.codCharges === "number") {
    codCharges = order.order.codCharges;
  } else if (typeof order.codCharges === "number") {
    codCharges = order.codCharges;
  }

  // Try to get Extra Amount
  let extraAmount = 0;
  if (typeof order["Extra Amount"] === "number") {
    extraAmount = order["Extra Amount"];
  } else if (order.order && typeof order.order.extraAmount === "number") {
    extraAmount = order.order.extraAmount;
  } else if (typeof order.extraAmount === "number") {
    extraAmount = order.extraAmount;
  }

  // FIXED: Always calculate total instead of using stored total
  // This ensures COD charges and other updates are reflected
  total = subtotal + tax + shipping + additionalCost + codCharges + extraAmount;

  // Show Additional Cost row
  const additionalCostRow = document.getElementById("additionalCostRow");
  const additionalCostCell = document.getElementById("detailAdditionalCost");
  if (additionalCostRow && additionalCostCell) {
    additionalCostRow.style.display = additionalCost > 0 ? "" : "none";
    additionalCostCell.textContent = `$${additionalCost.toFixed(2)}`;
  }

  // Show COD Charges row
  const codChargesRow = document.getElementById("codChargesRow");
  const codChargesCell = document.getElementById("detailCODCharges");
  if (codChargesRow && codChargesCell) {
    codChargesRow.style.display = codCharges > 0 ? "" : "none";
    codChargesCell.textContent = `$${codCharges.toFixed(2)}`;
  }

  // Update all the display elements
  document.getElementById("detailSubtotal").textContent = `$${subtotal.toFixed(
    2
  )}`;
  document.getElementById("detailTax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("detailShipping").textContent = `$${shipping.toFixed(
    2
  )}`;
  document.getElementById(
    "detailExtraAmount"
  ).textContent = `$${extraAmount.toFixed(2)}`;
  document.getElementById("detailTotal").textContent = `$${total.toFixed(2)}`;

  console.log("Total calculation breakdown:", {
    subtotal,
    tax,
    shipping,
    additionalCost,
    codCharges,
    extraAmount,
    calculatedTotal: total,
  });
}

// Helper function to setup update form (modified to handle both fields)
function setupUpdateForm(order) {
  const extraAmount =
    order["Extra Amount"] ||
    order.extraAmount ||
    (order.order ? order.order.extraAmount : 0) ||
    0;
  const additionalCost =
    order["Additional Cost"] ||
    order.additionalCost ||
    (order.order ? order.order.additionalCost : 0) ||
    0;
  const codCharges =
    order["COD Charges"] ||
    order.codCharges ||
    (order.order ? order.order.codCharges : 0) ||
    0;

  document.getElementById("updateOrderId").value = selectedOrderId;
  document.getElementById("orderStatus").value =
    order["Order Status"] || order.status || "Order Placed";
  document.getElementById("courier").value =
    order["Courier"] || order.courier || "";
  document.getElementById("trackingId").value =
    order["Tracking ID"] || order.trackingId || "";
  document.getElementById("comments").value =
    order["Comments"] || order.comments || "";
  document.getElementById("extraAmount").value = extraAmount || 0;

  // Set additional cost and COD charges if form fields exist
  const additionalCostField = document.getElementById("additionalCost");
  if (additionalCostField) {
    additionalCostField.value = additionalCost || 0;
  }

  const codChargesField = document.getElementById("codCharges");
  if (codChargesField) {
    codChargesField.value = codCharges || 0;
  }
}

// Update order status with improved error handling and verification (modified to handle both fields)
function updateOrderStatus(event) {
  event.preventDefault();

  const formData = {
    orderId: document.getElementById("updateOrderId").value,
    orderStatus: document.getElementById("orderStatus").value,
    courier: document.getElementById("courier").value,
    trackingId: document.getElementById("trackingId").value,
    comments: document.getElementById("comments").value,
    extraAmount: parseFloat(document.getElementById("extraAmount").value) || 0,
  };

  // Add additional cost and COD charges if form fields exist
  const additionalCostField = document.getElementById("additionalCost");
  if (additionalCostField) {
    formData.additionalCost = parseFloat(additionalCostField.value) || 0;
  }

  const codChargesField = document.getElementById("codCharges");
  if (codChargesField) {
    formData.codCharges = parseFloat(codChargesField.value) || 0;
  }

  console.log("Updating order with data:", formData);

  // Validate form
  if (!formData.orderId || !formData.orderStatus) {
    alert("Order ID and Status are required!");
    return;
  }

  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = "Updating...";
  submitButton.disabled = true;

  // Create the request payload
  const requestBody = {
    action: "updateOrderStatus",
    data: formData,
  };

  console.log("Sending request:", requestBody);

  // Use a more robust approach for the API call
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      submitButton.textContent = "Verifying...";

      // Wait briefly then verify the update
      setTimeout(() => {
        verifyOrderUpdate(
          formData.orderId,
          formData.orderStatus,
          () => {
            // Success callback
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            alert("Order status updated successfully!");
            loadOrders(); // Refresh order list
            closeOrderDetail();
          },
          () => {
            // Failure callback - but don't assume it failed
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            alert(
              "Update request sent. Please refresh to see if changes were applied."
            );
            loadOrders(); // Refresh anyway to see current state
          }
        );
      }, 3000); // Wait 3 seconds before checking
    })
    .catch((error) => {
      console.error("Error:", error);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;

      // Even if fetch fails, the request might have gone through
      alert(
        "Update request sent, but verification failed. Please refresh the page to check if the update was applied."
      );
      loadOrders(); // Refresh to see current state
    });
}

// Helper function to setup update form (extracted for better organization)
function setupUpdateForm(order) {
  const extraAmount =
    order["Extra Amount"] ||
    order.extraAmount ||
    (order.order ? order.order.extraAmount : 0) ||
    0;

  document.getElementById("updateOrderId").value = selectedOrderId;
  document.getElementById("orderStatus").value =
    order["Order Status"] || order.status || "Order Placed";
  document.getElementById("courier").value =
    order["Courier"] || order.courier || "";
  document.getElementById("trackingId").value =
    order["Tracking ID"] || order.trackingId || "";
  document.getElementById("comments").value =
    order["Comments"] || order.comments || "";
  document.getElementById("extraAmount").value = extraAmount || 0;
}

// Helper function to extract custom fabric details from full order JSON
function getCustomFabricDetails(fullOrderData, itemIndex) {
  if (!fullOrderData || !fullOrderData.order || !fullOrderData.order.items) {
    return null;
  }

  const item = fullOrderData.order.items[itemIndex];
  if (!item) return null;

  // Check if this item has custom fabric properties
  const customProperties = {};

  const fabricProperties = [
    "material",
    "color",
    "size",
    "sewingPatternNotes",
    "notes",
    "description",
    "isCustomFabric",
  ];

  fabricProperties.forEach((prop) => {
    if (item[prop]) {
      customProperties[prop] = item[prop];
    }
  });

  // Also check options object
  if (item.options && typeof item.options === "object") {
    Object.keys(item.options).forEach((key) => {
      if (item.options[key]) {
        customProperties[key] = item.options[key];
      }
    });
  }

  return Object.keys(customProperties).length > 0 ? customProperties : null;
}
// Close order detail view
function closeOrderDetail() {
  document.getElementById("orderDetail").style.display = "none";
  selectedOrderId = null;
}

// Update order status with improved error handling and verification
function updateOrderStatus(event) {
  event.preventDefault();

  const formData = {
    orderId: document.getElementById("updateOrderId").value,
    orderStatus: document.getElementById("orderStatus").value,
    courier: document.getElementById("courier").value,
    trackingId: document.getElementById("trackingId").value,
    comments: document.getElementById("comments").value,
    extraAmount: parseFloat(document.getElementById("extraAmount").value) || 0,
  };

  console.log("Updating order with data:", formData);

  // Validate form
  if (!formData.orderId || !formData.orderStatus) {
    alert("Order ID and Status are required!");
    return;
  }

  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = "Updating...";
  submitButton.disabled = true;

  // Create the request payload
  const requestBody = {
    action: "updateOrderStatus",
    data: formData,
  };

  console.log("Sending request:", requestBody);

  // Use a more robust approach for the API call
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      submitButton.textContent = "Verifying...";

      // Wait briefly then verify the update
      setTimeout(() => {
        verifyOrderUpdate(
          formData.orderId,
          formData.orderStatus,
          () => {
            // Success callback
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            alert("Order status updated successfully!");
            loadOrders(); // Refresh order list
            closeOrderDetail();
          },
          () => {
            // Failure callback - but don't assume it failed
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            alert(
              "Update request sent. Please refresh to see if changes were applied."
            );
            loadOrders(); // Refresh anyway to see current state
          }
        );
      }, 3000); // Wait 3 seconds before checking
    })
    .catch((error) => {
      console.error("Error:", error);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;

      // Even if fetch fails, the request might have gone through
      alert(
        "Update request sent, but verification failed. Please refresh the page to check if the update was applied."
      );
      loadOrders(); // Refresh to see current state
    });
}

// MODIFIED: Verification function - Uses getAllOrders instead of getOrderDetails to avoid access restrictions
function verifyOrderUpdate(
  orderId,
  expectedStatus,
  successCallback,
  failureCallback
) {
  let retryCount = 0;
  const maxRetries = 3;

  function attemptVerification() {
    // Use getAllOrders and find the specific order instead of getOrderDetails
    fetch(`${APPS_SCRIPT_URL}?action=getAllOrders&limit=1000&_t=${Date.now()}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Verification response:", data); // Debug log

        if (data.success && data.orders) {
          // Find the specific order in the response
          const updatedOrder = data.orders.find(
            (order) => order["Order ID"] === orderId
          );

          if (updatedOrder) {
            const currentStatus =
              updatedOrder["Order Status"] || updatedOrder.status;
            console.log(
              "Current status:",
              currentStatus,
              "Expected:",
              expectedStatus
            ); // Debug log

            if (currentStatus === expectedStatus) {
              // Update local data as well
              const localOrderIndex = currentOrders.findIndex(
                (order) => order["Order ID"] === orderId
              );
              if (localOrderIndex !== -1) {
                currentOrders[localOrderIndex] = updatedOrder;
              }
              successCallback();
            } else if (retryCount < maxRetries) {
              retryCount++;
              console.log(
                `Verification attempt ${retryCount} failed, retrying...`
              );
              setTimeout(attemptVerification, 2000); // Wait 2 seconds before retry
            } else {
              failureCallback();
            }
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptVerification, 2000);
          } else {
            failureCallback();
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptVerification, 2000);
        } else {
          failureCallback();
        }
      })
      .catch((error) => {
        console.error("Error verifying update:", error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptVerification, 2000);
        } else {
          failureCallback();
        }
      });
  }

  attemptVerification();
}

// Function to show product details in a popup
function showProductDetails(productId) {
  console.log("Showing product details for ID:", productId);

  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.id = "product-details-overlay";
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
    z-index: 10000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.id = "product-details-popup";
  popup.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Add loading content
  popup.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="margin-bottom: 20px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #007bff;"></i>
      </div>
      <div>Loading product details...</div>
    </div>
    <button onclick="closeProductDetails()" style="
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
    ">&times;</button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Fetch product details from Google Apps Script
  fetch(`${APPS_SCRIPT_URL}?action=getProduct&id=${productId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.product) {
        const product = data.product;
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Product Details</h3>
          </div>
          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div style="flex: 0 0 120px;">
              <img src="${
                product.imageUrl ||
                product.image ||
                "https://via.placeholder.com/120"
              }" 
                   alt="${product.title || product.name}" 
                   style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${
                product.title || product.name || "Unknown Product"
              }</h4>
              <div style="margin-bottom: 8px;"><strong>ID:</strong> ${
                product.id || productId
              }</div>
              <div style="margin-bottom: 8px;"><strong>Price:</strong> $${(
                product.price || 0
              ).toFixed(2)}</div>
              <div style="margin-bottom: 8px;"><strong>Category:</strong> ${
                product.category || "N/A"
              }</div>
              <div style="margin-bottom: 8px;"><strong>Sub Category:</strong> ${
                product.subCategory || "N/A"
              }</div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Description:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${
              product.description || "No description available"
            }</div>
          </div>
          ${
            product.details
              ? `
          <div style="margin-bottom: 15px;">
            <strong>Details:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${product.details}</div>
          </div>
          `
              : ""
          }
        `;
      } else {
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 20px; color: #dc3545;">
              <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
            </div>
            <div>Product not found or error loading details</div>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">ID: ${productId}</div>
          </div>
        `;
      }
    })
    .catch((error) => {
      console.error("Error fetching product details:", error);
      popup.innerHTML = `
        <button onclick="closeProductDetails()" style="
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        <div style="text-align: center; padding: 40px;">
          <div style="margin-bottom: 20px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
          </div>
          <div>Error loading product details</div>
          <div style="margin-top: 10px; font-size: 14px; color: #666;">Please try again later</div>
        </div>
      `;
    });
}

// New function to fetch product details from product URL
function showProductDetailsFromUrl(productUrl) {
  console.log("Showing product details from URL:", productUrl);

  if (!productUrl) {
    console.error("No product URL provided");
    return;
  }

  // Extract product ID from the URL
  const urlObj = new URL(productUrl, window.location.origin);
  const productId = urlObj.searchParams.get("id") || "N/A";

  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.id = "product-details-overlay";
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
    z-index: 10000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.id = "product-details-popup";
  popup.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Add loading content
  popup.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="margin-bottom: 20px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #007bff;"></i>
      </div>
      <div>Loading product details...</div>
    </div>
    <button onclick="closeProductDetails()" style="
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
    ">&times;</button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Try Google Apps Script API first (more reliable)
  console.log("Trying Google Apps Script API first...");
  fetchProductDetailsFromScript(productId, popup)
    .then((success) => {
      if (!success) {
        // If API fails, try URL approach as fallback
        console.log("API failed, trying URL approach as fallback...");
        return fetchProductDetailsFromUrl(productUrl, popup);
      }
    })
    .catch((error) => {
      console.error("Error with API approach:", error);
      console.log("Trying URL approach as fallback...");
      return fetchProductDetailsFromUrl(productUrl, popup);
    });
}

// Function to fetch product details from URL (as fallback)
function fetchProductDetailsFromUrl(productUrl, popup) {
  // Extract product ID from the URL
  const urlObj = new URL(productUrl, window.location.origin);
  const productId = urlObj.searchParams.get("id") || "N/A";

  return fetch(productUrl)
    .then((response) => {
      console.log("Response status:", response.status);
      console.log("Response URL:", response.url);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }
      return response.text();
    })
    .then((html) => {
      console.log("HTML content length:", html.length);

      // Parse the HTML to extract product information
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract product details from the parsed HTML
      const productDetails = extractProductDetailsFromHTML(doc, productId);

      if (productDetails) {
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Product Details (from URL)</h3>
          </div>
          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div style="flex: 0 0 120px;">
              <img src="${
                productDetails.imageUrl || "https://via.placeholder.com/120"
              }" 
                   alt="${productDetails.title || "Product"}" 
                   style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${
                productDetails.title || "Unknown Product"
              }</h4>
              <div style="margin-bottom: 8px;"><strong>ID:</strong> ${
                productDetails.id || "N/A"
              }</div>
              <div style="margin-bottom: 8px;"><strong>Price:</strong> $${(
                productDetails.price || 0
              ).toFixed(2)}</div>
              <div style="margin-bottom: 8px;"><strong>Category:</strong> ${
                productDetails.category || "N/A"
              }</div>
              <div style="margin-bottom: 8px;"><strong>Sub Category:</strong> ${
                productDetails.subCategory || "N/A"
              }</div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Description:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${
              productDetails.description || "No description available"
            }</div>
          </div>
          ${
            productDetails.details
              ? `
          <div style="margin-bottom: 15px;">
            <strong>Details:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${productDetails.details}</div>
          </div>
          `
              : ""
          }
        `;
        return true;
      } else {
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 20px; color: #dc3545;">
              <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
            </div>
            <div>Could not extract product details from URL</div>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">URL: ${productUrl}</div>
            <div style="margin-top: 10px; font-size: 12px; color: #999;">Product ID: ${productId}</div>
          </div>
        `;
        return false;
      }
    })
    .catch((error) => {
      console.error("Error fetching product details from URL:", error);
      popup.innerHTML = `
        <button onclick="closeProductDetails()" style="
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        <div style="text-align: center; padding: 40px;">
          <div style="margin-bottom: 20px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
          </div>
          <div>Error loading product details from URL</div>
          <div style="margin-top: 10px; font-size: 14px; color: #666;">${error.message}</div>
          <div style="margin-top: 10px; font-size: 12px; color: #999;">URL: ${productUrl}</div>
        </div>
      `;
      return false;
    });
}

// Fallback function to fetch product details from Google Apps Script
function fetchProductDetailsFromScript(productId, popup) {
  return fetch(PRODUCTS_API_URL)
    .then((response) => response.json())
    .then((data) => {
      // Check if this is a single product response or all products response
      if (data.success && data.product) {
        // Single product response (existing format)
        const product = data.product;
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Product Details</h3>
          </div>
          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div style="flex: 0 0 120px;">
              <img src="${
                product.imageUrl ||
                product.image ||
                product.mainImage ||
                "https://via.placeholder.com/120"
              }" 
                   alt="${product.title || product.name}" 
                   style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${
                product.title || product.name || "Unknown Product"
              }</h4>
              <div style="margin-bottom: 8px;"><strong>ID:</strong> ${
                product.id || productId
              }</div>
              <div style="margin-bottom: 8px;"><strong>Price:</strong> $${(
                product.price || 0
              ).toFixed(2)}</div>
              <div style="margin-bottom: 8px;"><strong>Category:</strong> ${
                product.category || "N/A"
              }</div>
              <div style="margin-bottom: 8px;"><strong>Sub Category:</strong> ${
                product.subCategory || "N/A"
              }</div>
              <div style="margin-bottom: 8px;"><strong>SKU:</strong> ${
                product.sku || "N/A"
              }</div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Description:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${
              product.description || "No description available"
            }</div>
          </div>
          ${
            product.details
              ? `
          <div style="margin-bottom: 15px;">
            <strong>Details:</strong>
            <div style="margin-top: 5px; color: #666; line-height: 1.5;">${product.details}</div>
          </div>
          `
              : ""
          }
        `;
        return true;
      } else if (Array.isArray(data)) {
        // All products response - find the specific product by ID
        const product = data.find((p) => p.id == productId);
        if (product) {
          popup.innerHTML = `
            <button onclick="closeProductDetails()" style="
              position: absolute;
              top: 10px;
              right: 15px;
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #666;
            ">&times;</button>
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Product Details</h3>
            </div>
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
              <div style="flex: 0 0 120px;">
                <img src="${
                  product.mainImage ||
                  product.image ||
                  product.imageUrl ||
                  "https://via.placeholder.com/120"
                }" 
                     alt="${product.title || product.name}" 
                     style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
              </div>
              <div style="flex: 1;">
                <h4 style="margin: 0 0 10px 0; color: #333;">${
                  product.title || product.name || "Unknown Product"
                }</h4>
                <div style="margin-bottom: 8px;"><strong>ID:</strong> ${
                  product.id || productId
                }</div>
                <div style="margin-bottom: 8px;"><strong>Price:</strong> $${(
                  product.price || 0
                ).toFixed(2)}</div>
                <div style="margin-bottom: 8px;"><strong>Category:</strong> ${
                  product.category || "N/A"
                }</div>
                <div style="margin-bottom: 8px;"><strong>Sub Category:</strong> ${
                  product.subCategory || "N/A"
                }</div>
                <div style="margin-bottom: 8px;"><strong>SKU:</strong> ${
                  product.sku || "N/A"
                }</div>
                <div style="margin-bottom: 8px;"><strong>Stock:</strong> ${
                  product.inStock ? "In Stock" : "Out of Stock"
                }</div>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <strong>Description:</strong>
              <div style="margin-top: 5px; color: #666; line-height: 1.5;">${
                product.description || "No description available"
              }</div>
            </div>
            ${
              product.details
                ? `
            <div style="margin-bottom: 15px;">
              <strong>Details:</strong>
              <div style="margin-top: 5px; color: #666; line-height: 1.5;">${product.details}</div>
            </div>
            `
                : ""
            }
            ${
              product.images && product.images.length > 1
                ? `
            `
                : ""
            }
          `;
          return true;
        } else {
          popup.innerHTML = `
            <button onclick="closeProductDetails()" style="
              position: absolute;
              top: 10px;
              right: 15px;
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #666;
            ">&times;</button>
            <div style="text-align: center; padding: 40px;">
              <div style="margin-bottom: 20px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
              </div>
              <div>Product not found</div>
              <div style="margin-top: 10px; font-size: 14px; color: #666;">ID: ${productId}</div>
            </div>
          `;
          return false;
        }
      } else {
        popup.innerHTML = `
          <button onclick="closeProductDetails()" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">&times;</button>
          <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 20px; color: #dc3545;">
              <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
            </div>
            <div>Product not found or error loading details</div>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">ID: ${productId}</div>
          </div>
        `;
        return false;
      }
    })
    .catch((error) => {
      console.error("Error fetching product details from script:", error);
      popup.innerHTML = `
        <button onclick="closeProductDetails()" style="
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        <div style="text-align: center; padding: 40px;">
          <div style="margin-bottom: 20px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
          </div>
          <div>Error loading product details</div>
          <div style="margin-top: 10px; font-size: 14px; color: #666;">Please try again later</div>
          <div style="margin-top: 10px; font-size: 12px; color: #999;">Product ID: ${productId}</div>
        </div>
      `;
      return false;
    });
}

// Helper function to extract product details from HTML
function extractProductDetailsFromHTML(doc, productId) {
  try {
    console.log("Extracting product details from HTML for ID:", productId);

    // Extract product information based on the actual product page structure

    // Look for product title
    const titleElement = doc.querySelector(".product-title");
    const title = titleElement
      ? titleElement.textContent.trim()
      : "Unknown Product";
    console.log("Found title:", title);

    // Look for product price
    const priceElement = doc.querySelector(".product-price");
    let price = 0;
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      console.log("Found price text:", priceText);
      const priceMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        console.log("Extracted price:", price);
      }
    }

    // Look for product image
    const imageElement = doc.querySelector(".main-image");
    const imageUrl = imageElement
      ? imageElement.src
      : "https://via.placeholder.com/120";
    console.log("Found image URL:", imageUrl);

    // Look for product description
    const descElement = doc.querySelector(".product-description");
    const description = descElement
      ? descElement.textContent.trim()
      : "No description available";
    console.log("Found description:", description);

    // Look for category information
    const categoryElements = doc.querySelectorAll(".category-tag");
    let category = "N/A";
    let subCategory = "N/A";

    if (categoryElements.length > 0) {
      category = categoryElements[0].textContent.trim();
      console.log("Found category:", category);
      if (categoryElements.length > 1) {
        subCategory = categoryElements[1].textContent.trim();
        console.log("Found subcategory:", subCategory);
      }
    }

    // Look for additional details
    const detailsElement = doc.querySelector(".product-details");
    let details = "";
    if (detailsElement) {
      // Get the content inside product-details, excluding the h3 title
      const detailsContent = detailsElement.querySelector("div");
      details = detailsContent ? detailsContent.textContent.trim() : "";
      console.log("Found details:", details);
    }

    // Check if we found meaningful data
    const hasValidData =
      title !== "Unknown Product" ||
      price > 0 ||
      description !== "No description available";
    console.log("Has valid data:", hasValidData);

    if (!hasValidData) {
      console.log("No valid product data found in HTML, will use fallback");
      return null;
    }

    return {
      id: productId,
      title: title,
      price: price,
      imageUrl: imageUrl,
      description: description,
      category: category,
      subCategory: subCategory,
      details: details,
    };
  } catch (error) {
    console.error("Error extracting product details from HTML:", error);
    return null;
  }
}

// Function to close product details popup
function closeProductDetails() {
  const overlay = document.getElementById("product-details-overlay");
  if (overlay) {
    overlay.remove();
  }
}

// Add scroll hint for table-responsive on mobile
document.addEventListener("DOMContentLoaded", function () {
  var tableWrappers = document.querySelectorAll(".table-responsive");
  tableWrappers.forEach(function (wrapper) {
    var hint = wrapper.querySelector(".scroll-hint");
    if (!hint) return;
    let scrolled = false;
    wrapper.addEventListener("scroll", function () {
      if (!scrolled) {
        wrapper.classList.add("scrolling");
        setTimeout(function () {
          wrapper.classList.remove("scrolling");
        }, 1500);
        scrolled = true;
      }
    });
  });
});

// Enhanced function to show custom item details in popup - UPDATED for specific fields only
function showCustomItemDetails(itemIndex) {
  console.log("Showing custom item details for index:", itemIndex);

  if (
    !window.fullOrderData ||
    !window.fullOrderData.order ||
    !window.fullOrderData.order.items
  ) {
    alert("No custom item details found in order data.");
    return;
  }

  const fullItem = window.fullOrderData.order.items[itemIndex];
  if (!fullItem) {
    alert("Custom item not found at index " + itemIndex);
    return;
  }

  console.log("Full item data:", fullItem);

  // Create popup overlay
  const overlay = document.createElement("div");
  overlay.id = "product-details-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex;
    justify-content: center; align-items: center; z-index: 10000;
  `;

  // Create popup content
  const popup = document.createElement("div");
  popup.id = "product-details-popup";
  popup.style.cssText = `
    background: white; border-radius: 8px; padding: 20px;
    max-width: 500px; max-height: 80vh; overflow-y: auto;
    position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  // Collect only the specific fields requested
  const details = [];

  // Only show these specific fields
  const fieldsToShow = {
    "Item Name": fullItem["Item Name"] || fullItem.name || fullItem.itemName,
    Size: fullItem["Size"] || fullItem.size,
    Id: fullItem["Id"] || fullItem.id || fullItem["ID"],
    "Parent Item": fullItem["Parent Item"] || fullItem.parentItem,
    "Parent Item Id":
      fullItem["Parent Item Id"] ||
      fullItem.parentItemId ||
      fullItem["Parent Item ID"],

    "Fabric Color":
      fullItem["Fabric Color"] || fullItem.fabricColor || fullItem.color,
    "Fabric Material":
      fullItem["Fabric Material"] ||
      fullItem.fabricMaterial ||
      fullItem.material,
    "Fabric Description":
      fullItem["Fabric Description"] ||
      fullItem.fabricDescription ||
      fullItem.description,
    "Fabric Pattern Notes":
      fullItem["Fabric Pattern Notes"] ||
      fullItem.fabricPatternNotes ||
      fullItem.sewingPatternNotes,
  };

  Object.keys(fieldsToShow).forEach((fieldName) => {
    const value = fieldsToShow[fieldName];
    if (value && value !== "" && value !== null && value !== "undefined") {
      details.push(`<strong>${fieldName}:</strong> ${value}`);
    }
  });

  // Handle image separately
  let imageHtml = "";
  const imageUrl = fullItem["Image Url"] || fullItem.imageUrl || fullItem.image;
  if (imageUrl && imageUrl !== "" && imageUrl !== null) {
    imageHtml = `
      <div style="margin: 15px 0; text-align: center;">
        <strong>Custom Fabric Image:</strong><br>
        <img src="${imageUrl}" alt="Custom Fabric" style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 2px solid #007bff; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div style="display: none; color: #dc3545; font-style: italic; margin-top: 10px;">Image could not be loaded</div>
      </div>
    `;
  }

  popup.innerHTML = `
    <button onclick="closeProductDetails()" style="
      position: absolute; top: 10px; right: 15px;
      background: none; border: none; font-size: 20px;
      cursor: pointer; color: #666;">&times;</button>
    <h3 style="margin-bottom: 15px; color: #28a745;">
      <i class="fas fa-cut" style="margin-right: 8px;"></i>
      Custom Fabric Item Details
    </h3>
    ${imageHtml}
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      ${
        details.length
          ? details
              .map(
                (d) =>
                  `<div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e9ecef;">${d}</div>`
              )
              .join("")
              .replace(
                /(<div[^>]*>.*?<\/div>)(?!.*<div)/,
                "$1".replace("border-bottom: 1px solid #e9ecef;", "")
              )
          : '<em style="color: #6c757d;">No specific details available for this custom item.</em>'
      }
    </div>
    <div style="text-align: center; margin-top: 15px;">
      <small style="color: #6c757d; font-style: italic;">
        Custom fabric items are made to order based on the specifications above.
      </small>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
