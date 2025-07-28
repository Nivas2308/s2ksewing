// Variables to store data
let faqs = [];

// Configuration - Update these URLs to match your Google Apps Script deployment
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwftCmIRYUmzb4_u8FcWduM8cJgVdHjPiEMnoDNtEhTfNbs2yhabXWohbNkLF_yIcy5MQ/exec";
const GET_URL =
  "https://script.google.com/macros/s/AKfycbz-6skM3aclPsJMyb8JOvA8OmLqx6pJXK_GYJYhqpRt47jw_SFTFAfrdj6I4_-eNewDWQ/exec";

// CORS workaround function for GET requests
async function corsProxyFetch(url, method = "GET", data = null) {
  try {
    const options = {
      method: method,
      mode: "no-cors",
    };

    if (data && method === "POST") {
      options.headers = {
        "Content-Type": "application/json",
      };
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return { success: true, data: null };
  } catch (error) {
    console.error("Fetch error:", error);

    if (method === "GET") {
      return await jsonpRequest(url);
    }

    throw error;
  }
}

// JSONP implementation for GET requests
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
    const script = document.createElement("script");
    let isCompleted = false;

    const separator = url.includes("?") ? "&" : "?";
    script.src = url + separator + "callback=" + callbackName;

    window[callbackName] = function (data) {
      if (isCompleted) return;
      isCompleted = true;

      resolve({ success: true, data: data });
      cleanup();
    };

    script.onerror = function () {
      if (isCompleted) return;
      isCompleted = true;

      reject(new Error("JSONP request failed"));
      cleanup();
    };

    function cleanup() {
      try {
        if (script && script.parentNode) {
          document.head.removeChild(script);
        }
        if (window[callbackName]) {
          delete window[callbackName];
        }
      } catch (e) {
        console.warn("Cleanup error:", e);
      }
    }

    document.head.appendChild(script);

    setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        reject(new Error("JSONP request timeout"));
        cleanup();
      }
    }, 10000);
  });
}

// Load home page data from server
async function loadHomeData() {
  try {
    console.log("Loading home data...");

    let data;
    try {
      const result = await jsonpRequest(GET_URL + "?type=home");
      data = result.data;
    } catch (jsonpError) {
      console.log("JSONP failed, trying direct fetch...");
      const response = await fetch(GET_URL + "?type=home", {
        method: "GET",
        cache: "no-store",
      });

      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    console.log("Loaded home data:", data);

    if (data && data.success) {
      document.getElementById("scrolling-title").value =
        data.scrollingTitle || "";
      document.getElementById("header-title").value = data.headerTitle || "";
      document.getElementById("highlighted-title").value =
        data.highlightedTitle || "";
      document.getElementById("newsletter-text").value =
        data.newsletterText || "";

      if (data.headerImage) {
        const headerPreview = document.getElementById("header-image-preview");
        headerPreview.src = data.headerImage;
        headerPreview.style.display = "block";
      }

      if (data.highlightedImage) {
        const highlightedPreview = document.getElementById(
          "highlighted-image-preview"
        );
        highlightedPreview.src = data.highlightedImage;
        highlightedPreview.style.display = "block";
      }

      if (data.faqs && Array.isArray(data.faqs)) {
        faqs = data.faqs;
        updateFAQList();
      }
    }
  } catch (error) {
    console.error("Error loading home data:", error);
    showMessage(
      "Could not load existing data. You can still make changes and save.",
      "warning"
    );
  }
}

// Load branding data from server
// Load branding data from server
async function loadBrandingData() {
  try {
    console.log("Loading branding data...");

    let data;
    try {
      const result = await jsonpRequest(GET_URL + "?type=branding");
      data = result.data;
    } catch (jsonpError) {
      console.log("JSONP failed for branding, trying direct fetch...");
      const response = await fetch(GET_URL + "?type=branding", {
        method: "GET",
        cache: "no-store",
      });

      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    console.log("Loaded branding data:", data);

    if (data && data.success) {
      // Handle logo image
      if (data.logoImage) {
        const logoPreview = document.getElementById("logo-preview");
        logoPreview.src = data.logoImage;
        logoPreview.style.display = "block";
      }

      // Handle background image - FIXED: Use backgroundImage instead of logoSize
      if (data.logoSize) {
        const bgPreview = document.getElementById("login-bg-preview");

        if (
          data.logoSize.startsWith("data:image") ||
          data.logoSize.startsWith("http")
        ) {
          bgPreview.src = data.logoSize;
        } else {
          bgPreview.src = "data:image/png;base64," + data.logoSize;
        }

        bgPreview.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error loading branding data:", error);
    showMessage(
      "Could not load existing branding data. You can still make changes and save.",
      "warning"
    );
  }
}

// Show message to user
function showMessage(message, type = "success") {
  const messageDiv = document.getElementById("success-message");
  messageDiv.textContent = message;
  messageDiv.className =
    type === "warning" ? "warning-message" : "success-message";
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

// Save home page data
async function saveChanges() {
  console.log("saveChanges() called");

  const saveButton = document.getElementById("save-changes");
  const originalText = saveButton.textContent;
  saveButton.textContent = "Saving...";
  saveButton.disabled = true;

  try {
    let headerImagePromise = Promise.resolve(null);
    let highlightedImagePromise = Promise.resolve(null);

    const headerImageInput = document.getElementById("header-image");
    if (headerImageInput.files && headerImageInput.files.length > 0) {
      headerImagePromise = convertToBase64(headerImageInput.files[0]);
    }

    const highlightedImageInput = document.getElementById("highlighted-image");
    if (highlightedImageInput.files && highlightedImageInput.files.length > 0) {
      highlightedImagePromise = convertToBase64(highlightedImageInput.files[0]);
    }

    const [headerImage, highlightedImage] = await Promise.all([
      headerImagePromise,
      highlightedImagePromise,
    ]);

    const homeData = {
      action: "editHome",
      scrollingTitle: document.getElementById("scrolling-title").value,
      headerTitle: document.getElementById("header-title").value,
      headerImage: headerImage,
      highlightedTitle: document.getElementById("highlighted-title").value,
      highlightedImage: highlightedImage,
      newsletterText: document.getElementById("newsletter-text").value,
      faqs: faqs || [],
    };

    console.log("Data to save:", homeData);

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(homeData),
    });

    saveButton.textContent = "Saved!";
    showMessage("Changes saved successfully!");

    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error saving changes:", error);
    saveButton.textContent = "Error!";
    showMessage("Error saving changes. Please try again.", "warning");
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }, 2000);
  }
}

// Save branding changes
async function saveBrandingChanges() {
  console.log("saveBrandingChanges() called");
  const saveButton = document.getElementById("save-branding");
  const originalText = saveButton.textContent;

  saveButton.textContent = "Saving...";
  saveButton.disabled = true;

  try {
    const logoInput = document.getElementById("logo-upload");
    const bgInput = document.getElementById("login-bg");

    let logoImage = null;
    let backgroundImage = null;

    if (logoInput.files && logoInput.files.length > 0) {
      logoImage = await convertToBase64(logoInput.files[0]);
    }

    if (bgInput.files && bgInput.files.length > 0) {
      backgroundImage = await convertToBase64(bgInput.files[0]);
    }

    const brandingData = {
      action: "editBranding",
      logoImage: logoImage,
      backgroundImage: backgroundImage,
    };

    console.log("Sending branding data:", brandingData);

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brandingData),
    });

    saveButton.textContent = "Saved!";
    showMessage("Branding changes saved successfully!");

    logoInput.value = "";
    bgInput.value = "";

    setTimeout(() => {
      loadBrandingData();
    }, 1000);
  } catch (error) {
    console.error("Branding save error:", error);
    saveButton.textContent = "Error!";
    showMessage("Error saving branding changes: " + error.message, "error");
  } finally {
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }, 2000);
  }
}

