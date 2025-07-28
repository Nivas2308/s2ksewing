const apiUrl =
  "https://script.google.com/macros/s/AKfycbxWFXxOe1m8YyNBjSeLVjUIU2iCS2HCEnxvBREMSDJQXkMkdo79bHUX1e50pgF157Ay/exec";

// Define sensitive fields that should be hidden
const sensitiveFields = [
  "password",
  "Password",
  "PASSWORD",
  "pass",
  "Pass",
  "PASS",
  "pwd",
  "Pwd",
  "PWD",
  "passcode",
  "Passcode",
  "PASSCODE",
  "pin",
  "Pin",
  "PIN",
  "secret",
  "Secret",
  "SECRET",
  "token",
  "Token",
  "TOKEN",
  "key",
  "Key",
  "KEY",
  "auth",
  "Auth",
  "AUTH",
  "credential",
  "Credential",
  "CREDENTIAL",
  "ssn",
  "SSN",
  "social_security",
  "credit_card",
  "creditcard",
  "card_number",
];

// Global variables for data management
let allData = [];
let filteredData = [];
let safeHeaders = [];
let currentPage = 1;
let pageSize = 25;
let searchTerm = "";

// Initialize event listeners
function initializeEventListeners() {
  // Search functionality
  document.getElementById("searchBox").addEventListener("input", function (e) {
    searchTerm = e.target.value.toLowerCase();
    filterData();
    currentPage = 1;
    displayCurrentPage();
  });

  // Page size change
  document
    .getElementById("pageSizeSelect")
    .addEventListener("change", function (e) {
      pageSize =
        e.target.value === "all"
          ? filteredData.length
          : parseInt(e.target.value);
      currentPage = 1;
      displayCurrentPage();
    });

  // Export buttons

  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", exportToExcel);
}

// Function to filter out sensitive columns
function filterSensitiveData(headers) {
  return headers.filter((header) => {
    const headerLower = header.toLowerCase();
    return !sensitiveFields.some((sensitive) =>
      headerLower.includes(sensitive.toLowerCase())
    );
  });
}

// Function to filter data based on search term
function filterData() {
  if (!searchTerm) {
    filteredData = [...allData];
    return;
  }

  filteredData = allData.filter((row) => {
    return safeHeaders.some((header) => {
      const value = row[header] || "";
      return String(value).toLowerCase().includes(searchTerm);
    });
  });
}

// Function to show debug information
function showDebug(message) {
  const debugSection = document.getElementById("debugSection");
  debugSection.innerHTML = `<div class="debug-info">Debug: ${message}</div>`;
  debugSection.style.display = "none";
}

// Function to show success information
function showSuccess(message) {
  const debugSection = document.getElementById("debugSection");
  debugSection.innerHTML = `<div class="success-info">${message}</div>`;
  debugSection.style.display = "block";
}

// Function to show filtered fields info
function showFilteredInfo(filteredCount) {
  if (filteredCount > 0) {
    const debugSection = document.getElementById("debugSection");
    const existingContent = debugSection.innerHTML;
    debugSection.innerHTML =
      existingContent +
      `<div class="filtered-info">🔒 ${filteredCount} sensitive field(s) hidden for security</div>`;
  }
}

// Main function to load data
async function loadData() {
  showDebug("Starting data load attempt...");

  // Try JSONP first (most reliable for Google Apps Script)
  try {
    await loadWithJSONP();
    return;
  } catch (error) {
    showDebug(`JSONP failed: ${error.message}`);
  }

  // Try standard fetch methods
  try {
    await loadWithFetch();
    return;
  } catch (error) {
    showDebug(`Fetch failed: ${error.message}`);
  }

  // If all methods fail
  showError(
    "Failed to load data. Please ensure the Google Apps Script is deployed and accessible."
  );
}

