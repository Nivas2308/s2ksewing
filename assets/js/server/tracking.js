// Global variables
let currentOrders = [];
let selectedOrderId = null;
let currentTab = "all";
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxGcDUEGutIXawSapOrWVGC9BcXgJTFSDnYml7HaGFcefQ3DolGTnzRWkyuSaO-hQ/exec";

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
  let filteredOrders = currentOrders;

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

// Display order details with improved data handling - UPDATED to show User ID
function displayOrderDetail(order) {
  console.log("Displaying order detail:", order); // Debug log

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

  // Fill in customer information with fallbacks
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

  // Build address from available fields
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

  // Handle items with multiple possible sources
  let items = [];

  // Try different possible item sources
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

  console.log("Items found:", items); // Debug log

  // Fill in order items
  const itemsBody = document.getElementById("detailItemsBody");
  if (!items || items.length === 0) {
    itemsBody.innerHTML =
      '<tr><td colspan="5">No items found for this order</td></tr>';
  } else {
    let itemsHtml = "";

    items.forEach((item) => {
      // Handle different possible field names for items
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

      itemsHtml += `
<tr>
<td>${itemName}</td>
<td>${productId}</td>
<td>$${price.toFixed(2)}</td>
<td>${quantities}</td>
<td>$${subtotal.toFixed(2)}</td>
</tr>
`;
    });

    itemsBody.innerHTML = itemsHtml;
  }

  // Fill in order totals with multiple fallback options
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

  // Try to get COD Charges
  let codCharges = 0;
  if (typeof order["COD Charges"] === "number") {
    codCharges = order["COD Charges"];
  } else if (order.order && typeof order.order.codCharges === "number") {
    codCharges = order.order.codCharges;
  } else if (typeof order.codCharges === "number") {
    codCharges = order.codCharges;
  }

  // Show or hide the COD Charges row
  const codChargesRow = document.getElementById("codChargesRow");
  const codChargesCell = document.getElementById("detailCODCharges");
  if (codCharges && codCharges > 0) {
    codChargesRow.style.display = "";
    codChargesCell.textContent = `$${codCharges.toFixed(2)}`;
  } else {
    codChargesRow.style.display = "none";
    codChargesCell.textContent = "";
  }

  // Try to get total
  if (typeof order["Total"] === "number") {
    total = order["Total"];
  } else if (order.order && typeof order.order.total === "number") {
    total = order.order.total;
  } else if (typeof order.total === "number") {
    total = order.total;
  } else {
    total = subtotal + tax + shipping;
  }

  document.getElementById("detailSubtotal").textContent = `$${subtotal.toFixed(
    2
  )}`;
  document.getElementById("detailTax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("detailShipping").textContent = `$${shipping.toFixed(
    2
  )}`;
  document.getElementById("detailTotal").textContent = `$${total.toFixed(2)}`;

  // Set up update form with current values
  document.getElementById("updateOrderId").value = selectedOrderId;
  document.getElementById("orderStatus").value =
    order["Order Status"] || order.status || "Order Placed";
  document.getElementById("courier").value =
    order["Courier"] || order.courier || "";
  document.getElementById("trackingId").value =
    order["Tracking ID"] || order.trackingId || "";
  document.getElementById("comments").value =
    order["Comments"] || order.comments || "";

  // Scroll to details
  document.getElementById("orderDetail").scrollIntoView({ behavior: "smooth" });
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
  };

  console.log("Updating order with data:", formData); // Debug log

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

  console.log("Sending request:", requestBody); // Debug log

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
      console.log("Response status:", response.status); // Debug log

      // For Google Apps Script, we might get an opaque response due to CORS
      // But if the request completes without error, it likely succeeded
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
