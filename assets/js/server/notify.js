const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzqRxOh2hLrU11llRAFJypEOSQYBhdoOLAVfVVj1UWYjIW6Z1EaznJZZRbtTX4L936_/exec";
const superAdminEmail = "s2ksewing@gmail.com";

if (localStorage.getItem("isSuperAdmin") !== "true") {
  document.body.innerHTML =
    "<h3>You are not authorized to access this page.</h3>";
  throw new Error("Access denied");
}

// Fetch ALL users
fetch(`${SCRIPT_URL}?action=getEmployees`)
  .then((res) => res.json())
  .then((data) => {
    const tbody = document.querySelector("#pendingTable tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan='7'>No registered admins found.</td></tr>";
      return;
    }

    data.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.orgEmail}</td>
            <td>${user.department}</td>
            <td>${user.position}</td>
            <td>${user.username}</td>
            <td>${user.status}</td>
            <td>
              ${
                user.status !== "Approved"
                  ? `<button onclick="approve('${user.username}')">Approve</button>`
                  : ""
              }
              <button onclick="updateStatus(${
                user.id
              }, 'Denied')" style="background-color:#f57c00;">Deny</button>
              <button onclick="updateStatus(${
                user.id
              }, 'Deleted')" style="background-color:#e53935;">Delete</button>
            </td>
          `;
      tbody.appendChild(tr);
    });
  })
  .catch((error) => {
    console.error("Error fetching employees:", error);
    const tbody = document.querySelector("#pendingTable tbody");
    tbody.innerHTML =
      "<tr><td colspan='7'>Error loading data. Please try again.</td></tr>";
  });

function approve(username) {
  fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "approve_user",
      username: username,
      approverEmail: superAdminEmail,
    }),
  })
    .then((res) => res.text())
    .then((msg) => {
      document.getElementById("message").textContent = msg;
      setTimeout(() => location.reload(), 1500);
    })
    .catch((error) => {
      console.error("Error approving user:", error);
      document.getElementById("message").textContent =
        "Error approving user. Please try again.";
    });
}

// FIXED updateStatus function - corrected parameter name from 'employeeId' to match server expectation
function updateStatus(id, status) {
  // Add confirmation for deletion
  if (status === "Deleted") {
    if (
      !confirm(
        "Are you sure you want to permanently delete this employee? This action cannot be undone."
      )
    ) {
      return;
    }
  }

  // Add confirmation for denial
  if (status === "Denied") {
    if (
      !confirm("Are you sure you want to deny this employee's application?")
    ) {
      return;
    }
  }

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "updateStatus",
      employeeId: id, // This parameter name now matches what the server expects
      status: status,
    }),
  })
    .then((res) => {
      // Handle both JSON and text responses
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        return res.text();
      }
    })
    .then((response) => {
      let message = "";
      let isSuccess = false;

      if (typeof response === "object" && response.message) {
        message = response.message;
        isSuccess = response.success;
      } else {
        message = response;
        // For text responses, consider it successful if it doesn't contain "error"
        isSuccess = !message.toLowerCase().includes("error");
      }

      // Display the message
      const messageEl = document.getElementById("message");
      messageEl.textContent = message;

      // Add visual feedback based on success/failure
      messageEl.style.color = isSuccess ? "green" : "red";

      // Only reload if the operation was successful
      if (isSuccess) {
        setTimeout(() => location.reload(), 1500);
      }
    })
    .catch((error) => {
      console.error("Error updating status:", error);
      const messageEl = document.getElementById("message");
      messageEl.textContent = "Error updating status. Please try again.";
      messageEl.style.color = "red";
    });
}
