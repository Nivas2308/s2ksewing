  // Configuration - Replace with your actual Google Apps Script web app URL
      const WEBAPP_URL =
        "https://script.google.com/macros/s/AKfycbx7rPU1nhE2noekfopCgNxNBkOaDj975MhCIwbBMkGXEKqXZdTPTVmVK4qK_Gr3AM9S/exec";

      // Gift cards data
      let giftCards = [];
      let currentCategory = "all";
      let selectedCard = null;
      let selectedPrice = 0;
      let quantity = 1;

      // Function to show error
      function showError(message) {
        $("#errorMessage").text(message);
        $("#errorAlert").removeClass("hidden").fadeIn();

        setTimeout(() => {
          $("#errorAlert").fadeOut();
        }, 5000);
      }

      // Function to fetch gift cards from Google Sheets
      function fetchGiftCards() {
        $("#loadingOverlay").show();

        $.ajax({
          url: WEBAPP_URL,
          type: "GET",
          data: { action: "getCards" },
          success: function (response) {
            if (Array.isArray(response)) {
              giftCards = response;
              populateCategories();
              renderGiftCards();
            } else if (response.error) {
              showError(response.error);
              $("#giftCardsGrid").html(
                '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
              );
            } else {
              showError("Invalid response format from server");
              $("#giftCardsGrid").html(
                '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
              );
            }
          },
          error: function (xhr, status, error) {
            showError("Failed to connect to server: " + error);
            $("#giftCardsGrid").html(
              '<div class="text-center text-red-500 col-span-full py-12">Failed to load gift cards. Please try again later.</div>'
            );
          },
          complete: function () {
            $("#loadingOverlay").hide();
          },
        });
      }

      // Function to populate category filters
      function populateCategories() {
        const categories = [...new Set(giftCards.map((card) => card.category))];

        $('#categoryFilters button:not([data-category="all"])').remove();

        categories.forEach((category) => {
          if (category) {
            $("#categoryFilters").append(`
                        <button class="category-filter bg-gray-100 text-gray-800 rounded-full px-4 py-2 hover:bg-indigo-100 transition-colors" data-category="${category}">
                            ${category}
                        </button>
                    `);
          }
        });

        $(".category-filter")
          .off("click")
          .on("click", function () {
            $(".category-filter")
              .removeClass("active bg-indigo-600 text-white")
              .addClass("bg-gray-100 text-gray-800");
            $(this)
              .removeClass("bg-gray-100 text-gray-800")
              .addClass("active bg-indigo-600 text-white");

            currentCategory = $(this).data("category");
            renderGiftCards();
          });
      }

      // Function to get price display for a card
      function getPriceDisplay(card) {
        switch (card.pricingType) {
          case "fixed":
            return `$${parseFloat(card.fixedPrice || 0).toFixed(2)}`;
          case "custom":
            return `$${parseFloat(card.minPrice || 0).toFixed(
              2
            )} - $${parseFloat(card.maxPrice || 0).toFixed(2)}`;
          case "both":
            return `From $${parseFloat(card.fixedPrice || 0).toFixed(2)}`;
          default:
            return `$${parseFloat(card.fixedPrice || card.price || 0).toFixed(
              2
            )}`;
        }
      }

      // Function to render gift cards
      function renderGiftCards() {
        const $grid = $("#giftCardsGrid");
        $grid.empty();

        const filteredCards =
          currentCategory === "all"
            ? giftCards
            : giftCards.filter((card) => card.category === currentCategory);

        if (filteredCards.length === 0) {
          $grid.html(
            '<div class="text-center text-gray-500 col-span-full py-12">No gift cards found for this category</div>'
          );
          return;
        }

        filteredCards.forEach((card) => {
          const imageUrl = card.imageUrl || "/api/placeholder/400/250";
          const priceDisplay = getPriceDisplay(card);

          $grid.append(`
                    <div class="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 card-hover">
                        <img src="${imageUrl}" alt="${card.name}" class="w-full h-48 object-cover">
                        <div class="p-4">
                            <h3 class="text-lg font-semibold mb-2">${card.name}</h3>
                            <div class="flex justify-between items-center mb-3">
                                <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">${card.category}</span>
                                <span class="font-bold text-white-600">${priceDisplay}</span>
                            </div>
                            <div class="flex justify-center">
                                <button class="view-details-btn w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors" data-id="${card.id}">
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                `);
        });

        $(".view-details-btn").on("click", function () {
          const cardId = $(this).data("id");
          showPurchaseModal(cardId);
        });
      }

      // Function to setup pricing options
      function setupPricingOptions(card) {
        const $pricingOptions = $("#pricingOptions");
        $pricingOptions.empty();

        if (card.pricingType === "fixed") {
          // Fixed price only
          const price = parseFloat(card.fixedPrice || 0);
          $pricingOptions.append(`
                    <div class="price-option selected" data-price="${price}">
                        <div class="flex justify-between items-center">
                            <span>Fixed Price</span>
                            <span class="font-bold">$${price.toFixed(2)}</span>
                        </div>
                    </div>
                `);
          selectedPrice = price;
        } else if (card.pricingType === "custom") {
          // Custom price with suggested options
          const minPrice = parseFloat(card.minPrice || 0);
          const maxPrice = parseFloat(card.maxPrice || 100);
          const suggestedPrices = card.suggestedPrices || [];

          // Add suggested price options
          if (suggestedPrices.length > 0) {
            suggestedPrices.forEach((price, index) => {
              $pricingOptions.append(`
                            <div class="price-option ${
                              index === 0 ? "selected" : ""
                            }" data-price="${price}">
                                <div class="flex justify-between items-center">
                                    <span>Suggested Amount</span>
                                    <span class="font-bold">$${parseFloat(
                                      price
                                    ).toFixed(2)}</span>
                                </div>
                            </div>
                        `);
            });
            selectedPrice = parseFloat(suggestedPrices[0]);
          }

          // Add custom amount option
          $pricingOptions.append(`
                    <div class="price-option" data-price="custom">
                        <div class="flex justify-between items-center">
                            <span>Custom Amount</span>
                            <span class="text-sm text-gray-600">$${minPrice.toFixed(
                              2
                            )} - $${maxPrice.toFixed(2)}</span>
                        </div>
                        <input type="number" class="custom-price-input" id="customPriceInput" 
                               min="${minPrice}" max="${maxPrice}" step="0.01" 
                               placeholder="Enter custom amount" style="display: none;">
                    </div>
                `);
        } else if (card.pricingType === "both") {
          // Both fixed and custom options
          const fixedPrice = parseFloat(card.fixedPrice || 0);
          const minPrice = parseFloat(card.minPrice || 0);
          const maxPrice = parseFloat(card.maxPrice || 100);
          const suggestedPrices = card.suggestedPrices || [];

          // Fixed price option
          $pricingOptions.append(`
                    <div class="price-option selected" data-price="${fixedPrice}">
                        <div class="flex justify-between items-center">
                            <span>Standard Amount</span>
                            <span class="font-bold">$${fixedPrice.toFixed(
                              2
                            )}</span>
                        </div>
                    </div>
                `);
          selectedPrice = fixedPrice;

          // Suggested custom amounts
          if (suggestedPrices.length > 0) {
            suggestedPrices.forEach((price) => {
              $pricingOptions.append(`
                            <div class="price-option" data-price="${price}">
                                <div class="flex justify-between items-center">
                                    <span>Suggested Amount</span>
                                    <span class="font-bold">$${parseFloat(
                                      price
                                    ).toFixed(2)}</span>
                                </div>
                            </div>
                        `);
            });
          }

          // Custom amount option
          $pricingOptions.append(`
                    <div class="price-option" data-price="custom">
                        <div class="flex justify-between items-center">
                            <span>Custom Amount</span>
                            <span class="text-sm text-gray-600">$${minPrice.toFixed(
                              2
                            )} - $${maxPrice.toFixed(2)}</span>
                        </div>
                        <input type="number" class="custom-price-input" id="customPriceInput" 
                               min="${minPrice}" max="${maxPrice}" step="0.01" 
                               placeholder="Enter custom amount" style="display: none;">
                    </div>
                `);
        }

        // Set up price option click handlers
        $(".price-option")
          .off("click")
          .on("click", function () {
            $(".price-option").removeClass("selected");
            $(this).addClass("selected");

            const price = $(this).data("price");

            if (price === "custom") {
              $("#customPriceInput").show().focus();
              selectedPrice = 0; // Will be set when user enters amount
            } else {
              $("#customPriceInput").hide();
              selectedPrice = parseFloat(price);
            }

            updateTotalAmount();
          });

        // Handle custom price input
        $("#customPriceInput")
          .off("input")
          .on("input", function () {
            const value = parseFloat($(this).val());
            if (!isNaN(value) && value > 0) {
              selectedPrice = value;
              updateTotalAmount();
            }
          });
      }

      // Function to show purchase modal
      function showPurchaseModal(cardId) {
        selectedCard = giftCards.find((card) => card.id === cardId);
        if (!selectedCard) return;

        // Populate modal with card details
        $("#modalCardImage").attr(
          "src",
          selectedCard.imageUrl || "/api/placeholder/400/250"
        );
        $("#modalCardTitle").text(selectedCard.name);
        $("#modalCardCategory").text(selectedCard.category);
        $("#modalCardValidity").text(`${selectedCard.validityDays} days`);
        $("#modalCardDescription").text(
          selectedCard.description || "No description available"
        );

        // Setup pricing options
        setupPricingOptions(selectedCard);

        // Reset form
        $("#purchaseForm")[0].reset();
        quantity = 1;
        $("#quantity").val(quantity);

        updateTotalAmount();
        $("#purchaseModal").removeClass("hidden");
      }

      // Function to update total amount
      function updateTotalAmount() {
        const total = selectedPrice * quantity;
        $("#totalAmount").text(`$${total.toFixed(2)}`);
      }

      // Function to generate order ID
      function generateOrderId() {
        return (
          "GC-" +
          Date.now() +
          "-" +
          Math.random().toString(36).substr(2, 5).toUpperCase()
        );
      }

      // Function to complete purchase
      function completePurchase() {
        if (!selectedCard || selectedPrice <= 0 || quantity <= 0) {
          showError("Please select a gift card and valid amount");
          return;
        }

        const form = $("#purchaseForm")[0];
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const purchaseData = {
          action: "purchase",
          purchase: {
            items: [
              {
                id: selectedCard.id,
                name: selectedCard.name,
                quantity: quantity,
                selectedPrice: selectedPrice,
              },
            ],
            recipient: {
              name: $("#recipientName").val(),
              email: $("#recipientEmail").val(),
              message: $("#personalMessage").val(),
            },
          },
        };

        $("#loader").show();

        $.ajax({
          url: WEBAPP_URL,
          type: "POST",
          data: JSON.stringify(purchaseData),
          contentType: "application/json",
          success: function (response) {
            if (response.success) {
              $("#purchaseModal").addClass("hidden");
              $("#orderIdDisplay").text(response.purchaseId);
              $("#purchaseConfirmModal").removeClass("hidden");

              // Update cart count (simulated)
              updateCartCount();
            } else {
              showError(response.error || "Purchase failed");
            }
          },
          error: function (xhr, status, error) {
            showError("Purchase failed: " + error);
          },
          complete: function () {
            $("#loader").hide();
          },
        });
      }

      // Initialize the application
      $(document).ready(function () {
        // Fetch gift cards on page load
        fetchGiftCards();

        // Modal event handlers
        $("#closePurchaseBtn, #cancelPurchaseBtn").on("click", function () {
          $("#purchaseModal").addClass("hidden");
        });

        $("#confirmDoneBtn").on("click", function () {
          $("#purchaseConfirmModal").addClass("hidden");
        });

        // Quantity controls
        $("#increaseQty").on("click", function () {
          if (quantity < 99) {
            quantity++;
            $("#quantity").val(quantity);
            updateTotalAmount();
          }
        });

        $("#decreaseQty").on("click", function () {
          if (quantity > 1) {
            quantity--;
            $("#quantity").val(quantity);
            updateTotalAmount();
          }
        });

        $("#quantity").on("change", function () {
          const newQty = parseInt($(this).val());
          if (newQty >= 1 && newQty <= 99) {
            quantity = newQty;
            updateTotalAmount();
          } else {
            $(this).val(quantity);
          }
        });

        // Purchase form submission
        $("#purchaseForm").on("submit", function (e) {
          e.preventDefault();
          completePurchase();
        });

        // Close modal when clicking outside
        $("#purchaseModal").on("click", function (e) {
          if (e.target === this) {
            $(this).addClass("hidden");
          }
        });

        $("#purchaseConfirmModal").on("click", function (e) {
          if (e.target === this) {
            $(this).addClass("hidden");
          }
        });

        // Newsletter subscription
        $(".sub-btn").on("click", function () {
          const email = $(".email-btn").val();
          if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            // Simulate newsletter subscription
            alert("Thank you for subscribing to our newsletter!");
            $(".email-btn").val("");
          } else {
            alert("Please enter a valid email address");
          }
        });

        // Handle Enter key in email input
        $(".email-btn").on("keypress", function (e) {
          if (e.which === 13) {
            $(".sub-btn").click();
          }
        });

        // Load site configuration (if available)
        loadSiteConfig();
      });

      // Function to load site configuration
      function loadSiteConfig() {
        // This would typically load from a configuration endpoint
        // For now, we'll set defaults
        $("#site-logo").attr(
          "src",
          "https://via.placeholder.com/120x40/4f46e5/ffffff?text=S2K+SEWING"
        );
        $("#newsletter-text").text(
          "Subscribe to our newsletter for latest updates and exclusive offers!"
        );

        // Update scrolling text
        $("#scrolling-text").text(
          "Welcome to S2K Sewing - Your premier destination for gift cards! 🎁 Free delivery on orders over $100!"
        );
      }

      // Utility function to handle API errors gracefully
      function handleApiError(xhr, textStatus, errorThrown) {
        console.error("API Error:", {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          textStatus: textStatus,
          errorThrown: errorThrown,
        });

        let errorMessage = "An unexpected error occurred. Please try again.";

        if (xhr.status === 0) {
          errorMessage =
            "Unable to connect to the server. Please check your internet connection.";
        } else if (xhr.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (xhr.status === 404) {
          errorMessage = "Service not found. Please contact support.";
        }

        return errorMessage;
      }

      // Function to retry failed requests
      function retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
        let retries = 0;

        function attempt() {
          return requestFunction().catch((error) => {
            retries++;
            if (retries < maxRetries) {
              console.log(`Retry attempt ${retries}/${maxRetries}`);
              return new Promise((resolve) => {
                setTimeout(() => resolve(attempt()), delay * retries);
              });
            } else {
              throw error;
            }
          });
        }

        return attempt();
      }

      // Add loading states for better UX
      function setButtonLoading(buttonSelector, loading = true) {
        const $button = $(buttonSelector);
        if (loading) {
          $button.prop("disabled", true);
          const originalText = $button.text();
          $button.data("original-text", originalText);
          $button.html(
            '<span class="spinner-border spinner-border-sm mr-2"></span>Loading...'
          );
        } else {
          $button.prop("disabled", false);
          $button.text($button.data("original-text") || "Submit");
        }
      }

      // Enhanced error handling with user-friendly messages
      window.onerror = function (msg, url, lineNo, columnNo, error) {
        console.error("Global error:", {
          message: msg,
          source: url,
          line: lineNo,
          column: columnNo,
          error: error,
        });

        // Don't show technical errors to users, but log them
        return false;
      };

      // Service worker registration for offline functionality (optional)
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          // Uncomment if you have a service worker
          // navigator.serviceWorker.register('/sw.js');
        });
      }