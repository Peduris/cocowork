const authView = document.getElementById("authView");
const contractorView = document.getElementById("contractorView");
const adminView = document.getElementById("adminView");
const logoutBtn = document.getElementById("logoutBtn");

const loginContractorForm = document.getElementById("loginContractorForm");
const loginAdminForm = document.getElementById("loginAdminForm");
const registerForm = document.getElementById("registerForm");
const loginContractorError = document.getElementById("loginContractorError");
const loginAdminError = document.getElementById("loginAdminError");
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
const contractorInvoiceTable = document.getElementById("contractorInvoiceTable")?.querySelector("tbody");
const adminContractEditForm = document.getElementById("adminContractEditForm");
const adminContractSaved = document.getElementById("adminContractSaved");

const templateForm = document.getElementById("templateForm");
const templateSaved = document.getElementById("templateSaved");
const invoiceForm = document.getElementById("invoiceForm");
const invoiceStatus = document.getElementById("invoiceStatus");
const adminInvoiceTable = document.getElementById("adminInvoiceTable").querySelector("tbody");
const splitPreviewTable = document.getElementById("splitPreviewTable")?.querySelector("tbody");
const invoiceFilter = document.getElementById("invoiceFilter");
const contractorSearch = document.getElementById("contractorSearch");
const adminInvoiceFilter = document.getElementById("adminInvoiceFilter");
const adminTotalContractors = document.getElementById("adminTotalContractors");
const adminSignedContracts = document.getElementById("adminSignedContracts");
const adminUnpaidInvoices = document.getElementById("adminUnpaidInvoices");
const contractStatus = document.getElementById("contractStatus");
const invoiceCount = document.getElementById("invoiceCount");
const invoiceUnpaid = document.getElementById("invoiceUnpaid");

let currentUser = null;
let selectedContractorId = null;
let cachedContractors = [];
let cachedInvoices = [];
let cachedProfile = null;

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

function getTotal(inv) {
  if (typeof inv.total_cents === "number" && inv.total_cents > 0) return inv.total_cents;
  return (inv.amount_cents || 0) + (inv.vat_cents || 0);
}

function statusBadge(status) {
  const label = status === "paid" ? "Paid" : "Unpaid";
  const cls = status === "paid" ? "badge success" : "badge warn";
  return `<span class="${cls}">${label}</span>`;
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
    cachedProfile = profile;
    for (const [key, value] of Object.entries(profile)) {
      const input = profileForm.querySelector(`[name="${key}"]`);
      if (input && value !== null && value !== undefined) input.value = value;
    }
  }
  const contract = await api("/api/contract");
  if (contract.ok) {
    contractContent.textContent = contract.contract.content;
    contractorSignature.textContent = contract.contract.contractor_signature || "Not signed yet";
    adminSignature.textContent = contract.contract.admin_signature || "Pending";
    if (contractStatus) {
      const signed = contract.contract.contractor_signed_at && contract.contract.admin_signed_at;
      contractStatus.textContent = signed ? "Signed" : "Pending";
    }
  }
  const invoices = await api("/api/invoices");
  if (invoices.ok) {
    cachedInvoices = invoices.invoices || [];
    renderContractorInvoices();
  }
}

