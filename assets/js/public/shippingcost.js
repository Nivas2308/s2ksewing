// Google Apps Script Web App URL - REPLACE THIS WITH YOUR DEPLOYED SCRIPT URL
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz4u8iR1P5W_mysP3V9mp0CSVcKjIW8ujGdRZBzy39Ydcvr4PIgrj2IvxES9EFX_Eeecg/exec";

// Function to fetch pricing configuration from Google Sheets
async function fetchPricingConfig() {
  try {
    document.getElementById("loadingMessage").style.display = "block";
    document.getElementById("shippingTable").style.display = "none";

    // Hide notes container while loading
    const notesContainer = document.getElementById("notesContainer");
    if (notesContainer) {
      notesContainer.style.display = "none";
    }

    const response = await fetch(`${SCRIPT_URL}?action=getPricingConfig`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    updateShippingTable(data);
    updateNotesSection(data);

    document.getElementById("loadingMessage").style.display = "none";
    document.getElementById("shippingTable").style.display = "table";

    // Show notes container
    if (notesContainer) {
      notesContainer.style.display = "block";
    }

    // Update last fetch time
    document.getElementById(
      "lastUpdated"
    ).textContent = `Last updated: ${new Date().toLocaleString()}`;
  } catch (error) {
    console.error("Error fetching pricing data:", error);
    document.getElementById("loadingMessage").textContent =
      "Error loading shipping information. Please try again later.";
  }
}

// Function to update the shipping table with fetched data
function updateShippingTable(data) {
  const tableBody = document.getElementById("shippingTableBody");
  tableBody.innerHTML = "";

  // Check if shipping options exist and is an array
  if (!data.shippingOptions || !Array.isArray(data.shippingOptions)) {
    const noDataRow = document.createElement("tr");
    noDataRow.innerHTML = `
      <td colspan="3" style="text-align: center; padding: 20px; color: #666;">
        No shipping options available
      </td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }

  // Add each shipping option as a row
  data.shippingOptions.forEach((option) => {
    const row = document.createElement("tr");

    // Determine if shipping is free based on threshold
    const isFreeShipping = data.freeShippingThreshold > 0;
    const freeShippingText = isFreeShipping
      ? `Free on orders over $${data.freeShippingThreshold.toFixed(2)}`
      : "No free shipping";

    row.innerHTML = `
      <td>
        <strong>${option.name}</strong>
        ${
          option.name === "Express"
            ? '<span style="color: #e74c3c; font-size: 0.8em; margin-left: 5px;">(Fastest)</span>'
            : ""
        }
      </td>
      <td>
        <span class="cost">$${option.cost.toFixed(2)}</span>
        <div style="font-size: 0.8em; color: #666; margin-top: 2px;">
          ${freeShippingText}
        </div>
      </td>
      <td>
        <span class="delivery-time">${option.deliveryDays} ${
      option.deliveryDays === 1 ? "day" : "days"
    }</span>
      </td>
    `;

    // Add special styling for express shipping
    if (option.name.toLowerCase().includes("express")) {
      row.style.background =
        "linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%)";
      row.style.borderLeft = "4px solid #ff9800";
    }

    tableBody.appendChild(row);
  });
}

// Function to update notes section below the table
function updateNotesSection(data) {
  const notesContainer = document.getElementById("notesContainer");

  if (!notesContainer) {
    // Create notes container if it doesn't exist
    const container = document.createElement("div");
    container.id = "notesContainer";
    container.style.cssText = `
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    `;

    // Insert after the shipping table
    const shippingTable = document.getElementById("shippingTable");
    if (shippingTable && shippingTable.parentNode) {
      shippingTable.parentNode.insertBefore(
        container,
        shippingTable.nextSibling
      );
    }
  }

  const notes = [];

  // Add COD information if applicable
  if (data.codCharges && data.codCharges > 0) {
    let codNote = `<strong>Cash on Delivery:</strong> Additional $${data.codCharges.toFixed(
      2
    )} charge applies`;
    if (!data.onlinePaymentEnabled) {
      codNote += " (Online payment currently unavailable)";
    }
    notes.push(codNote);
  }

  // Add VAT information if applicable
  if (data.vatPercentage && data.vatPercentage > 0) {
    notes.push(
      `<strong>VAT:</strong> ${data.vatPercentage}% VAT included in all prices`
    );
  }

  // Add free shipping information as a note
  if (data.freeShippingThreshold && data.freeShippingThreshold > 0) {
    notes.push(
      `<strong>Free Shipping:</strong> Available on orders over $${data.freeShippingThreshold.toFixed(
        2
      )}`
    );
  }

  // Update notes container content
  const container = document.getElementById("notesContainer");
  if (container) {
    if (notes.length > 0) {
      container.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">
          📋 Shipping Notes
        </h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          ${notes
            .map((note) => `<li style="margin-bottom: 8px;">${note}</li>`)
            .join("")}
        </ul>
      `;
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }
}

// Function to refresh data manually
function refreshShippingData() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.textContent = "Refreshing...";
    refreshBtn.disabled = true;
  }

  fetchPricingConfig().then(() => {
    if (refreshBtn) {
      refreshBtn.textContent = "Refresh";
      refreshBtn.disabled = false;
    }
  });
}

// Function to show loading state
function showLoadingState() {
  const loadingMessage = document.getElementById("loadingMessage");
  if (loadingMessage) {
    loadingMessage.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
        <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Loading shipping information...
      </div>
    `;
  }
}

// Function to handle errors gracefully
function handleFetchError(error) {
  console.error("Shipping data fetch error:", error);

  const tableBody = document.getElementById("shippingTableBody");
  const loadingMessage = document.getElementById("loadingMessage");
  const notesContainer = document.getElementById("notesContainer");

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 20px; color: #e74c3c;">
          <strong>Unable to load shipping information</strong><br>
          <small>Please check your connection and try again</small>
        </td>
      </tr>
    `;
  }

  if (loadingMessage) {
    loadingMessage.innerHTML = `
      <div style="color: #e74c3c; text-align: center;">
        <strong>Error loading shipping information</strong><br>
        <button onclick="refreshShippingData()" style="margin-top: 10px; padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    loadingMessage.style.display = "block";
  }

  // Hide notes container on error
  if (notesContainer) {
    notesContainer.style.display = "none";
  }

  document.getElementById("shippingTable").style.display = "none";
}

// Enhanced fetch function with better error handling
async function fetchPricingConfigEnhanced() {
  try {
    showLoadingState();
    document.getElementById("shippingTable").style.display = "none";

    // Hide notes container while loading
    const notesContainer = document.getElementById("notesContainer");
    if (notesContainer) {
      notesContainer.style.display = "none";
    }

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${SCRIPT_URL}?action=getPricingConfig`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch pricing configuration");
    }

    updateShippingTable(data);
    updateNotesSection(data);

    document.getElementById("loadingMessage").style.display = "none";
    document.getElementById("shippingTable").style.display = "table";

    // Show notes container
    if (notesContainer) {
      notesContainer.style.display = "block";
    }

    // Update last fetch time
    const lastUpdatedElement = document.getElementById("lastUpdated");
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
    }
  } catch (error) {
    handleFetchError(error);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Use enhanced fetch function
  fetchPricingConfigEnhanced();

  // Add refresh button functionality if it exists
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshShippingData);
  }
});

// Auto-refresh every 5 minutes (300000 ms)
setInterval(fetchPricingConfigEnhanced, 300000);

// Add CSS animation for loading spinner
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