// FAQ functions
function addFAQ() {
  const question = document.getElementById("faq-question").value.trim();
  const answer = document.getElementById("faq-answer").value.trim();

  if (question && answer) {
    faqs.push({ question, answer });
    updateFAQList();

    document.getElementById("faq-question").value = "";
    document.getElementById("faq-answer").value = "";
  } else {
    alert("Please enter both question and answer.");
  }
}

function updateFAQList() {
  const list = document.getElementById("faq-list");
  list.innerHTML = "";
  faqs.forEach((faq, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <strong>${faq.question}</strong>
            <p>${faq.answer}</p>
            <button onclick="removeFAQ(${index})" style="margin-top: 5px;">Remove</button>
          `;
    list.appendChild(li);
  });
}

function removeFAQ(index) {
  faqs.splice(index, 1);
  updateFAQList();
}

// Helper function to convert file to base64
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Set up event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  loadHomeData();
  loadBrandingData();

  // Setup image preview event listeners
  document
    .getElementById("header-image")
    .addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const previewElem = document.getElementById("header-image-preview");
          previewElem.src = e.target.result;
          previewElem.style.display = "block";
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

  document
    .getElementById("highlighted-image")
    .addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const previewElem = document.getElementById(
            "highlighted-image-preview"
          );
          previewElem.src = e.target.result;
          previewElem.style.display = "block";
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

  document
    .getElementById("logo-upload")
    .addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const logoPreview = document.getElementById("logo-preview");
          logoPreview.src = e.target.result;
          logoPreview.style.display = "block";
        };
        reader.readAsDataURL(this.files[0]);
      }
    });

  document.getElementById("login-bg").addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const bgPreview = document.getElementById("login-bg-preview");
        bgPreview.src = e.target.result;
        bgPreview.style.display = "block";
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  // Button event listeners
  document
    .getElementById("save-changes")
    .addEventListener("click", saveChanges);
  document
    .getElementById("save-branding")
    .addEventListener("click", saveBrandingChanges);
  document.getElementById("add-faq-btn").addEventListener("click", addFAQ);
});

// Make removeFAQ function globally available
window.removeFAQ = removeFAQ;
