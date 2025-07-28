 // Configuration - Update this with your Google Apps Script Web App URL
      const GOOGLE_APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwgFFBPPgN4tznZccmNmzX67RWtqidspr116UF7srUdZRR01vWW_Il5tPKEx2GO4mXm/exec";

      // Enable debug mode by adding ?debug=true to URL
      const DEBUG_MODE =
        new URLSearchParams(window.location.search).get("debug") === "true";

      document.addEventListener("DOMContentLoaded", function () {
        // Get order number from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const orderNumber =
          urlParams.get("orderNumber") ||
          urlParams.get("id") ||
          urlParams.get("orderId");

        if (DEBUG_MODE) {
          document.getElementById("debugInfo").style.display = "block";
          document.getElementById(
            "debugText"
          ).innerHTML = `Order Number from URL: ${orderNumber}`;
        }

        if (orderNumber) {
          fetchOrderDetails(orderNumber);
        } else {
          showError("No order number provided in URL parameters");
        }

        // Create confetti animation
        createConfetti();
      });

      async function fetchOrderDetails(orderNumber) {
        try {
          if (DEBUG_MODE) {
            document.getElementById(
              "debugText"
            ).innerHTML += `<br>Fetching order details for: ${orderNumber}`;
          }

          // Use the correct action name that exists in your Google Apps Script
          const response = await fetch(
            `${GOOGLE_APPS_SCRIPT_URL}?action=getOrderDetails&orderId=${encodeURIComponent(
              orderNumber
            )}`
          );

          if (DEBUG_MODE) {
            document.getElementById(
              "debugText"
            ).innerHTML += `<br>Response status: ${response.status}`;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (DEBUG_MODE) {
            document.getElementById(
              "debugText"
            ).innerHTML += `<br>API Response: ${JSON.stringify(
              result,
              null,
              2
            )}`;
          }

          if (result.success && result.order) {
            displayOrderDetails(result.order);
          } else {
            showError(result.message || "Order not found");
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
          if (DEBUG_MODE) {
            document.getElementById(
              "debugText"
            ).innerHTML += `<br>Error: ${error.message}`;
          }
          showError("Unable to load order details. Please try again later.");
        }
      }

      function displayOrderDetails(order) {
        if (DEBUG_MODE) {
          document.getElementById(
            "debugText"
          ).innerHTML += `<br>Displaying order: ${JSON.stringify(
            order,
            null,
            2
          )}`;
        }

        // Handle different possible field names from your Google Apps Script
        const orderNumber =
          order["Order ID"] || order.id || order.orderId || "N/A";
        const orderDate =
          order["Date"] || order.date || order.orderDate || "N/A";
        const customerName =
          order["Customer Name"] ||
          (order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : "") ||
          "N/A";
        const customerEmail =
          order["Email"] ||
          (order.customer ? order.customer.email : "") ||
          "N/A";
        const paymentMethod =
          order["Payment Method"] || order.paymentMethod || "N/A";
        const orderStatus = order["Order Status"] || order.status || "N/A";
        const orderTotal =
          order["Total"] ||
          (order.order ? order.order.total : order.total) ||
          "N/A";

        // Update order details in the DOM
        document.getElementById("orderNumber").textContent = orderNumber;
        document.getElementById("orderDate").textContent =
          formatDate(orderDate);
        document.getElementById("customerName").textContent = customerName;
        document.getElementById("customerEmail").textContent = customerEmail;
        document.getElementById("paymentMethod").textContent =
          formatPaymentMethod(paymentMethod);
        document.getElementById("orderStatus").textContent =
          formatStatus(orderStatus);
        document.getElementById("orderTotal").textContent =
          formatCurrency(orderTotal);

        // Remove loading class
        document
          .querySelectorAll(".loading")
          .forEach((el) => el.classList.remove("loading"));
      }

      function showError(message) {
        // Display error message in all fields
        const errorFields = [
          "orderNumber",
          "orderDate",
          "customerName",
          "customerEmail",
          "paymentMethod",
          "orderStatus",
          "orderTotal",
        ];
        errorFields.forEach((fieldId) => {
          const element = document.getElementById(fieldId);
          element.textContent = "Error loading data";
          element.classList.remove("loading");
          element.classList.add("error");
        });

        // Show specific error in order number field
        document.getElementById("orderNumber").textContent = message;
      }

      function formatDate(dateString) {
        if (!dateString || dateString === "N/A") return "N/A";
        try {
          const date = new Date(dateString);
          return date.toLocaleString();
        } catch (error) {
          return dateString; // Return original if parsing fails
        }
      }

      function formatPaymentMethod(method) {
        if (!method || method === "N/A") return "N/A";
        const methodMap = {
          cod: "Cash on Delivery",
          online: "Credit/Debit Card",
          card: "Credit/Debit Card",
        };
        return methodMap[method.toLowerCase()] || method;
      }

      function formatStatus(status) {
        if (!status || status === "N/A") return "N/A";
        // Capitalize first letter and replace underscores with spaces
        return (
          status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
        );
      }

      function formatCurrency(amount) {
        if (!amount || amount === "N/A") return "N/A";
        try {
          const numAmount =
            typeof amount === "string" ? parseFloat(amount) : amount;
          return "$" + numAmount.toFixed(2);
        } catch (error) {
          return amount;
        }
      }

      function createConfetti() {
        const confettiColors = [
          "#f44336",
          "#e91e63",
          "#9c27b0",
          "#673ab7",
          "#3f51b5",
          "#2196f3",
          "#03a9f4",
          "#00bcd4",
          "#009688",
          "#4CAF50",
          "#8bc34a",
          "#cddc39",
        ];

        const confettiContainer = document.querySelector(".confirmation-card");

        for (let i = 0; i < 100; i++) {
          const confetti = document.createElement("div");
          confetti.className = "confetti";
          confetti.style.left = Math.random() * 100 + "%";
          confetti.style.backgroundColor =
            confettiColors[Math.floor(Math.random() * confettiColors.length)];
          confetti.style.animationDelay = Math.random() * 3 + "s";
          confetti.style.animationDuration = Math.random() * 3 + 2 + "s";
          confetti.style.animation = "confettiFall linear forwards";

          // Random shape
          if (Math.random() > 0.6) {
            confetti.style.borderRadius = "50%"; // Circle
          } else if (Math.random() > 0.5) {
            confetti.style.width = "8px";
            confetti.style.height = "20px";
          } else {
            // Rectangle/square remains default
          }

          confettiContainer.appendChild(confetti);
        }
      }