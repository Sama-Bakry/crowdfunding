"use strict";


/* =========================
   Auth guard
   ========================= */

function requireAuthOrRedirect() {

    const accessToken =
        getAccessToken();

    if (!accessToken) {

        window.location.href =
            "login.html";

        return null;
    }

    return accessToken;
}


/* =========================
   Authenticated API request
   ========================= */

async function authApiRequest(endpoint, options = {}) {

    const accessToken =
        getAccessToken();

    const headers = {
        ...(options.headers || {}),
    };

    if (accessToken) {
        headers.Authorization =
            `Bearer ${accessToken}`;
    }

    return apiRequest(
        endpoint,
        {
            ...options,
            headers,
        }
    );
}




async function authMultipartRequest(endpoint, formData, method = "POST") {

    const accessToken =
        getAccessToken();

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method,
                body: formData,
                headers: {
                    Accept: "application/json",
                    ...(accessToken
                        ? { Authorization: `Bearer ${accessToken}` }
                        : {}),
                },
            }
        );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error("Request failed.");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}


/* =========================
   Categories
   ========================= */

async function fetchCategories() {
    return apiRequest("/projects/categories/");
}


function populateCategorySelect(selectElement, categories, selectedId = null) {

    if (!selectElement) {
        return;
    }

    const options = categories.map((category) => {
        const selectedAttr =
            selectedId && Number(selectedId) === category.id
                ? " selected"
                : "";

        return `<option value="${category.id}"${selectedAttr}>${escapeHtml(category.name)}</option>`;
    });

    selectElement.innerHTML =
        `<option value="">Select a category</option>` +
        options.join("");
}


/* =========================
   Formatting helpers
   ========================= */

function formatCurrency(amount) {

    const value = Number(amount);

    if (Number.isNaN(value)) {
        return "EGP 0";
    }

    return `EGP ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
    );
}


const STATUS_LABELS = {
    running: "Running",
    upcoming: "Upcoming",
    ended: "Ended",
    cancelled: "Cancelled",
};


function statusBadgeHtml(status) {

    const label =
        STATUS_LABELS[status] || status;

    return `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}


function tagListHtml(tags) {

    if (!tags || tags.length === 0) {
        return "";
    }

    const chips = tags.map(
        (tag) => `<span class="tag-chip">${escapeHtml(tag.name)}</span>`
    );

    return `<div class="tag-list">${chips.join("")}</div>`;
}


function progressBarHtml(progress) {

    const value =
        Math.max(0, Math.min(100, Number(progress) || 0));

    return `
        <div class="project-progress">
            <div class="progress-track">
                <div class="progress-value" style="width: ${value}%;"></div>
            </div>
        </div>
    `;
}


/* =========================
   Error helpers
   ========================= */

function firstApiErrorMessage(data, fallback) {

    if (!data || typeof data !== "object") {
        return fallback;
    }

    if (data.detail) {
        return Array.isArray(data.detail) ? data.detail[0] : data.detail;
    }

    for (const key of Object.keys(data)) {
        const value = data[key];
        return Array.isArray(value) ? value[0] : value;
    }

    return fallback;
}


function applyFieldErrors(data, fieldMap) {

    if (!data || typeof data !== "object") {
        return;
    }

    Object.entries(fieldMap).forEach(([apiField, elementId]) => {

        if (!data[apiField]) {
            return;
        }

        const message =
            Array.isArray(data[apiField])
                ? data[apiField][0]
                : data[apiField];

        const input = document.getElementById(elementId);
        const errorElement = document.getElementById(`${elementId}-error`);

        if (input) {
            input.classList.add("is-invalid");
        }

        if (errorElement) {
            errorElement.textContent = message;
        }
    });
}


function clearFieldErrors(form) {

    if (!form) {
        return;
    }

    form.querySelectorAll(".is-invalid").forEach((input) => {
        input.classList.remove("is-invalid");
    });

    form.querySelectorAll(".field-error").forEach((element) => {
        element.textContent = "";
    });
}
