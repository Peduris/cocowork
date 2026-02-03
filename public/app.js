const authView = document.getElementById("authView");
const contractorView = document.getElementById("contractorView");
const adminView = document.getElementById("adminView");
const logoutBtn = document.getElementById("logoutBtn");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

const profileForm = document.getElementById("profileForm");
const profileSaved = document.getElementById("profileSaved");
const contractContent = document.getElementById("contractContent");
const contractorSignature = document.getElementById("contractorSignature");
const adminSignature = document.getElementById("adminSignature");
const contractSignForm = document.getElementById("contractSignForm");
const invoiceTable = document.getElementById("invoiceTable").querySelector("tbody");

const contractorTable = document.getElementById("contractorTable").querySelector("tbody");
const selectedContractor = document.getElementById("selectedContractor");
const selectedDetails = document.getElementById("selectedDetails");
const profileDetails = document.getElementById("profileDetails");
const adminContractContent = document.getElementById("adminContractContent");
const adminContractorSignature = document.getElementById("adminContractorSignature");
const adminAdminSignature = document.getElementById("adminAdminSignature");
const adminSignForm = document.getElementById("adminSignForm");

const templateForm = document.getElementById("templateForm");
const templateSaved = document.getElementById("templateSaved");
const invoiceForm = document.getElementById("invoiceForm");
const invoiceStatus = document.getElementById("invoiceStatus");
const adminInvoiceTable = document.getElementById("adminInvoiceTable").querySelector("tbody");

let currentUser = null;
let selectedContractorId = null;

function api(path, method = "GET", body = null) {
  const options = { method, headers: {} };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  return fetch(path, options).then((res) => res.json());
}

function show(view) {
  authView.hidden = view !== "auth";
  contractorView.hidden = view !== "contractor";
  adminView.hidden = view !== "admin";
  logoutBtn.hidden = view === "auth";
}

function formatAmount(cents) {
  const amount = (cents / 100).toFixed(2);
  return `$${amount}`;
}

async function loadMe() {
  const data = await api("/api/me");
  if (!data.ok) {
    currentUser = null;
    show("auth");
    return;
  }
  currentUser = data.user;
  if (currentUser.role === "admin") {
    show("admin");
    await loadAdminData();
  } else {
    show("contractor");
    await loadContractorData(data.profile);
  }
}

async function loadContractorData(profile) {
  if (profile) {
    for (const [key, value] of Object.entries(profile)) {
      const input = profileForm.querySelector(`[name="${key}"]`);
      if (input && value) input.value = value;
    }
  }
  const contract = await api("/api/contract");
  if (contract.ok) {
    contractContent.textContent = contract.contract.content;
    contractorSignature.textContent = contract.contract.contractor_signature || "Not signed yet";
    adminSignature.textContent = contract.contract.admin_signature || "Pending";
  }
  const invoices = await api("/api/invoices");
  if (invoices.ok) {
    invoiceTable.innerHTML = "";
    invoices.invoices.forEach((inv) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${inv.invoice_number}</td>
        <td>${inv.month}</td>
        <td>${formatAmount(inv.amount_cents)}</td>
        <td>${inv.status}</td>
      `;
      invoiceTable.appendChild(row);
    });
  }
}

async function loadAdminData() {
  const contractors = await api("/api/admin/contractors");
  contractorTable.innerHTML = "";
  if (contractors.ok) {
    contractors.contractors.forEach((contractor) => {
      const row = document.createElement("tr");
      const contractStatus = contractor.admin_signed_at && contractor.contractor_signed_at
        ? "Signed"
        : "Pending";
      row.innerHTML = `
        <td>${contractor.full_name || "-"}</td>
        <td>${contractor.email}</td>
        <td>${contractor.company_name || "-"}</td>
        <td>${contractStatus}</td>
        <td><button class="ghost" data-id="${contractor.id}">View</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => {
        selectContractor(contractor.id);
      });
      contractorTable.appendChild(row);
    });
  }

  await loadAdminInvoices();
}

