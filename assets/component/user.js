// User Activity Tracking System
// This file handles all user activity tracking and communication with Google Sheets

class UserActivityTracker {
  constructor() {
    // Configuration
    this.SHEET_URL =
      "https://script.google.com/macros/s/AKfycbw3oo0-y7JmTFJWmuhQh0JlP5XChr-094wrLbUqcoXda4jb94eONb-d21qOYZ6RjSon/exec";

    // Activity tracking variables
    this.currentActivityId = null;
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.pageLoadTime = Date.now();
    this.lastActivityTime = Date.now();

    // Initialize tracking
    this.init();
  }

  // Initialize the tracking system
  init() {
    // Set up page visibility tracking
    this.setupVisibilityTracking();

    // Set up scroll tracking
    this.setupScrollTracking();

    // Set up click tracking
    this.setupClickTracking();

    // Set up form tracking
    this.setupFormTracking();

    // Set up periodic activity updates
    this.setupPeriodicUpdates();

    // Check if this is a product page and wait for product data to load
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (productId) {
      // This is a product page - wait for product data to be available
      this.waitForProductData();
    } else {
      // Track general page load immediately
      this.trackPageLoad();
    }

    // Set up beforeunload to save final activity
    window.addEventListener("beforeunload", () => this.handlePageUnload());
  }

  // Wait for product data to be available before tracking
  waitForProductData() {
    const checkForProduct = () => {
      // Check if global product variable exists and has data
      if (
        typeof window.product !== "undefined" &&
        window.product &&
        window.product.id
      ) {
        this.trackPageLoad();
        return;
      }

      // Check if product is rendered in DOM
      const productTitle = document.querySelector(".product-title");
      const productPrice = document.querySelector(".product-price");

      if (productTitle && productPrice) {
        // Product is rendered, track it
        this.trackPageLoad();
        return;
      }

      // If product data is not ready yet, try again in 100ms
      setTimeout(checkForProduct, 100);
    };

    // Start checking immediately
    checkForProduct();
  }

  // Generate or retrieve user ID
  getUserId() {
    let userId = localStorage.getItem("userId");

    if (!userId) {
      // Check if user is logged in
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

      if (userInfo && userInfo.email) {
        userId = userInfo.email;
      } else {
        // Generate anonymous user ID
        userId = "anon_" + this.generateUniqueId();
      }

      localStorage.setItem("userId", userId);
    }

    return userId;
  }

  // Generate session ID
  generateSessionId() {
    const existing = sessionStorage.getItem("sessionId");
    if (existing) return existing;

    const sessionId =
      "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("sessionId", sessionId);
    return sessionId;
  }

