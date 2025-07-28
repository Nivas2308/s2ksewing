 // Google Apps Script URL - Replace with your deployed script URL
      const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbxXG1-5hT62KsCptbLYcgTt11SMtI8ndNLxQZXZ4wX8XnNa6O6buJ33YQPLoxZ9eNo/exec";
      // Product API URL (same as productpage.html)
      const PRODUCT_API_URL =
        "https://script.google.com/macros/s/AKfycbwWZEWxIHLTQSLDcxE0ltmydCCWDVbv0feh2GnjnO2fvd0Ur78C0ztV8EJIJCXqmQQ8/exec";

      // --- Product Details Display ---
      function getProductIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("id");
      }

      async function fetchProductDetails(productId) {
        try {
          const response = await fetch(PRODUCT_API_URL);
          const data = await response.json();

          let products = [];
          if (Array.isArray(data)) {
            // API returns array directly
            products = data;
          } else if (data.success && Array.isArray(data.products)) {
            // API returns { success: true, products: [...] }
            products = data.products;
          } else {
            console.log("API returned unexpected format:", data);
            return null;
          }

          // Debug: log all product IDs
          console.log(
            "All product IDs:",
            products.map((p) => p.id)
          );
          // Compare as strings, trimmed
          return products.find(
            (p) =>
              p.id && p.id.toString().trim() === productId.toString().trim()
          );
        } catch (error) {
          console.error("Error fetching product data:", error);
        }
        return null;
      }

      function renderProductDetails(product) {
        console.log("Rendering product:", product);
        const container = document.getElementById("productDetailsContainer");
        if (!container) {
          console.error("productDetailsContainer not found in DOM!");
          return;
        }
        if (!product) {
          container.innerHTML =
            "<div style='color:red;'>No product data to display.</div>";
          return;
        }
        const image =
          (product.images && product.images[0]) ||
          product.mainImage ||
          product.image ||
          "https://via.placeholder.com/150";
        const price = product.price
          ? `<div class='product-price'>$${product.price}</div>`
          : "";
        const category = product.category
          ? `<span>${product.category}</span>`
          : "";
        const subCategory = product.subCategory
          ? ` &middot; <span>${product.subCategory}</span>`
          : "";
        const stock =
          product.inStock === false || product.inStock === "Out of Stock"
            ? `<span class='product-stock out'>Out of Stock</span>`
            : `<span class='product-stock'>In Stock</span>`;
        container.innerHTML = `
                <img src="${image}" alt="${
          product.title
        }" class="product-image">
                <div class="product-info">
                    <div class="product-title">${
                      product.title || "Untitled Product"
                    }</div>
                    ${price}
                    <div class="product-category">${category}${subCategory}</div>
                    ${stock}
                    <div class="product-description">${
                      product.description || ""
                    }</div>
                </div>
            `;
      }

      document.addEventListener("DOMContentLoaded", async function () {
        const productId = getProductIdFromUrl();
        console.log("Product ID from URL:", productId);
        if (productId) {
          const product = await fetchProductDetails(productId);
          console.log("Fetched product:", product);
          if (product) {
            window.loadedProduct = product; // Store globally for form submission
            renderProductDetails(product);
          } else {
            const container = document.getElementById(
              "productDetailsContainer"
            );
            if (container) {
              container.innerHTML =
                "<div style='color:red;'>Product not found.<br>Check the product ID and API data.</div>";
            }
          }
        }
      });

      // Image preview functionality
      document
        .getElementById("referenceImage")
        .addEventListener("change", function (e) {
          const file = e.target.files[0];
          const preview = document.getElementById("imagePreview");

          if (file) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
              showError("File size must be less than 5MB");
              this.value = "";
              return;
            }

            // Check file type
            if (!file.type.startsWith("image/")) {
              showError("Please select an image file");
              this.value = "";
              return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
              preview.innerHTML = `
                        <img src="${e.target.result}" alt="Image preview">
                        <br>
                        <button type="button" class="remove-image" onclick="removeImage()">Remove Image</button>
                    `;
            };
            reader.readAsDataURL(file);
          } else {
            preview.innerHTML = "";
          }
        });

      function removeImage() {
        document.getElementById("referenceImage").value = "";
        document.getElementById("imagePreview").innerHTML = "";
      }

      function showSuccess(message) {
        const successEl = document.getElementById("successMessage");
        const errorEl = document.getElementById("errorMessage");

        if (message) successEl.textContent = message;
        successEl.style.display = "block";
        errorEl.style.display = "none";

        // Scroll to top to show message
        successEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function showError(message) {
        const successEl = document.getElementById("successMessage");
        const errorEl = document.getElementById("errorMessage");

        if (message) errorEl.textContent = message;
        errorEl.style.display = "block";
        successEl.style.display = "none";

        // Scroll to top to show message
        errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function hideMessages() {
        document.getElementById("successMessage").style.display = "none";
        document.getElementById("errorMessage").style.display = "none";
      }

      // Form submission
      const paymentPopup = document.getElementById("paymentPopup");
      const proceedBtn = document.getElementById("proceedBtn");
      const cancelBtn = document.getElementById("cancelBtn");
      const form = document.getElementById("fabricRequestForm");
      let allowSubmit = false;

      // Refactored form submission logic
      form.addEventListener("submit", async function (e) {
        if (!allowSubmit) {
          e.preventDefault();
          paymentPopup.style.display = "flex";
          return;
        }
        // Only allow submission after Proceed is clicked
        allowSubmit = false; // reset for next time
        e.preventDefault();
        // Hide any previous messages
        hideMessages();

        // Show loading state
        const submitBtn = document.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;

        try {
          // Get form data
          const formData = new FormData(this);

          // Validate required fields
          const requiredFields = [
            "fullName",
            "phone",
            "email",
            "fabricColor",
            "fabricMaterial",
          ];
          let isValid = true;

          requiredFields.forEach((field) => {
            if (!formData.get(field) || formData.get(field).trim() === "") {
              isValid = false;
            }
          });

          if (!isValid) {
            showError("Please fill in all required fields.");
            return;
          }

          // Convert image to base64 if present
          let imageData = "";
          const imageFile = formData.get("referenceImage");
          if (imageFile && imageFile.size > 0) {
            imageData = await fileToBase64(imageFile);
          }

          // Prepare data for Google Sheets
          // Get userId from sessionStorage or localStorage
          let userId = sessionStorage.getItem('userId') || localStorage.getItem('userId') || '';
          // Get product details from the loaded product (if available)
          let productId = '';
          let productTitle = '';
          let productPrice = '';
          if (window.loadedProduct) {
            productId = window.loadedProduct.id || '';
            productTitle = window.loadedProduct.title || '';
            productPrice = window.loadedProduct.price || '';
          }

          const submitData = {
            timestamp: new Date().toISOString(),
            fullName: formData.get("fullName"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            fabricColor: formData.get("fabricColor"),
            fabricMaterial: formData.get("fabricMaterial"),
            referenceDescription: formData.get("referenceDescription") || "",
            imageData: imageData,
            userId: userId,
            productId: productId,
            productTitle: productTitle,
            productPrice: productPrice
          };

          // Submit to Google Sheets with no-cors mode
          const response = await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", // This prevents reading the response but allows the request
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submitData),
          });

          // With no-cors mode, we can't read response details
          // But if the fetch doesn't throw an error, assume success
          console.log("Form submitted successfully");
          showSuccess(
            "Thank you! Your custom fabric request has been submitted successfully. We'll contact you within 24-48 hours."
          );
          this.reset();
          removeImage();
        } catch (error) {
          console.error("Error submitting form:", error);
          showError(
            "There was an error submitting your request. Please try again or contact us directly."
          );
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });

      proceedBtn.addEventListener("click", function () {
        paymentPopup.style.display = "none";
        allowSubmit = true;
        form.requestSubmit(); // triggers submit again, now allowed
      });

      cancelBtn.addEventListener("click", function () {
        paymentPopup.style.display = "none";
      });

      // Cancel and return to product page button logic
      document
        .getElementById("returnToProductBtn")
        .addEventListener("click", function () {
          const urlParams = new URLSearchParams(window.location.search);
          const productId = urlParams.get("id");
          if (productId) {
            window.location.href = `productpage.html?id=${encodeURIComponent(
              productId
            )}`;
          } else {
            window.location.href = "productpage.html";
          }
        });

      // Helper function to convert file to base64
      function fileToBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      }