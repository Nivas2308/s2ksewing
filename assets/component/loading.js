/**
 * Loading.js - Background Image Loading Handler
 * Provides smooth loading experience while fetching background images
 */

class BackgroundLoader {
  constructor(options = {}) {
    this.options = {
      googleScriptUrl: options.googleScriptUrl || "",
      defaultBackground:
        options.defaultBackground ||
        "https://images.unsplash.com/photo-1470167290877-7d5d3446de4c?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      loadingTimeout: options.loadingTimeout || 10000, // 10 seconds
      fadeInDuration: options.fadeInDuration || 800,
      showLoadingOverlay: options.showLoadingOverlay !== false,
      loadingText: options.loadingText || "Loading...",
      ...options,
    };

    this.loadingOverlay = null;
    this.isLoading = false;
    this.backgroundLoaded = false;
  }

  /**
   * Initialize the loading system
   */
  init() {
    if (this.options.showLoadingOverlay) {
      this.createLoadingOverlay();
      this.showLoading();
    }

    // Set default background immediately for faster perceived loading
    this.setBackgroundImage(this.options.defaultBackground, false);

    // Start loading background from Google Sheets
    this.loadBackgroundFromSheet();

    // Set timeout to hide loading overlay if it takes too long
    setTimeout(() => {
      if (this.isLoading) {
        console.log("Background loading timeout reached, hiding overlay");
        this.hideLoading();
      }
    }, this.options.loadingTimeout);
  }

  /**
   * Create the loading overlay
   */
  createLoadingOverlay() {
    if (document.getElementById("background-loading-overlay")) {
      return; // Already exists
    }

    const overlay = document.createElement("div");
    overlay.id = "background-loading-overlay";
    overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${this.options.loadingText}</div>
                <div class="loading-progress">
                    <div class="loading-bar"></div>
                </div>
            </div>
        `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
            #background-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, 
                    rgba(74, 144, 226, 0.95), 
                    rgba(80, 200, 120, 0.95)
                );
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                backdrop-filter: blur(10px);
                opacity: 1;
                transition: opacity ${this.options.fadeInDuration}ms ease-out;
            }

            #background-loading-overlay.fade-out {
                opacity: 0;
                pointer-events: none;
            }

            .loading-content {
                text-align: center;
                color: white;
                max-width: 300px;
                padding: 40px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px auto;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .loading-progress {
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                overflow: hidden;
                margin-top: 10px;
            }

            .loading-bar {
                height: 100%;
                background: linear-gradient(90deg, 
                    rgba(255, 255, 255, 0.8), 
                    rgba(255, 255, 255, 1)
                );
                width: 0%;
                animation: loading-progress 3s ease-in-out infinite;
                border-radius: 2px;
            }

            @keyframes loading-progress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .loading-content {
                    max-width: 250px;
                    padding: 30px 20px;
                }

                .loading-text {
                    font-size: 16px;
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                }
            }
        `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    this.loadingOverlay = overlay;
  }

  /**
   * Show the loading overlay
   */
  showLoading() {
    this.isLoading = true;
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove("fade-out");
      this.loadingOverlay.style.display = "flex";
    }
  }

  /**
   * Hide the loading overlay
   */
  hideLoading() {
    this.isLoading = false;
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add("fade-out");

      // Remove the overlay after fade animation
      setTimeout(() => {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
          this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
      }, this.options.fadeInDuration);
    }
  }

  /**
   * Set background image with optional loading check
   */
  setBackgroundImage(imageUrl, hideLoading = true) {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        reject(new Error("No image URL provided"));
        return;
      }

      // Create a new image to preload
      const img = new Image();

      img.onload = () => {
        // Apply background image
        document.body.style.backgroundImage = `url('${imageUrl}')`;
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";

        this.backgroundLoaded = true;

        if (hideLoading) {
          // Add slight delay for smooth transition
          setTimeout(() => {
            this.hideLoading();
          }, 500);
        }

        console.log("Background image loaded successfully:", imageUrl);
        resolve(imageUrl);
      };

      img.onerror = () => {
        console.error("Failed to load background image:", imageUrl);

        // If this isn't the default background, try the default
        if (imageUrl !== this.options.defaultBackground) {
          console.log("Falling back to default background");
          this.setBackgroundImage(this.options.defaultBackground, hideLoading)
            .then(resolve)
            .catch(reject);
        } else {
          if (hideLoading) {
            this.hideLoading();
          }
          reject(new Error("Failed to load background image"));
        }
      };

      // Start loading the image
      img.src = imageUrl;
    });
  }

  /**
   * Load background from Google Sheets
   */
  async loadBackgroundFromSheet() {
    if (!this.options.googleScriptUrl) {
      console.log("No Google Script URL provided, using default background");
      this.hideLoading();
      return;
    }

    try {
      console.log("Fetching background image from Google Sheets...");

      const response = await fetch(
        `${this.options.googleScriptUrl}?type=branding&t=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.backgroundImage) {
        console.log(
          "Background image found in Google Sheets:",
          data.backgroundImage
        );
        await this.setBackgroundImage(data.backgroundImage, true);
      } else {
        console.log(
          "No background image found in Google Sheets, keeping default"
        );
        this.hideLoading();
      }
    } catch (error) {
      console.error("Error loading background from Google Sheets:", error);
      console.log("Keeping default background image");
      this.hideLoading();
    }
  }

  /**
   * Update loading text
   */
  updateLoadingText(text) {
    if (this.loadingOverlay) {
      const textElement = this.loadingOverlay.querySelector(".loading-text");
      if (textElement) {
        textElement.textContent = text;
      }
    }
  }

  /**
   * Check if background is loaded
   */
  isBackgroundLoaded() {
    return this.backgroundLoaded;
  }

  /**
   * Destroy the loader
   */
  destroy() {
    this.hideLoading();
    this.loadingOverlay = null;
    this.isLoading = false;
  }
}

// Global instance
let backgroundLoader = null;

/**
 * Initialize background loader
 */
function initBackgroundLoader(options = {}) {
  // Default configuration for your login page
  const defaultOptions = {
    googleScriptUrl:
      "https://script.google.com/macros/s/AKfycbxWNzaRVCHFKBBq-bCCj4o_ZKLk7HhlmTHDehEilj8RVWCzPSv0VKtox6pvg9v3EuSPkw/exec",
    defaultBackground:
      "https://images.unsplash.com/photo-1470167290877-7d5d3446de4c?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    loadingText: "Loading...",
    showLoadingOverlay: true,
    ...options,
  };

  backgroundLoader = new BackgroundLoader(defaultOptions);
  backgroundLoader.init();

  return backgroundLoader;
}

/**
 * Quick start function for immediate use
 */
function startBackgroundLoading(googleScriptUrl, defaultBackground) {
  return initBackgroundLoader({
    googleScriptUrl: googleScriptUrl,
    defaultBackground: defaultBackground,
  });
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Auto-initialize with default settings if no manual initialization
    if (!backgroundLoader) {
      initBackgroundLoader();
    }
  });
} else {
  // DOM is already ready
  if (!backgroundLoader) {
    initBackgroundLoader();
  }
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BackgroundLoader,
    initBackgroundLoader,
    startBackgroundLoading,
  };
}
