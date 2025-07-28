// Loader CSS
const loaderStyle = document.createElement("style");
loaderStyle.textContent = `
      #loader {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255,255,255,0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 5px solid #e9f0ff;
        border-top: 5px solid #4caf50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
document.head.appendChild(loaderStyle);

function showLoading(show) {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = show ? "flex" : "none";
}
// Ensure promoCodes is available globally
window.promoCodes = window.promoCodes || [];
// Track if data has been loaded
window.pricingDataLoaded = false;

// Function to load pricing data
async function loadPricingData() {
  showLoading(true);
  // Don't reload if data is already loaded
  if (window.pricingDataLoaded) {
    showLoading(false);
    return;
  }

  try {
    // Show loading indicator
    const container = document.getElementById("promo-codes-container");
    if (container) {
      container.innerHTML = "<p>Loading pricing data...</p>";
    }

    // Load pricing configuration from Google Apps Script
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbxFQGWg83k7nTxCRfqezwQUNl5fU85tGpEVd1m1ARqOiPxskPzmPiLD1oi7giX5v5syRw/exec?action=getPricingConfig"
    );

    const data = await response.json();

    if (data.error) {
      console.error("Error loading pricing config:", data.error);
      if (container) {
        container.innerHTML =
          "<p>Error loading pricing data. Please try again.</p>";
      }
      showLoading(false);
      return;
    }

    // Populate payment settings
    const onlinePaymentSwitch = document.getElementById(
      "online-payment-switch"
    );
    const onlinePaymentStatus = document.getElementById(
      "online-payment-status"
    );
    if (onlinePaymentSwitch && onlinePaymentStatus) {
      onlinePaymentSwitch.checked = data.onlinePaymentEnabled !== false; // Default to true
      onlinePaymentStatus.textContent = onlinePaymentSwitch.checked
        ? "On"
        : "Off";
    }

    // Populate COD charges
    const codChargesInput = document.getElementById("cod-charges");
    if (codChargesInput) {
      codChargesInput.value = data.codCharges || 0;
    }

    // Populate VAT percentage
    const vatInput = document.getElementById("vat-percentage");
    if (vatInput) {
      vatInput.value = data.vatPercentage || 0;
    }

    // Populate shipping costs
    document.getElementById("shipping-cost-domestic").value =
      data.shippingCosts?.domestic || 0;
    document.getElementById("shipping-cost-business").value =
      data.shippingCosts?.business || 0;
    document.getElementById("shipping-cost-international").value =
      data.shippingCosts?.international || 0;
    document.getElementById("shipping-cost-express").value =
      data.shippingCosts?.express || 0;
    document.getElementById("free-shipping-threshold").value =
      data.freeShippingThreshold || 0;

    // Populate delivery times for each shipping option
    document.getElementById("delivery-time-domestic").value =
      data.deliveryTimes?.domestic || 5;
    document.getElementById("delivery-time-business").value =
      data.deliveryTimes?.business || 3;
    document.getElementById("delivery-time-international").value =
      data.deliveryTimes?.international || 10;
    document.getElementById("delivery-time-express").value =
      data.deliveryTimes?.express || 1;

    // Load promo codes
    window.promoCodes = data.promoCodes || [];
    renderPromoCodes();

    // Mark data as loaded
    window.pricingDataLoaded = true;
    showLoading(false);
  } catch (error) {
    console.error("Error loading pricing data:", error);
    const container = document.getElementById("promo-codes-container");
    if (container) {
      container.innerHTML =
        "<p>Error loading pricing data. Please try again.</p>";
    }

    // Initialize promoCodes as empty array if there's an error
    window.promoCodes = [];
    showLoading(false);
  }
}

// Function to initialize the pricing configuration section
function initPricingConfig() {
  // Load data if not already loaded
  if (!window.pricingDataLoaded) {
    loadPricingData();
  }
}

// Add a manual reload button function
function reloadPricingData() {
  // Reset the loaded flag
  window.pricingDataLoaded = false;
  // Load the data again
  loadPricingData();
}

// Function to render promo codes
function renderPromoCodes() {
  const container = document.getElementById("promo-codes-container");
  if (!container) {
    console.error("Promo codes container not found");
    return;
  }

  container.innerHTML = "";

  // Ensure promoCodes is an array
  if (!Array.isArray(window.promoCodes)) {
    window.promoCodes = [];
  }

  if (window.promoCodes.length === 0) {
    container.innerHTML = "<p>No promo codes added yet.</p>";
    return;
  }

  // Create a table to display promo codes
  const table = document.createElement("table");
  table.classList.add("promo-codes-table");

  // Add table header
  const thead = document.createElement("thead");
  thead.innerHTML = `
<tr>
  <th>Code</th>
  <th>Amount</th>
  <th>Type</th>
  <th>Actions</th>
</tr>
`;
  table.appendChild(thead);

  // Add table body
  const tbody = document.createElement("tbody");

  window.promoCodes.forEach((promo, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
  <td>${promo.code}</td>
  <td>${promo.amount}</td>
  <td>${promo.type === "percentage" ? "Percentage" : "Fixed Amount"}</td>
  <td><button onclick="removePromoCode(${index})">Remove</button></td>
`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Function to add a promo code
function addPromoCode() {
  // Ensure promoCodes is initialized
  if (!Array.isArray(window.promoCodes)) {
    window.promoCodes = [];
  }

  const codeInput = document.getElementById("promo-code");
  const amountInput = document.getElementById("promo-amount");
  const typeSelect = document.getElementById("promo-type");

  if (!codeInput || !amountInput || !typeSelect) {
    console.error("Promo code form elements not found");
    return;
  }

  const code = codeInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeSelect.value;

  if (!code || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid promo code and amount");
    return;
  }

  // Check if code already exists
  const existingIndex = window.promoCodes.findIndex(
    (promo) => promo.code === code
  );
  if (existingIndex >= 0) {
    alert("This promo code already exists. Please use a different code.");
    return;
  }

  // Add the promo code
  window.promoCodes.push({
    code: code,
    amount: amount,
    type: type,
  });

  // Clear input fields
  codeInput.value = "";
  amountInput.value = "";

  // Render the updated list
  renderPromoCodes();
}