// Method 1: JSONP approach (recommended for Google Apps Script)
function loadWithJSONP() {
  return new Promise((resolve, reject) => {
    showDebug("Trying JSONP method...");

    const callbackName = "jsonpCallback_" + Date.now();
    const script = document.createElement("script");

    // Set up timeout
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out"));
    }, 15000); // 15 second timeout

    // Set up callback
    window[callbackName] = function (data) {
      try {
        clearTimeout(timeout);

        if (data && data.success && data.data && Array.isArray(data.data)) {
          processData(data.data);
          resolve();
        } else if (data && data.error) {
          reject(new Error(data.error));
        } else if (data && !data.success) {
          reject(new Error(data.message || "Request failed"));
        } else {
          reject(new Error("Invalid data format received"));
        }
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    function cleanup() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window[callbackName]) {
        delete window[callbackName];
      }
    }

    // Set up error handling
    script.onerror = function () {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("JSONP script failed to load"));
    };

    // Load script with callback parameter
    script.src = `${apiUrl}?action=getAllData&callback=${callbackName}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

// Method 2: Standard fetch with different approaches
async function loadWithFetch() {
  showDebug("Trying fetch method...");

  const methods = [
    // Try GET with action parameter
    {
      url: `${apiUrl}?action=getAllData&_=${Date.now()}`,
      options: {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
      },
    },
    // Try POST with form data
    {
      url: apiUrl,
      options: {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `action=getAllData&_=${Date.now()}`,
      },
    },
  ];

  for (let i = 0; i < methods.length; i++) {
    try {
      showDebug(`Trying fetch method ${i + 1}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(methods[i].url, {
        ...methods[i].options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.success && data.data && Array.isArray(data.data)) {
        processData(data.data);
        return;
      } else if (data && data.error) {
        throw new Error(data.error);
      } else if (data && !data.success) {
        throw new Error(data.message || "Request failed");
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (error) {
      showDebug(`Fetch method ${i + 1} failed: ${error.message}`);
      if (i === methods.length - 1) {
        throw error;
      }
    }
  }
}

// Process the loaded data
function processData(data) {
  if (data.length === 0) {
    showError("No customer data found in the spreadsheet.");
    return;
  }

  // Store the data
  allData = data;

  // Get all column headers from the first row
  const allHeaders = Object.keys(data[0]);

  // Filter out sensitive fields
  safeHeaders = filterSensitiveData(allHeaders);
  const filteredCount = allHeaders.length - safeHeaders.length;

  // Initialize filtered data
  filterData();

  showSuccess(`Successfully loaded ${data.length} customer records`);
  showFilteredInfo(filteredCount);

  // Setup the interface
  setupTable();
  displayCurrentPage();
  showControls();

  // Hide debug section after a delay
  setTimeout(() => {
    const debugSection = document.getElementById("debugSection");
    debugSection.style.display = "none";
  }, 5000);
}

// Setup the table headers
function setupTable() {
  const tableHead = document.getElementById("tableHead");

  tableHead.innerHTML = `
                <tr>
                    ${safeHeaders
                      .map((header) => `<th>${header}</th>`)
                      .join("")}
                </tr>
            `;
}

