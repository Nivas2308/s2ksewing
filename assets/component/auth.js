// Page Loading Function
// Wait for all required data to be fetched before hiding loader and showing content

document.addEventListener("DOMContentLoaded", function () {
  const loader = document.getElementById("loader");
  const content = document.getElementById("content");

  // Promises for all required fetches
  const fetchHomeData = fetch(
    "https://script.google.com/macros/s/AKfycbyF_vLCIJK7evShOw2P_BPepGx-6fBIsGlndqnmfSiojDqgogEkYVeCZd9iU-2dI9RT/exec"
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("scrolling-text").textContent =
          data.scrollingTitle || "Default Scrolling Offer";
        document.getElementById("newsletter-text").textContent =
          data.newsletterText ||
          "Subscribe to our newsletter for latest updates!";
      }
    })
    .catch((error) => console.error("Error fetching home data:", error));

  const fetchLogo = fetch(
    "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec?type=branding"
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.logoImage) {
        const logoImg = document.getElementById("site-logo");
        if (logoImg) {
          logoImg.src = data.logoImage + "?cb=" + new Date().getTime(); // Prevent cache
        }
      } else {
        console.warn("No logo image found.");
      }
    })
    .catch((error) => console.error("Error fetching branding data:", error));

  // Wait for all fetches to complete
  Promise.all([fetchHomeData, fetchLogo]).finally(() => {
    if (loader) loader.style.display = "none";
    if (content) content.style.display = "block";
  });
});

// Retriving default Function
document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbyF_vLCIJK7evShOw2P_BPepGx-6fBIsGlndqnmfSiojDqgogEkYVeCZd9iU-2dI9RT/exec"
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("scrolling-text").textContent =
          data.scrollingTitle || "Default Scrolling Offer";
        document.getElementById("newsletter-text").textContent =
          data.newsletterText ||
          "Subscribe to our newsletter for latest updates!";
      }
    })
    .catch((error) => console.error("Error fetching home data:", error));
});

// Email Collection Function
document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.querySelector(".email-btn");
  const submitButton = document.querySelector(".sub-btn");

  if (emailInput && submitButton) {
    submitButton.addEventListener("click", function () {
      const email = emailInput.value.trim();

      if (!email) {
        alert("Please enter an email address");
        return;
      }

      if (!isValidEmail(email)) {
        alert("Please enter a valid email address");
        return;
      }

      // Show loading state
      const originalText = submitButton.textContent;
      submitButton.textContent = "Subscribing...";
      submitButton.disabled = true;

      // Use the correct deployment ID
      const url =
        "https://script.google.com/macros/s/AKfycbwWmAPt83L7z-yfDZRp4VDwDW8bnmU_D0m2tvjFhTGWbjylOYVXAFSaEgZyXr_vD2oC/exec";

      // Use fetch with no-cors mode
      fetch(url + "?email=" + encodeURIComponent(email) + "&source=website", {
        method: "GET",
        mode: "no-cors",
      })
        .then(() => {
          alert("Thank you for subscribing to our newsletter!");
          emailInput.value = ""; // Clear the input field
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("An error occurred. Please try again later.");
        })
        .finally(() => {
          // Reset button state
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        });
    });
  }

  // Email validation function
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});

// Logo
document.addEventListener("DOMContentLoaded", function () {
  fetch(
    "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec?type=branding"
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.logoImage) {
        const logoImg = document.getElementById("site-logo");
        if (logoImg) {
          logoImg.src = data.logoImage + "?cb=" + new Date().getTime(); // Prevent cache
        }
      } else {
        console.warn("No logo image found.");
      }
    })
    .catch((error) => console.error("Error fetching branding data:", error));
});
