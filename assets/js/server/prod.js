// Configuration - Replace with your actual Google Apps Script URL
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw3oo0-y7JmTFJWmuhQh0JlP5XChr-094wrLbUqcoXda4jb94eONb-d21qOYZ6RjSon/exec";

let barChart = null;
let pieChart = null;
let dashboardData = null;
let currentFilter = "";

// Vibrant color palette for charts
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

// Initialize dashboard on page load
document.addEventListener("DOMContentLoaded", function () {
  loadDashboard();
});

async function loadDashboard() {
  showLoading(true);
  hideError();

  try {
    // Load product stats
    const statsResponse = await fetchData("getProductStats");

    if (!statsResponse.success) {
      throw new Error(statsResponse.message || "Failed to load data");
    }

    dashboardData = {
      stats: statsResponse.stats || [],
    };

    populateFilters();
    updateDashboard();
  } catch (error) {
    console.error("Error loading dashboard:", error);
    showError("Failed to load dashboard data: " + error.message);
  } finally {
    showLoading(false);
  }
}

async function fetchData(action, params = {}) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.append("action", action);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url);
  return await response.json();
}

function populateFilters() {
  const categoryFilter = document.getElementById("categoryFilter");
  const categories = [
    ...new Set(
      dashboardData.stats.map((stat) => stat.category).filter((cat) => cat)
    ),
  ];

  categoryFilter.innerHTML = '<option value="">All Categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function updateDashboard() {
  const filteredData = applyFilters();
  updateStatCards(filteredData);
  updateCharts(filteredData);
  updateProductsTable(filteredData);
  updateOverview(dashboardData); // Always use full data for overview
  updateFilterIndicator();

  document.getElementById("dashboardContent").style.display = "block";
}

function updateDashboardWithFilters() {
  currentFilter = document.getElementById("categoryFilter").value;
  updateDashboard();
}

function clearFilters() {
  document.getElementById("categoryFilter").value = "";
  currentFilter = "";
  updateDashboard();
}

function updateFilterIndicator() {
  const indicator = document.getElementById("filterIndicator");
  const filterText = document.getElementById("filterText");

  if (currentFilter) {
    indicator.style.display = "block";
    filterText.textContent = `Showing data filtered by category: ${currentFilter}`;
  } else {
    indicator.style.display = "none";
  }
}

function applyFilters() {
  let filteredStats = dashboardData.stats;

  // Apply category filter
  if (currentFilter) {
    filteredStats = filteredStats.filter(
      (stat) => stat.category === currentFilter
    );
  }

  return {
    stats: filteredStats,
  };
}

function updateStatCards(data) {
  const totalProducts = data.stats.length;
  const totalViews = data.stats.reduce(
    (sum, stat) => sum + (stat.viewCount || 0),
    0
  );
  const avgTimeSpent =
    data.stats.length > 0
      ? data.stats.reduce((sum, stat) => sum + (stat.avgTimeSpent || 0), 0) /
        data.stats.length
      : 0;

  document.getElementById("totalProducts").textContent =
    totalProducts.toLocaleString();
  document.getElementById("totalViews").textContent =
    totalViews.toLocaleString();
  document.getElementById("avgTimeSpent").textContent =
    Math.round(avgTimeSpent) + "s";

  // Update descriptions based on filter
  if (currentFilter) {
    document.getElementById(
      "totalProductsChange"
    ).textContent = `Products in ${currentFilter} category`;
    document.getElementById(
      "totalViewsChange"
    ).textContent = `Views for ${currentFilter} products`;
    document.getElementById(
      "avgTimeSpentChange"
    ).textContent = `Avg time for ${currentFilter} products`;
  } else {
    document.getElementById("totalProductsChange").textContent =
      "Active products in catalog";
    document.getElementById("totalViewsChange").textContent =
      "Product page visits";
    document.getElementById("avgTimeSpentChange").textContent =
      "Per product view";
  }
}

function updateCharts(data) {
  updateBarChart(data);
  updatePieChart(data);
}

function updateBarChart(data) {
  let chartData = {};
  let chartTitle = "Product Views by Category";

  if (currentFilter) {
    // When a category is selected, show subcategories within that category
    data.stats.forEach((stat) => {
      const subcategory = stat.subCategory || "Uncategorized";
      if (!chartData[subcategory]) {
        chartData[subcategory] = 0;
      }
      chartData[subcategory] += stat.viewCount || 0;
    });
    chartTitle = `Product Views by Subcategory (${currentFilter})`;
  } else {
    // When no category is selected, show categories
    data.stats.forEach((stat) => {
      const category = stat.category || "Uncategorized";
      if (!chartData[category]) {
        chartData[category] = 0;
      }
      chartData[category] += stat.viewCount || 0;
    });
  }

  const ctx = document.getElementById("barChart").getContext("2d");

  if (barChart) {
    barChart.destroy();
  }

  const labels = Object.keys(chartData);
  const backgroundColors = labels.map(
    (_, index) => vibrantColors[index % vibrantColors.length]
  );
  const borderColors = backgroundColors.map((color) => color);

  // Update chart title
  document.querySelector(".chart-container h3").textContent = chartTitle;

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Views",
          data: Object.values(chartData),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#fff",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: "#666",
            font: {
              size: 12,
              weight: "500",
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#666",
            font: {
              size: 12,
              weight: "500",
            },
          },
        },
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
    },
  });
}

