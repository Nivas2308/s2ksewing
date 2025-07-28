const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec";
const DEFAULT_BACKGROUND =
  "https://images.unsplash.com/photo-1470167290877-7d5d3446de4c?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

function setBackgroundImage(imageUrl) {
  document.body.style.backgroundImage = `url('${imageUrl}')`;
}

async function loadBackgroundFromSheet() {
  try {
    console.log("Fetching background image from Google Sheets...");
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=branding`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.success && data.backgroundImage) {
      setBackgroundImage(data.backgroundImage);
    } else {
      setBackgroundImage(DEFAULT_BACKGROUND);
    }
  } catch (error) {
    console.error("Error loading background from Google Sheets:", error);
    setBackgroundImage(DEFAULT_BACKGROUND);
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", function () {
  setBackgroundImage(DEFAULT_BACKGROUND);
  loadBackgroundFromSheet();
});

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("employeeRegisterForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const strengthMeter = document.getElementById("strength-meter");
  const strengthText = document.getElementById("strength-text");
  const registerBtn = document.getElementById("registerBtn");
  const loader = document.getElementById("loader");

  // Image preview functionality
  const profileImageInput = document.getElementById("profileImage");
  const imagePreview = document.getElementById("imagePreview");
  const fileName = document.getElementById("fileName");

  profileImageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (file) {
      const reader = new FileReader();

      reader.addEventListener("load", function () {
        // Clear the preview
        imagePreview.innerHTML = "";

        // Create image element
        const img = document.createElement("img");
        img.src = reader.result;
        imagePreview.appendChild(img);

        // Update filename display
        fileName.textContent = file.name;
      });

      reader.readAsDataURL(file);
    } else {
      // Reset to placeholder if no file selected
      imagePreview.innerHTML =
        '<div class="image-preview-placeholder">No image<br>selected</div>';
      fileName.textContent = "No file chosen";
    }
  });

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbymiW25uafCai9Gchi7nkRN-7mBlMvzOuJ44-4tUbNmmnP6nMDLm414kQpSncIFlLO9/exec";

  // Password strength meter
  passwordInput.addEventListener("input", function () {
    const password = passwordInput.value;
    const strength = checkPasswordStrength(password);

    // Update strength meter
    strengthMeter.style.width = strength.percentage + "%";
    strengthMeter.style.backgroundColor = strength.color;
    strengthText.textContent = strength.text;
    strengthText.style.color = strength.color;
  });

  // Check password strength
  function checkPasswordStrength(password) {
    const length = password.length;

    if (length === 0) {
      return {
        percentage: 0,
        color: "#ddd",
        text: "Password strength",
      };
    }

    let strength = 0;

    // Length check
    if (length >= 8) strength += 1;
    if (length >= 12) strength += 1;

    // Character type checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    // Determine strength level
    if (strength <= 2) {
      return {
        percentage: 25,
        color: "#ff4d4d",
        text: "Weak",
      };
    } else if (strength <= 4) {
      return {
        percentage: 50,
        color: "#ffa64d",
        text: "Medium",
      };
    } else if (strength <= 5) {
      return {
        percentage: 75,
        color: "#2ecc71",
        text: "Strong",
      };
    } else {
      return {
        percentage: 100,
        color: "#27ae60",
        text: "Very Strong",
      };
    }
  }

  // Form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Validate passwords match
    if (passwordInput.value !== confirmPasswordInput.value) {
      showAlert("Error", "Passwords do not match!", "error");
      return;
    }

    // Validate pincode
    const pincodeInput = document.getElementById("pincode");
    const pincodePattern = /^[0-9]{4,10}$/;
    if (!pincodePattern.test(pincodeInput.value)) {
      showAlert(
        "Error",
        "Please enter a valid pincode (4-10 digits only)",
        "error"
      );
      return;
    }

    // Show loader
    registerBtn.textContent = "";
    loader.style.display = "block";

    // Get form data
    const formData = new FormData(form);
    const data = new URLSearchParams();

    // Add all form fields except the image file
    for (let [key, value] of formData.entries()) {
      if (key !== "profileImage") {
        data.append(key, value);
      }
    }

    // Handle the image file separately
    const imageFile = profileImageInput.files[0];
    if (imageFile) {
      // Read the file as data URL
      const reader = new FileReader();

      reader.onload = function (fileEvent) {
        // Add the image data to our form data
        data.append("imageData", fileEvent.target.result);

        // Now send the complete data to the server
        submitFormData(data);
      };

      reader.readAsDataURL(imageFile);
    } else {
      // No image selected, just submit the form data
      submitFormData(data);
    }

    // Function to submit the form data
    function submitFormData(data) {
      // Send data to Google Apps Script
      fetch(SCRIPT_URL, {
        redirect: "follow",
        method: "POST",
        body: data,
        mode: "no-cors", // Required for Google Apps Script
      })
        .then((response) => {
          // Handle response
          loader.style.display = "none";
          registerBtn.textContent = "Register";

          // Show success message
          showAlert(
            "Success",
            "Employee registration successful! Wait for the Approval.",
            "success"
          );

          // Reset form
          form.reset();
          // Reset image preview
          imagePreview.innerHTML =
            '<div class="image-preview-placeholder">No image<br>selected</div>';
          fileName.textContent = "No file chosen";
        })
        .catch((error) => {
          // Handle error
          loader.style.display = "none";
          registerBtn.textContent = "Register";

          showAlert(
            "Error",
            "Registration failed. Please try again later.",
            "error"
          );

          console.error("Error:", error);
        });
    }
  });
  // Custom alert function
  function showAlert(title, message, type) {
    const alertContainer = document.getElementById("custom-alert-container");
    const alertBox = document.getElementById("custom-alert");
    const alertTitle = document.getElementById("alert-title");
    const alertMessage = document.getElementById("alert-message");
    const alertBtn = document.getElementById("alert-btn");

    // Set alert content
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    // Set alert type
    alertBox.className = "custom-alert alert-" + type;

    // Show alert
    alertContainer.style.display = "flex";

    // Close alert on button click
    alertBtn.onclick = function () {
      alertContainer.style.display = "none";
    };
  }
});
