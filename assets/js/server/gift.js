// ====== EMBEDDED CONFIGURATION ======
// Replace this URL with your actual Google Apps Script Web App URL
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx7rPU1nhE2noekfopCgNxNBkOaDj975MhCIwbBMkGXEKqXZdTPTVmVK4qK_Gr3AM9S/exec";
// ====================================

let currentDeleteId = null;
let giftCards = [];

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  // Load gift cards on startup
  loadGiftCards();
});

function getApiUrl() {
  if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE")) {
    showAlert(
      "Script URL not configured. Please update the SCRIPT_URL constant in the code.",
      "warning"
    );
    return null;
  }
  return SCRIPT_URL;
}

function showAlert(message, type = "info") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

  const container = document.querySelector(".container-fluid");
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

async function loadGiftCards() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return;

  const spinner = document.getElementById("loadingSpinner");
  const container = document.getElementById("giftCardsContainer");
  const countBadge = document.getElementById("cardCount");

  spinner.style.display = "block";
  container.innerHTML = "";

  try {
    const response = await fetch(`${apiUrl}?action=getCards`);
    const data = await response.json();

    if (Array.isArray(data)) {
      giftCards = data;
      displayGiftCards(data);
      countBadge.textContent = `${data.length} cards`;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      giftCards = [];
      container.innerHTML =
        '<div class="alert alert-info">No gift cards found. Create your first gift card!</div>';
      countBadge.textContent = "0 cards";
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Error loading gift cards: ${error.message}</div>`;
    countBadge.textContent = "Error";
  } finally {
    spinner.style.display = "none";
  }
}

function displayGiftCards(cards) {
  const container = document.getElementById("giftCardsContainer");

  if (cards.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info">No gift cards found. Create your first gift card!</div>';
    return;
  }

  const cardsHtml = cards
    .map(
      (card) => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                ${
                                  card.imageUrl
                                    ? `<img src="${card.imageUrl}" class="img-fluid rounded" alt="${card.name}" style="max-height: 80px;">`
                                    : `<div class="bg-secondary rounded d-flex align-items-center justify-content-center" style="height: 80px;">
                                        <i class="fas fa-gift text-white fa-2x"></i>
                                    </div>`
                                }
                            </div>
                            <div class="col-md-7">
                                <h5 class="card-title mb-1">${card.name}</h5>
                                <p class="text-muted mb-1">${
                                  card.category || "No category"
                                }</p>
                                <p class="card-text mb-2">${
                                  card.description || "No description"
                                }</p>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-calendar me-1"></i>Valid for ${
                                              card.validityDays
                                            } days
                                        </small>
                                    </div>
                                    <div class="col-sm-6">
                                        ${getPricingDisplay(card)}
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 text-end">
                                <button class="btn btn-sm me-2 btn-outline-green" onclick="editCard('${
                                  card.id
                                }')">
  <i class="fas fa-edit"></i> Edit
</button>

                                <button class="btn btn-outline-danger btn-sm" onclick="deleteCard('${
                                  card.id
                                }', '${card.name}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `
    )
    .join("");

  container.innerHTML = cardsHtml;
}

function getPricingDisplay(card) {
  let html =
    '<small class="text-muted"><i class="fas fa-dollar-sign me-1"></i>';

  if (card.pricingType === "fixed") {
    html += `Fixed: $${card.fixedPrice}`;
  } else if (card.pricingType === "custom") {
    html += `Custom: $${card.minPrice} - $${card.maxPrice}`;
  } else if (card.pricingType === "both") {
    html += `Fixed: $${card.fixedPrice}, Custom: $${card.minPrice} - $${card.maxPrice}`;
  } else {
    html += "Price not set";
  }

  html += "</small>";
  return html;
}

function showAddCardModal() {
  document.getElementById("modalTitle").textContent = "Add New Gift Card";
  document.getElementById("cardForm").reset();
  document.getElementById("cardId").value = "";
  togglePricingFields();
  new bootstrap.Modal(document.getElementById("cardModal")).show();
}

