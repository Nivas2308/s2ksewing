// API URL - Update this with your Google Apps Script Web App URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbyTAjaNkFqI-9t8TlE9LyoKLpxcVha7KFy3r7nYFl_fGsrDyTjxW0CjkDwdeKL4XQs/exec";

// Global variables
let allEmployees = [];
let currentEmployees = [];
let itemsPerPage = 9;
let currentPage = 1;

// DOM elements
const employeeGrid = document.getElementById("employee-grid");
const loadingElement = document.getElementById("loading");
const noResultsElement = document.getElementById("no-results");
const searchInput = document.getElementById("search-input");
const departmentFilter = document.getElementById("department-filter");
const paginationElement = document.getElementById("pagination");

// Define departments and positions
const departmentsAndPositions = {
  sales: ["Supervisor", "Team Member", "Support"],
  marketing: ["Supervisor", "Team Member", "Support"],
  processing: ["Supervisor", "Team Member", "Support"],
  shipping: ["Supervisor", "Team Member", "Support"],
};

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchEmployees();
    setupEventListeners();
  } catch (error) {
    console.error("Error initializing app:", error);
    loadingElement.innerHTML =
      "Error loading employees. Please try again later.";
  }
});

// Fetch employees from the API
async function fetchEmployees() {
  try {
    loadingElement.style.display = "block";
    employeeGrid.innerHTML = "";

    const response = await fetch(`${API_URL}?action=getEmployees`);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      allEmployees = data;
      currentEmployees = [...allEmployees];
      renderEmployees();
    } else {
      throw new Error("Invalid data received from server");
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    loadingElement.innerHTML =
      "Failed to load employees. Please try again later.";
  }
}

// Set up event listeners
function setupEventListeners() {
  searchInput.addEventListener("input", filterEmployees);
  departmentFilter.addEventListener("change", filterEmployees);

  // Edit form submission
  document.getElementById("edit-form").addEventListener("submit", function (e) {
    e.preventDefault();
    updateEmployeeRole();
  });

  // Populate position dropdown when department changes
  document
    .getElementById("edit-department")
    .addEventListener("change", function () {
      populatePositions(this.value);
    });
}

// Filter employees based on search input and department filter
function filterEmployees() {
  const searchTerm = searchInput.value.toLowerCase();
  const departmentValue = departmentFilter.value.toLowerCase();

  currentEmployees = allEmployees.filter((employee) => {
    const matchesSearch =
      employee.firstName.toLowerCase().includes(searchTerm) ||
      employee.lastName.toLowerCase().includes(searchTerm) ||
      employee.position.toLowerCase().includes(searchTerm) ||
      (employee.employeeId &&
        employee.employeeId.toLowerCase().includes(searchTerm));

    const matchesDepartment =
      !departmentValue || employee.department.toLowerCase() === departmentValue;

    return matchesSearch && matchesDepartment;
  });

  currentPage = 1; // Reset to first page on new filter
  renderEmployees();
}

// Render employees to the grid
function renderEmployees() {
  loadingElement.style.display = "none";

  if (currentEmployees.length === 0) {
    employeeGrid.innerHTML = "";
    noResultsElement.style.display = "block";
    paginationElement.innerHTML = "";
    return;
  }

  noResultsElement.style.display = "none";

  // Calculate pagination
  const totalPages = Math.ceil(currentEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, currentEmployees.length);
  const pageEmployees = currentEmployees.slice(startIndex, endIndex);

  // Generate HTML for employee cards
  let employeeCardsHTML = "";

  pageEmployees.forEach((employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const imageUrl =
      employee.imageUrl && employee.imageUrl !== "No Image"
        ? employee.imageUrl
        : "/api/placeholder/120/120"; // Placeholder image

    employeeCardsHTML += `
<div class="employee-card">
    <div class="card-header">
        <div>S2K Employee</div>
        <div class="employee-id">${employee.employeeId || "N/A"}</div>
    </div>
    <div class="card-body">
        <img src="${imageUrl}" alt="${fullName}" class="profile-image">
        <h3 class="employee-name">${fullName}</h3>
        <div class="employee-position">${
          employee.position || "Position not assigned"
        }</div>
        <div class="employee-department">${
          employee.department || "Department not assigned"
        }</div>
        <div class="status-badge status-${employee.status.toLowerCase()}">${
      employee.status
    }</div>
    </div>
    <div class="card-actions">
        <button class="btn btn-outline" onclick="viewEmployeeDetails(${
          employee.id
        })">
            <i class="fas fa-eye"></i> View Details
        </button>
        <button class="btn btn-primary" onclick="openEditModal(${employee.id})">
            <i class="fas fa-edit"></i> Edit Role
        </button>
    </div>
</div>
`;
  });

  employeeGrid.innerHTML = employeeCardsHTML;
  renderPagination(totalPages);
}

// Render pagination controls
function renderPagination(totalPages) {
  if (totalPages <= 1) {
    paginationElement.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
<button class="pagination-button ${currentPage === 1 ? "disabled" : ""}" 
${
  currentPage === 1
    ? "disabled"
    : 'onclick="changePage(' + (currentPage - 1) + ')"'
}>
<i class="fas fa-chevron-left"></i>
</button>
`;
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
<button class="pagination-button ${i === currentPage ? "active" : ""}" 
    onclick="changePage(${i})">
    ${i}
</button>
`;
  }

  // Next button
  paginationHTML += `
<button class="pagination-button ${
    currentPage === totalPages ? "disabled" : ""
  }" 
${
  currentPage === totalPages
    ? "disabled"
    : 'onclick="changePage(' + (currentPage + 1) + ')"'
}>
<i class="fas fa-chevron-right"></i>
</button>
`;

  paginationElement.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  currentPage = page;
  renderEmployees();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
// remove function
async function removeEmployee() {
  const employeeId = document.getElementById("edit-employee-id").value;

  if (!employeeId) {
    alert("Please select an employee to remove");
    return;
  }

  if (!confirm("Are you sure you want to remove this employee?")) {
    return;
  }

  const removeButton = document.querySelector(".btn-danger");

  try {
    removeButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Removing...';
    removeButton.disabled = true;

    // Use URLSearchParams for compatibility with Google Apps Script
    const formData = new URLSearchParams();
    formData.append("action", "removeEmployee");
    formData.append("id", employeeId);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      mode: "no-cors", // Add this for Google Apps Script compatibility
    });

    // Since we're using no-cors, assume success and refresh data
    await fetchEmployees(); // Refresh the employee list
    closeModal("edit-modal");
    alert("Employee removed successfully");
  } catch (error) {
    console.error("Error:", error);
    alert("Error removing employee: " + error.message);
  } finally {
    removeButton.innerHTML = '<i class="fas fa-trash"></i> Remove Employee';
    removeButton.disabled = false;
  }
}

// View employee details
async function viewEmployeeDetails(employeeId) {
  try {
    // Use the cached data
    const employee = allEmployees.find((emp) => emp.id === employeeId);

    if (!employee) {
      throw new Error("Employee not found");
    }

    const fullName = `${employee.firstName} ${employee.lastName}`;
    const imageUrl =
      employee.imageUrl && employee.imageUrl !== "No Image"
        ? employee.imageUrl
        : "/api/placeholder/180/180"; // Placeholder image

    const detailsHTML = `
<div class="details-image">
    <img src="${imageUrl}" alt="${fullName}">
</div>
<div class="details-info">
    <div class="info-group">
        <div class="info-label">Employee ID</div>
        <div class="info-value">${employee.employeeId || "N/A"}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Name</div>
        <div class="info-value">${fullName}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Email</div>
        <div class="info-value">${employee.orgEmail || "N/A"}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Status</div>
        <div class="info-value">
            <span class="status-badge status-${employee.status.toLowerCase()}">${
      employee.status
    }</span>
        </div>
    </div>
    <div class="info-group">
        <div class="info-label">Department</div>
        <div class="info-value">${employee.department || "Not assigned"}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Position</div>
        <div class="info-value">${employee.position || "Not assigned"}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Phone</div>
        <div class="info-value">${employee.countryCode || ""} ${
      employee.mobileNumber || "N/A"
    }</div>
    </div>
    <div class="info-group">
        <div class="info-label">Registration Date</div>
        <div class="info-value">${employee.registrationDate || "N/A"}</div>
    </div>
    <div class="info-group">
        <div class="info-label">Address</div>
        <div class="info-value">
            ${employee.houseNumber || ""} ${employee.street || ""}<br>
            ${employee.city || ""}, ${employee.state || ""}<br>
            ${employee.country || ""}
        </div>
    </div>
</div>
`;

    document.getElementById("employee-details").innerHTML = detailsHTML;
    openModal("view-modal");
  } catch (error) {
    console.error("Error viewing employee details:", error);
    alert("Failed to load employee details. Please try again.");
  }
}

// Open edit modal
function openEditModal(employeeId) {
  const employee = allEmployees.find((emp) => emp.id === employeeId);

  if (!employee) {
    alert("Employee not found");
    return;
  }

  // Set the employee ID to the hidden field
  document.getElementById("edit-employee-id").value = employeeId;

  // Set the current department
  const departmentSelect = document.getElementById("edit-department");
  departmentSelect.value = employee.department
    ? employee.department.toLowerCase()
    : "";

  // Populate positions based on selected department
  populatePositions(departmentSelect.value, employee.position);

  openModal("edit-modal");
}

// Populate positions dropdown based on selected department
function populatePositions(department, currentPosition = "") {
  const positionSelect = document.getElementById("edit-position");
  positionSelect.innerHTML = '<option value="">Select Position</option>';

  // Convert department to lowercase for case-insensitive matching
  const deptLower = department ? department.toLowerCase() : "";

  if (deptLower && departmentsAndPositions[deptLower]) {
    departmentsAndPositions[deptLower].forEach((position) => {
      const option = document.createElement("option");
      option.value = position;
      option.textContent = position;
      positionSelect.appendChild(option);
    });
  }

  // Set the current position if provided
  if (currentPosition) {
    // Try to find an exact match first
    let found = false;
    for (let i = 0; i < positionSelect.options.length; i++) {
      if (
        positionSelect.options[i].value.toLowerCase() ===
        currentPosition.toLowerCase()
      ) {
        positionSelect.selectedIndex = i;
        found = true;
        break;
      }
    }

    // If no exact match, add the current position as an option
    if (!found && currentPosition.trim() !== "") {
      const option = document.createElement("option");
      option.value = currentPosition;
      option.textContent = currentPosition + " (Current)";
      positionSelect.appendChild(option);
      positionSelect.value = currentPosition;
    }
  }
}

// Update employee role
async function updateEmployeeRole() {
  const employeeId = document.getElementById("edit-employee-id").value;
  const department = document.getElementById("edit-department").value;
  const position = document.getElementById("edit-position").value;

  if (!employeeId || !department || !position) {
    alert("Please fill all required fields");
    return;
  }

  try {
    // Show loading indicator
    const submitButton = document.querySelector(
      "#edit-form button[type='submit']"
    );
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitButton.disabled = true;

    // Prepare the request data
    const requestData = {
      action: "updateEmployee",
      id: employeeId,
      department: department,
      position: position,
    };

    console.log("Sending update request:", requestData);

    // Use application/x-www-form-urlencoded format instead of JSON
    const formData = new URLSearchParams();
    for (const key in requestData) {
      formData.append(key, requestData[key]);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      credentials: "include",
    });

    // For GAS web apps using "no-cors", we can't access the response directly
    // Instead, we'll assume success and refresh the data

    // Update the employee in the local data
    const employeeIndex = allEmployees.findIndex(
      (emp) => emp.id === parseInt(employeeId)
    );

    if (employeeIndex !== -1) {
      allEmployees[employeeIndex].department = department;
      allEmployees[employeeIndex].position = position;

      // Also update in currentEmployees if it exists there
      const currentIndex = currentEmployees.findIndex(
        (emp) => emp.id === parseInt(employeeId)
      );

      if (currentIndex !== -1) {
        currentEmployees[currentIndex].department = department;
        currentEmployees[currentIndex].position = position;
      }
    }

    // Reset button state
    submitButton.innerHTML = originalButtonText;
    submitButton.disabled = false;

    // Close the modal and refresh
    closeModal("edit-modal");
    renderEmployees();

    // Show success message
    alert("Employee role updated successfully");

    // Optionally refresh data from server
    fetchEmployees();
  } catch (error) {
    console.error("Error updating employee role:", error);
    alert(
      "Failed to update employee role. Please try again. Error: " +
        error.message
    );

    // Reset the button state
    const submitButton = document.querySelector(
      "#edit-form button[type='submit']"
    );
    submitButton.innerHTML = "Save Changes";
    submitButton.disabled = false;
  }
}

// Open modal
function openModal(modalId) {
  document.getElementById(modalId).style.display = "block";
  document.body.style.overflow = "hidden"; // Prevent scrolling
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.style.overflow = "auto"; // Enable scrolling
}

// Export data to CSV
function exportToCSV() {
  const headers = [
    "Employee ID",
    "First Name",
    "Last Name",
    "Department",
    "Position",
    "Status",
    "Email",
  ];
  let csvContent = headers.join(",") + "\n";

  currentEmployees.forEach((employee) => {
    const row = [
      employee.employeeId,
      employee.firstName,
      employee.lastName,
      employee.department,
      employee.position,
      employee.status,
      employee.orgEmail,
    ];

    // Handle commas in fields by enclosing in quotes
    const formattedRow = row.map((field) => {
      const stringField = String(field || "");
      return stringField.includes(",") ? `"${stringField}"` : stringField;
    });

    csvContent += formattedRow.join(",") + "\n";
  });

  // Create a download link and trigger download
  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "S2K_Employees.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Add export button to the interface
function addExportButton() {
  if (!document.getElementById("export-btn")) {
    const exportBtn = document.createElement("button");
    exportBtn.id = "export-btn";
    exportBtn.className = "btn btn-primary";
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Export to CSV';
    exportBtn.style.marginBottom = "20px";
    exportBtn.onclick = exportToCSV;

    // Find the employee grid element
    const employeeGrid = document.getElementById("employee-grid");

    // Get the parent container of the employee grid
    const container = employeeGrid.parentNode;

    // Insert the export button before the employee grid
    container.insertBefore(exportBtn, employeeGrid);
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Wait for other elements to load first
  setTimeout(addExportButton, 100);
});

// Close modals when clicking outside of them
window.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal")) {
    closeModal(event.target.id);
  }
});

// Mobile responsiveness adjustments
function adjustForMobileView() {
  if (window.innerWidth <= 768) {
    itemsPerPage = 6; // Show fewer items per page on mobile
  } else {
    itemsPerPage = 9; // Default for desktop
  }
  currentPage = 1; // Reset to first page
  renderEmployees();
}

// Listen for window resize events
window.addEventListener("resize", function () {
  adjustForMobileView();
});

// Initialize the adjustments for mobile
adjustForMobileView();

// Add export button when the page loads
document.addEventListener("DOMContentLoaded", function () {
  addExportButton();
});
