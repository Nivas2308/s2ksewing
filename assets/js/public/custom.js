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
      const form = document.getElementById("fabricRequestForm");

      // Form submission logic
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        // Hide any previous messages
        hideMessages();

        // Show loading state
        const submitBtn = document.querySelector(".submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;

        try {
          // Get form data
          const formData = new FormData(this);

          // Validate required fields
          const requiredFields = [
            "fabricColor",
            "fabricMaterial",
            "fabricSize"
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

          // Get product details from the loaded product (if available)
          let productId = '';
          let productTitle = '';
          let productPrice = '';
          if (window.loadedProduct) {
            productId = window.loadedProduct.id || '';
            productTitle = window.loadedProduct.title || '';
            productPrice = window.loadedProduct.price || '';
          }

          // Create custom fabric object
          const customFabric = {
            id: 'custom_fabric_' + Date.now(),
            title: `Custom Fabric - ${formData.get("fabricColor")} ${formData.get("fabricMaterial")}`,
            size: parseFloat(formData.get("fabricSize")),
            color: formData.get("fabricColor"),
            material: formData.get("fabricMaterial"),
            description: formData.get("referenceDescription") || "",
            sewingPatternNotes: formData.get("sewingPatternNotes") || "",
            imageData: imageData,
            category: "fabrics",
            subCategory: "Custom Fabric",
            isCustom: true,
            notes: `Custom fabric request: ${formData.get("fabricColor")} ${formData.get("fabricMaterial")}`,
            image: imageData || "https://via.placeholder.com/250x200/4caf50/ffffff?text=Custom+Fabric"
          };

          // Store custom fabric in session storage
          const existingCustomFabrics = JSON.parse(sessionStorage.getItem('customFabrics') || '[]');
          existingCustomFabrics.push(customFabric);
          sessionStorage.setItem('customFabrics', JSON.stringify(existingCustomFabrics));

          console.log("Custom fabric stored successfully");
          
          // Show the newly added fabric
          showNewlyAddedFabric(customFabric);
          
          showSuccess(
            "Custom fabric added successfully! Redirecting to product page in 2 seconds..."
          );

          // Reset form for next entry
          this.reset();
          removeImage();
          
          // Redirect to product page after a short delay
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get("id");
            if (productId) {
              window.location.href = `/public/productpage.html?id=${encodeURIComponent(productId)}`;
            } else {
              window.location.href = "/public/productpage.html";
            }
          }, 2000); // 2 second delay to show the success message

        } catch (error) {
          console.error("Error processing custom fabric:", error);
          showError(
            "There was an error processing your custom fabric request. Please try again."
          );
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });

      // Function to show newly added custom fabric
      function showNewlyAddedFabric(fabric) {
        const container = document.getElementById("newlyAddedFabrics");
        const list = document.getElementById("newlyAddedFabricsList");
        
        // Show the container
        container.style.display = "block";
        
        // Create fabric card
        const fabricCard = document.createElement("div");
        fabricCard.className = "newly-added-fabric-card";
        fabricCard.innerHTML = `
          <div class="fabric-card-header">
            <h4>${fabric.title}</h4>
            <span class="custom-badge">Custom</span>
          </div>
          <div class="fabric-card-details">
            <div class="fabric-specs">
              <span><strong>Color:</strong> ${fabric.color}</span>
              <span><strong>Material:</strong> ${fabric.material}</span>
              <span><strong>Size:</strong> ${fabric.size} yard(s)</span>
            </div>
            ${fabric.description ? `<div class="fabric-description"><strong>Description:</strong> ${fabric.description}</div>` : ''}
            ${fabric.sewingPatternNotes ? `<div class="fabric-pattern-notes"><strong>Pattern Notes:</strong> ${fabric.sewingPatternNotes}</div>` : ''}
          </div>
          <div class="fabric-card-actions">
            <button onclick="removeNewlyAddedFabric('${fabric.id}')" class="remove-fabric-btn">
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        `;
        
        list.appendChild(fabricCard);
        
        // Update the cancel button to show "Return to Product"
        const cancelBtn = document.getElementById("returnToProductBtn");
        cancelBtn.textContent = "Return to Product";
        cancelBtn.style.background = "#4caf50";
        cancelBtn.style.color = "white";
      }

      // Function to remove newly added fabric
      function removeNewlyAddedFabric(fabricId) {
        try {
          const customFabrics = JSON.parse(sessionStorage.getItem('customFabrics') || '[]');
          const updatedCustomFabrics = customFabrics.filter(fabric => fabric.id !== fabricId);
          sessionStorage.setItem('customFabrics', JSON.stringify(updatedCustomFabrics));
          
          // Remove from display
          const fabricCards = document.querySelectorAll('.newly-added-fabric-card');
          fabricCards.forEach(card => {
            if (card.querySelector('button').onclick.toString().includes(fabricId)) {
              card.remove();
            }
          });
          
          // Hide container if no fabrics left
          const list = document.getElementById("newlyAddedFabricsList");
          if (list.children.length === 0) {
            document.getElementById("newlyAddedFabrics").style.display = "none";
            const cancelBtn = document.getElementById("returnToProductBtn");
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.background = "#e74c3c";
            cancelBtn.style.color = "white";
          }
        } catch (error) {
          console.error("Error removing newly added fabric:", error);
        }
      }

      // Cancel and return to product page button logic
      document
        .getElementById("returnToProductBtn")
        .addEventListener("click", function () {
          const urlParams = new URLSearchParams(window.location.search);
          const productId = urlParams.get("id");
          if (productId) {
            window.location.href = `/public/productpage.html?id=${encodeURIComponent(
              productId
            )}`;
          } else {
            window.location.href = "/public/productpage.html";
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