function editCard(id) {
  const card = giftCards.find((c) => c.id === id);
  if (!card) return;

  document.getElementById("modalTitle").textContent = "Edit Gift Card";
  document.getElementById("cardId").value = card.id;
  document.getElementById("cardName").value = card.name || "";
  document.getElementById("cardCategory").value = card.category || "";
  document.getElementById("cardDescription").value = card.description || "";
  document.getElementById("cardImageUrl").value = card.imageUrl || "";
  document.getElementById("cardValidityDays").value = card.validityDays || 365;
  document.getElementById("pricingType").value = card.pricingType || "fixed";
  document.getElementById("fixedPrice").value = card.fixedPrice || "";
  document.getElementById("minPrice").value = card.minPrice || "";
  document.getElementById("maxPrice").value = card.maxPrice || "";

  if (Array.isArray(card.suggestedPrices)) {
    document.getElementById("suggestedPrices").value =
      card.suggestedPrices.join(",");
  } else if (typeof card.suggestedPrices === "string") {
    document.getElementById("suggestedPrices").value = card.suggestedPrices;
  }

  togglePricingFields();
  new bootstrap.Modal(document.getElementById("cardModal")).show();
}

function togglePricingFields() {
  const pricingType = document.getElementById("pricingType").value;
  const fixedGroup = document.getElementById("fixedPriceGroup");
  const customGroup = document.getElementById("customPriceGroup");

  fixedGroup.style.display = "none";
  customGroup.style.display = "none";

  if (pricingType === "fixed" || pricingType === "both") {
    fixedGroup.style.display = "block";
  }
  if (pricingType === "custom" || pricingType === "both") {
    customGroup.style.display = "block";
  }
}

async function saveCard() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return;

  const cardData = {
    id: document.getElementById("cardId").value || undefined,
    name: document.getElementById("cardName").value.trim(),
    category: document.getElementById("cardCategory").value.trim(),
    description: document.getElementById("cardDescription").value.trim(),
    imageUrl: document.getElementById("cardImageUrl").value.trim(),
    validityDays:
      parseInt(document.getElementById("cardValidityDays").value) || 365,
    pricingType: document.getElementById("pricingType").value,
    fixedPrice:
      parseFloat(document.getElementById("fixedPrice").value) || undefined,
    minPrice:
      parseFloat(document.getElementById("minPrice").value) || undefined,
    maxPrice:
      parseFloat(document.getElementById("maxPrice").value) || undefined,
    suggestedPrices: document.getElementById("suggestedPrices").value.trim(),
  };

  // Validate required fields
  if (!cardData.name) {
    showAlert("Please enter a card name.", "warning");
    return;
  }

  if (!cardData.pricingType) {
    showAlert("Please select a pricing type.", "warning");
    return;
  }

  // Validate pricing based on type
  if (cardData.pricingType === "fixed" && !cardData.fixedPrice) {
    showAlert("Please enter a fixed price.", "warning");
    return;
  }

  if (
    (cardData.pricingType === "custom" || cardData.pricingType === "both") &&
    (!cardData.minPrice || !cardData.maxPrice)
  ) {
    showAlert(
      "Please enter both minimum and maximum prices for custom pricing.",
      "warning"
    );
    return;
  }

  if (
    cardData.maxPrice &&
    cardData.minPrice &&
    cardData.maxPrice <= cardData.minPrice
  ) {
    showAlert("Maximum price must be greater than minimum price.", "warning");
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "saveCard",
        card: cardData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showAlert(result.message, "success");
      bootstrap.Modal.getInstance(document.getElementById("cardModal")).hide();
      loadGiftCards();
    } else {
      throw new Error(result.error || "Failed to save card");
    }
  } catch (error) {
    showAlert(`Error saving card: ${error.message}`, "danger");
  }
}

function deleteCard(id, name) {
  currentDeleteId = id;
  document.getElementById("deleteCardName").textContent = name;
  new bootstrap.Modal(document.getElementById("deleteModal")).show();
}

async function confirmDelete() {
  if (!currentDeleteId) return;

  const apiUrl = getApiUrl();
  if (!apiUrl) return;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deleteCard",
        id: currentDeleteId,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showAlert(result.message, "success");
      bootstrap.Modal.getInstance(
        document.getElementById("deleteModal")
      ).hide();
      loadGiftCards();
    } else {
      throw new Error(result.error || "Failed to delete card");
    }
  } catch (error) {
    showAlert(`Error deleting card: ${error.message}`, "danger");
  } finally {
    currentDeleteId = null;
  }
}

// Modal event listeners
document
  .getElementById("cardModal")
  .addEventListener("hide.bs.modal", function () {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });

document
  .getElementById("deleteModal")
  .addEventListener("hide.bs.modal", function () {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });
