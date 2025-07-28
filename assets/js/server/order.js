// ============ CONFIGURATION ============
// Replace this URL with your actual Google Apps Script Web App URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzxf6QIcDxddugHTflm8lXtHcDo4gs0qGxqNznHGnet8AHf7esaYsVGXXoBTXKsMpgh/exec";

// ============ DASHBOARD CODE ============
let salesChart, statusChart;
let allOrders = [];

function showMessage(message, type = "info") {
  const messageDiv = document.getElementById("message");
  messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => {
    messageDiv.innerHTML = "";
  }, 5000);
}

function hideLoadingIndicators() {
  // Hide chart loading indicators
  const salesLoading = document.getElementById("salesChartLoading");
  const statusLoading = document.getElementById("statusChartLoading");
  if (salesLoading) salesLoading.style.display = "none";
  if (statusLoading) statusLoading.style.display = "none";
}

async function fetchData() {
  const dateRange = document.getElementById("dateRange").value;

  // Check if URL is configured
  if (WEB_APP_URL.includes("YOUR_SCRIPT_ID")) {
    showMessage(
      "Please configure the WEB_APP_URL in the JavaScript code with your actual Google Apps Script URL",
      "error"
    );
    return;
  }

  showMessage("Loading dashboard data...", "info");

  try {
    // Fetch all orders
    const response = await fetch(
      `${WEB_APP_URL}?action=getAllOrders&limit=1000`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to fetch data");
    }

    allOrders = data.orders || [];

    // Filter orders by date range
    const filteredOrders = filterOrdersByDate(allOrders, dateRange);

    // Update dashboard
    updateStats(filteredOrders);
    updateCharts(filteredOrders);
    updateTopPerformers(filteredOrders);

    hideLoadingIndicators();
    showMessage("Dashboard loaded successfully!", "success");
  } catch (error) {
    console.error("Error fetching data:", error);
    showMessage(`Error loading data: ${error.message}`, "error");
    hideLoadingIndicators();
  }
}

function filterOrdersByDate(orders, days) {
  if (days === "all") return orders;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

  return orders.filter((order) => {
    const orderDate = new Date(order.Date);
    return orderDate >= cutoffDate;
  });
}

function updateStats(orders) {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (parseFloat(order.Total) || 0),
    0
  );
  const deliveredOrders = orders.filter(
    (order) =>
      order["Order Status"] === "Delivered" ||
      order["Order Status"] === "Completed"
  ).length;
  const pendingOrders = orders.filter(
    (order) =>
      order["Order Status"] === "Order Placed" ||
      order["Order Status"] === "Processing"
  ).length;

  document.getElementById("totalOrders").textContent =
    totalOrders.toLocaleString();
  document.getElementById(
    "totalRevenue"
  ).textContent = `$${totalRevenue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("deliveredProducts").textContent =
    deliveredOrders.toLocaleString();
  document.getElementById("pendingProducts").textContent =
    pendingOrders.toLocaleString();
}

function updateCharts(orders) {
  updateSalesChart(orders);
  updateStatusChart(orders);
}

function getDateGrouping(dateRange) {
  if (dateRange <= 7) return "day";
  if (dateRange <= 90) return "week";
  if (dateRange <= 365) return "month";
  return "year";
}

function formatDateByGrouping(date, grouping) {
  const d = new Date(date);

  switch (grouping) {
    case "day":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "week":
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return `Week of ${weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    case "month":
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    case "year":
      return d.getFullYear().toString();
    default:
      return d.toLocaleDateString();
  }
}

function getDateKey(date, grouping) {
  const d = new Date(date);

  switch (grouping) {
    case "day":
      return d.toISOString().split("T")[0];
    case "week":
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split("T")[0];
    case "month":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    case "year":
      return d.getFullYear().toString();
    default:
      return d.toISOString().split("T")[0];
  }
}

