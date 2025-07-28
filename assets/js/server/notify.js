const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzc2m4iEYB7idPx9JgKi13xDBsNJAK8ldV-TB7_lkvwg_nh40Pxad2eFIPZcEHh4WvS/exec";
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
  });

function approve(username) {
  fetch(SCRIPT_URL, {
    method: "POST",
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
    });
}

function updateStatus(id, status) {
  fetch(SCRIPT_URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "updateStatus",
      employeeId: id,
      status: status,
    }),
  })
    .then((res) => res.text())
    .then((msg) => {
      document.getElementById("message").textContent = msg;
      setTimeout(() => location.reload(), 1500);
    });
}