  // Generate unique ID
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get device/browser information
  getDeviceInfo() {
    const nav = navigator;
    return {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  // Track page load/view
  async trackPageLoad() {
    try {
      const productData = this.extractProductData();

      if (productData && productData.id) {
        // This is a product page with valid data
        console.log("Tracking product view with data:", productData); // Debug log

        const response = await this.sendActivity("trackProductView", {
          userId: this.userId,
          productData: JSON.stringify(productData),
          sessionId: this.sessionId,
          deviceInfo: JSON.stringify(this.getDeviceInfo()),
          timeSpent: 0,
        });

        if (response.success) {
          this.currentActivityId = response.activityId;
          console.log(
            "Product view tracked successfully:",
            response.activityId
          ); // Debug log
        } else {
          console.error("Failed to track product view:", response);
        }
      } else {
        // General page view
        await this.trackGeneralPageView();
      }
    } catch (error) {
      console.error("Error tracking page load:", error);
    }
  }

  // Track general page view (non-product pages)
  async trackGeneralPageView() {
    try {
      const pageData = {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        pathname: window.location.pathname,
      };

      await this.sendActivity("trackPageView", {
        userId: this.userId,
        pageData: JSON.stringify(pageData),
        sessionId: this.sessionId,
        deviceInfo: JSON.stringify(this.getDeviceInfo()),
      });
    } catch (error) {
      console.error("Error tracking general page view:", error);
    }
  }

  // Extract product data from current page
  extractProductData() {
    // Check if this is a product page
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) return null;

    // First priority: Try to get product data from global variable
    if (
      typeof window.product !== "undefined" &&
      window.product &&
      window.product.id
    ) {
      console.log("Using global product data:", window.product); // Debug log
      return {
        id: window.product.id,
        title: window.product.title || "Unknown Product",
        category: window.product.category || "",
        subCategory: window.product.subCategory || "",
        price: window.product.price || "0",
      };
    }

    // Second priority: Try to extract from DOM elements
    const titleElement = document.querySelector(".product-title, h1");
    const priceElement = document.querySelector(".product-price");
    const categoryElements = document.querySelectorAll(".category-tag");

    // Extract category and subcategory from DOM
    let category = "";
    let subCategory = "";

    if (categoryElements.length > 0) {
      category = categoryElements[0].textContent.trim();
      if (categoryElements.length > 1) {
        subCategory = categoryElements[1].textContent.trim();
      }
    }

    // Extract price from DOM
    let price = "0";
    if (priceElement) {
      const priceText = priceElement.textContent.replace(/[^0-9.]/g, "");
      price = priceText || "0";
    }

    const extractedData = {
      id: productId,
      title: titleElement ? titleElement.textContent.trim() : "Unknown Product",
      category: category,
      subCategory: subCategory,
      price: price,
    };

    console.log("Extracted product data from DOM:", extractedData); // Debug log
    return extractedData;
  }

  // Track search activity
  async trackSearch(searchQuery, category = "", subCategory = "") {
    try {
      await this.sendActivity("trackSearch", {
        userId: this.userId,
        searchQuery: searchQuery,
        category: category,
        subCategory: subCategory,
        sessionId: this.sessionId,
        deviceInfo: JSON.stringify(this.getDeviceInfo()),
      });
    } catch (error) {
      console.error("Error tracking search:", error);
    }
  }

  // Track add to cart activity
  async trackAddToCart(productData) {
    try {
      // Ensure we have the most up-to-date product data
      const currentProductData = this.extractProductData();
      const finalProductData = { ...currentProductData, ...productData };

      console.log("Tracking add to cart with data:", finalProductData); // Debug log

      await this.sendActivity("trackAddToCart", {
        userId: this.userId,
        productData: JSON.stringify(finalProductData),
        sessionId: this.sessionId,
        deviceInfo: JSON.stringify(this.getDeviceInfo()),
      });
    } catch (error) {
      console.error("Error tracking add to cart:", error);
    }
  }

  // Update current activity with time spent
  async updateCurrentActivity() {
    if (!this.currentActivityId) return;

    try {
      const timeSpent = Math.floor((Date.now() - this.pageLoadTime) / 1000);

      await this.sendActivity("updateActivity", {
        activityId: this.currentActivityId,
        timeSpent: timeSpent,
      });
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  }

  // Set up visibility tracking (when user switches tabs)
  setupVisibilityTracking() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // User switched away from tab
        this.updateCurrentActivity();
      } else {
        // User returned to tab
        this.lastActivityTime = Date.now();
      }
    });
  }

  // Set up scroll tracking
  setupScrollTracking() {
    let scrollTimeout;

    window.addEventListener("scroll", () => {
      this.lastActivityTime = Date.now();

      // Debounce scroll events
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScrollActivity();
      }, 1000);
    });
  }

  // Track scroll activity
  trackScrollActivity() {
    const scrollPercent = Math.round(
      (window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight)) *
        100
    );

    // Store scroll data (could be sent to server if needed)
    this.lastScrollPosition = scrollPercent;
  }

  // Set up click tracking
  setupClickTracking() {
    document.addEventListener("click", (event) => {
      this.lastActivityTime = Date.now();
      this.trackClickActivity(event);
    });
  }

  // Track click activity
  trackClickActivity(event) {
    const element = event.target;
    const clickData = {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      textContent: element.textContent.trim().substring(0, 100),
      href: element.href || "",
    };

    // Track specific important clicks
    if (element.classList.contains("add-to-cart-btn")) {
      // Add to cart button clicked
      const productData = this.extractProductData();
      if (productData) {
        this.trackAddToCart(productData);
      }
    } else if (
      element.classList.contains("product-card") ||
      element.closest(".product-card")
    ) {
      // Product card clicked
      this.trackProductClick(element);
    }
  }

  // Track product card clicks
  trackProductClick(element) {
    const productCard = element.closest(".product-card") || element;
    const productTitle = productCard.querySelector(".product-card-title, h4");
    const productPrice = productCard.querySelector(".product-card-price");

    if (productTitle) {
      // This could be expanded to track product interest
      console.log("Product clicked:", productTitle.textContent);
    }
  }

  // Set up form tracking
  setupFormTracking() {
    document.addEventListener("submit", (event) => {
      this.trackFormSubmission(event);
    });

    // Track form field interactions
    document.addEventListener(
      "focus",
      (event) => {
        if (
          event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.tagName === "SELECT"
        ) {
          this.lastActivityTime = Date.now();
        }
      },
      true
    );
  }

  // Track form submissions
  trackFormSubmission(event) {
    const form = event.target;
    const formData = {
      action: form.action,
      method: form.method,
      id: form.id,
      className: form.className,
    };

    // Track specific form types
    if (form.id === "search-form" || form.classList.contains("search-form")) {
      const searchInput = form.querySelector(
        'input[type="search"], input[name="search"], input[name="query"]'
      );
      if (searchInput && searchInput.value.trim()) {
        this.trackSearch(searchInput.value.trim());
      }
    }
  }

  // Set up periodic activity updates
  setupPeriodicUpdates() {
    // Update activity every 30 seconds if user is active
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;

      // Only update if user was active in the last 2 minutes
      if (timeSinceLastActivity < 2 * 60 * 1000) {
        this.updateCurrentActivity();
      }
    }, 30000);
  }

  // Handle page unload
  handlePageUnload() {
    // Send final activity update
    if (this.currentActivityId) {
      const timeSpent = Math.floor((Date.now() - this.pageLoadTime) / 1000);

      // Use sendBeacon for reliable delivery during page unload
      const data = new FormData();
      data.append("action", "updateActivity");
      data.append("activityId", this.currentActivityId);
      data.append("timeSpent", timeSpent);

      navigator.sendBeacon(this.SHEET_URL, data);
    }
  }

  // Send activity data to Google Sheets
  async sendActivity(action, params) {
    try {
      const formData = new FormData();
      formData.append("action", action);

      // Add all parameters
      for (const [key, value] of Object.entries(params)) {
        formData.append(key, value);
      }

      const response = await fetch(this.SHEET_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error sending activity data:", error);
      throw error;
    }
  }

  // Get user's activity history
  async getUserActivityHistory(limit = 50, activityType = null) {
    try {
      const params = {
        action: "getActivityHistory",
        userId: this.userId,
        limit: limit,
      };

      if (activityType) {
        params.activityType = activityType;
      }

      const response = await this.sendActivity("getActivityHistory", params);
      return response;
    } catch (error) {
      console.error("Error getting activity history:", error);
      throw error;
    }
  }

  // Get product statistics
  async getProductStats(productId = null, category = null) {
    try {
      const params = {
        action: "getProductStats",
      };

      if (productId) params.productId = productId;
      if (category) params.category = category;

      const response = await this.sendActivity("getProductStats", params);
      return response;
    } catch (error) {
      console.error("Error getting product stats:", error);
      throw error;
    }
  }
}

