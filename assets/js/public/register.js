const scriptURL =
        "https://script.google.com/macros/s/AKfycbwRSPzWFIq2I0fkd84d3F8-C0XQIC-rsg-uuaDogfzh7yKsPW5VgaSKoY8gTXKyAHBQ/exec";
      const form = document.getElementById("registerForm");
      const submitBtn = document.getElementById("registerBtn");
      const loader = document.getElementById("loader");
      const mobileInput = document.getElementById("mobile");
      const mobileError = document.getElementById("mobile-error");
      const countryCodeSelect = document.getElementById("country-code");

      // Function to load background from Google Sheets
      // Function to load background from Google Sheets
      async function loadBackgroundFromSheets() {
        try {
          const bgLoading = document.getElementById("bgLoading");
          if (bgLoading) {
            bgLoading.style.display = "block";
          }

          // Your Google Apps Script URL - replace with your actual deployed script URL
          const scriptURL =
            "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec";

          // Fetch branding data from your Google Sheets
          const response = await fetch(
            `${scriptURL}?type=branding&_=${Date.now()}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Branding data received:", data);

          if (data.success && data.backgroundImage) {
            // Create a new image to preload
            const img = new Image();

            img.onload = function () {
              // Once image is loaded, apply it as background
              document.body.style.backgroundImage = `url("${data.backgroundImage}")`;

              // Optional: Add some styling properties for better display
              document.body.style.backgroundPosition = "center";
              document.body.style.backgroundSize = "cover";
              document.body.style.backgroundRepeat = "no-repeat";
              document.body.style.backgroundAttachment = "fixed";

              if (bgLoading) {
                bgLoading.style.display = "none";
              }
              console.log(
                "Background image loaded successfully from Google Sheets"
              );
            };

            img.onerror = function () {
              console.warn(
                "Failed to load background image from Google Sheets, using fallback"
              );
              if (bgLoading) {
                bgLoading.style.display = "none";
              }
            };

            // Start loading the image
            img.src = data.backgroundImage;
          } else {
            console.log(
              "No background image found in Google Sheets, using default"
            );
            if (bgLoading) {
              bgLoading.style.display = "none";
            }
          }
        } catch (error) {
          console.error("Error loading background from Google Sheets:", error);
          if (document.getElementById("bgLoading")) {
            document.getElementById("bgLoading").style.display = "none";
          }
          // Keep the default background image if there's an error
        }
      }

      // Alternative function if you want to fetch from a different Google Apps Script URL
      async function loadBackgroundFromDifferentSheet(customScriptURL) {
        try {
          const bgLoading = document.getElementById("bgLoading");
          if (bgLoading) {
            bgLoading.style.display = "block";
          }

          // Use custom script URL if provided
          const scriptURL =
            customScriptURL || "YOUR_DIFFERENT_GOOGLE_APPS_SCRIPT_URL_HERE";

          // Fetch branding data from your different Google Sheets
          const response = await fetch(
            `${scriptURL}?type=branding&timestamp=${Date.now()}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Background data from different sheet:", data);

          // Handle different response structures
          let backgroundImageUrl = null;

          if (data.success && data.backgroundImage) {
            backgroundImageUrl = data.backgroundImage;
          } else if (data.background) {
            backgroundImageUrl = data.background;
          } else if (data.backgroundUrl) {
            backgroundImageUrl = data.backgroundUrl;
          }

          if (backgroundImageUrl) {
            // Create a new image to preload
            const img = new Image();

            img.onload = function () {
              // Apply background with smooth transition
              document.body.style.backgroundImage = `url("${backgroundImageUrl}")`;
              document.body.style.backgroundPosition = "center";
              document.body.style.backgroundSize = "cover";
              document.body.style.backgroundRepeat = "no-repeat";
              document.body.style.backgroundAttachment = "fixed";

              if (bgLoading) {
                bgLoading.style.display = "none";
              }
              console.log("Background image loaded from different sheet");
            };

            img.onerror = function () {
              console.warn(
                "Failed to load background image from different sheet"
              );
              if (bgLoading) {
                bgLoading.style.display = "none";
              }
            };

            img.src = backgroundImageUrl;
          } else {
            console.log("No background image found in different sheet");
            if (bgLoading) {
              bgLoading.style.display = "none";
            }
          }
        } catch (error) {
          console.error(
            "Error loading background from different sheet:",
            error
          );
          if (document.getElementById("bgLoading")) {
            document.getElementById("bgLoading").style.display = "none";
          }
        }
      }

      // Function to periodically check for background updates (optional)
      function startBackgroundUpdateChecker(intervalMinutes = 5) {
        const intervalMs = intervalMinutes * 60 * 1000;

        setInterval(async () => {
          console.log("Checking for background image updates...");
          await loadBackgroundFromSheets();
        }, intervalMs);
      }

      // Initialize function to call when page loads
      function initializeBackgroundLoader() {
        // Load background immediately
        loadBackgroundFromSheets();

        // Optional: Start checking for updates every 5 minutes
        // startBackgroundUpdateChecker(5);
      }

      // Call this function when DOM is loaded
      document.addEventListener("DOMContentLoaded", function () {
        initializeBackgroundLoader();
      });

      // Alternative: Call this if you're not using DOMContentLoaded
      // window.addEventListener("load", initializeBackgroundLoader);

      // Toast notification function
      function showToast(message, type = "success") {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
          toast.classList.remove("show");
        }, 3000); // Hide after 3 seconds
      }

      // Custom Alert Implementation - FIXED
      function createCustomAlert(
        message,
        isError,
        shouldRedirect = false,
        redirectURL = null,
        userData = null
      ) {
        // Create container for alerts if it doesn't exist
        if (!document.getElementById("custom-alert-container")) {
          const alertContainer = document.createElement("div");
          alertContainer.id = "custom-alert-container";
          document.body.appendChild(alertContainer);
        }

        const container = document.getElementById("custom-alert-container");

        // Create alert box
        const alertBox = document.createElement("div");
        alertBox.className = `custom-alert ${
          isError ? "alert-error" : "alert-success"
        }`;

        // Create title based on message type
        const title = document.createElement("h3");
        title.textContent = isError ? "Error" : "Success";

        // Create message
        const text = document.createElement("p");
        text.textContent = message;

        // Create button
        const button = document.createElement("button");
        button.className = "alert-btn";
        button.textContent = "OK";
        button.onclick = function () {
          container.remove();

          // Only redirect on successful registrations
          if (!isError && shouldRedirect && redirectURL) {
            // If we have userData and we're redirecting to login page, store user ID
            if (userData && userData.userId && redirectURL === "login.html") {
              // Note: localStorage is not supported in this environment
              // You might want to use a different approach or remove this line
              console.log("User registered with ID:", userData.userId);
            }
            window.location.href = redirectURL;
          }
        };

        // Assemble alert
        alertBox.appendChild(title);
        alertBox.appendChild(text);
        alertBox.appendChild(button);
        container.appendChild(alertBox);
      }

      // Override the default alert function - FIXED
      window.originalAlert = window.alert;
      window.alert = function (message, userData = null) {
        // Better error detection
        const isError =
          message.toLowerCase().includes("invalid") ||
          message.toLowerCase().includes("failed") ||
          message.toLowerCase().includes("error") ||
          message.toLowerCase().includes("already exists") ||
          message.toLowerCase().includes("try again") ||
          message.toLowerCase().includes("must") ||
          message.toLowerCase().includes("do not match") ||
          message.toLowerCase().includes("please") ||
          !message.toLowerCase().includes("successful");

        let shouldRedirect = false;
        let redirectURL = null;

        // Only consider redirection for success messages
        if (
          !isError &&
          (message.toLowerCase().includes("successful") ||
            message.toLowerCase().includes("success"))
        ) {
          shouldRedirect = true;
          if (message.toLowerCase().includes("login")) {
            redirectURL = "index.html";
          } else if (message.toLowerCase().includes("registration")) {
            redirectURL = "login.html";
          }
        }

        createCustomAlert(
          message,
          isError,
          shouldRedirect,
          redirectURL,
          userData
        );
      };

      // Mobile number validation
      mobileInput.addEventListener("input", function (e) {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, "");

        // Show error if not 10 digits
        if (this.value.length > 0 && this.value.length !== 10) {
          mobileError.style.display = "block";
        } else {
          mobileError.style.display = "none";
        }
      });

      // Function to check if username or email already exists
      async function checkExistingUser(username, email) {
        try {
          const response = await fetch(
            `${scriptURL}?action=checkUser&username=${encodeURIComponent(
              username
            )}&email=${encodeURIComponent(email)}`
          );
          const text = await response.text();
          console.log("Check user response:", text);

          if (!text) throw new Error("Empty response from server");
          return JSON.parse(text);
        } catch (error) {
          console.error("Error checking existing user:", error);
          return { exists: false, message: "Error checking existing user" };
        }
      }

      // Initialize the page
      document.addEventListener("DOMContentLoaded", function () {
        // Load background from Google Sheets
        loadBackgroundFromSheets();

        form.addEventListener("submit", async function (e) {
          e.preventDefault();

          // Show loader
          submitBtn.style.display = "none";
          loader.style.display = "block";

          try {
            // Validate all fields are filled
            const fullname = document.getElementById("fullname").value;
            const mobileNumber = document.getElementById("mobile").value;
            const countryCode = document.getElementById("country-code").value;
            const email = document.getElementById("email").value;
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const confirmPassword =
              document.getElementById("confirm-password").value;
            const termsAccepted = document.getElementById("terms").checked;

            // Basic validation
            if (
              !fullname ||
              !mobileNumber ||
              !email ||
              !username ||
              !password ||
              !confirmPassword
            ) {
              alert("Please fill in all fields.");
              submitBtn.style.display = "block";
              loader.style.display = "none";
              return;
            }

            // Validate mobile number is 10 digits
            if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
              alert("Please enter a valid 10-digit mobile number.");
              submitBtn.style.display = "block";
              loader.style.display = "none";
              return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              alert("Please enter a valid email address.");
              submitBtn.style.display = "block";
              loader.style.display = "none";
              return;
            }

            // Check passwords match
            if (password !== confirmPassword) {
              alert("Passwords do not match!");
              submitBtn.style.display = "block";
              loader.style.display = "none";
              return;
            }

            // Validate terms are accepted
            if (!termsAccepted) {
              alert("You must accept the terms and conditions!");
              submitBtn.style.display = "block";
              loader.style.display = "none";
              return;
            }

            // First check if username or email already exists
            const existingCheck = await checkExistingUser(username, email);
            if (existingCheck.exists) {
              alert(existingCheck.message);
              submitBtn.style.display = "block";
              loader.style.display = "none";
              showToast(existingCheck.message, "error");
              return;
            }

            // Create user data object with full mobile number including country code
            let userData = {
              fullname: fullname,
              mobile: countryCode + mobileNumber,
              email: email,
              username: username,
              password: password,
            };

            // Try to register the user
            const response = await fetch(scriptURL, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                action: "register",
                user: JSON.stringify(userData),
              }),
            });

            const text = await response.text();
            console.log("Register response:", text);

            if (!text) {
              throw new Error("Empty response from server");
            }

            const result = JSON.parse(text);

            // Hide loader
            submitBtn.style.display = "block";
            loader.style.display = "none";

            if (result.success) {
              // Reset form
              form.reset();

              // Store user data with ID
              const userWithId = {
                ...userData,
                userId: result.userId,
              };

              // Use the userId in the success message
              alert("Registration Successful! You can now log in.", userWithId);
              showToast("Registration successful!", "success");

              // Note: localStorage is not supported in this environment
              console.log("Registered user ID:", result.userId);
            } else {
              // Handle error case
              alert(result.message || "Registration failed. Try again.");
              showToast(result.message || "Registration failed!", "error");
            }
          } catch (error) {
            console.error("Error in registration:", error);

            // Hide loader
            submitBtn.style.display = "block";
            loader.style.display = "none";

            alert("An error occurred during registration. Please try again.");
            showToast("Registration error!", "error");
          }
        });
      });