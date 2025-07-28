document.addEventListener("DOMContentLoaded", function () {
  // API endpoint for Google Sheets Web App
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz7ZzI7hStZLqcBzDSo2gk9F4B2Qo47npGbINcmGYckr_jYDPbOo9sRhoLRC3cqLjsL/exec";

  // DOM Elements
  const statusMessage = document.getElementById("status-message");
  const policyContent = document.getElementById("policy-content");
  const bulletPointsContainer = document.getElementById(
    "bullet-points-container"
  );
  const faqsContainer = document.getElementById("faqs-container");
  const saveButton = document.getElementById("save-changes");

  // Event Listeners
  document
    .getElementById("add-bullet")
    .addEventListener("click", () => addBulletPoint());
  document.getElementById("add-faq").addEventListener("click", () => addFAQ());

  if (saveButton) {
    saveButton.addEventListener("click", saveData);
  }

  // Initialize the form
  loadData();

  // Handle bullet point removal
  window.removeBulletPoint = function (button) {
    button.closest(".bullet-item").remove();
  };

  // Handle FAQ removal
  window.removeFAQ = function (button) {
    button.closest(".faq-item").remove();
  };

  function loadData() {
    showStatusMessage("Loading data...", "loading");

    fetch(GOOGLE_SCRIPT_URL + "?action=getData", {
      method: "GET",
      mode: "cors",
      redirect: "follow",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response: " + response.status);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          populateForm(data.data);
          showStatusMessage("Data loaded successfully", "success");
        } else {
          throw new Error(data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        showStatusMessage("Failed to load data: " + error.message, "error");
      });
  }

  function populateForm(data) {
    // Set policy content
    policyContent.value = data.policyContent || "";

    // Clear existing bullet points and FAQs
    bulletPointsContainer.innerHTML = "";
    faqsContainer.innerHTML = "";

    // Add bullet points
    if (data.bulletPoints && data.bulletPoints.length > 0) {
      data.bulletPoints.forEach((point) => addBulletPoint(point));
    } else {
      addBulletPoint(); // Add empty one if none exist
    }

    // Add FAQs
    if (data.faqs && data.faqs.length > 0) {
      data.faqs.forEach((faq) => addFAQ(faq.question, faq.answer));
    } else {
      addFAQ(); // Add empty one if none exist
    }
  }

  function addBulletPoint(text = "") {
    const bulletItem = document.createElement("div");
    bulletItem.className = "bullet-item";

    const safeText = escapeHTML(text);

    bulletItem.innerHTML = `
            <input type="text" class="bullet-point" placeholder="Enter bullet point..." value="${safeText}">
            <button type="button" class="delete-btn" onclick="removeBulletPoint(this)">Delete</button>
        `;

    bulletPointsContainer.appendChild(bulletItem);
  }

  function addFAQ(question = "", answer = "") {
    const faqItem = document.createElement("div");
    faqItem.className = "faq-item";

    const safeQuestion = escapeHTML(question);
    const safeAnswer = escapeHTML(answer);

    faqItem.innerHTML = `
            <input type="text" class="faq-question" placeholder="Enter question..." value="${safeQuestion}">
            <textarea class="faq-answer" placeholder="Enter answer...">${safeAnswer}</textarea>
            <button type="button" class="delete-btn" onclick="removeFAQ(this)">Delete</button>
        `;

    faqsContainer.appendChild(faqItem);
  }

  function saveData() {
    const formData = collectFormData();

    showStatusMessage("Saving changes...", "loading");

    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "saveData",
        data: formData,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response: " + response.status);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          showStatusMessage("Changes saved successfully", "success");
        } else {
          throw new Error(data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error);
        showStatusMessage("Failed to save: " + error.message, "error");
      });
  }

  function collectFormData() {
    // Get policy content
    const policyText = policyContent.value;

    // Get bullet points
    const bulletPoints = [];
    document.querySelectorAll(".bullet-point").forEach((input) => {
      const value = input.value.trim();
      if (value !== "") {
        bulletPoints.push(value);
      }
    });

    // Get FAQs
    const faqs = [];
    document.querySelectorAll(".faq-item").forEach((item) => {
      const question = item.querySelector(".faq-question").value.trim();
      const answer = item.querySelector(".faq-answer").value.trim();

      if (question !== "" && answer !== "") {
        faqs.push({ question, answer });
      }
    });

    return {
      policyContent: policyText,
      bulletPoints: bulletPoints,
      faqs: faqs,
    };
  }

  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";

    if (type) {
      statusMessage.classList.add(type);
    }

    // Automatically clear success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        if (statusMessage.textContent === message) {
          statusMessage.textContent = "";
          statusMessage.className = "status-message";
        }
      }, 5000);
    }
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
