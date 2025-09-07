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

// Ensure global variables are available
window.promoCodes = window.promoCodes || [];
window.shippingOptions = window.shippingOptions || [];
window.pricingDataLoaded = false;

// Function to load pricing data
async function loadPricingData() {
  showLoading(true);
  if (window.pricingDataLoaded) {
    showLoading(false);
    return;
  }

  try {
    const container = document.getElementById("promo-codes-container");
    if (container) {
      container.innerHTML = "<p>Loading pricing data...</p>";
    }

    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbz4u8iR1P5W_mysP3V9mp0CSVcKjIW8ujGdRZBzy39Ydcvr4PIgrj2IvxES9EFX_Eeecg/exec?action=getPricingConfig"
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
      onlinePaymentSwitch.checked = data.onlinePaymentEnabled !== false;
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

    // Load shipping options
    window.shippingOptions = data.shippingOptions || [];
    renderShippingOptions();

    // Free shipping threshold
    document.getElementById("free-shipping-threshold").value =
      data.freeShippingThreshold || 0;

    // Load promo codes
    window.promoCodes = data.promoCodes || [];
    renderPromoCodes();

    window.pricingDataLoaded = true;
    showLoading(false);
  } catch (error) {
    console.error("Error loading pricing data:", error);
    const container = document.getElementById("promo-codes-container");
    if (container) {
      container.innerHTML =
        "<p>Error loading pricing data. Please try again.</p>";
    }
    window.promoCodes = [];
    window.shippingOptions = [];
    showLoading(false);
  }
}

// Function to render shipping options
function renderShippingOptions() {
  const container = document.getElementById("shipping-container");
  if (!container) {
    console.error("Shipping container not found");
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(window.shippingOptions)) {
    window.shippingOptions = [];
  }

  if (window.shippingOptions.length === 0) {
    container.innerHTML = "<p>No shipping options added yet.</p>";
    return;
  }

  // Create a table to display shipping options
  const table = document.createElement("table");
  table.classList.add("promo-codes-table");

  // Add table header
  const thead = document.createElement("thead");
  thead.innerHTML = `
<tr>
  <th>Name</th>
  <th>Cost</th>
  <th>Delivery Days</th>
  <th>Actions</th>
</tr>
`;
  table.appendChild(thead);

  // Add table body
  const tbody = document.createElement("tbody");

  window.shippingOptions.forEach((shipping, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
  <td>${shipping.name}</td>
  <td>$${shipping.cost}</td>
  <td>${shipping.deliveryDays} days</td>
  <td><button onclick="removeShippingOption(${index})">Remove</button></td>
`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Function to add a shipping option
function addShippingOption() {
  if (!Array.isArray(window.shippingOptions)) {
    window.shippingOptions = [];
  }

  const nameInput = document.getElementById("shipping-name");
  const costInput = document.getElementById("shipping-cost");
  const daysInput = document.getElementById("delivery-days");

  if (!nameInput || !costInput || !daysInput) {
    console.error("Shipping form elements not found");
    return;
  }

  const name = nameInput.value.trim();
  const cost = parseFloat(costInput.value);
  const deliveryDays = parseInt(daysInput.value);

  if (
    !name ||
    isNaN(cost) ||
    cost < 0 ||
    isNaN(deliveryDays) ||
    deliveryDays < 1
  ) {
    alert("Please enter valid shipping name, cost, and delivery days");
    return;
  }

  // Check if shipping option name already exists
  const existingIndex = window.shippingOptions.findIndex(
    (shipping) => shipping.name.toLowerCase() === name.toLowerCase()
  );
  if (existingIndex >= 0) {
    alert(
      "This shipping option name already exists. Please use a different name."
    );
    return;
  }

  // Add the shipping option
  window.shippingOptions.push({
    name: name,
    cost: cost,
    deliveryDays: deliveryDays,
  });

  // Clear input fields
  nameInput.value = "";
  costInput.value = "";
  daysInput.value = "";

  // Render the updated list
  renderShippingOptions();
}

// Function to remove a shipping option
function removeShippingOption(index) {
  if (!Array.isArray(window.shippingOptions)) {
    window.shippingOptions = [];
    renderShippingOptions();
    return;
  }

  if (index >= 0 && index < window.shippingOptions.length) {
    window.shippingOptions.splice(index, 1);
    renderShippingOptions();
  }
}

// Function to render promo codes
function renderPromoCodes() {
  const container = document.getElementById("promo-codes-container");
  if (!container) {
    console.error("Promo codes container not found");
    return;
  }

  container.innerHTML = "";

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
    if (!Array.isArray(window.promoCodes)) {
      window.promoCodes = [];
    }
    if (!Array.isArray(window.shippingOptions)) {
      window.shippingOptions = [];
    }

    // Get payment settings
    const onlinePaymentSwitch = document.getElementById(
      "online-payment-switch"
    );
    const codChargesInput = document.getElementById("cod-charges");
    const vatInput = document.getElementById("vat-percentage");
    const freeShippingThresholdInput = document.getElementById(
      "free-shipping-threshold"
    );

    if (
      !onlinePaymentSwitch ||
      !codChargesInput ||
      !vatInput ||
      !freeShippingThresholdInput
    ) {
      alert(
        "Some form elements could not be found. Please refresh the page and try again."
      );
      return;
    }

    const onlinePaymentEnabled = onlinePaymentSwitch.checked;
    const codCharges = parseFloat(codChargesInput.value) || 0;
    const vatPercentage = parseFloat(vatInput.value) || 0;
    const freeShippingThreshold =
      parseFloat(freeShippingThresholdInput.value) || 0;

    const pricingData = {
      action: "updatePricingConfig",
      onlinePaymentEnabled,
      codCharges,
      vatPercentage,
      shippingOptions: window.shippingOptions,
      freeShippingThreshold,
      promoCodes: window.promoCodes,
    };

    console.log("Sending pricing data:", pricingData);

    // Send data to Google Apps Script
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbz4u8iR1P5W_mysP3V9mp0CSVcKjIW8ujGdRZBzy39Ydcvr4PIgrj2IvxES9EFX_Eeecg/exec",
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

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  window.promoCodes = window.promoCodes || [];
  window.shippingOptions = window.shippingOptions || [];

  loadPricingData();

  // Online Payment switch logic
  const onlinePaymentSwitch = document.getElementById("online-payment-switch");
  const onlinePaymentStatus = document.getElementById("online-payment-status");
  if (onlinePaymentSwitch && onlinePaymentStatus) {
    onlinePaymentSwitch.addEventListener("change", function () {
      onlinePaymentStatus.textContent = this.checked ? "On" : "Off";
    });
  }
});
