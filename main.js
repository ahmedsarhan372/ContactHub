(() => {
  "use strict";

  const STORAGE_KEY = "contacthub.contacts.v1";
  const colors = [
    ["#edeaff", "#6048d8"], ["#e7f4ff", "#3282c8"], ["#fff0e9", "#d5713b"],
    ["#e7f7f0", "#37956e"], ["#fff3da", "#b77a17"], ["#ffeaf0", "#ce5573"]
  ];
  const els = {
    add: [document.getElementById("addContactButton"), document.getElementById("addContactButtonSmall"), document.getElementById("emptyAddButton")],
    dialog: document.getElementById("contactDialog"),
    form: document.getElementById("contactForm"),
    name: document.getElementById("contactName"),
    phone: document.getElementById("contactPhone"),
    email: document.getElementById("contactEmail"),
    company: document.getElementById("contactCompany"),
    group: document.getElementById("contactGroup"),
    notes: document.getElementById("contactNotes"),
    favorite: document.getElementById("contactFavorite"),
    emergency: document.getElementById("contactEmergency"),
    title: document.getElementById("dialogTitle"),
    save: document.getElementById("saveContactButton"),
    error: document.getElementById("formError"),
    list: document.getElementById("contactList"),
    empty: document.getElementById("emptyState"),
    emptyTitle: document.getElementById("emptyTitle"),
    emptyDescription: document.getElementById("emptyDescription"),
    search: document.getElementById("searchInput"),
    sort: document.getElementById("sortSelect"),
    total: document.getElementById("totalCount"),
    favoriteCount: document.getElementById("favoriteCount"),
    emergencyCount: document.getElementById("emergencyCount"),
    visible: document.getElementById("visibleCount"),
    summary: document.getElementById("resultSummary"),
    favorites: document.getElementById("favoriteList"),
    emergencyList: document.getElementById("emergencyList"),
    toast: document.getElementById("toast")
  };

  let contacts = loadContacts();
  let activeFilter = "all";
  let editingId = null;
  let toastTimer = 0;

  function loadContacts() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (!value) return [];
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string")
        .map(item => ({
          id: item.id,
          name: item.name.slice(0, 80),
          phone: typeof item.phone === "string" ? item.phone.slice(0, 30) : "",
          email: typeof item.email === "string" ? item.email.slice(0, 120) : "",
          company: typeof item.company === "string" ? item.company.slice(0, 80) : "",
          group: typeof item.group === "string" ? item.group.slice(0, 30) : "",
          notes: typeof item.notes === "string" ? item.notes.slice(0, 500) : "",
          favorite: item.favorite === true,
          emergency: item.emergency === true,
          createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
          updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now()
        }));
    } catch (error) {
      console.error("Could not read saved contacts:", error);
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
      return true;
    } catch (error) {
      console.error("Could not save contacts:", error);
      showToast("Could not save changes. Check browser storage space.", true);
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "?").slice(0, 2)).toUpperCase();
  }

  function colorStyle(contact) {
    const index = Array.from(contact.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return "--avatar-bg:" + colors[index][0] + ";--avatar-color:" + colors[index][1];
  }

  function safeTel(phone) {
    return phone.replace(/[^\d+*#,;]/g, "");
  }

  function contactCard(contact) {
    const name = escapeHTML(contact.name);
    const phone = escapeHTML(contact.phone);
    const email = escapeHTML(contact.email);
    const company = escapeHTML(contact.company);
    const group = escapeHTML(contact.group);
    const safePhone = escapeHTML(safeTel(contact.phone));
    return '<article class="contact-card" data-contact-id="' + escapeHTML(contact.id) + '">' +
      '<div class="contact-card-top"><span class="contact-avatar" style="' + colorStyle(contact) + '">' + escapeHTML(initials(contact.name)) + '</span>' +
      '<div class="contact-name-wrap"><h3 class="contact-name">' + name + '</h3><p class="contact-company">' + (company || group || "No company added") + '</p></div>' +
      '<div class="card-flags">' + (contact.favorite ? '<i class="fa-solid fa-star flag" title="Favorite" aria-label="Favorite"></i>' : '') +
      (contact.emergency ? '<i class="fa-solid fa-heart-pulse flag emergency" title="Emergency contact" aria-label="Emergency contact"></i>' : '') + '</div>' +
      '<div class="card-actions"><button class="icon-button ' + (contact.favorite ? "is-favorite" : "") + '" type="button" data-action="favorite" aria-label="' + (contact.favorite ? "Remove " + name + " from favorites" : "Add " + name + " to favorites") + '" title="Toggle favorite"><i class="fa-' + (contact.favorite ? "solid" : "regular") + ' fa-star" aria-hidden="true"></i></button>' +
      '<button class="icon-button" type="button" data-action="edit" aria-label="Edit ' + name + '" title="Edit contact"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>' +
      '<button class="icon-button" type="button" data-action="delete" aria-label="Delete ' + name + '" title="Delete contact"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></div></div>' +
      '<div class="contact-lines">' + (phone ? '<a class="contact-line" href="tel:' + safePhone + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>' + phone + '</span></a>' : '') +
      (email ? '<a class="contact-line" href="mailto:' + email + '"><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>' + email + '</span></a>' : '') + '</div>' +
      (group ? '<span class="contact-group">' + group + '</span>' : '') + '</article>';
  }

  function miniContact(contact) {
    return '<div class="side-contact"><span class="mini-avatar" style="' + colorStyle(contact) + '">' + escapeHTML(initials(contact.name)) + '</span>' +
      '<div class="side-contact-info"><strong>' + escapeHTML(contact.name) + '</strong><span>' + escapeHTML(contact.phone || contact.email || "No contact details") + '</span></div></div>';
  }

  function visibleContacts() {
    const query = els.search.value.trim().toLocaleLowerCase();
    let result = contacts.filter(contact => {
      if (activeFilter === "favorites" && !contact.favorite) return false;
      if (activeFilter === "emergency" && !contact.emergency) return false;
      if (!query) return true;
      return [contact.name, contact.phone, contact.email, contact.company, contact.group, contact.notes]
        .some(value => value.toLocaleLowerCase().includes(query));
    });
    result.sort((a, b) => els.sort.value === "recent" ? b.createdAt - a.createdAt : a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return result;
  }

  function renderSideList(target, items, emptyText) {
    target.innerHTML = items.length ? items.slice(0, 5).map(miniContact).join("") : '<p class="side-empty">' + emptyText + '</p>';
  }

  function render() {
    const shown = visibleContacts();
    els.total.textContent = String(contacts.length);
    els.favoriteCount.textContent = String(contacts.filter(contact => contact.favorite).length);
    els.emergencyCount.textContent = String(contacts.filter(contact => contact.emergency).length);
    els.visible.textContent = String(shown.length);
    els.summary.textContent = els.search.value.trim()
      ? "Showing " + shown.length + " matching " + (shown.length === 1 ? "contact" : "contacts")
      : contacts.length + " " + (contacts.length === 1 ? "contact" : "contacts") + " saved";
    els.list.innerHTML = shown.map(contactCard).join("");
    const hasMatches = shown.length > 0;
    els.list.hidden = !hasMatches;
    els.empty.hidden = hasMatches;
    if (!contacts.length) {
      els.emptyTitle.textContent = "Your address book is ready";
      els.emptyDescription.textContent = "Add your first contact to keep important details in one place.";
      document.getElementById("emptyAddButton").hidden = false;
    } else {
      els.emptyTitle.textContent = els.search.value.trim() ? "No contacts found" : "Nothing in this view yet";
      els.emptyDescription.textContent = els.search.value.trim() ? "Try another name, phone number, email or company." : "Try another filter or add someone new to your address book.";
      document.getElementById("emptyAddButton").hidden = !!els.search.value.trim();
    }
    renderSideList(els.favorites, contacts.filter(contact => contact.favorite).sort(byName), "Star a contact to keep them close.");
    renderSideList(els.emergencyList, contacts.filter(contact => contact.emergency).sort(byName), "Mark priority contacts for quick reference.");
  }

  function byName(a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }

  function showToast(message, isError) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle("error", !!isError);
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function openDialog(contact) {
    editingId = contact ? contact.id : null;
    els.form.reset();
    els.error.textContent = "";
    els.title.textContent = contact ? "Edit contact" : "Add a contact";
    els.save.textContent = contact ? "Save changes" : "Save contact";
    if (contact) {
      els.name.value = contact.name;
      els.phone.value = contact.phone;
      els.email.value = contact.email;
      els.company.value = contact.company;
      els.group.value = contact.group;
      els.notes.value = contact.notes;
      els.favorite.checked = contact.favorite;
      els.emergency.checked = contact.emergency;
    }
    els.dialog.showModal();
    window.setTimeout(() => els.name.focus(), 0);
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
    editingId = null;
    els.error.textContent = "";
  }

  function normalizePhone(phone) {
    return phone.replace(/\D/g, "");
  }

  function saveContact(event) {
    event.preventDefault();
    els.error.textContent = "";
    const name = els.name.value.trim().replace(/\s+/g, " ");
    const phone = els.phone.value.trim();
    const email = els.email.value.trim();
    if (!name || !phone) {
      els.error.textContent = "Please enter a name and phone number.";
      (!name ? els.name : els.phone).focus();
      return;
    }
    if (email && !els.email.validity.valid) {
      els.error.textContent = "Enter a valid email address.";
      els.email.focus();
      return;
    }
    const duplicate = contacts.find(contact => contact.id !== editingId && (
      (email && contact.email.toLocaleLowerCase() === email.toLocaleLowerCase()) ||
      (normalizePhone(phone) && normalizePhone(contact.phone) === normalizePhone(phone))
    ));
    if (duplicate) {
      els.error.textContent = "A contact with this email or phone number already exists.";
      return;
    }
    const now = Date.now();
    const existing = editingId ? contacts.find(contact => contact.id === editingId) : null;
    const contact = {
      id: editingId || (window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : "contact-" + now + "-" + Math.random().toString(36).slice(2)),
      name: name,
      phone: phone,
      email: email,
      company: els.company.value.trim(),
      group: els.group.value,
      notes: els.notes.value.trim(),
      favorite: els.favorite.checked,
      emergency: els.emergency.checked,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    const next = existing ? contacts.map(item => item.id === editingId ? contact : item) : [contact].concat(contacts);
    const previous = contacts;
    contacts = next;
    if (!persist()) {
      contacts = previous;
      return;
    }
    closeDialog();
    render();
    showToast(existing ? "Contact updated." : "Contact added.");
  }

  function handleCardAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest("[data-contact-id]");
    if (!card) return;
    const contact = contacts.find(item => item.id === card.dataset.contactId);
    if (!contact) return;
    const action = button.dataset.action;
    if (action === "edit") {
      openDialog(contact);
    } else if (action === "delete") {
      if (!window.confirm("Delete " + contact.name + " from your contacts? This cannot be undone.")) return;
      const previous = contacts;
      contacts = contacts.filter(item => item.id !== contact.id);
      if (!persist()) {
        contacts = previous;
        return;
      }
      render();
      showToast("Contact deleted.");
    } else if (action === "favorite") {
      const previous = contacts;
      contacts = contacts.map(item => item.id === contact.id ? Object.assign({}, item, { favorite: !item.favorite, updatedAt: Date.now() }) : item);
      if (!persist()) {
        contacts = previous;
        return;
      }
      render();
      showToast(contact.favorite ? "Removed from favorites." : "Added to favorites.");
    }
  }

  els.add.forEach(button => button.addEventListener("click", () => openDialog(null)));
  document.querySelectorAll(".close-dialog").forEach(button => button.addEventListener("click", closeDialog));
  els.dialog.addEventListener("click", event => {
    if (event.target === els.dialog) closeDialog();
  });
  els.form.addEventListener("submit", saveContact);
  els.list.addEventListener("click", handleCardAction);
  els.search.addEventListener("input", render);
  els.sort.addEventListener("change", render);
  document.querySelector(".filter-tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach(tab => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    render();
  });
  document.addEventListener("keydown", event => {
    const target = event.target;
    const typing = target && /INPUT|TEXTAREA|SELECT/.test(target.tagName);
    if (event.key === "/" && !typing && !els.dialog.open) {
      event.preventDefault();
      els.search.focus();
    } else if (event.key === "Escape" && els.dialog.open) {
      closeDialog();
    }
  });
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    contacts = loadContacts();
    render();
    showToast("Contacts updated in another tab.");
  });

  render();
})();