// Initialize the user activity tracker
const userTracker = new UserActivityTracker();

// Expose functions globally for use in other scripts
window.trackSearch = (query, category, subCategory) => {
  userTracker.trackSearch(query, category, subCategory);
};

window.trackAddToCart = (productData) => {
  userTracker.trackAddToCart(productData);
};

window.getUserActivityHistory = (limit, activityType) => {
  return userTracker.getUserActivityHistory(limit, activityType);
};

window.getProductStats = (productId, category) => {
  return userTracker.getProductStats(productId, category);
};

// Enhanced search tracking function for search forms
function enhanceSearchForms() {
  const searchForms = document.querySelectorAll(
    'form[role="search"], .search-form, #search-form'
  );

  searchForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      const searchInput = form.querySelector(
        'input[type="search"], input[name="search"], input[name="query"]'
      );
      if (searchInput && searchInput.value.trim()) {
        // Extract category context if available
        const categorySelect = form.querySelector('select[name="category"]');
        const subCategorySelect = form.querySelector(
          'select[name="subcategory"]'
        );

        const category = categorySelect ? categorySelect.value : "";
        const subCategory = subCategorySelect ? subCategorySelect.value : "";

        window.trackSearch(searchInput.value.trim(), category, subCategory);
      }
    });
  });
}

// Enhanced add to cart tracking
function enhanceAddToCartButtons() {
  const addToCartButtons = document.querySelectorAll(
    '.add-to-cart-btn, [onclick*="addToCart"]'
  );

  addToCartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Extract product data from the page or button context
      const productData = userTracker.extractProductData();

      if (productData) {
        // Add additional context like size, quantity, etc.
        const sizeSelect = document.querySelector(
          '#garment-size, select[name*="size"]'
        );
        const quantityInput = document.querySelector(
          '#fabrics-size, input[name*="quantity"]'
        );

        if (sizeSelect) {
          productData.selectedSize = sizeSelect.value;
        }

        if (quantityInput) {
          productData.quantity = quantityInput.value;
        }

        // Add selected complementary items if any
        if (
          typeof selectedComplementaryItems !== "undefined" &&
          selectedComplementaryItems.length > 0
        ) {
          productData.complementaryItems = selectedComplementaryItems.map(
            (item) => ({
              id: item.id,
              title: item.title,
              category: item.category,
              size: item.size,
              notes: item.notes,
            })
          );
        }

        window.trackAddToCart(productData);
      }
    });
  });
}

// Initialize enhancements when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  enhanceSearchForms();
  enhanceAddToCartButtons();
});

// Re-enhance when dynamic content is added
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      // Check if new search forms or add to cart buttons were added
      enhanceSearchForms();
      enhanceAddToCartButtons();
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Export for module systems if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = UserActivityTracker;
}
