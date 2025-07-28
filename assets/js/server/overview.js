// API URLs - Replace with your actual Google Apps Script Web App URLs
const PRODUCTS_API =
  "https://script.google.com/macros/s/AKfycbwQyKC3urO0pq-dt5A8H6pzNRmkXhxbnI3nNtglkJKugfwu5_2PidYHcmWVoMf_P1ye/exec";
const CUSTOMERS_API =
  "https://script.google.com/macros/s/AKfycbwwp9dqgdsh77s2H-uoV970UuGSeiCQ5_pbeC4P75uz-UND78MjDJtzZSUYV42iiegd/exec?action=getAllCustomers";
const ORDERS_API =
  "https://script.google.com/macros/s/AKfycbzxf6QIcDxddugHTflm8lXtHcDo4gs0qGxqNznHGnet8AHf7esaYsVGXXoBTXKsMpgh/exec";

// Global chart instances
let categoryChart, customerChart, salesChart;

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
});

async function initializeDashboard() {
  try {
    // Load all data
    await Promise.all([loadProductData(), loadCustomerData(), loadOrderData()]);
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showError();
  }
}

async function loadProductData() {
  try {
    const response = await fetch(PRODUCTS_API);
    const data = await response.json();

    if (data && Array.isArray(data)) {
      updateProductStats(data);
      updateCategoryChart(data);
    } else {
      throw new Error("Invalid product data format");
    }
  } catch (error) {
    console.error("Error loading product data:", error);
    document.getElementById("totalProducts").textContent = "Error";
    document.getElementById("totalProducts").className = "stat-number error";
  }
}

async function loadCustomerData() {
  try {
    console.log("Fetching customer data from:", CUSTOMERS_API);
    const response = await fetch(CUSTOMERS_API);
    const data = await response.json();

    if (data && data.success && Array.isArray(data.customers)) {
      updateCustomerStats(data.customers);
      updateCustomerChart(data.customers);
    } else if (data && Array.isArray(data)) {
      updateCustomerStats(data);
      updateCustomerChart(data);
    } else {
      throw new Error("Invalid customer data format");
    }
  } catch (error) {
    console.error("Error loading customer data:", error);
    document.getElementById("totalCustomers").textContent = "Error";
    document.getElementById("totalCustomers").className = "stat-number error";
  }
}

async function loadOrderData() {
  try {
    console.log("Fetching order data...");

    // Fetch orders using getAllOrders action instead of getOrders
    // This will get orders from all users, not just GUEST
    const ordersResponse = await fetch(
      `${ORDERS_API}?action=getAllOrders&limit=10000`
    );
    const ordersData = await ordersResponse.json();

    if (ordersData && ordersData.success && Array.isArray(ordersData.orders)) {
      updateOrderStats(ordersData.orders);
      updateSalesChart(ordersData.orders);
    } else {
      throw new Error(
        "Invalid order data format: " + JSON.stringify(ordersData)
      );
    }
  } catch (error) {
    console.error("Error loading order data:", error);
    document.getElementById("totalOrders").textContent = "Error";
    document.getElementById("totalRevenue").textContent = "Error";
    document.getElementById("totalOrders").className = "stat-number error";
    document.getElementById("totalRevenue").className = "stat-number error";
  }
}

function updateProductStats(products) {
  const totalProducts = products.length;
  document.getElementById("totalProducts").textContent = totalProducts;
  document.getElementById("totalProducts").className = "stat-number";
}

function updateCustomerStats(customers) {
  const totalCustomers = customers.length;
  document.getElementById("totalCustomers").textContent = totalCustomers;
  document.getElementById("totalCustomers").className = "stat-number";
}