function updatePieChart(data) {
  let chartData = {};
  let chartTitle = "Category Distribution";

  if (currentFilter) {
    // When a category is selected, show subcategories within that category
    data.stats.forEach((stat) => {
      const subcategory = stat.subCategory || "Uncategorized";
      if (!chartData[subcategory]) {
        chartData[subcategory] = 0;
      }
      chartData[subcategory] += stat.viewCount || 0;
    });
    chartTitle = `Subcategory Distribution (${currentFilter})`;
  } else {
    // When no category is selected, show categories
    data.stats.forEach((stat) => {
      const category = stat.category || "Uncategorized";
      if (!chartData[category]) {
        chartData[category] = 0;
      }
      chartData[category] += stat.viewCount || 0;
    });
  }

  const ctx = document.getElementById("pieChart").getContext("2d");

  if (pieChart) {
    pieChart.destroy();
  }

  const labels = Object.keys(chartData);
  const backgroundColors = labels.map(
    (_, index) => vibrantColors[index % vibrantColors.length]
  );

  // Update chart title
  document.querySelectorAll(".chart-container h3")[1].textContent = chartTitle;

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: Object.values(chartData),
          backgroundColor: backgroundColors,
          borderWidth: 3,
          borderColor: "#fff",
          hoverBorderWidth: 4,
          hoverBorderColor: "#fff",
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
            pointStyle: "circle",
            font: {
              size: 12,
              weight: "500",
            },
            color: "#333",
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
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return (
                context.label +
                ": " +
                context.formattedValue +
                " (" +
                percentage +
                "%)"
              );
            },
          },
        },
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
      cutout: "60%",
    },
  });
}

function updateProductsTable(data) {
  const tableBody = document.getElementById("productsTableBody");
  const tableTitle = document.getElementById("productsTableTitle");
  tableBody.innerHTML = "";

  // Update table title based on filter
  if (currentFilter) {
    tableTitle.textContent = `${currentFilter} Products Statistics`;
  } else {
    tableTitle.textContent = " Individual Product Statistics";
  }

  // Sort products by view count (descending)
  const sortedProducts = data.stats.sort(
    (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
  );

  if (sortedProducts.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align: center; padding: 40px; color: #666;">No products found for the selected filter</td>`;
    tableBody.appendChild(row);
    return;
  }

  sortedProducts.forEach((product) => {
    const row = document.createElement("tr");

    const totalTime = Math.floor((product.totalTimeSpent || 0) / 60);
    const totalTimeFormatted =
      totalTime > 0 ? `${totalTime}m` : `${product.totalTimeSpent || 0}s`;

    row.innerHTML = `
            <td class="product-title" title="${
              product.productTitle || "N/A"
            }">${product.productTitle || "N/A"}</td>
            <td>${product.category || "N/A"}</td>
            <td>${product.subCategory || "N/A"}</td>
            <td class="stat-value">${(
              product.viewCount || 0
            ).toLocaleString()}</td>
            <td class="stat-value">${totalTimeFormatted}</td>
            <td class="stat-value">${Math.round(
              product.avgTimeSpent || 0
            )}s</td>
          `;

    tableBody.appendChild(row);
  });
}

function updateOverview(data) {
  // Always use full dataset for overview (not filtered data)
  const allStats = data.stats;

  // Top performing product by views
  const topProduct = allStats.reduce(
    (max, stat) => ((stat.viewCount || 0) > (max.viewCount || 0) ? stat : max),
    { productTitle: "N/A", viewCount: 0, totalTimeSpent: 0 }
  );

  document.getElementById("topProductName").textContent =
    topProduct.productTitle;
  const topProductTime = Math.floor((topProduct.totalTimeSpent || 0) / 60);
  const topProductTimeFormatted =
    topProductTime > 0
      ? `${topProductTime}m`
      : `${topProduct.totalTimeSpent || 0}s`;
  document.getElementById("topProductStats").textContent = `${(
    topProduct.viewCount || 0
  ).toLocaleString()} views • ${topProductTimeFormatted} total time`;

  // Most popular category
  const categoryStats = {};
  allStats.forEach((stat) => {
    const category = stat.category || "Uncategorized";
    if (!categoryStats[category]) {
      categoryStats[category] = 0;
    }
    categoryStats[category] += stat.viewCount || 0;
  });

  const topCategory = Object.keys(categoryStats).reduce(
    (a, b) => (categoryStats[a] > categoryStats[b] ? a : b),
    "N/A"
  );
  document.getElementById("topCategory").textContent = topCategory;
  document.getElementById("topCategoryStats").textContent = `${(
    categoryStats[topCategory] || 0
  ).toLocaleString()} total views`;

  // Best engagement product (highest average time)
  const bestEngagement = allStats.reduce(
    (max, stat) =>
      (stat.avgTimeSpent || 0) > (max.avgTimeSpent || 0) ? stat : max,
    { productTitle: "N/A", avgTimeSpent: 0, viewCount: 0 }
  );

  document.getElementById("bestEngagementProduct").textContent =
    bestEngagement.productTitle;
  document.getElementById("bestEngagementStats").textContent = `${Math.round(
    bestEngagement.avgTimeSpent || 0
  )}s avg • ${(bestEngagement.viewCount || 0).toLocaleString()} views`;

  // Total session time
  const totalTime = allStats.reduce(
    (sum, stat) => sum + (stat.totalTimeSpent || 0),
    0
  );
  const hours = Math.floor(totalTime / 3600);
  const minutes = Math.floor((totalTime % 3600) / 60);
  document.getElementById("totalSessionTime").textContent =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function showLoading(show) {
  document.getElementById("loadingIndicator").style.display = show
    ? "block"
    : "none";
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}

function hideError() {
  document.getElementById("errorMessage").style.display = "none";
}

// Auto-refresh every 5 minutes
setInterval(loadDashboard, 5 * 60 * 1000);
