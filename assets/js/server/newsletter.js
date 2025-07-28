const API_URL =
  "https://script.google.com/macros/s/AKfycby-Uo27yl3Q6dhKJeL_VbAzKrM4-GG51QBzFCrfudUAXsFLyR8GQ0NG1LGmbpKRk_sd/exec";

let trendsChart = null;
let sourcesChart = null;
let allSubscribers = []; // Store all subscribers for pagination
let currentPage = 1;
const subscribersPerPage = 10;

async function fetchData() {
  try {
    console.log("Fetching data from:", `${API_URL}?sheet=Newsletter`);

    const response = await fetch(`${API_URL}?sheet=Newsletter`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log("Raw response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid JSON response from server");
    }

    console.log("Parsed data:", data);

    // Check if data is an error response
    if (data && data.success === false) {
      throw new Error(data.message || "Unknown error from server");
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn("Data is not an array:", data);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

function processData(data) {
  console.log("Processing data:", data);

  if (!data || data.length === 0) {
    return {
      totalSubscribers: 0,
      newSubscribers: 0,
      topSource: "N/A",
      trendsData: [0, 0, 0, 0, 0, 0],
      sourceCounts: { website: 0, message: 0 },
      allSubscribers: [],
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Process monthly trends (last 6 months)
  const monthlyData = {};
  const sourceCounts = { website: 0, message: 0 };
  let newSubscribers = 0;

  // Sort subscribers by date (newest first)
  const sortedSubscribers = data.slice().sort((a, b) => {
    const dateA = new Date(a.Date || new Date());
    const dateB = new Date(b.Date || new Date());
    return dateB - dateA;
  });

  data.forEach((subscriber) => {
    try {
      // Handle different date formats
      let date;
      if (subscriber.Date) {
        date = new Date(subscriber.Date);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn("Invalid date found:", subscriber.Date);
          date = new Date(); // Use current date as fallback
        }
      } else {
        console.warn("No date found for subscriber:", subscriber);
        date = new Date(); // Use current date as fallback
      }

      const monthKey = date.toLocaleDateString("en-US", {
        month: "short",
      });

      // Count monthly signups
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey]++;

      // Count sources (handle case sensitivity)
      const source = (subscriber.Source || "website").toLowerCase();
      const normalizedSource = source === "message" ? "message" : "website";

      sourceCounts[normalizedSource]++;

      // Count new subscribers (last 30 days)
      if (date >= thirtyDaysAgo) {
        newSubscribers++;
      }
    } catch (error) {
      console.error("Error processing subscriber:", subscriber, error);
    }
  });

  // Create trends data for last 6 months
  const currentMonth = new Date().getMonth();
  const months = [
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
  const last6Months = [];

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    last6Months.push(months[monthIndex]);
  }

  const trendsData = last6Months.map((month) => monthlyData[month] || 0);

  const result = {
    totalSubscribers: data.length,
    newSubscribers,
    topSource:
      sourceCounts.website >= sourceCounts.message ? "Website" : "Message",
    trendsData,
    sourceCounts,
    allSubscribers: sortedSubscribers,
  };

  console.log("Processed data:", result);
  return result;
}

function updateStats(stats) {
  document.getElementById("total-subscribers").textContent =
    stats.totalSubscribers;
  document.getElementById("new-subscribers").textContent = stats.newSubscribers;
  document.getElementById("top-source").textContent = stats.topSource;
}

function createTrendsChart(data) {
  const ctx = document.getElementById("trendsChart").getContext("2d");

  if (trendsChart) {
    trendsChart.destroy();
  }

  // Get last 6 months labels
  const currentMonth = new Date().getMonth();
  const months = [
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
  const last6Months = [];

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    last6Months.push(months[monthIndex]);
  }

  trendsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: last6Months,
      datasets: [
        {
          label: "Newsletter Signups",
          data: data,
          borderColor: "#6fa85b",
          backgroundColor: "rgba(111, 168, 91, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#6fa85b",
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
        point: {
          hoverRadius: 10,
        },
      },
    },
  });
}

function createSourcesChart(sourceCounts) {
  const ctx = document.getElementById("sourcesChart").getContext("2d");

  if (sourcesChart) {
    sourcesChart.destroy();
  }

  const totalCount = sourceCounts.website + sourceCounts.message;

  // Don't create chart if no data
  if (totalCount === 0) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText(
      "No data available",
      ctx.canvas.width / 2,
      ctx.canvas.height / 2
    );
    return;
  }

  sourcesChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Website", "Message"],
      datasets: [
        {
          data: [sourceCounts.website, sourceCounts.message],
          backgroundColor: ["#4caf50", "#3498db"],
          borderWidth: 0,
          hoverOffset: 4,
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
            font: {
              size: 14,
            },
          },
        },
      },
      cutout: "60%",
    },
  });
}

