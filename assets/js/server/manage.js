// PRODUCT MANAGEMENT FUNCTIONS

/// Updated loadProducts function with more professional layout
function loadProducts() {
  // Show loading indicator if it exists
  if (typeof showLoadingIndicator === "function") {
    showLoadingIndicator();
  }

  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec"
  )
    .then((response) => response.json())
    .then((products) => {
      const productList = document.getElementById("product-list");
      productList.innerHTML = "";

      products.forEach((product) => {
        const productItem = document.createElement("div");
        productItem.classList.add("product-item");
        productItem.setAttribute("data-product-id", product.id);

        // Get the primary image or use fallback
        let primaryImageUrl = "placeholder.jpg";

        if (
          product.images &&
          Array.isArray(product.images) &&
          product.images.length > 0
        ) {
          primaryImageUrl = product.images[0];
        } else if (product.image && product.image.startsWith("http")) {
          primaryImageUrl = product.image;
        }

        // Create image gallery indicator if multiple images
        let imagesGallery = "";
        if (
          product.images &&
          Array.isArray(product.images) &&
          product.images.length > 1
        ) {
          imagesGallery =
            '<div class="image-count">' + product.images.length + "</div>";
        }

        // Ensure inStock property is a boolean
        const isInStock =
          product.inStock === true ||
          product.inStock === "In Stock" ||
          product.inStock === "true";

        // Format price with 2 decimal places if needed
        const formattedPrice = parseFloat(product.price).toFixed(2);

        // Create the HTML for the product item with improved layout
        productItem.innerHTML = `
          <div class="product-image">
            <img src="${primaryImageUrl}" alt="${product.title}" 
              onerror="this.src='placeholder.jpg';">
            ${imagesGallery}
          </div>
          <div class="product-details">
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">$${formattedPrice}</div>
            <div class="product-meta">
              <div>${product.category}</div>
              <div>${product.subCategory || "N/A"}</div>
            </div>
            <span class="stock-status ${
              isInStock ? "in-stock" : "out-of-stock"
            }">
              ${isInStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>
          <div class="product-actions">
            <button class="edit-btn" data-product='${JSON.stringify({
              ...product,
              inStock: isInStock,
            }).replace(/'/g, "&apos;")}'>Edit</button>
            <button class="remove-btn" onclick="removeProduct('${
              product.id
            }')">Remove</button>
            <div class="stock-switch-container">
              <span class="switch-label">In Stock</span>
              <label class="switch">
                <input type="checkbox" ${isInStock ? "checked" : ""}
                  onchange="toggleStockStatus('${product.id}', this.checked)">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        `;

        productList.appendChild(productItem);

        // Add event listener to the edit button
        const editBtn = productItem.querySelector(".edit-btn");
        editBtn.addEventListener("click", function () {
          const productData = JSON.parse(
            this.getAttribute("data-product").replace(/&apos;/g, "'")
          );
          editProduct(
            productData.id,
            productData.title,
            productData.price,
            productData.images || [productData.image] || [],
            productData.category,
            productData.subCategory || "",
            productData.description || "",
            productData.details || ""
          );
        });
      });
    })
    .catch((error) => {
      console.error("Error loading products:", error);
      const productList = document.getElementById("product-list");
      productList.innerHTML =
        "<p>Error loading products. Please try again.</p>";
    })
    .finally(() => {
      // Hide loading indicator if it exists
      if (typeof hideLoadingIndicator === "function") {
        hideLoadingIndicator();
      }
    });
}