// Function to remove a promo code
function removePromoCode(index) {
  // Ensure promoCodes is initialized
  if (!Array.isArray(window.promoCodes)) {
    window.promoCodes = [];
    renderPromoCodes();
    return;
  }

  if (index >= 0 && index < window.promoCodes.length) {
    window.promoCodes.splice(index, 1);
    renderPromoCodes();
  }
}

// Function to save pricing configuration
async function savePricingConfig() {
  try {
    // Ensure promoCodes is initialized
    if (!Array.isArray(window.promoCodes)) {
      window.promoCodes = [];
    }

    // Get payment settings
    const onlinePaymentSwitch = document.getElementById(
      "online-payment-switch"
    );
    const codChargesInput = document.getElementById("cod-charges");
    const vatInput = document.getElementById("vat-percentage");

    // Get shipping cost inputs
    const domesticShippingInput = document.getElementById(
      "shipping-cost-domestic"
    );
    const businessShippingInput = document.getElementById(
      "shipping-cost-business"
    );
    const internationalShippingInput = document.getElementById(
      "shipping-cost-international"
    );
    const expressShippingInput = document.getElementById(
      "shipping-cost-express"
    );
    const freeShippingThresholdInput = document.getElementById(
      "free-shipping-threshold"
    );

    // Get delivery time inputs for each shipping option
    const domesticDeliveryInput = document.getElementById(
      "delivery-time-domestic"
    );
    const businessDeliveryInput = document.getElementById(
      "delivery-time-business"
    );
    const internationalDeliveryInput = document.getElementById(
      "delivery-time-international"
    );
    const expressDeliveryInput = document.getElementById(
      "delivery-time-express"
    );

    if (
      !onlinePaymentSwitch ||
      !codChargesInput ||
      !vatInput ||
      !domesticShippingInput ||
      !businessShippingInput ||
      !internationalShippingInput ||
      !expressShippingInput ||
      !domesticDeliveryInput ||
      !businessDeliveryInput ||
      !internationalDeliveryInput ||
      !expressDeliveryInput
    ) {
      alert(
        "Some form elements could not be found. Please refresh the page and try again."
      );
      return;
    }

    const onlinePaymentEnabled = onlinePaymentSwitch.checked;
    const codCharges = parseFloat(codChargesInput.value) || 0;
    const vatPercentage = parseFloat(vatInput.value) || 0;

    // Get shipping costs
    const shippingCosts = {
      domestic: parseFloat(domesticShippingInput.value) || 0,
      business: parseFloat(businessShippingInput.value) || 0,
      international: parseFloat(internationalShippingInput.value) || 0,
      express: parseFloat(expressShippingInput.value) || 0,
    };

    // Get delivery times for each shipping option
    const deliveryTimes = {
      domestic: parseInt(domesticDeliveryInput.value) || 5,
      business: parseInt(businessDeliveryInput.value) || 3,
      international: parseInt(internationalDeliveryInput.value) || 10,
      express: parseInt(expressDeliveryInput.value) || 1,
    };

    const freeShippingThreshold =
      parseFloat(freeShippingThresholdInput.value) || 0;

    const pricingData = {
      action: "updatePricingConfig",
      onlinePaymentEnabled,
      codCharges,
      vatPercentage,
      shippingCosts,
      deliveryTimes,
      freeShippingThreshold,
      promoCodes: window.promoCodes,
    };

    console.log("Sending pricing data:", pricingData);

    // Send data to Google Apps Script
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbzz2qtBZwp8ZA-5EgTw8LIKfZIERtbfAizGveANNrSiy5wHjq5NOnJLp-x8vCKG6hO3iw/exec",
      {
        method: "POST",
        body: JSON.stringify(pricingData),
      }
    );

    const result = await response.json();

    if (result.success) {
      alert("Pricing configuration updated successfully!");
    } else {
      alert(
        "Error updating pricing configuration: " +
          (result.error || "Unknown error")
      );
    }
  } catch (error) {
    console.error("Error saving pricing config:", error);
    alert("Error saving pricing configuration. Please try again.");
  }
}

// Add event listener to initialize pricing config when section is shown
document.addEventListener("DOMContentLoaded", function () {
  // Ensure promoCodes is initialized globally
  window.promoCodes = window.promoCodes || [];

  // Always load latest pricing data on page load
  loadPricingData();

  // Modify the existing showSection function to initialize pricing config
  const originalShowSection = window.showSection || function () {};

  window.showSection = function (sectionId) {
    if (typeof originalShowSection === "function") {
      originalShowSection(sectionId);
    } else {
      // Fallback if originalShowSection is not defined
      document
        .querySelectorAll("section")
        .forEach((sec) => sec.classList.remove("active"));
      const section = document.getElementById(sectionId);
      if (section) section.classList.add("active");
    }

    if (sectionId === "pricing-config") {
      loadPricingData();
    }
  };

  // Online Payment switch logic
  const onlinePaymentSwitch = document.getElementById("online-payment-switch");
  const onlinePaymentStatus = document.getElementById("online-payment-status");
  if (onlinePaymentSwitch && onlinePaymentStatus) {
    onlinePaymentSwitch.addEventListener("change", function () {
      onlinePaymentStatus.textContent = this.checked ? "On" : "Off";
    });
  }
});
