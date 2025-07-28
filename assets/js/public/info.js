// Initialize tab indicator position
      window.addEventListener("load", function () {
        positionTabIndicator();
      });

      // Position the tab indicator based on the active tab
      function positionTabIndicator() {
        const activeTab = document.querySelector(".main-tabs button.active");
        const tabIndicator = document.querySelector(".tab-indicator");

        if (activeTab && tabIndicator && window.innerWidth > 768) {
          tabIndicator.style.width = `${activeTab.offsetWidth}px`;
          tabIndicator.style.left = `${activeTab.offsetLeft}px`;
        }
      }

      // Show appropriate section when tabs are clicked
      function showSection(section) {
        const garmentSection = document.getElementById("garmentSection");
        const fabricSection = document.getElementById("fabricSection");
        const garmentBtn = document.getElementById("garmentBtn");
        const fabricBtn = document.getElementById("fabricBtn");

        // First hide both sections with fadeOut animation
        if (section === "garment") {
          if (fabricSection.style.display !== "none") {
            fabricSection.classList.add("fade-exit");
            setTimeout(() => {
              fabricSection.style.display = "none";
              fabricSection.classList.remove("fade-exit");

              // Then show the selected section with fadeIn animation
              garmentSection.style.display = "block";
              garmentSection.classList.add("fade-enter");
              setTimeout(() => {
                garmentSection.classList.remove("fade-enter");
              }, 500);
            }, 300);
          }
        } else {
          if (garmentSection.style.display !== "none") {
            garmentSection.classList.add("fade-exit");
            setTimeout(() => {
              garmentSection.style.display = "none";
              garmentSection.classList.remove("fade-exit");

              // Then show the selected section with fadeIn animation
              fabricSection.style.display = "block";
              fabricSection.classList.add("fade-enter");
              setTimeout(() => {
                fabricSection.classList.remove("fade-enter");
              }, 500);
            }, 300);
          }
        }

        // Update active state for tab buttons
        garmentBtn.classList.toggle("active", section === "garment");
        fabricBtn.classList.toggle("active", section === "fabric");

        // Update tab indicator position
        positionTabIndicator();
      }

      // Show appropriate size chart
      function showChart(type) {
        const womenChart = document.getElementById("womenChart");
        const menChart = document.getElementById("menChart");
        const womenBtn = document.getElementById("womenBtn");
        const menBtn = document.getElementById("menBtn");

        // Hide currently displayed chart with fadeOut
        if (type === "women" && menChart.style.display !== "none") {
          menChart.classList.add("fade-exit");
          setTimeout(() => {
            menChart.style.display = "none";
            menChart.classList.remove("fade-exit");

            // Show the selected chart with fadeIn
            womenChart.style.display = "block";
            womenChart.classList.add("fade-enter");
            setTimeout(() => {
              womenChart.classList.remove("fade-enter");
            }, 500);
          }, 300);
        } else if (type === "men" && womenChart.style.display !== "none") {
          womenChart.classList.add("fade-exit");
          setTimeout(() => {
            womenChart.style.display = "none";
            womenChart.classList.remove("fade-exit");

            // Show the selected chart with fadeIn
            menChart.style.display = "block";
            menChart.classList.add("fade-enter");
            setTimeout(() => {
              menChart.classList.remove("fade-enter");
            }, 500);
          }, 300);
        }

        // Update active state for chart buttons
        womenBtn.classList.toggle("active", type === "women");
        menBtn.classList.toggle("active", type === "men");

        // Update gender in size finder
        document.getElementById("genderSelect").value = type;
        updateMeasurementLabels();
      }

      // Update measurement labels based on gender selection
      function updateMeasurementLabels() {
        const gender = document.getElementById("genderSelect").value;
        const measureLabel1 = document.getElementById("measureLabel1");

        if (gender === "women") {
          measureLabel1.textContent = "Bust (in)";
        } else {
          measureLabel1.textContent = "Chest (in)";
        }
      }

      // Event listener for gender select
      document
        .getElementById("genderSelect")
        .addEventListener("change", updateMeasurementLabels);

      // Find size based on measurements - COMPLETE VERSION
      function findSize() {
        const gender = document.getElementById("genderSelect").value;
        const bustChest = parseFloat(
          document.getElementById("bustInput").value
        );
        const waist = parseFloat(document.getElementById("waistInput").value);
        const hip = parseFloat(document.getElementById("hipInput").value);
        const resultDiv = document.getElementById("sizeResult");

        // Validate inputs
        if (isNaN(bustChest) || isNaN(waist) || isNaN(hip)) {
          resultDiv.textContent = "Please enter all measurements";
          resultDiv.classList.add("show");
          return;
        }

        let size = "";
        let sizeRanges = {};

        if (gender === "women") {
          sizeRanges = {
            XS: { bust: [32, 33], waist: [24, 25], hip: [34, 35] },
            S: { bust: [34, 35], waist: [26, 27], hip: [36, 37] },
            M: { bust: [36, 37], waist: [28, 29], hip: [38, 39] },
            L: { bust: [38, 40], waist: [30, 32], hip: [40, 42] },
            XL: { bust: [41, 43], waist: [33, 35], hip: [43, 45] },
            XXL: { bust: [44, 46], waist: [36, 38], hip: [46, 48] },
          };
        } else {
          sizeRanges = {
            S: { bust: [34, 36], waist: [28, 30], hip: [34, 36] },
            M: { bust: [38, 40], waist: [32, 34], hip: [38, 40] },
            L: { bust: [42, 44], waist: [36, 38], hip: [42, 44] },
            XL: { bust: [46, 48], waist: [40, 42], hip: [46, 48] },
            XXL: { bust: [50, 52], waist: [44, 46], hip: [50, 52] },
          };
        }

        // Check for exact matches first
        for (const [sizeLabel, ranges] of Object.entries(sizeRanges)) {
          if (
            bustChest >= ranges.bust[0] &&
            bustChest <= ranges.bust[1] &&
            waist >= ranges.waist[0] &&
            waist <= ranges.waist[1] &&
            hip >= ranges.hip[0] &&
            hip <= ranges.hip[1]
          ) {
            size = sizeLabel;
            break;
          }
        }

        // If no exact match, find the best fit with some tolerance
        if (!size) {
          let bestMatch = null;
          let bestScore = 0;
          const tolerance = 2; // inches tolerance

          for (const [sizeLabel, ranges] of Object.entries(sizeRanges)) {
            let score = 0;
            let matches = 0;

            // Check bust/chest with tolerance
            if (
              bustChest >= ranges.bust[0] - tolerance &&
              bustChest <= ranges.bust[1] + tolerance
            ) {
              score += 3;
              matches++;
            }
            // Check waist with tolerance
            if (
              waist >= ranges.waist[0] - tolerance &&
              waist <= ranges.waist[1] + tolerance
            ) {
              score += 3;
              matches++;
            }
            // Check hip with tolerance
            if (
              hip >= ranges.hip[0] - tolerance &&
              hip <= ranges.hip[1] + tolerance
            ) {
              score += 3;
              matches++;
            }

            // Calculate final score based on how many measurements match
            const finalScore = (score / 9) * matches;

            if (finalScore > bestScore) {
              bestScore = finalScore;
              bestMatch = sizeLabel;
            }
          }

          if (bestMatch && bestScore > 0.5) {
            size = bestMatch + " (approximate fit)";
          }
        }

        // Display result
        if (size) {
          resultDiv.textContent = `Recommended Size: ${size}`;
          resultDiv.style.color = "var(--primary-dark)";
        } else {
          resultDiv.textContent =
            "No matching size found. Consider custom sizing.";
          resultDiv.style.color = "#d32f2f";
        }

        resultDiv.classList.add("show");
      }

      // Fabric conversion functionality
      let isMetersToYards = true;

      function convertMeasurement() {
        const metersInput = document.getElementById("metersInput");
        const yardsInput = document.getElementById("yardsInput");

        if (isMetersToYards) {
          const meters = parseFloat(metersInput.value);
          if (!isNaN(meters)) {
            const yards = meters * 1.094;
            yardsInput.value = yards.toFixed(3);
          } else {
            alert("Please enter a valid number for meters");
          }
        } else {
          const yards = parseFloat(yardsInput.value);
          if (!isNaN(yards)) {
            const meters = yards / 1.094;
            metersInput.value = meters.toFixed(3);
          } else {
            alert("Please enter a valid number for yards");
          }
        }
      }

      function swapConversion() {
        isMetersToYards = !isMetersToYards;
        const convertDirection = document.getElementById("convertDirection");
        const metersInput = document.getElementById("metersInput");
        const yardsInput = document.getElementById("yardsInput");

        // Clear both inputs
        metersInput.value = "";
        yardsInput.value = "";

        // Update button text
        if (isMetersToYards) {
          convertDirection.innerHTML =
            'Convert <i class="fas fa-arrow-right"></i>';
        } else {
          convertDirection.innerHTML =
            'Convert <i class="fas fa-arrow-left"></i>';
        }

        // Update input focus based on conversion direction
        if (isMetersToYards) {
          metersInput.focus();
        } else {
          yardsInput.focus();
        }
      }

      // Handle window resize for tab indicator
      window.addEventListener("resize", function () {
        positionTabIndicator();
      });

      // Auto-convert on input change
      document
        .getElementById("metersInput")
        .addEventListener("input", function () {
          if (isMetersToYards && this.value) {
            const meters = parseFloat(this.value);
            if (!isNaN(meters)) {
              const yards = meters * 1.094;
              document.getElementById("yardsInput").value = yards.toFixed(3);
            }
          }
        });

      document
        .getElementById("yardsInput")
        .addEventListener("input", function () {
          if (!isMetersToYards && this.value) {
            const yards = parseFloat(this.value);
            if (!isNaN(yards)) {
              const meters = yards / 1.094;
              document.getElementById("metersInput").value = meters.toFixed(3);
            }
          }
        });

      // Initialize the page
      document.addEventListener("DOMContentLoaded", function () {
        updateMeasurementLabels();
        positionTabIndicator();
      });