// Toggle product stock status
function toggleStockStatus(productId, inStock) {
  // Store reference to the checkbox that triggered the event
  const checkbox = event.target;

  if (
    !confirm(
      `Are you sure you want to mark this product as ${
        inStock ? "in stock" : "out of stock"
      }?`
    )
  ) {
    // If user cancels, revert the checkbox state
    checkbox.checked = !checkbox.checked;
    return;
  }

  // Show loading indicator if available
  if (typeof showLoadingIndicator === "function") {
    showLoadingIndicator();
  }

  // Define the API URL if not already defined
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec";

  // Make API call to update stock status
  fetch(apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "updateStock",
      id: productId,
      inStock: inStock,
    }),
  })
    .then((response) => {
      // Handle 'no-cors' mode which doesn't return a parsed response
      if (response.type === "opaque" || response.type === "opaqueredirect") {
        return {
          success: true,
          message: "Stock status updated (assumed success)",
        };
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Find the product item by data-product-id attribute
        const productItem = document.querySelector(
          `[data-product-id="${productId}"]`
        );

        if (productItem) {
          // Update the status element
          const statusElement = productItem.querySelector(".stock-status");
          if (statusElement) {
            statusElement.textContent = inStock ? "In Stock" : "Out of Stock";
            statusElement.className = `stock-status ${
              inStock ? "in-stock" : "out-of-stock"
            }`;
          }

          // Update the data in the edit button to maintain consistency
          const editButton = productItem.querySelector(".edit-btn");
          if (editButton) {
            const productData = JSON.parse(
              editButton.getAttribute("data-product").replace(/&apos;/g, "'")
            );
            productData.inStock = inStock;
            editButton.setAttribute(
              "data-product",
              JSON.stringify(productData).replace(/'/g, "&apos;")
            );
          }
        }

        // Show success notification if function exists
        if (typeof showNotification === "function") {
          showNotification("Stock status updated successfully", "success");
        } else {
          console.log("Stock status updated successfully");
        }
      } else {
        // Show error notification if function exists
        if (typeof showNotification === "function") {
          showNotification(
            "Failed to update stock status: " +
              (data.message || "Unknown error"),
            "error"
          );
        } else {
          console.error("Failed to update stock status:", data.message);
        }

        // Revert the checkbox
        checkbox.checked = !inStock;
      }
    })
    .catch((error) => {
      console.error("Error updating stock status:", error);

      // Show error notification if function exists
      if (typeof showNotification === "function") {
        showNotification(
          "Error updating stock status. Please try again.",
          "error"
        );
      }

      // Revert the checkbox
      checkbox.checked = !inStock;
    })
    .finally(() => {
      // Hide loading indicator if function exists
      if (typeof hideLoadingIndicator === "function") {
        hideLoadingIndicator();
      }
    });
}

// Remove product function
function removeProduct(id) {
  console.log("Remove product called with ID:", id);

  if (!confirm("Are you sure you want to delete this product?")) return;

  showLoadingIndicator();

  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec",
    {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        action: "delete",
        id: id,
      }),
    }
  )
    .then(() => {
      showNotification("Product deleted successfully", "success");
      loadProducts(); // Reload the product list
    })
    .catch((error) => {
      console.error("Error deleting product:", error);
      showNotification("Error deleting product", "error");
    })
    .finally(() => {
      hideLoadingIndicator();
    });
}

// Edit product function
let currentEditingProductId = null;

function editProduct(
  id,
  title,
  price,
  images,
  category,
  subCategory,
  description,
  details
) {
  currentEditingProductId = id;

  // Fill the form with current product data
  document.getElementById("edit-title").value = title || "";
  document.getElementById("edit-price").value = price || "";
  document.getElementById("edit-category").value = category || "Fabrics";
  document.getElementById("edit-subcategory").value = subCategory || "";
  document.getElementById("edit-description").value = description || "";
  document.getElementById("edit-detail").value = details || "";

  // Show the popup
  openPopup();
}