function renderContractorInvoices() {
  invoiceTable.innerHTML = "";
  const list = filterInvoices(cachedInvoices, invoiceFilter?.value || "");
  invoiceCount.textContent = `${cachedInvoices.length}`;
  invoiceUnpaid.textContent = `${cachedInvoices.filter((inv) => inv.status !== "paid").length}`;
  list.forEach((inv) => {
    const total = getTotal(inv);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inv.invoice_number}</td>
      <td>${inv.month}</td>
      <td>${formatAmount(inv.amount_cents)}</td>
      <td>${formatAmount(inv.vat_cents || 0)}</td>
      <td>${formatAmount(total)}</td>
      <td>${statusBadge(inv.status)}</td>
    `;
    invoiceTable.appendChild(row);
  });
}

async function loadAdminData() {
  const contractors = await api("/api/admin/contractors");
  contractorTable.innerHTML = "";
  if (contractors.ok) {
    cachedContractors = contractors.contractors || [];
    renderContractorTable();
    const signedCount = cachedContractors.filter(
      (c) => c.admin_signed_at && c.contractor_signed_at
    ).length;
    if (adminTotalContractors) adminTotalContractors.textContent = `${cachedContractors.length}`;
    if (adminSignedContracts) adminSignedContracts.textContent = `${signedCount}`;
  }

  await loadAdminInvoices();
  await renderSplitPreview();
}

function renderContractorTable() {
  contractorTable.innerHTML = "";
  const term = (contractorSearch?.value || "").toLowerCase();
  const list = cachedContractors.filter((c) => {
    if (!term) return true;
    return (
      (c.full_name || "").toLowerCase().includes(term) ||
      (c.company_name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term)
    );
  });
  list.forEach((contractor) => {
      const row = document.createElement("tr");
      const contractStatus = contractor.admin_signed_at && contractor.contractor_signed_at
        ? "Signed"
        : "Pending";
      const badgeClass = contractStatus === "Signed" ? "badge success" : "badge warn";
      const vatBadge = contractor.vat_payer ? `Yes (${contractor.vat_rate || 0}%)` : "No";
      row.innerHTML = `
        <td>${contractor.full_name || "-"}</td>
        <td>${contractor.email}</td>
        <td>${contractor.company_name || "-"}</td>
        <td>${vatBadge}</td>
        <td><span class="${badgeClass}">${contractStatus}</span></td>
        <td><button class="ghost" data-id="${contractor.id}">View</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => {
        selectContractor(contractor.id);
      });
      contractorTable.appendChild(row);
  }
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
    <p><strong>DPH/VAT payer:</strong> ${data.profile?.vat_payer ? "Yes" : "No"}</p>
    <p><strong>DPH/VAT rate:</strong> ${data.profile?.vat_rate || 0}%</p>
    <p><strong>Address:</strong> ${data.profile?.address || "-"}</p>
    <p><strong>Phone:</strong> ${data.profile?.phone || "-"}</p>
    <p><strong>Bank:</strong> ${data.profile?.bank_account || "-"}</p>
  `;
  adminContractContent.textContent = data.contract?.content || "";
  adminContractorSignature.textContent = data.contract?.contractor_signature || "Not signed";
  adminAdminSignature.textContent = data.contract?.admin_signature || "Not signed";
  if (adminContractEditForm) {
    adminContractEditForm.querySelector("textarea").value = data.contract?.content || "";
  }
  if (contractorInvoiceTable) {
    contractorInvoiceTable.innerHTML = "";
    (data.invoices || []).forEach((inv) => {
      const total = getTotal(inv);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inv.invoice_number}</td>
      <td>${inv.month}</td>
      <td>${formatAmount(inv.amount_cents)}</td>
      <td>${formatAmount(inv.vat_cents || 0)}</td>
      <td>${formatAmount(total)}</td>
      <td>${statusBadge(inv.status)}</td>
    `;
    contractorInvoiceTable.appendChild(row);
  });
  }
}