// Display the current page of data
function displayCurrentPage() {
  const tableBody = document.getElementById("tableBody");
  const table = document.getElementById("dataTable");
  const loading = document.getElementById("loadingSection");
  const noDataSection = document.getElementById("noDataSection");

  if (filteredData.length === 0) {
    table.style.display = "none";
    noDataSection.style.display = "block";
    document.getElementById("paginationSection").style.display = "none";
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  // Create table rows
  tableBody.innerHTML = pageData
    .map(
      (row) => `
                <tr>
                    ${safeHeaders
                      .map((header) => {
                        const value = row[header] || "";
                        // Escape HTML to prevent XSS
                        const escapedValue = String(value)
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                        return `<td>${escapedValue}</td>`;
                      })
                      .join("")}
                </tr>
            `
    )
    .join("");

  // Show table and hide loading/no data
  loading.style.display = "none";
  noDataSection.style.display = "none";
  table.style.display = "table";

  // Update pagination
  updatePagination(totalPages, startIndex + 1, endIndex);
}

// Update pagination controls
function updatePagination(totalPages, startIndex, endIndex) {
  const paginationInfo = document.getElementById("paginationInfo");
  const paginationControls = document.getElementById("paginationControls");
  const paginationSection = document.getElementById("paginationSection");

  // Update pagination info
  paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${
    filteredData.length
  } entries${searchTerm ? " (filtered)" : ""}`;

  // Generate pagination controls
  let paginationHTML = "";

  // Previous button
  paginationHTML += `<button onclick="changePage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  }>Previous</button>`;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHTML += `<button onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span>...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `<button onclick="changePage(${i})" ${
      i === currentPage ? 'class="active"' : ""
    }>${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span>...</span>`;
    }
    paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  // Next button
  paginationHTML += `<button onclick="changePage(${currentPage + 1})" ${
    currentPage === totalPages ? "disabled" : ""
  }>Next</button>`;

  // Go to page input
  paginationHTML += `
                <span style="margin-left: 15px;">Go to page:</span>
                <input type="number" class="page-input" min="1" max="${totalPages}" value="${currentPage}" onchange="goToPage(this.value)">
            `;

  paginationControls.innerHTML = paginationHTML;
  paginationSection.style.display = totalPages > 1 ? "flex" : "none";
}

// Change page function
function changePage(page) {
  const totalPages = Math.ceil(filteredData.length / pageSize);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    displayCurrentPage();
  }
}

// Go to specific page
function goToPage(page) {
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageNum = parseInt(page);
  if (pageNum >= 1 && pageNum <= totalPages) {
    changePage(pageNum);
  }
}

// Show controls
function showControls() {
  document.getElementById("controlsSection").style.display = "flex";
}

// Export to CSV
function exportToCSV() {
  if (filteredData.length === 0) {
    alert("No data to export");
    return;
  }

  let csvContent = "";

  // Add headers
  csvContent += safeHeaders.map((header) => `"${header}"`).join(",") + "\n";

  // Add data rows
  filteredData.forEach((row) => {
    const csvRow = safeHeaders
      .map((header) => {
        const value = row[header] || "";
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");
    csvContent += csvRow + "\n";
  });

  // Create and download file
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `customer_data_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to Excel (using a simple HTML table method)
function exportToExcel() {
  if (filteredData.length === 0) {
    alert("No data to export");
    return;
  }

  let excelContent = `
                <table border="1">
                    <thead>
                        <tr>
                            ${safeHeaders
                              .map((header) => `<th>${header}</th>`)
                              .join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData
                          .map(
                            (row) => `
                            <tr>
                                ${safeHeaders
                                  .map((header) => {
                                    const value = row[header] || "";
                                    return `<td>${String(value)
                                      .replace(/&/g, "&amp;")
                                      .replace(/</g, "&lt;")
                                      .replace(/>/g, "&gt;")}</td>`;
                                  })
                                  .join("")}
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            `;

  const blob = new Blob([excelContent], {
    type: "application/vnd.ms-excel",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `customer_data_${new Date().toISOString().split("T")[0]}.xls`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showError(message) {
  const loading = document.getElementById("loadingSection");
  const errorSection = document.getElementById("errorSection");

  loading.style.display = "none";
  errorSection.innerHTML = `
                <div class="error">
                    ${message}
                    <br><br>
                    <button class="retry-btn" onclick="retryLoad()">Retry</button>
                </div>
            `;
  errorSection.style.display = "block";
}

function retryLoad() {
  const loading = document.getElementById("loadingSection");
  const errorSection = document.getElementById("errorSection");
  const table = document.getElementById("dataTable");
  const debugSection = document.getElementById("debugSection");
  const controlsSection = document.getElementById("controlsSection");
  const paginationSection = document.getElementById("paginationSection");
  const noDataSection = document.getElementById("noDataSection");

  // Reset display
  loading.style.display = "block";
  errorSection.style.display = "none";
  table.style.display = "none";
  debugSection.style.display = "none";
  controlsSection.style.display = "none";
  paginationSection.style.display = "none";
  noDataSection.style.display = "none";

  // Reset variables
  allData = [];
  filteredData = [];
  currentPage = 1;
  searchTerm = "";

  // Retry loading
  loadData();
}

// Load data when page loads
window.onload = function () {
  initializeEventListeners();
  loadData();
};