function updateSubscribersTable(page = 1) {
  const tbody = document.getElementById("subscribers-tbody");
  tbody.innerHTML = "";

  if (!allSubscribers || allSubscribers.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="3" style="text-align: center; color: #666;">No subscribers found</td>';
    tbody.appendChild(row);
    updatePaginationControls(0, page);
    return;
  }

  // Calculate pagination
  const startIndex = (page - 1) * subscribersPerPage;
  const endIndex = startIndex + subscribersPerPage;
  const subscribersToShow = allSubscribers.slice(startIndex, endIndex);

  subscribersToShow.forEach((subscriber) => {
    const row = document.createElement("tr");

    // Handle date formatting
    let dateStr = "Unknown";
    if (subscriber.Date) {
      try {
        const date = new Date(subscriber.Date);
        if (!isNaN(date.getTime())) {
          dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }
      } catch (error) {
        console.error("Error formatting date:", subscriber.Date, error);
      }
    }

    const source = subscriber.Source || "website";
    const sourceClass =
      source.toLowerCase() === "website" ? "source-website" : "source-message";

    row.innerHTML = `
            <td>${subscriber.email || "N/A"}</td>
            <td>${dateStr}</td>
            <td><span class="source-badge ${sourceClass}">${source}</span></td>
        `;
    tbody.appendChild(row);
  });

  updatePaginationControls(allSubscribers.length, page);
}