async function loadAdminInvoices() {
  const data = await api("/api/invoices");
  if (!data.ok) return;
  cachedInvoices = data.invoices || [];
  const list = filterAdminInvoices(cachedInvoices, adminInvoiceFilter?.value || "");
  adminInvoiceTable.innerHTML = "";
  if (adminUnpaidInvoices) {
    adminUnpaidInvoices.textContent = `${cachedInvoices.filter((inv) => inv.status !== "paid").length}`;
  }
  list.forEach((inv) => {
    const total = getTotal(inv);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inv.invoice_number}</td>
      <td>${inv.full_name || inv.company_name || inv.email}</td>
      <td>${inv.month}</td>
      <td>${formatAmount(inv.amount_cents)}</td>
      <td>${formatAmount(inv.vat_cents || 0)}</td>
      <td>${formatAmount(total)}</td>
      <td>${statusBadge(inv.status)}</td>
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

function filterInvoices(list, term) {
  const t = term.trim().toLowerCase();
  if (!t) return list;
  return list.filter((inv) => (inv.month || "").toLowerCase().includes(t));
}

function filterAdminInvoices(list, term) {
  const t = term.trim().toLowerCase();
  if (!t) return list;
  return list.filter((inv) => {
    return (
      (inv.month || "").toLowerCase().includes(t) ||
      (inv.full_name || "").toLowerCase().includes(t) ||
      (inv.company_name || "").toLowerCase().includes(t) ||
      (inv.email || "").toLowerCase().includes(t)
    );
  });
}

async function renderSplitPreview() {
  if (!splitPreviewTable) return;
  splitPreviewTable.innerHTML = "";
  const month = invoiceForm?.querySelector("input[name=\"month\"]")?.value || "";
  const totalAmount = invoiceForm?.querySelector("input[name=\"total_amount\"]")?.value || "";
  if (!month || !totalAmount || cachedContractors.length === 0) return;
  const totalCents = parseAmount(totalAmount);
  if (totalCents === null) return;
  const count = cachedContractors.length;
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  cachedContractors.forEach((c, idx) => {
    const baseCents = base + (idx < remainder ? 1 : 0);
    const vatRate = Number(c.vat_rate || 0);
    const vatCents = c.vat_payer ? Math.floor(baseCents * vatRate / 100) : 0;
    const total = baseCents + vatCents;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.full_name || c.company_name || c.email}</td>
      <td>${formatAmount(baseCents)}</td>
      <td>${formatAmount(vatCents)}</td>
      <td>${formatAmount(total)}</td>
    `;
    splitPreviewTable.appendChild(row);
  });
}

function parseAmount(value) {
  if (!value) return null;
  const cleaned = value.replace("$", "").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  const whole = parseInt(parts[0] || "0", 10);
  const frac = (parts[1] || "0").padEnd(2, "0").slice(0, 2);
  if (Number.isNaN(whole)) return null;
  return whole * 100 + parseInt(frac, 10);
}

loginContractorForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginContractorError.textContent = "";
  const formData = new FormData(loginContractorForm);
  const res = await api("/api/login", "POST", Object.fromEntries(formData));
  if (!res.ok) {
    loginContractorError.textContent = res.error || "Login failed";
    return;
  }
  await loadMe();
});

loginAdminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginAdminError.textContent = "";
  const formData = new FormData(loginAdminForm);
  const res = await api("/api/login", "POST", Object.fromEntries(formData));
  if (!res.ok) {
    loginAdminError.textContent = res.error || "Login failed";
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

adminContractEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedContractorId) return;
  adminContractSaved.textContent = "";
  const formData = new FormData(adminContractEditForm);
  const payload = Object.fromEntries(formData);
  payload.user_id = selectedContractorId;
  payload.reset_signatures = formData.get("reset") === "on";
  const res = await api("/api/admin/contractor/contract/update", "POST", payload);
  if (res.ok) {
    adminContractSaved.textContent = "Contract updated.";
    await selectContractor(selectedContractorId);
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
    await renderSplitPreview();
  } else {
    invoiceStatus.textContent = res.error || "Failed to generate";
  }
});

invoiceFilter?.addEventListener("input", () => {
  renderContractorInvoices();
});

contractorSearch?.addEventListener("input", () => {
  renderContractorTable();
});

adminInvoiceFilter?.addEventListener("input", () => {
  loadAdminInvoices();
});

invoiceForm?.querySelector("input[name=\"month\"]")?.addEventListener("input", renderSplitPreview);
invoiceForm?.querySelector("input[name=\"total_amount\"]")?.addEventListener("input", renderSplitPreview);

loadMe();
