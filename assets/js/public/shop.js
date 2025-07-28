
// Profile icon update functionality
document.addEventListener("DOMContentLoaded", function () {
  // Get the profile icon element
  const profileIcon = document.getElementById("profile-icon");
  const profileLink = document.getElementById("profile-link");

  // Check if user is logged in
  function checkLoginStatus() {
    // Get user info from localStorage (adjust this based on how you store user data)
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

    if (userInfo && userInfo.name) {
      // User is logged in - replace icon with first letter of name
      const firstLetter = userInfo.name.charAt(0).toUpperCase();

      // Remove the Font Awesome icon
      profileIcon.classList.remove("fa", "fa-user-circle");

      // Create a styled initial in place of the icon
      profileIcon.innerHTML = firstLetter;
      profileIcon.classList.add("user-initial");

      // Update href to point to account page instead of login
      profileLink.href = "cp.html"; // Customer profile/account page
    } else {
      // User is not logged in - ensure icon is displayed
      profileIcon.innerHTML = "";
      profileIcon.classList.add("fa", "fa-user-circle");
      profileIcon.classList.remove("user-initial");

      // Set link to login page
      profileLink.href = "login.html";
    }
  }

  // Add required CSS for the user initial display
  function addProfileIconStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .user-initial {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background-color: #4caf50;
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
          text-decoration: none;
        }
        
        /* Add hover effect */
        .user-initial:hover {
          background-color: #3d9c40;
        }

        /* Cart counter styling */
.cart-counter {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #4caf50; /* Orange color as shown in image */
  color: white;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  padding: 0 2px;
  box-sizing: border-box;
}
      `;
    document.head.appendChild(style);
  }

  // Initialize
  addProfileIconStyles();
  checkLoginStatus();

  // Optional: Check login status on events like storage changes
  window.addEventListener("storage", function (e) {
    if (e.key === "userInfo") {
      checkLoginStatus();
    }
  });
});

// Updated function to update the cart count display - only uses server data

function updateCartCount() {
  // Get cart items from localStorage
  const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");

  // Calculate total items
  let itemCount = cart.length;

  // Update the counter
  const counter = document.getElementById("cart-count");
  if (counter) {
    counter.textContent = itemCount;
    // Hide counter when empty
    counter.style.display = itemCount > 0 ? "flex" : "none";
  }
}

// Call this function when the page loads
document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();
});

    
      
        // Page Loading Function
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
    document.getElementById("content").style.display = "block";
  }, 4000);
});


// Global variables
let allProducts = [];
let currentPage = 1;
let cachedProducts = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minutes
let currentFilteredProducts = null;

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async function() {
  try {
    // Check for category and subcategory in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlSubCategory = urlParams.get('subcategory');

    // Initialize the page
    await initializePage();

    // If category (and optionally subcategory) is present, filter immediately
    if (urlCategory) {
      // Capitalize first letter of each word for category to match data
      const formattedCategory = urlCategory.replace(/\b\w/g, c => c.toUpperCase());
      // Wait for products to be loaded
      if (urlSubCategory) {
        // Capitalize first letter of each word for subcategory
        const formattedSubCategory = urlSubCategory.replace(/\b\w/g, c => c.toUpperCase());
        currentFilteredProducts = allProducts.filter(product =>
          product.category && product.category.toLowerCase() === formattedCategory.toLowerCase() &&
          product.subCategory && product.subCategory.toLowerCase() === formattedSubCategory.toLowerCase()
        );
        currentPage = 1;
        displayProducts(currentFilteredProducts);
        updateFilterStatus(formattedCategory, formattedSubCategory);
      } else {
        currentFilteredProducts = allProducts.filter(product =>
          product.category && product.category.toLowerCase() === formattedCategory.toLowerCase()
        );
        currentPage = 1;
        displayProducts(currentFilteredProducts);
        updateFilterStatus(formattedCategory, "");
      }
    }

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Error during page initialization:", error);
    document.getElementById("loader").style.display = "none";
  }
});
// Main initialization function
async function initializePage() {
  // Show loader
  const loader = document.getElementById("loader");
  
  try {
    // Fetch general site data
    fetchSiteData();
    
    // Fetch products
    allProducts = await fetchProducts();
    
    // Load categories for the sidebar
    await loadCategories();
    
    // Display products with pagination
    displayProducts();
    
    // Hide loader when everything is ready
    setTimeout(() => {
      loader.style.display = "none";
    }, 500); // Small timeout to ensure smooth transition
  } catch (error) {
    console.error("Error initializing page:", error);
    loader.style.display = "none";
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Search functionality
  document.getElementById("searchBar").addEventListener("input", handleSearch);
  
  // Sorting functionality
  document.querySelectorAll(".sort").forEach(sortSelect => {
    sortSelect.addEventListener("change", handleSort);
  });
    
  // Back to top button (if it exists)
  const backToTopBtn = document.querySelector(".back-to-top");
  if (backToTopBtn) {
    window.addEventListener("scroll", toggleBackToTopButton);
    backToTopBtn.addEventListener("click", scrollToTop);
  }
  
  // Email newsletter subscription
  setupNewsletterSubscription();
}

// Fetch product data from Google Sheets with caching
async function fetchProducts() {
  const currentTime = Date.now();
  
  // Use cached data if available and not expired
  if (cachedProducts && (currentTime - lastFetchTime < CACHE_DURATION)) {
    console.log("Using cached product data");
    return cachedProducts;
  }
  
  const sheetURL = "https://script.google.com/macros/s/AKfycbxFLUCGkJduvdomkpc_SXxZsVcGkF99576QGfdzaRAYSfGFlAO6JKWSe6CN53Q8m88L/exec";
  
  try {
    console.log("Fetching fresh product data");
    const response = await fetch(sheetURL);
    const data = await response.json();
    
    // Process the data
    if (data.success && data.products) {
      cachedProducts = data.products;
    } else {
      cachedProducts = Array.isArray(data) ? data : [];
    }
    
    // Update cache timestamp
    lastFetchTime = currentTime;
    return cachedProducts;
  } catch (error) {
    console.error("Error fetching data: ", error);
    return cachedProducts || [];
  }
}

// Fetch site data (scrolling title, newsletter text)
function fetchSiteData() {
  fetch("https://script.google.com/macros/s/AKfycbyF_vLCIJK7evShOw2P_BPepGx-6fBIsGlndqnmfSiojDqgogEkYVeCZd9iU-2dI9RT/exec")
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById("scrolling-text").textContent = data.scrollingTitle || "Default Scrolling Offer";
        document.getElementById("newsletter-text").textContent = data.newsletterText || "Subscribe to our newsletter for latest updates!";
      }
    })
    .catch(error => console.error("Error fetching site data:", error));
}

// Display Products in the UI with pagination
function displayProducts(filteredProducts = null) {
  let products = filteredProducts !== null ? filteredProducts : (currentFilteredProducts !== null ? currentFilteredProducts : allProducts);
  const container = document.getElementById("productsContainer");
  const paginationContainer = document.getElementById("pagination");
  
  // Clear containers
  container.innerHTML = "";
  paginationContainer.innerHTML = "";
  
  if (products.length === 0) {
    container.innerHTML = "<p>No products available.</p>";
    updateFilterStatus("", "");
    return;
  }
  
  // Calculate pagination
  const productsPerPage = 20;
  const totalPages = Math.ceil(products.length / productsPerPage);
  const start = (currentPage - 1) * productsPerPage;
  const end = Math.min(start + productsPerPage, products.length);
  const paginatedProducts = products.slice(start, end);
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Display products
  paginatedProducts.forEach((product, index) => {
    const images = product.images || [product.mainImage || product.image || "https://via.placeholder.com/150"];
    const productIndex = start + index;
    
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.productId = product.id;
    card.onclick = () => redirectToProduct(product.id);
    
    card.innerHTML = `
      <div class="card-img" data-src="${images[0]}" style="background-color: #f0f0f0;"></div>
      <div class="card-info">
        <p class="text-title">${product.title}</p>
        <div class="product-category">${product.category}${product.subCategory ? ` - ${product.subCategory}` : ''}</div>
      </div>
      <div class="card-footer">
        <span class="text-title">$${product.price}</span>
        <button class="card-button" onclick="event.stopPropagation(); redirectToProduct(${product.id})">Buy</button>
      </div>
    `;
    
    fragment.appendChild(card);
  });
  
  // Append all products at once
  container.appendChild(fragment);
  
  // Create pagination with document fragment
  if (totalPages > 1) {
    const paginationFragment = document.createDocumentFragment();
    
    if (currentPage > 1) {
      const prevButton = document.createElement('button');
      prevButton.textContent = 'Previous';
      prevButton.onclick = () => changePage(currentPage - 1);
      paginationFragment.appendChild(prevButton);
    }
    
    // Show limited number of pages for better UX
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    // Add first page button if not included in the range
    if (startPage > 1) {
      const firstPageButton = document.createElement('button');
      firstPageButton.textContent = 1;
      firstPageButton.onclick = () => changePage(1);
      paginationFragment.appendChild(firstPageButton);
      
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.margin = '0 5px';
        paginationFragment.appendChild(ellipsis);
      }
    }
    
    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.onclick = () => changePage(i);
      if (i === currentPage) {
        pageButton.style.background = '#2c3e50';
        pageButton.style.color = 'white';
      }
      paginationFragment.appendChild(pageButton);
    }
    
    // Add last page button if not included in the range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.margin = '0 5px';
        paginationFragment.appendChild(ellipsis);
      }
      
      const lastPageButton = document.createElement('button');
      lastPageButton.textContent = totalPages;
      lastPageButton.onclick = () => changePage(totalPages);
      paginationFragment.appendChild(lastPageButton);
    }
    
    if (currentPage < totalPages) {
      const nextButton = document.createElement('button');
      nextButton.textContent = 'Next';
      nextButton.onclick = () => changePage(currentPage + 1);
      paginationFragment.appendChild(nextButton);
    }
    
    paginationContainer.appendChild(paginationFragment);
  }
  
  // Initialize lazy loading of images
  lazyLoadImages();
  // If showing all products (no filter), clear filter status
  if (!filteredProducts && currentFilteredProducts === null) {
    updateFilterStatus("", "");
  }
}

// Implement lazy loading for images
function lazyLoadImages() {
  // Check if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            img.style.backgroundImage = `url(${src})`;
            img.removeAttribute('data-src');
          }
          
          imageObserver.unobserve(img);
        }
      });
    });
    
    // Observe all product images with data-src attribute
    document.querySelectorAll('.card-img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll('.card-img[data-src]').forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.style.backgroundImage = `url(${src})`;
        img.removeAttribute('data-src');
      }
    });
  }
}

// Redirect to product page
function redirectToProduct(productId) {
  window.location.href = `productpage.html?id=${productId}`;
}

// Change page in pagination
function changePage(page) {
  currentPage = page;
  displayProducts();
  // Scroll to top of products container
  document.getElementById("productsContainer").scrollIntoView({ behavior: 'smooth' });
}

// Add to cart functionality
function addToCart(productIndex) {
  const product = allProducts[productIndex];
  if (!product) return;
  
  // Get existing cart or initialize empty array
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  // Check if product already in cart
  const existingProductIndex = cart.findIndex(item => item.id === product.id);
  
  if (existingProductIndex !== -1) {
    // Update quantity if product already in cart
    cart[existingProductIndex].quantity += 1;
  } else {
    // Add product to cart
    const images = product.images || [product.mainImage || product.image || "https://via.placeholder.com/150"];
    
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: images[0],
      quantity: 1
    });
  }
  
  // Save updated cart
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Show confirmation
  showToast('Product added to cart!');
}

// Show toast notification
function showToast(message) {
  // Check if toast container exists, create if not
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    `;
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    background-color: var(--accent-color);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    margin-top: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
    opacity: 0;
  `;
  toast.textContent = message;
  
  // Add animation keyframes if not already added
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Search functionality
async function handleSearch() {
  let searchQuery = this.value.toLowerCase();
  
  if (searchQuery.length === 0) {
    // Reset to all products if search is cleared
    currentPage = 1;
    currentFilteredProducts = null;
    displayProducts();
    updateFilterStatus("", "");
    return;
  }
  
  // Debounce search for better performance
  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }
  
  this.searchTimeout = setTimeout(() => {
    let filteredProducts = allProducts.filter(product => 
      product.title.toLowerCase().includes(searchQuery) ||
      (product.category && product.category.toLowerCase().includes(searchQuery)) ||
      (product.subCategory && product.subCategory.toLowerCase().includes(searchQuery))
    );
    
    currentPage = 1;
    currentFilteredProducts = filteredProducts;
    displayProducts(filteredProducts);
    // Show search status
    const filterStatus = document.getElementById("filterStatus");
    filterStatus.textContent = `Showing results for "${this.value}"`;
  }, 300);
}

// Sorting functionality
async function handleSort() {
  let sortType = this.value;
  let productsToSort = currentFilteredProducts !== null ? [...currentFilteredProducts] : [...allProducts];
  
  switch(sortType) {
    case "A to Z":
      productsToSort.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "Z to A":
      productsToSort.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case "Low to High":
      productsToSort.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case "High to Low":
      productsToSort.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
  }
  
  currentPage = 1;
  displayProducts(productsToSort);
}

// Toggle filter sidebar
function toggleFilter() {
  let sidebar = document.getElementById("categorySidebar");
  let overlay = document.getElementById("overlay");
  
  if (sidebar.style.left === "0px") {
    sidebar.style.left = "-320px";
    overlay.style.display = "none";
  } else {
    sidebar.style.left = "0px";
    overlay.style.display = "block";
  }
}

// Load categories for filter sidebar
async function loadCategories() {
  const products = await fetchProducts();
  const categoryContainer = document.getElementById("categoryContainer");
  
  // Use Map and Set for better performance
  const categories = new Map();
  
  products.forEach(product => {
    if (!product.category) return;
    
    if (!categories.has(product.category)) {
      categories.set(product.category, new Set());
    }
    
    if (product.subCategory) {
      categories.get(product.category).add(product.subCategory);
    }
  });
  
  // Use document fragment
  const fragment = document.createDocumentFragment();
  
  // Sort categories alphabetically
  const sortedCategories = Array.from(categories.keys()).sort();
  
  sortedCategories.forEach(category => {
    const subCategories = categories.get(category);
    const sortedSubCategories = Array.from(subCategories).sort();
    
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-card';
    
    const subCategoryOptions = sortedSubCategories.length
      ? sortedSubCategories.map(sub => `<option value="${sub}">${sub}</option>`).join("")
      : "<option value=''>No Subcategories</option>";
    
    categoryCard.innerHTML = `
      <button class="category-button" onclick="filterByCategory('${category}')">
        ${category}
      </button>
      <select id="${category.replace(/\s+/g, "")}SubCategory" onchange="filterProducts('${category}')">
        <option value="">All Subcategories</option>
        ${subCategoryOptions}
      </select>
    `;
    
    fragment.appendChild(categoryCard);
  });
  
  categoryContainer.innerHTML = "";
  categoryContainer.appendChild(fragment);
}

// Filter by category
function filterByCategory(category) {
  const subCategorySelect = document.getElementById(category.replace(/\s+/g, "") + "SubCategory");
  if (subCategorySelect) {
    subCategorySelect.value = "";
  }
  filterProducts(category);
  updateFilterStatus(category, "");
}

// Filter products by category and subcategory
function filterProducts(category) {
  const selectedSubCategory = document.getElementById(
    category.replace(/\s+/g, "") + "SubCategory"
  ).value;
  
  currentFilteredProducts = allProducts.filter(product => {
    return (
      product.category === category &&
      (selectedSubCategory === "" || product.subCategory === selectedSubCategory)
    );
  });
  
  // Reset pagination to first page when filtering
  currentPage = 1;
  
  // Display filtered products
  displayProducts(currentFilteredProducts);
  
  // Update filter status
  updateFilterStatus(category, selectedSubCategory);
  
  // Close the sidebar after filtering
  toggleFilter();
}
// Scroll to top
function scrollToTop() {
  // This function can be implemented if needed
  // It's referenced in setupEventListeners but not defined in the original code
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function updateFilterStatus(category, subCategory) {
  const filterStatus = document.getElementById("filterStatus");
  if (!category && !subCategory) {
    filterStatus.textContent = "";
    return;
  }
  let text = "Showing";
  if (category) text += ` Category: ${category}`;
  if (subCategory) text += ` | Type: ${subCategory}`;
  filterStatus.textContent = text;
}

// Add event listener for Reset Filters button
  document.addEventListener("DOMContentLoaded", function() {
    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        // Reset all subcategory selects
        document.querySelectorAll('#categorySidebar select').forEach(sel => sel.value = "");
        // Show all products
        currentFilteredProducts = null;
        currentPage = 1;
        displayProducts();
        updateFilterStatus("", "");
        // Optionally close the sidebar
        toggleFilter();
      });
    }
  });