function updatePaginationControls(totalSubscribers, currentPageNum) {
  const paginationContainer = document.getElementById("pagination-container");

  if (!paginationContainer) {
    // Create pagination container if it doesn't exist
    const container = document.createElement("div");
    container.id = "pagination-container";
    container.className = "pagination-container";
    container.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding: 15px 0;
            border-top: 1px solid #eee;
        `;

    // Insert after the subscribers table
    const table = document.querySelector(".subscribers-table").parentElement;
    table.appendChild(container);
  }

  const totalPages = Math.ceil(totalSubscribers / subscribersPerPage);
  currentPage = currentPageNum;

  if (totalPages <= 1) {
    document.getElementById("pagination-container").innerHTML = "";
    return;
  }

  const startRecord =
    totalSubscribers === 0 ? 0 : (currentPage - 1) * subscribersPerPage + 1;
  const endRecord = Math.min(
    currentPage * subscribersPerPage,
    totalSubscribers
  );

  document.getElementById("pagination-container").innerHTML = `
        <div class="pagination-info" style="color: #666; font-size: 14px;">
            Showing ${startRecord}-${endRecord} of ${totalSubscribers} subscribers
        </div>
        <div class="pagination-controls" style="display: flex; gap: 10px; align-items: center;">
            <button 
                onclick="goToPage(${currentPage - 1})" 
                ${currentPage === 1 ? "disabled" : ""}
                style="
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    background: ${currentPage === 1 ? "#f5f5f5" : "#fff"};
                    color: ${currentPage === 1 ? "#999" : "#333"};
                    border-radius: 4px;
                    cursor: ${currentPage === 1 ? "not-allowed" : "pointer"};
                    font-size: 14px;
                "
            >
                Previous
            </button>
            
            <div class="page-numbers" style="display: flex; gap: 5px;">
                ${generatePageNumbers(currentPage, totalPages)}
            </div>
            
            <button 
                onclick="goToPage(${currentPage + 1})" 
                ${currentPage === totalPages ? "disabled" : ""}
                style="
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    background: ${
                      currentPage === totalPages ? "#f5f5f5" : "#fff"
                    };
                    color: ${currentPage === totalPages ? "#999" : "#333"};
                    border-radius: 4px;
                    cursor: ${
                      currentPage === totalPages ? "not-allowed" : "pointer"
                    };
                    font-size: 14px;
                "
            >
                Next
            </button>
        </div>
    `;
}

function generatePageNumbers(current, total) {
  let pages = [];

  // Always show first page
  if (current > 3) {
    pages.push(1);
    if (current > 4) {
      pages.push("...");
    }
  }

  // Show pages around current page
  for (
    let i = Math.max(1, current - 2);
    i <= Math.min(total, current + 2);
    i++
  ) {
    pages.push(i);
  }

  // Always show last page
  if (current < total - 2) {
    if (current < total - 3) {
      pages.push("...");
    }
    pages.push(total);
  }

  return pages
    .map((page) => {
      if (page === "...") {
        return '<span style="padding: 8px 4px; color: #999;">...</span>';
      }

      const isActive = page === current;
      return `
            <button 
                onclick="goToPage(${page})" 
                style="
                    padding: 8px 12px;
                    border: 1px solid ${isActive ? "#6fa85b" : "#ddd"};
                    background: ${isActive ? "#6fa85b" : "#fff"};
                    color: ${isActive ? "#fff" : "#333"};
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    min-width: 40px;
                "
            >
                ${page}
            </button>
        `;
    })
    .join("");
}

function goToPage(page) {
  if (
    page < 1 ||
    page > Math.ceil(allSubscribers.length / subscribersPerPage)
  ) {
    return;
  }

  currentPage = page;
  updateSubscribersTable(page);

  // Scroll to table top
  document.querySelector(".subscribers-table").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function showDebugInfo(message) {
  const debugDiv = document.getElementById("debug");
  debugDiv.innerHTML = message;
  debugDiv.style.display = "block";

  // Hide debug info after 10 seconds
  setTimeout(() => {
    debugDiv.style.display = "none";
  }, 10000);
}

async function loadDashboard() {
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");
  const content = document.getElementById("dashboard-content");

  loading.style.display = "block";
  error.style.display = "none";
  content.style.display = "none";

  try {
    console.log("Starting dashboard load...");
    const data = await fetchData();

    const stats = processData(data);

    // Store all subscribers globally for pagination
    allSubscribers = stats.allSubscribers;
    currentPage = 1; // Reset to first page on data reload

    updateStats(stats);
    createTrendsChart(stats.trendsData);
    createSourcesChart(stats.sourceCounts);
    updateSubscribersTable(1); // Start with page 1

    loading.style.display = "none";
    content.style.display = "block";

    console.log("Dashboard loaded successfully");
  } catch (err) {
    console.error("Dashboard load error:", err);
    loading.style.display = "none";
    error.style.display = "block";
    error.innerHTML = `
            <strong>Error loading data:</strong> ${err.message}<br>
            <small>Check the browser console for more details.</small><br>
            <button onclick="loadDashboard()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">Try Again</button>
        `;
  }
}

// Load dashboard on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting dashboard...");
  loadDashboard();
});

// Auto-refresh every 5 minutes
setInterval(loadDashboard, 5 * 60 * 1000);

// Add keyboard shortcut for manual refresh (Ctrl+R or Cmd+R)
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "r") {
    e.preventDefault();
    loadDashboard();
  }
});
