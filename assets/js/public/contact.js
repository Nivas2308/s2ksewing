const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyd7fznH81hb93DwOOBgY-UN8Gro47AHQ2ESwwezgA7J9p0OFF5NeQ00PPux-CbW7tn/exec";

// Update the DOMContentLoaded event listener to include initializeDropdown
document.addEventListener("DOMContentLoaded", function () {
  loadContactInfo();
  initializeContactForm();
  initializeDropdown(); // Add this line
});

/**
 * Initialize dropdown functionality
 */
function initializeDropdown() {
  const dropdownTrigger = document.getElementById("formDropdownTrigger");
  const formContainer = document.getElementById("formContainer");

  if (!dropdownTrigger || !formContainer) {
    console.warn("Dropdown elements not found");
    return;
  }

  dropdownTrigger.addEventListener("click", function () {
    // Toggle the form visibility
    const isVisible = formContainer.classList.contains("show");

    if (isVisible) {
      // Hide form
      formContainer.classList.remove("show");
      dropdownTrigger.classList.remove("active");
      dropdownTrigger.querySelector("span").textContent = "Send us a Message";
    } else {
      // Show form
      formContainer.classList.add("show");
      dropdownTrigger.classList.add("active");
      dropdownTrigger.querySelector("span").textContent = "Hide Message Form";

      // Scroll to form after animation
      setTimeout(() => {
        formContainer.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    }
  });
}

/**
 * Load contact information from Google Sheets
 */
async function loadContactInfo() {
  try {
    console.log("Loading contact information...");

    const response = await fetch(`${SCRIPT_URL}?action=get_admin_contact_info`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw response from server:", data);

    if (data.success) {
      // Access the contactInfo from the correct location in the response
      const contactInfo = data.contactInfo || data.data?.contactInfo;
      console.log("Contact info extracted:", contactInfo);
      updateContactDisplay(contactInfo);
    } else {
      throw new Error(data.message || "Failed to load contact information");
    }
  } catch (error) {
    console.error("Error loading contact info:", error);

    // Try alternative fetch method
    try {
      await loadContactInfoAlternative();
    } catch (altError) {
      console.error("Alternative method failed:", altError);
      showContactLoadError();
    }
  }
}

/**
 * Alternative method to load contact info using form data
 */
async function loadContactInfoAlternative() {
  try {
    console.log("Trying alternative loading method...");
    const formData = new FormData();
    formData.append("action", "get_admin_contact_info");

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    console.log("Alternative method response:", data);

    if (data.success) {
      const contactInfo = data.contactInfo || data.data?.contactInfo;
      updateContactDisplay(contactInfo);
    } else {
      throw new Error(data.message || "Alternative method failed");
    }
  } catch (error) {
    console.error("Alternative loading method failed:", error);
    throw error;
  }
}

/**
 * Update the contact display section with loaded data
 */
function updateContactDisplay(contactInfo) {
  // Hide loading indicator and show contact details
  const loadingElement = document.getElementById("contactLoading");
  const detailsElement = document.getElementById("contactDetails");

  if (loadingElement) loadingElement.style.display = "none";
  if (detailsElement) detailsElement.style.display = "grid";

  console.log("Updating display with contactInfo:", contactInfo);

  // Update customer support info
  const customerSupportElement = document.getElementById("customerSupportInfo");
  if (customerSupportElement) {
    const customerSupport = contactInfo?.customerSupport || "";
    customerSupportElement.textContent =
      customerSupport || "Contact information not available";
    console.log("Updated customerSupport:", customerSupport);
  }

  // Update main office info
  const mainOfficeElement = document.getElementById("mainOfficeInfo");
  if (mainOfficeElement) {
    const mainOffice = contactInfo?.mainOffice || "";
    mainOfficeElement.textContent =
      mainOffice || "Office information not available";
    console.log("Updated mainOffice:", mainOffice);
  }

  console.log("Contact display updated successfully");
}

/**
 * Show error message when contact info fails to load
 */
function showContactLoadError() {
  console.log("Showing contact load error message");

  const loadingElement = document.getElementById("contactLoading");
  const detailsElement = document.getElementById("contactDetails");

  if (loadingElement) {
    loadingElement.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> Unable to load contact information. Please try refreshing the page.';
    loadingElement.style.color = "#dc3545";
  }

  // Still show the contact details section but with error message
  if (detailsElement) {
    detailsElement.style.display = "grid";

    const customerSupportElement = document.getElementById(
      "customerSupportInfo"
    );
    const mainOfficeElement = document.getElementById("mainOfficeInfo");

    if (customerSupportElement) {
      customerSupportElement.textContent =
        "Unable to load customer support information";
    }

    if (mainOfficeElement) {
      mainOfficeElement.textContent = "Unable to load office information";
    }
  }
}

/**
 * Initialize contact form functionality
 */
function initializeContactForm() {
  const form = document.getElementById("contactForm");
  const successMessage = document.getElementById("successMessage");

  if (!form) {
    console.warn("Contact form not found");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    console.log("Contact form submitted");

    // Clear previous errors
    clearErrors();

    // Validate form
    let isValid = validateForm();

    if (isValid) {
      try {
        // Collect form data
        const formData = {
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("email").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          subject: document.getElementById("subject").value,
          message: document.getElementById("message").value.trim(),
          timestamp: new Date().toISOString(),
        };

        // Send form data to Google Sheets
        await submitContactForm(formData);

        // Show success message
        successMessage.style.display = "block";
        form.reset();

        // Hide success message after 5 seconds
        setTimeout(() => {
          successMessage.style.display = "none";
        }, 5000);

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        console.error("Error submitting form:", error);
        alert("There was an error sending your message. Please try again.");
      }
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.error[style*="block"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });
}

/**
 * Submit contact form to Google Sheets
 */
async function submitContactForm(formData) {
  try {
    const submitData = new FormData();
    submitData.append("action", "submit_contact_form");
    submitData.append("name", formData.name);
    submitData.append("email", formData.email);
    submitData.append("phone", formData.phone);
    submitData.append("subject", formData.subject);
    submitData.append("message", formData.message);
    submitData.append("timestamp", formData.timestamp);

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: submitData,
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to submit form");
    }

    console.log("Contact form submitted successfully");
    return result;
  } catch (error) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
}

/**
 * Validate the contact form
 */
function validateForm() {
  let isValid = true;

  // Validate name
  const name = document.getElementById("name").value.trim();
  if (!name) {
    showError("nameError", "Please enter your name");
    isValid = false;
  } else if (name.length < 2) {
    showError("nameError", "Name must be at least 2 characters long");
    isValid = false;
  }

  // Validate email
  const email = document.getElementById("email").value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showError("emailError", "Please enter your email address");
    isValid = false;
  } else if (!emailRegex.test(email)) {
    showError("emailError", "Please enter a valid email address");
    isValid = false;
  }

  // Validate phone (optional, but format check if provided)
  const phone = document.getElementById("phone").value.trim();
  if (phone) {
    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      showError("phoneError", "Please enter a valid phone number");
      isValid = false;
    }
  }

  // Validate subject
  const subject = document.getElementById("subject").value;
  if (!subject) {
    showError("subjectError", "Please select a subject");
    isValid = false;
  }

  // Validate message
  const message = document.getElementById("message").value.trim();
  if (!message) {
    showError("messageError", "Please enter your message");
    isValid = false;
  } else if (message.length < 10) {
    showError("messageError", "Message must be at least 10 characters long");
    isValid = false;
  }

  return isValid;
}

/**
 * Show form error
 */
function showError(errorId, message) {
  const errorElement = document.getElementById(errorId);
  const inputElement = errorElement
    ? errorElement.previousElementSibling
    : null;

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  if (inputElement) {
    inputElement.classList.add("invalid");
  }
}

/**
 * Clear all form errors
 */
function clearErrors() {
  const errors = document.querySelectorAll(".error");
  const inputs = document.querySelectorAll("input, textarea, select");

  errors.forEach((error) => {
    error.style.display = "none";
  });

  inputs.forEach((input) => {
    input.classList.remove("invalid");
  });
}

// Add real-time validation feedback
document.addEventListener("DOMContentLoaded", function () {
  const inputs = document.querySelectorAll(
    "#contactForm input, #contactForm textarea, #contactForm select"
  );

  inputs.forEach((input) => {
    // Clear errors on focus
    input.addEventListener("focus", function () {
      const errorElement = this.parentElement.querySelector(".error");
      if (errorElement && errorElement.style.display === "block") {
        errorElement.style.display = "none";
        this.classList.remove("invalid");
      }
    });

    // Clear errors on input
    input.addEventListener("input", function () {
      const errorElement = this.parentElement.querySelector(".error");
      if (errorElement && errorElement.style.display === "block") {
        errorElement.style.display = "none";
        this.classList.remove("invalid");
      }
    });
  });
});

// Auto-format phone number input
document.addEventListener("DOMContentLoaded", function () {
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      let value = this.value.replace(/\D/g, "");

      // Limit to 10 digits for US phone numbers
      if (value.length > 10) {
        value = value.substring(0, 10);
      }

      // Format the number
      if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
      } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{0,3})/, "($1) $2");
      }

      this.value = value;
    });

    // Prevent non-numeric input
    phoneInput.addEventListener("keypress", function (e) {
      const char = String.fromCharCode(e.which);
      if (!/[0-9\(\)\-\s]/.test(char)) {
        e.preventDefault();
      }
    });
  }
});

// Manual refresh function for testing
window.refreshContactInfo = function () {
  console.log("Manually refreshing contact information...");
  loadContactInfo();
};

// Add some debugging helpers
window.testContactForm = function () {
  console.log("Testing contact form submission...");
  const testData = {
    name: "Test User",
    email: "test@example.com",
    phone: "(123) 456-7890",
    subject: "general",
    message: "This is a test message",
    timestamp: new Date().toISOString(),
  };

  submitContactForm(testData)
    .then(() => console.log("Test submission successful"))
    .catch((error) => console.error("Test submission failed:", error));
};