function updateSalesChart(orders) {
  const dateRange = parseInt(document.getElementById("dateRange").value) || 30;
  const grouping = getDateGrouping(dateRange);

  // Group orders by date period
  const salesByPeriod = {};
  orders.forEach((order) => {
    const dateKey = getDateKey(order.Date, grouping);
    salesByPeriod[dateKey] =
      (salesByPeriod[dateKey] || 0) + (parseFloat(order.Total) || 0);
  });

  // Sort periods and format labels
  const sortedPeriods = Object.keys(salesByPeriod).sort();
  const labels = sortedPeriods.map((period) =>
    formatDateByGrouping(period, grouping)
  );
  const salesData = sortedPeriods.map((period) => salesByPeriod[period]);

  if (salesChart) {
    salesChart.destroy();
  }

  const ctx = document.getElementById("salesChart").getContext("2d");
  salesChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Sales by ${grouping} ($)`,
          data: salesData,
          borderColor: "#4caf50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#4caf50",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        resize: {
          duration: 0, // Disable only resize animations
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
        },
        x: {
          ticks: {
            maxTicksLimit: grouping === "day" ? 15 : 10,
            maxRotation: 45,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });
}

function updateStatusChart(orders) {
  // Count orders by status
  const statusCounts = {};
  orders.forEach((order) => {
    const status = order["Order Status"] || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);

  // Updated color palette with vibrant, distinct colors
  const colors = [
    "#FF6B6B", // Coral Red - for urgent/cancelled statuses
    "#4ECDC4", // Turquoise - for processing
    "#45B7D1", // Sky Blue - for pending
    "#96CEB4", // Mint Green - for completed/delivered
    "#FFEAA7", // Soft Yellow - for placed orders
    "#DDA0DD", // Plum - for review/approval
    "#FFB347", // Peach - for shipped
    "#98D8C8", // Mint - for confirmed
    "#F7DC6F", // Light Gold - for payment pending
    "#BB8FCE", // Lavender - for other statuses
    "#85C1E9", // Light Blue - for archived
    "#F8C471", // Light Orange - for refunded
  ];

  if (statusChart) {
    statusChart.destroy();
  }

  const ctx = document.getElementById("statusChart").getContext("2d");
  statusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 3,
          borderColor: "#fff",
          hoverBorderWidth: 4,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        resize: {
          duration: 0, // Disable only resize animations
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: "circle",
            font: {
              size: 12,
              weight: "500",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#fff",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed * 100) / total).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
      cutout: "60%",
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
      },
    },
  });
}

function updateTopPerformers(orders) {
  updateTopProducts(orders);
  updateTopCustomers(orders);
}

function updateTopProducts(orders) {
  const productSales = {};
  const productQuantities = {};
  const productIds = {};

  orders.forEach((order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const productName = item.name || item["Item Name"] || "Unknown Product";
        const productId = item.id || item["Product ID"] || "N/A";
        const quantity = parseInt(item.quantity || item.Quantity || 0);
        const revenue = parseFloat(item.price || item.Price || 0) * quantity;

        productSales[productName] = (productSales[productName] || 0) + revenue;
        productQuantities[productName] =
          (productQuantities[productName] || 0) + quantity;
        productIds[productName] = productId;
      });
    }
  });

  // Sort by revenue
  const sortedProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topProductsDiv = document.getElementById("topProducts");
  if (sortedProducts.length === 0) {
    topProductsDiv.innerHTML =
      '<div class="performance-item"><span>No product data available</span></div>';
    return;
  }

  topProductsDiv.innerHTML = sortedProducts
    .map(
      ([product, revenue]) => `
                <div class="performance-item">
                    <div class="performance-name">
                        <div>${product}</div>
                        <div style="font-size: 0.8rem; color: #666; margin-top: 2px;">ID: ${
                          productIds[product]
                        }</div>
                    </div>
                    <div class="performance-value">
                        $${revenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <div class="performance-count">${
                          productQuantities[product]
                        } sold</div>
                    </div>
                </div>
            `
    )
    .join("");
}

function updateTopCustomers(orders) {
  const customerSales = {};
  const customerOrders = {};
  const customerIds = {};

  orders.forEach((order) => {
    const customerName = order["Customer Name"] || "Unknown Customer";
    const customerId = order["Customer ID"] || order["User ID"] || "N/A";
    const revenue = parseFloat(order.Total || 0);
    customerSales[customerName] = (customerSales[customerName] || 0) + revenue;
    customerOrders[customerName] = (customerOrders[customerName] || 0) + 1;
    customerIds[customerName] = customerId;
  });

  // Sort by total spent
  const sortedCustomers = Object.entries(customerSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topCustomersDiv = document.getElementById("topCustomers");
  if (sortedCustomers.length === 0) {
    topCustomersDiv.innerHTML =
      '<div class="performance-item"><span>No customer data available</span></div>';
    return;
  }

  topCustomersDiv.innerHTML = sortedCustomers
    .map(
      ([customer, revenue]) => `
                <div class="performance-item">
                    <div class="performance-name">
                        <div>${customer}</div>
                        <div style="font-size: 0.8rem; color: #666; margin-top: 2px;">ID: ${
                          customerIds[customer]
                        }</div>
                    </div>
                    <div class="performance-value">
                        $${revenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <div class="performance-count">${
                          customerOrders[customer]
                        } orders</div>
                    </div>
                </div>
            `
    )
    .join("");
}

let resizeTimeout;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (salesChart) {
      salesChart.options.animation.duration = 0;
      salesChart.resize();
    }
    if (statusChart) {
      statusChart.options.animation.duration = 0;
      statusChart.resize();
    }
  }, 100); // Debounce resize calls
});

// Auto-load dashboard when page loads
window.addEventListener("DOMContentLoaded", function () {
  fetchData();
});