async function selectContractor(userId) {
  selectedContractorId = userId;
  const data = await api(`/api/admin/contractor?user_id=${userId}`);
  if (!data.ok) return;
  selectedContractor.textContent = "";
  selectedDetails.hidden = false;
  profileDetails.innerHTML = `
    <p><strong>Name:</strong> ${data.profile?.full_name || "-"}</p>
    <p><strong>Company:</strong> ${data.profile?.company_name || "-"}</p>
    <p><strong>Type:</strong> ${data.profile?.company_type || "-"}</p>
    <p><strong>Tax ID/CIN:</strong> ${data.profile?.tax_id || "-"}</p>
    <p><strong>Address:</strong> ${data.profile?.address || "-"}</p>
    <p><strong>Phone:</strong> ${data.profile?.phone || "-"}</p>
    <p><strong>Bank:</strong> ${data.profile?.bank_account || "-"}</p>
  `;
  adminContractContent.textContent = data.contract?.content || "";
  adminContractorSignature.textContent = data.contract?.contractor_signature || "Not signed";
  adminAdminSignature.textContent = data.contract?.admin_signature || "Not signed";
}

async function loadAdminInvoices() {
  const data = await api("/api/invoices");
  if (!data.ok) return;
  adminInvoiceTable.innerHTML = "";
  data.invoices.forEach((inv) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inv.invoice_number}</td>
      <td>${inv.full_name || inv.company_name || inv.email}</td>
      <td>${inv.month}</td>
      <td>${formatAmount(inv.amount_cents)}</td>
      <td>${inv.status}</td>
      <td><button class="ghost" data-id="${inv.id}">${inv.status === "paid" ? "Mark unpaid" : "Mark paid"}</button></td>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await api("/api/admin/invoice/mark-paid", "POST", {
        invoice_id: inv.id,
        paid: inv.status !== "paid",
      });
      await loadAdminInvoices();
    });
    adminInvoiceTable.appendChild(row);
  });
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const formData = new FormData(loginForm);
  const res = await api("/api/login", "POST", Object.fromEntries(formData));
  if (!res.ok) {
    loginError.textContent = res.error || "Login failed";
    return;
  }
  await loadMe();
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerError.textContent = "";
  const formData = new FormData(registerForm);
  const res = await api("/api/register", "POST", Object.fromEntries(formData));
  if (!res.ok) {
    registerError.textContent = res.error || "Registration failed";
    return;
  }
  registerError.textContent = "Account created. You can log in now.";
});

logoutBtn?.addEventListener("click", async () => {
  await api("/api/logout", "POST");
  await loadMe();
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileSaved.textContent = "";
  const formData = new FormData(profileForm);
  const res = await api("/api/profile", "POST", Object.fromEntries(formData));
  if (res.ok) {
    profileSaved.textContent = "Saved.";
  }
});

contractSignForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(contractSignForm);
  const res = await api("/api/contract/sign", "POST", Object.fromEntries(formData));
  if (res.ok) {
    await loadContractorData();
  }
});

adminSignForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedContractorId) return;
  const formData = new FormData(adminSignForm);
  const payload = Object.fromEntries(formData);
  payload.user_id = selectedContractorId;
  const res = await api("/api/contract/sign", "POST", payload);
  if (res.ok) {
    await selectContractor(selectedContractorId);
    await loadAdminData();
  }
});

templateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  templateSaved.textContent = "";
  const formData = new FormData(templateForm);
  const payload = Object.fromEntries(formData);
  payload.apply_to_unsigned = formData.get("apply") === "on";
  const res = await api("/api/admin/contract/update", "POST", payload);
  if (res.ok) {
    templateSaved.textContent = "Template saved.";
  }
});

invoiceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  invoiceStatus.textContent = "";
  const formData = new FormData(invoiceForm);
  const res = await api("/api/admin/invoices/generate", "POST", Object.fromEntries(formData));
  if (res.ok) {
    invoiceStatus.textContent = "Invoices generated.";
    await loadAdminInvoices();
  } else {
    invoiceStatus.textContent = res.error || "Failed to generate";
  }
});

loadMe();