// Save edit changes function
function saveEditChanges() {
  if (!currentEditingProductId) {
    showNotification("No product selected for editing", "error");
    return;
  }

  // Get form data
  const title = document.getElementById("edit-title").value.trim();
  const price = document.getElementById("edit-price").value.trim();
  const category = document.getElementById("edit-category").value;
  const subCategory = document.getElementById("edit-subcategory").value.trim();
  const description = document.getElementById("edit-description").value.trim();
  const details = document.getElementById("edit-detail").value.trim();

  // Validate required fields
  if (
    !title ||
    !price ||
    !category ||
    !subCategory ||
    !description ||
    !details
  ) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  // Validate price
  if (isNaN(price) || parseFloat(price) < 0) {
    showNotification("Please enter a valid price", "error");
    return;
  }

  showLoadingIndicator();

  const updateData = {
    action: "update",
    id: currentEditingProductId,
    title: title,
    price: parseFloat(price),
    category: category,
    subCategory: subCategory,
    description: description,
    details: details,
  };

  fetch(
    "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec",
    {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    }
  )
    .then(() => {
      showNotification("Product updated successfully", "success");
      closePopup();
      loadProducts(); // Reload the product list
    })
    .catch((error) => {
      console.error("Error updating product:", error);
      showNotification("Error updating product", "error");
    })
    .finally(() => {
      hideLoadingIndicator();
    });
}

// Popup functions
function openPopup() {
  const overlay = document.getElementById("popup-overlay");
  const popup = document.getElementById("edit-popup");

  overlay.classList.add("active");
  popup.classList.add("active");

  // Focus on first input
  setTimeout(() => {
    document.getElementById("edit-title").focus();
  }, 100);
}

function closePopup() {
  const overlay = document.getElementById("popup-overlay");
  const popup = document.getElementById("edit-popup");

  overlay.classList.remove("active");
  popup.classList.remove("active");

  // Reset form and current editing ID
  document.getElementById("edit-form").reset();
  currentEditingProductId = null;
}

// Search functionality
function setupSearch() {
  const searchBar = document.getElementById("searchBar");

  searchBar.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim();
    const productItems = document.querySelectorAll(".product-item");
    let visibleCount = 0;

    productItems.forEach((item) => {
      const title = item
        .querySelector(".product-title")
        .textContent.toLowerCase();
      const category = item
        .querySelector(".product-meta div:first-child")
        .textContent.toLowerCase();
      const subCategory = item
        .querySelector(".product-meta div:nth-child(2)")
        .textContent.toLowerCase();

      const isVisible =
        title.includes(searchTerm) ||
        category.includes(searchTerm) ||
        subCategory.includes(searchTerm);

      if (isVisible) {
        item.style.display = "block";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    // Show/hide no results message
    let noResultsMsg = document.getElementById("no-search-results");
    if (visibleCount === 0 && searchTerm !== "") {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement("div");
        noResultsMsg.id = "no-search-results";
        noResultsMsg.innerHTML = `
          <h3>No products found</h3>
          <p>Try adjusting your search terms or browse all products.</p>
        `;
        document.getElementById("product-list").appendChild(noResultsMsg);
      }
      noResultsMsg.style.display = "block";
    } else if (noResultsMsg) {
      noResultsMsg.style.display = "none";
    }
  });
}

// Helper function to show notifications
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Create or get notification container
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "10000";
    document.body.appendChild(container);
  }

  container.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Loading indicator functions
function showLoadingIndicator() {
  let loader = document.getElementById("loading-indicator");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loading-indicator";
    loader.innerHTML = '<div class="spinner"></div>';
    loader.style.position = "fixed";
    loader.style.top = "0";
    loader.style.left = "0";
    loader.style.width = "100%";
    loader.style.height = "100%";
    loader.style.backgroundColor = "rgba(255,255,255,0.9)";
    loader.style.display = "flex";
    loader.style.justifyContent = "center";
    loader.style.alignItems = "center";
    loader.style.zIndex = "9999";

    document.body.appendChild(loader);
  } else {
    loader.style.display = "flex";
  }
}

function hideLoadingIndicator() {
  const loader = document.getElementById("loading-indicator");
  if (loader) {
    loader.style.display = "none";
  }
}

// Close popup when clicking overlay
document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("popup-overlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closePopup();
      }
    });
  }

  // Close popup with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closePopup();
    }
  });

  // Setup search functionality
  setupSearch();

  // Load products on page load
  loadProducts();
});

// Handle form submission
document.addEventListener("DOMContentLoaded", function () {
  const editForm = document.getElementById("edit-form");
  if (editForm) {
    editForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveEditChanges();
    });
  }
});
