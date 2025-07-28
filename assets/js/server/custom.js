let allData = [];
let filteredData = [];
let deleteRowIndex = -1;

// Replace with your actual Google Apps Script Web App URL
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxXG1-5hT62KsCptbLYcgTt11SMtI8ndNLxQZXZ4wX8XnNa6O6buJ33YQPLoxZ9eNo/exec";

async function loadData() {
  document.getElementById("loadingState").style.display = "block";
  document.getElementById("dataTable").style.display = "none";
  document.getElementById("emptyState").style.display = "none";

  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();

    if (result.success) {
      allData = result.data || [];
      filteredData = [...allData];
      updateStats();
      renderTable();
    } else {
      console.error("Error loading data:", result.error);
      showEmptyState();
    }
  } catch (error) {
    console.error("Error:", error);
    showEmptyState();
  }

  document.getElementById("loadingState").style.display = "none";
}

function updateStats() {
  const total = allData.length;
  const today = new Date().toDateString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const todayCount = allData.filter((entry) => {
    const entryDate = new Date(entry.Timestamp);
    return entryDate.toDateString() === today;
  }).length;

  const weekCount = allData.filter((entry) => {
    const entryDate = new Date(entry.Timestamp);
    return entryDate >= oneWeekAgo;
  }).length;

  document.getElementById("totalEntries").textContent = total;
  document.getElementById("todayEntries").textContent = todayCount;
  document.getElementById("weekEntries").textContent = weekCount;
}

function renderTable() {
  const tableBody = document.getElementById("tableBody");
  const dataTable = document.getElementById("dataTable");
  const emptyState = document.getElementById("emptyState");

  if (filteredData.length === 0) {
    showEmptyState();
    return;
  }

  dataTable.style.display = "table";
  emptyState.style.display = "none";

  tableBody.innerHTML = filteredData
    .map((entry, index) => {
      const timestamp = new Date(entry.Timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const fabricInfo = `${entry["Fabric Color"] || "N/A"} - ${
        entry["Fabric Material"] || "N/A"
      }`;

      return `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${entry["Full Name"] || "N/A"}</td>
                        <td>${entry.Email || "N/A"}</td>
                        <td>${entry.Phone || "N/A"}</td>
                        <td>${fabricInfo}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-view btn-small" onclick="viewEntry(${index})">
                                    View
                                </button>
                                <button class="btn btn-danger btn-small" onclick="deleteEntry(${index})">
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
    })
    .join("");
}

function showEmptyState() {
  document.getElementById("dataTable").style.display = "none";
  document.getElementById("emptyState").style.display = "block";
}

function viewEntry(index) {
  const entry = filteredData[index];
  const detailsContainer = document.getElementById("entryDetails");

  const fields = [
    {
      label: "Timestamp",
      value: new Date(entry.Timestamp).toLocaleString(),
    },
    { label: "Full Name", value: entry["Full Name"] },
    { label: "Phone", value: entry.Phone },
    { label: "Email", value: entry.Email },
    { label: "Fabric Color", value: entry["Fabric Color"] },
    { label: "Fabric Material", value: entry["Fabric Material"] },
    {
      label: "Reference Description",
      value: entry["Reference Description"],
    },
    { label: "User ID", value: entry["User ID"] },
    { label: "Product ID", value: entry["Product ID"] },
    { label: "Product Title", value: entry["Product Title"] },
    { label: "Product Price", value: entry["Product Price"] },
  ];

  detailsContainer.innerHTML = fields
    .map((field) => {
      const value = field.value || "N/A";
      return `
                    <div class="detail-item">
                        <div class="detail-label">${field.label}:</div>
                        <div class="detail-value">${value}</div>
                    </div>
                `;
    })
    .join("");

  document.getElementById("viewModal").style.display = "block";
}

function deleteEntry(index) {
  deleteRowIndex = index;
  const entry = filteredData[index];

  document.getElementById("deleteEntryPreview").innerHTML = `
                <strong>${entry["Full Name"] || "N/A"}</strong><br>
                <small>${entry.Email || "N/A"} • ${new Date(
    entry.Timestamp
  ).toLocaleDateString()}</small>
            `;

  document.getElementById("deleteModal").style.display = "block";
}

function confirmDelete() {
  // Note: This is a frontend-only delete for demo purposes
  // In a real implementation, you'd need to add a delete endpoint to your Google Apps Script
  if (deleteRowIndex >= 0) {
    const deletedEntry = filteredData[deleteRowIndex];

    // Remove from both arrays
    const originalIndex = allData.findIndex(
      (entry) =>
        entry.Timestamp === deletedEntry.Timestamp &&
        entry["Full Name"] === deletedEntry["Full Name"]
    );

    if (originalIndex >= 0) {
      allData.splice(originalIndex, 1);
    }

    filteredData.splice(deleteRowIndex, 1);

    updateStats();
    renderTable();
    closeModal("deleteModal");

    // Show success message
    alert("Entry deleted successfully!");
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  deleteRowIndex = -1;
}

function searchData() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();

  if (!searchTerm) {
    filteredData = [...allData];
  } else {
    filteredData = allData.filter((entry) => {
      return Object.values(entry).some(
        (value) => value && value.toString().toLowerCase().includes(searchTerm)
      );
    });
  }

  renderTable();
}

function exportData() {
  if (filteredData.length === 0) {
    alert("No data to export!");
    return;
  }

  const headers = Object.keys(filteredData[0]);
  const csvContent = [
    headers.join(","),
    ...filteredData.map((entry) =>
      headers
        .map(
          (header) =>
            `"${(entry[header] || "").toString().replace(/"/g, '""')}"`
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `admin_data_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event listeners
document.getElementById("searchInput").addEventListener("input", searchData);

// Close modals when clicking outside
window.onclick = function (event) {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
};

// Initialize
window.onload = function () {
  loadData();
};
