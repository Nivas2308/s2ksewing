// Configuration
      const APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbxkaAzwdOqLhbg8c5wPwyS5la0Esd5qJEFccqzw8gq0alo1Eu8AVcsUHo7FwElrohzv/exec";

      // Global variables
      let allOrders = [];
      let filteredOrders = [];
      let currentFilter = "all";
      let currentUser = null;

      // Initialize page
      document.addEventListener("DOMContentLoaded", function () {
        // Hide loader after a brief delay
        setTimeout(() => {
          document.getElementById("loader").style.display = "none";
        }, 1000);

        // Check authentication first
        checkAuthentication();

        // Update profile icon and cart count
        updateProfileIcon();
        updateCartCount();

        // Set up event listeners for authenticated users
        setupEventListeners();
      });

      function checkAuthentication() {
        try {
          // Get user info from localStorage
          const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

          // Check if user is logged in and has required info
          if (
            userInfo &&
            userInfo.name &&
            (userInfo.userId || userInfo.id || userInfo.email)
          ) {
            currentUser = userInfo;

            // User is authenticated - show orders content
            document.getElementById("authMessage").style.display = "none";
            document.getElementById("ordersContent").style.display = "block";

            // Load orders for this user
            loadUserOrders();
          } else {
            // User is not authenticated - show login message
            document.getElementById("authMessage").style.display = "block";
            document.getElementById("ordersContent").style.display = "none";
          }
        } catch (error) {
          console.error("Error checking authentication:", error);
          // Show login message on error
          document.getElementById("authMessage").style.display = "block";
          document.getElementById("ordersContent").style.display = "none";
        }
      }

      function updateProfileIcon() {
        const profileIcon = document.getElementById("profile-icon");
        const profileLink = document.getElementById("profile-link");

        if (currentUser && currentUser.name) {
          const firstLetter = currentUser.name.charAt(0).toUpperCase();
          profileIcon.classList.remove("fa", "fa-user-circle");
          profileIcon.innerHTML = firstLetter;
          profileIcon.classList.add("user-initial");
          profileLink.href = "cp.html";
        } else {
          profileIcon.innerHTML = "";
          profileIcon.classList.add("fa", "fa-user-circle");
          profileIcon.classList.remove("user-initial");
          profileLink.href = "login.html";
        }
      }

      function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
        const counter = document.getElementById("cart-count");
        if (counter) {
          counter.textContent = cart.length;
          counter.style.display = cart.length > 0 ? "flex" : "none";
        }
      }

      function setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll(".tab");
        tabs.forEach((tab) => {
          tab.addEventListener("click", function () {
            const filter = this.dataset.filter;
            switchTab(filter);
          });
        });

        // Search input
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.addEventListener("input", function () {
            if (this.value.length === 0) {
              searchOrders();
            }
          });

          searchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
              searchOrders();
            }
          });
        }

        // Storage events for real-time updates
        window.addEventListener("storage", function (e) {
          if (e.key === "userInfo") {
            // User login/logout detected
            location.reload();
          } else if (e.key === "shoppingCart") {
            updateCartCount();
          }
        });
      }

      async function loadUserOrders() {
        try {
          showLoading();

          // Get user ID - try multiple possible fields
          const userId =
            currentUser.userId || currentUser.id || currentUser.email;

          if (!userId) {
            showError("Unable to identify user. Please log in again.");
            return;
          }

          console.log("Loading orders for user:", userId);

          const response = await fetch(
            `${APPS_SCRIPT_URL}?action=getOrders&limit=50&userId=${encodeURIComponent(
              userId
            )}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log("Orders response:", data);

          if (data.success) {
            allOrders = data.orders || [];
            console.log("Loaded orders:", allOrders.length);
            filterOrders();
          } else {
            showError(data.message || "Failed to load orders");
          }
        } catch (error) {
          console.error("Error loading orders:", error);
          showError(
            "Failed to load orders. Please check your connection and try again."
          );
        }
      }

      function switchTab(filter) {
        // Update active tab
        document.querySelectorAll(".tab").forEach((tab) => {
          tab.classList.remove("active");
        });
        document
          .querySelector(`[data-filter="${filter}"]`)
          .classList.add("active");

        // Update current filter
        currentFilter = filter;

        // Filter and display orders
        filterOrders();
      }

      function filterOrders() {
        let filtered = [...allOrders];

        // Apply status filter
        if (currentFilter === "pending") {
          filtered = filtered.filter((order) => {
            const status = (
              order["Order Status"] ||
              order.status ||
              "pending"
            ).toLowerCase();
            return [
              "order placed",
              "processing",
              "pending",
              "shipped",
            ].includes(status);
          });
        } else if (currentFilter === "completed") {
          filtered = filtered.filter((order) => {
            const status = (
              order["Order Status"] ||
              order.status ||
              "pending"
            ).toLowerCase();
            return ["delivered", "completed"].includes(status);
          });
        }

        filteredOrders = filtered;
        displayOrders(filteredOrders);
      }

      function searchOrders() {
        const searchTerm = document
          .getElementById("searchInput")
          .value.toLowerCase()
          .trim();

        if (!searchTerm) {
          filterOrders();
          return;
        }

        const searched = filteredOrders.filter((order) => {
          const orderId = (order["Order ID"] || order.id || "").toLowerCase();
          const customerName = (order["Customer Name"] || "").toLowerCase();

          // Search in items
          let itemsMatch = false;
          if (order.items && Array.isArray(order.items)) {
            itemsMatch = order.items.some((item) =>
              (item.name || "").toLowerCase().includes(searchTerm)
            );
          }

          return (
            orderId.includes(searchTerm) ||
            customerName.includes(searchTerm) ||
            itemsMatch
          );
        });

        displayOrders(searched);
      }

      function displayOrders(orders) {
        const container = document.getElementById("ordersContainer");

        if (orders.length === 0) {
          container.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No orders found</h3>
                <p>You don't have any orders matching the current filter.</p>
                <p style="margin-top: 15px;">
                    <a href="index.html" class="login-btn" style="font-size: 0.9rem; padding: 10px 25px;">
                        <i class="fas fa-shopping-cart"></i> Start Shopping
                    </a>
                </p>
            </div>
        `;
          return;
        }

        const ordersHTML = orders
          .map((order) => createOrderCard(order))
          .join("");
        container.innerHTML = `<div class="orders-grid">${ordersHTML}</div>`;
      }

      function createOrderCard(order) {
        const orderId = order["Order ID"] || order.id || "N/A";
        const orderDate = formatDate(order["Date"] || order.date);
        const total = order["Total"] || order.total || 0;
        const status = order["Order Status"] || order.status || "pending";
        const paymentMethod =
          order["Payment Method"] || order.paymentMethod || "N/A";

        // Get items
        let items = [];
        if (order.items && Array.isArray(order.items)) {
          items = order.items;
        } else if (order["Items JSON"]) {
          try {
            items = JSON.parse(order["Items JSON"]);
          } catch (e) {
            items = [];
          }
        }

        // Create items display
        const itemsHTML = items
          .slice(0, 3)
          .map(
            (item) => `
        <div class="order-item">
            <div>
                <span class="item-name">${
                  item.name || item["Item Name"] || "Unknown Item"
                }</span>
                <span class="item-quantity">x${
                  item.quantity || item.Quantity || 1
                }</span>
            </div>
            <span class="item-price">$${parseFloat(
              item.price || item.Price || 0
            ).toFixed(2)}</span>
        </div>
    `
          )
          .join("");

        const moreItemsText =
          items.length > 3
            ? `<div style="color: #6c757d; font-size: 0.9rem; margin-top: 10px; text-align: center;">
             <i class="fas fa-plus-circle"></i> ${items.length - 3} more item${
                items.length - 3 !== 1 ? "s" : ""
              }
           </div>`
            : "";

        return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">
                    <i class="fas fa-receipt"></i> ${orderId}
                </div>
                <div class="order-date">
                    <i class="fas fa-calendar"></i> ${orderDate}
                </div>
            </div>
            
            <div class="order-items">
                ${itemsHTML}
                ${moreItemsText}
            </div>
            
            <div class="order-footer">
                <div class="order-total">
                    <i class="fas fa-dollar-sign"></i> ${parseFloat(
                      total
                    ).toFixed(2)}
                </div>
                <div class="order-actions">
                    <span class="status-badge ${getStatusClass(
                      status
                    )}">${formatStatus(status)}</span>
                    <button class="view-details-btn" onclick="viewOrderDetails('${orderId}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
      }

      function formatDate(dateString) {
        if (!dateString) return "N/A";

        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (e) {
          return "N/A";
        }
      }

      function getStatusClass(status) {
        const statusLower = (status || "").toLowerCase();

        if (["order placed", "pending"].includes(statusLower)) {
          return "pending";
        } else if (["processing"].includes(statusLower)) {
          return "processing";
        } else if (["shipped"].includes(statusLower)) {
          return "shipped";
        } else if (["delivered", "completed"].includes(statusLower)) {
          return "delivered";
        } else if (["cancelled"].includes(statusLower)) {
          return "cancelled";
        }

        return "pending";
      }

      function formatStatus(status) {
        if (!status) return "Pending";
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      }

      function viewOrderDetails(orderId) {
        const userId =
          currentUser.userId || currentUser.id || currentUser.email;
        const url = `orders.html?orderId=${encodeURIComponent(
          orderId
        )}&userId=${encodeURIComponent(userId)}`;
        window.location.href = url;
      }

      function showLoading() {
        document.getElementById("ordersContainer").innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Loading your orders...
        </div>
    `;
      }

      function showError(message) {
        document.getElementById("ordersContainer").innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i> ${message}
            <div style="margin-top: 15px;">
                <button onclick="loadUserOrders()" class="login-btn" style="font-size: 0.9rem; padding: 10px 25px;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        </div>
    `;
      }

      // Handle logout functionality
      function handleLogout() {
        if (confirm("Are you sure you want to logout?")) {
          localStorage.removeItem("userInfo");
          localStorage.setItem("logoutEvent", Date.now().toString());
          localStorage.removeItem("logoutEvent");
          location.reload();
        }
      }

      // Add logout functionality to logout buttons if any exist
      document.addEventListener("click", function (e) {
        if (e.target.matches('[data-action="logout"]')) {
          e.preventDefault();
          handleLogout();
        }
      });