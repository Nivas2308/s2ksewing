// Configuration
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwwp9dqgdsh77s2H-uoV970UuGSeiCQ5_pbeC4P75uz-UND78MjDJtzZSUYV42iiegd/exec"; // Replace with your actual URL

// Global variables
let allCustomers = [];
let filteredCustomers = [];
let charts = {};
let currentPage = 1;
const rowsPerPage = 20;

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  loadCustomerData();
  setupDateFilters();
});

// Setup default date filters (last 30 days)
function setupDateFilters() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  document.getElementById("dateTo").valueAsDate = today;
  document.getElementById("dateFrom").valueAsDate = thirtyDaysAgo;
}

// Load customer data from Apps Script
async function loadCustomerData() {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getAllCustomers`);
    const result = await response.json();

    if (result.success && Array.isArray(result.customers)) {
      allCustomers = result.customers.map((c) => ({
        ...c,
        createdDate: new Date(c.createdDate), // ensure date format is correct
        status: c.status || "Active",
      }));
      filteredCustomers = [...allCustomers];
      updateDashboard();
    } else {
      throw new Error(result.message || "Failed to load customer data");
    }
  } catch (error) {
    console.error("Error loading customer data:", error);
    showError("Failed to load customer data from server.");
  }
}

function applyFilters() {
  const dateFromValue = document.getElementById("dateFrom").value;
  const dateToValue = document.getElementById("dateTo").value;
  const sortBy = document.getElementById("sortBy").value;

  const dateFrom = dateFromValue ? new Date(dateFromValue) : null;
  const dateTo = dateToValue ? new Date(dateToValue) : null;

  // Filter customers by date range only
  filteredCustomers = allCustomers.filter((customer) => {
    const customerDate = new Date(customer.createdDate);
    return (
      (!dateFrom || customerDate >= dateFrom) &&
      (!dateTo || customerDate <= dateTo)
    );
  });

  filteredCustomers.sort((a, b) => {
    if (sortBy === "createdDate") {
      return new Date(b.createdDate) - new Date(a.createdDate);
    } else if (sortBy === "userId") {
      // Sort numerically if userId is like S2K123456
      const numA = parseInt(a.userId.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.userId.replace(/\D/g, "")) || 0;
      return numA - numB;
    } else {
      const valA = a[sortBy] ? a[sortBy].toLowerCase().trim() : "";
      const valB = b[sortBy] ? b[sortBy].toLowerCase().trim() : "";
      return valA.localeCompare(valB);
    }
  });

  updateDashboard();
}

// Update all dashboard components
function updateDashboard() {
  updateStats();
  updateCharts();
  updateTable();
}

// Update statistics cards
function updateStats() {
  const now = new Date();
  const thisMonth = filteredCustomers.filter((customer) => {
    const customerDate = new Date(customer.createdDate);
    return (
      customerDate.getMonth() === now.getMonth() &&
      customerDate.getFullYear() === now.getFullYear()
    );
  });

  const activeUsers = filteredCustomers.filter(
    (customer) => customer.status === "Active"
  );

  const totalDays = filteredCustomers.reduce((sum, customer) => {
    return (
      sum +
      Math.floor((now - new Date(customer.createdDate)) / (1000 * 60 * 60 * 24))
    );
  }, 0);
  const avgAge =
    filteredCustomers.length > 0
      ? Math.round(totalDays / filteredCustomers.length)
      : 0;

  document.getElementById("totalCustomers").textContent =
    filteredCustomers.length;
  document.getElementById("newThisMonth").textContent = thisMonth.length;
  document.getElementById("activeUsers").textContent = activeUsers.length;
  document.getElementById("avgAge").textContent = avgAge;
}

// Update all charts
function updateCharts() {
  updateRegistrationChart();
  updateDomainChart();
  updateGrowthChart();
  updateActivityChart();
}

// Registration trends chart
function updateRegistrationChart() {
  const ctx = document.getElementById("registrationChart").getContext("2d");

  // Group by date
  const dateGroups = {};
  filteredCustomers.forEach((customer) => {
    const date = new Date(customer.createdDate).toDateString();
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });

  const sortedDates = Object.keys(dateGroups).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  const labels = sortedDates.map((date) => new Date(date).toLocaleDateString());
  const data = sortedDates.map((date) => dateGroups[date]);

  if (charts.registration) {
    charts.registration.destroy();
  }

  charts.registration = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "New Registrations",
          data: data,
          borderColor: "#4caf50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// Domain distribution chart - Updated with vibrant colors
function updateDomainChart() {
  const ctx = document.getElementById("domainChart").getContext("2d");

  const domainGroups = {};
  filteredCustomers.forEach((customer) => {
    const domain = customer.email.split("@")[1];
    domainGroups[domain] = (domainGroups[domain] || 0) + 1;
  });

  const labels = Object.keys(domainGroups);
  const data = Object.values(domainGroups);

  // New vibrant color palette for domain chart
  const domainColors = [
    "#FF6B6B", // Coral Red
    "#4ECDC4", // Turquoise
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FECA57", // Golden Yellow
    "#FF9FF3", // Pink
    "#54A0FF", // Blue
    "#5F27CD", // Purple
    "#00D2D3", // Cyan
    "#FF9F43", // Orange
    "#10AC84", // Emerald
    "#EE5A24", // Red Orange
    "#0984E3", // Royal Blue
    "#A29BFE", // Light Purple
    "#FD79A8", // Rose Pink
    "#FDCB6E", // Peach
    "#6C5CE7", // Violet
    "#A0E7E5", // Light Cyan
    "#FFB8B8", // Light Pink
    "#C8D6E5", // Light Blue Gray
  ];

  // Generate colors based on number of domains
  const colors = [];
  for (let i = 0; i < labels.length; i++) {
    colors.push(domainColors[i % domainColors.length]);
  }

  if (charts.domain) {
    charts.domain.destroy();
  }

  charts.domain = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
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
      resizeDelay: 0,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#fff",
          borderWidth: 1,
        },
      },
      cutout: "60%",
      elements: {
        arc: {
          hoverBackgroundColor: function (context) {
            // Slightly darken on hover
            const color = context.parsed;
            return colors[context.dataIndex];
          },
        },
      },
    },
  });
}

// Monthly growth chart - Updated with vibrant gradient colors
function updateGrowthChart() {
  const ctx = document.getElementById("growthChart").getContext("2d");

  const monthGroups = {};
  filteredCustomers.forEach((customer) => {
    const date = new Date(customer.createdDate);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    monthGroups[monthKey] = (monthGroups[monthKey] || 0) + 1;
  });

  const sortedMonths = Object.keys(monthGroups).sort();
  const labels = sortedMonths.map((month) => {
    const [year, monthNum] = month.split("-");
    return new Date(year, monthNum - 1).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  });
  const data = sortedMonths.map((month) => monthGroups[month]);

  // Create gradient colors for each bar
  const gradientColors = [
    "#FF6B6B", // Coral Red
    "#4ECDC4", // Turquoise
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint Green
    "#FECA57", // Golden Yellow
    "#FF9FF3", // Pink
    "#54A0FF", // Blue
    "#5F27CD", // Purple
    "#00D2D3", // Cyan
    "#FF9F43", // Orange
    "#10AC84", // Emerald
    "#EE5A24", // Red Orange
  ];

  // Generate background colors for bars
  const backgroundColors = data.map((_, index) => {
    return gradientColors[index % gradientColors.length];
  });

  // Generate border colors (slightly darker versions)
  const borderColors = backgroundColors.map((color) => {
    // Darken the color by reducing RGB values
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    return `rgb(${r}, ${g}, ${b})`;
  });

  if (charts.growth) {
    charts.growth.destroy();
  }

  charts.growth = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "New Customers",
          data: data,
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
      resizeDelay: 0,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#fff",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
      elements: {
        bar: {
          borderRadius: 6,
        },
      },
    },
  });
}

// Activity overview chart
function updateActivityChart() {
  const ctx = document.getElementById("activityChart").getContext("2d");

  const activeCount = filteredCustomers.filter(
    (c) => c.status === "Active"
  ).length;
  const inactiveCount = filteredCustomers.length - activeCount;

  if (charts.activity) {
    charts.activity.destroy();
  }

  charts.activity = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Active", "Inactive"],
      datasets: [
        {
          data: [activeCount, inactiveCount],
          backgroundColor: ["#4caf50", "#e0e0e0"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// Update customer table
function updateTable() {
  const tbody = document.getElementById("customersTableBody");
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);

  if (filteredCustomers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="no-data">No customers found matching your criteria</td></tr>';
    document.getElementById("pageInfo").textContent = "";
    return;
  }

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const customersToShow = filteredCustomers.slice(startIndex, endIndex);

  tbody.innerHTML = customersToShow
    .map(
      (customer) => `
        <tr>
            <td>${customer.userId}</td>
            <td>${customer.fullname}</td>
            <td>${customer.email}</td>
            <td>${customer.mobile}</td>
            <td>${customer.username}</td>
            <td>${new Date(customer.createdDate).toLocaleDateString()}</td>
            <td>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                    background: ${
                      customer.status === "Active" ? "#e8f5e8" : "#f5f5f5"
                    }; 
                    color: ${
                      customer.status === "Active" ? "#2e7d32" : "#666"
                    };">
                    ${customer.status}
                </span>
            </td>
        </tr>
    `
    )
    .join("");

  document.getElementById(
    "pageInfo"
  ).textContent = `Page ${currentPage} of ${totalPages}`;
}

// Generate colors for other charts (keeping original function for backward compatibility)
function generateColors(count) {
  const baseColors = [
    "#4caf50",
    "#66bb6a",
    "#81c784",
    "#a5d6a7",
    "#c8e6c9",
    "#388e3c",
    "#2e7d32",
    "#1b5e20",
    "#8bc34a",
    "#9ccc65",
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

// Show error message
function showError(message) {
  const tbody = document.getElementById("customersTableBody");
  tbody.innerHTML = `<tr><td colspan="7" class="error">${message}</td></tr>`;
}

// Pagination functions
function nextPage() {
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
}
