document.addEventListener("DOMContentLoaded", function () {
  const navItems = document.querySelectorAll(".nav-item");
  const mainContent = document.getElementById("main-content");

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all items
      navItems.forEach((nav) => nav.classList.remove("active"));

      // Add active class to clicked item
      this.classList.add("active");

      // Get the src attribute
      const src = this.getAttribute("src");

      if (src) {
        // Create iframe to load the content
        mainContent.innerHTML = `<iframe src="${src}" class="frame-container"></iframe>`;
      } else {
        // Fallback content
        const sectionName = this.querySelector("span").textContent;
        mainContent.innerHTML = `
                            <div class="welcome-content">
                                <h2>${sectionName} Section</h2>
                                <p>Content for ${sectionName} would be loaded here</p>
                            </div>
                        `;
      }
    });
  });
});