function updateOrderStats(orders) {
  console.log("Processing order stats with orders:", orders.length);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    const total = parseFloat(order.Total || order.total || 0);
    return sum + total;
  }, 0);

  document.getElementById("totalOrders").textContent =
    totalOrders.toLocaleString();
  document.getElementById(
    "totalRevenue"
  ).textContent = `$${totalRevenue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  document.getElementById("totalOrders").className = "stat-number";
  document.getElementById("totalRevenue").className = "stat-number";

  console.log(
    `Updated stats: ${totalOrders} orders, $${totalRevenue.toFixed(2)} revenue`
  );
}

function updateCategoryChart(products) {
  const categoryCount = {};

  products.forEach((product) => {
    const category = product.category || product.Category || "Uncategorized";
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  const labels = Object.keys(categoryCount);
  const data = Object.values(categoryCount);
  const colors = generateColors(labels.length);

  if (categoryChart) {
    categoryChart.destroy();
  }

  const ctx = document.getElementById("categoryChart").getContext("2d");
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            color: "#2c3e50",
            font: {
              weight: "600",
            },
          },
        },
      },
    },
  });
}

function updateCustomerChart(customers) {
  console.log("Updating customer chart with data:", customers.length);

  const monthlyData = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Initialize all months with 0
  monthNames.forEach((month) => {
    monthlyData[month] = 0;
  });

  customers.forEach((customer) => {
    let customerDate;

    if (customer.createdDate) {
      customerDate = new Date(customer.createdDate);
    } else if (customer.created_date) {
      customerDate = new Date(customer.created_date);
    } else if (customer.date) {
      customerDate = new Date(customer.date);
    } else {
      customerDate = new Date();
    }

    if (!isNaN(customerDate.getTime())) {
      const monthName = monthNames[customerDate.getMonth()];
      if (monthlyData[monthName] !== undefined) {
        monthlyData[monthName]++;
      }
    }
  });

  const labels = Object.keys(monthlyData);
  const data = Object.values(monthlyData);

  if (customerChart) {
    customerChart.destroy();
  }

  const ctx = document.getElementById("customerChart").getContext("2d");
  customerChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "New Customers",
          data: data,
          backgroundColor: "rgba(78, 205, 196, 0.8)",
          borderColor: "#4ECDC4",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: "#2c3e50",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "#2c3e50",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function updateSalesChart(orders) {
  console.log("Updating sales chart with orders:", orders.length);

  const monthlyData = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Initialize all months
  monthNames.forEach((month) => {
    monthlyData[month] = {
      orders: 0,
      revenue: 0,
    };
  });

  orders.forEach((order) => {
    let orderDate;

    // Handle different date field names
    if (order.Date) {
      orderDate = new Date(order.Date);
    } else if (order.date) {
      orderDate = new Date(order.date);
    } else {
      orderDate = new Date();
    }

    if (!isNaN(orderDate.getTime())) {
      const monthName = monthNames[orderDate.getMonth()];
      if (monthlyData[monthName] !== undefined) {
        monthlyData[monthName].orders++;
        const revenue = parseFloat(order.Total || order.total || 0);
        monthlyData[monthName].revenue += revenue;
      }
    }
  });

  const labels = Object.keys(monthlyData);
  const orderData = labels.map((month) => monthlyData[month].orders);
  const revenueData = labels.map((month) => monthlyData[month].revenue);

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
          label: "Monthly Orders",
          data: orderData,
          borderColor: "#FF6B6B",
          backgroundColor: "rgba(255, 107, 107, 0.1)",
          fill: true,
          tension: 0.4,
          yAxisID: "y",
          borderWidth: 3,
          pointBackgroundColor: "#FF6B6B",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
        },
        {
          label: "Monthly Revenue ($)",
          data: revenueData,
          borderColor: "#45B7D1",
          backgroundColor: "rgba(69, 183, 209, 0.1)",
          fill: true,
          tension: 0.4,
          yAxisID: "y1",
          borderWidth: 3,
          pointBackgroundColor: "#45B7D1",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Month",
            color: "#2c3e50",
            font: {
              weight: "600",
            },
          },
          ticks: {
            color: "#2c3e50",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Number of Orders",
            color: "#FF6B6B",
            font: {
              weight: "600",
            },
          },
          beginAtZero: true,
          ticks: {
            color: "#FF6B6B",
          },
          grid: {
            color: "rgba(255, 107, 107, 0.1)",
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Revenue ($)",
            color: "#45B7D1",
            font: {
              weight: "600",
            },
          },
          beginAtZero: true,
          ticks: {
            color: "#45B7D1",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#2c3e50",
            font: {
              weight: "600",
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.datasetIndex === 1) {
                return `${
                  context.dataset.label
                }: $${context.parsed.y.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              }
              return `${context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
      },
    },
  });

  console.log("Sales chart updated successfully");
}

function generateColors(count) {
  const vibrantColors = [
    "#FF6B6B", // Vibrant Red
    "#4ECDC4", // Turquoise
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FFEAA7", // Warm Yellow
    "#DDA0DD", // Plum
    "#98D8C8", // Seafoam
    "#F7DC6F", // Golden Yellow
    "#BB8FCE", // Lavender
    "#85C1E9", // Light Blue
    "#F8C471", // Peach
    "#82E0AA", // Light Green
    "#F1948A", // Salmon
    "#85C1E9", // Powder Blue
    "#D2B4DE", // Light Purple
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(vibrantColors[i % vibrantColors.length]);
  }
  return result;
}

function showError() {
  document.getElementById("totalProducts").textContent = "Error";
  document.getElementById("totalCustomers").textContent = "Error";
  document.getElementById("totalOrders").textContent = "Error";
  document.getElementById("totalRevenue").textContent = "Error";

  document.getElementById("totalProducts").className = "stat-number error";
  document.getElementById("totalCustomers").className = "stat-number error";
  document.getElementById("totalOrders").className = "stat-number error";
  document.getElementById("totalRevenue").className = "stat-number error";
}

// Refresh data every 5 minutes
setInterval(() => {
  console.log("Refreshing dashboard data...");
  initializeDashboard();
}, 300000);
