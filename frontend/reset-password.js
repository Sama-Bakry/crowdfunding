"use strict";

const RESET_PASSWORD_API_BASE =
    "http://127.0.0.1:8000/api/accounts/reset-password/";


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const form =
            document.getElementById("reset-form");

        if (!form) {
            return;
        }

        form.addEventListener(
            "submit",
            handleResetPassword
        );

        setupPasswordToggle(
            "new-password",
            "new-password-toggle"
        );

        setupPasswordToggle(
            "confirm-password",
            "confirm-password-toggle"
        );
    }
);


/* =========================
   READ RESET DATA
========================= */

function getResetDataFromHash() {
    const hash =
        window.location.hash.replace(
            /^#/,
            ""
        );

    const parts =
        hash.split("/");

    if (
        parts.length !== 4 ||
        parts[0] !== "uid" ||
        parts[2] !== "token"
    ) {
        return null;
    }

    const uid =
        parts[1];

    const token =
        decodeURIComponent(parts[3]);

    if (!uid || !token) {
        return null;
    }

    return {
        uid,
        token,
    };
}


/* =========================
   SUBMIT
========================= */

async function handleResetPassword(event) {
    event.preventDefault();

    clearErrors();
    hideAlert();

    const resetData =
        getResetDataFromHash();

    if (!resetData) {
        showAlert(
            "This password reset link is incomplete or invalid.",
            "error"
        );

        return;
    }

    const newPassword =
        document
            .getElementById("new-password")
            .value;

    const confirmPassword =
        document
            .getElementById("confirm-password")
            .value;

    const errors =
        validatePasswords(
            newPassword,
            confirmPassword
        );

    if (
        Object.keys(errors).length > 0
    ) {
        showErrors(errors);
        return;
    }

    setLoading(true);

    try {
        const response =
            await fetch(
                `${RESET_PASSWORD_API_BASE}${encodeURIComponent(resetData.uid)}/${encodeURIComponent(resetData.token)}/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",
                    },

                    body: JSON.stringify({
                        new_password:
                            newPassword,

                        confirm_password:
                            confirmPassword,
                    }),
                }
            );

        const data =
            await parseResponse(response);

        if (!response.ok) {
            handleApiError(data);
            return;
        }

        showAlert(
            "Your password has been reset successfully. Redirecting to sign in...",
            "success"
        );

        document
            .getElementById("reset-form")
            .reset();

        /*
         * Remove the sensitive token from
         * the browser URL after success.
         */
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        setTimeout(
            () => {
                window.location.href =
                    "login.html";
            },
            1800
        );

    } catch (error) {
        console.error(
            "Password reset request failed:",
            error
        );

        showAlert(
            "Unable to connect to the server. Please make sure Django is running.",
            "error"
        );

    } finally {
        setLoading(false);
    }
}


/* =========================
   VALIDATION
========================= */

function validatePasswords(
    newPassword,
    confirmPassword
) {
    const errors = {};

    if (!newPassword) {
        errors.new_password =
            "New password is required.";
    } else if (
        newPassword.length < 8
    ) {
        errors.new_password =
            "Password must contain at least 8 characters.";
    }

    if (!confirmPassword) {
        errors.confirm_password =
            "Please confirm your password.";
    } else if (
        newPassword !== confirmPassword
    ) {
        errors.confirm_password =
            "Passwords do not match.";
    }

    return errors;
}


function showErrors(errors) {
    if (errors.new_password) {
        setFieldError(
            "new-password",
            errors.new_password
        );
    }

    if (errors.confirm_password) {
        setFieldError(
            "confirm-password",
            errors.confirm_password
        );
    }
}


/* =========================
   API RESPONSE
========================= */

async function parseResponse(
    response
) {
    const contentType =
        response.headers.get(
            "content-type"
        );

    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {
        return response.json();
    }

    return {
        detail:
            await response.text(),
    };
}


function handleApiError(data) {
    if (
        data &&
        data.detail
    ) {
        const message =
            Array.isArray(data.detail)
                ? data.detail[0]
                : data.detail;

        showAlert(
            message,
            "error"
        );

        return;
    }

    if (
        data &&
        data.new_password
    ) {
        setFieldError(
            "new-password",
            getFirstMessage(
                data.new_password
            )
        );
    }

    if (
        data &&
        data.confirm_password
    ) {
        setFieldError(
            "confirm-password",
            getFirstMessage(
                data.confirm_password
            )
        );
    }
}


function getFirstMessage(value) {
    return Array.isArray(value)
        ? value[0]
        : value;
}


/* =========================
   FIELD ERRORS
========================= */

function setFieldError(
    elementId,
    message
) {
    const input =
        document.getElementById(
            elementId
        );

    const error =
        document.getElementById(
            `${elementId}-error`
        );

    if (input) {
        input.classList.add(
            "is-invalid"
        );
    }

    if (error) {
        error.textContent =
            message;
    }
}


function clearErrors() {
    document
        .querySelectorAll(
            "#reset-form .is-invalid"
        )
        .forEach(
            (element) => {
                element.classList.remove(
                    "is-invalid"
                );
            }
        );

    document
        .querySelectorAll(
            "#reset-form .field-error"
        )
        .forEach(
            (element) => {
                element.textContent = "";
            }
        );
}


/* =========================
   ALERT
========================= */

function showAlert(
    message,
    type = "error"
) {
    const alert =
        document.getElementById(
            "reset-alert"
        );

    if (!alert) {
        return;
    }

    alert.hidden = false;

    alert.textContent =
        message;

    alert.classList.toggle(
        "success",
        type === "success"
    );
}


function hideAlert() {
    const alert =
        document.getElementById(
            "reset-alert"
        );

    if (!alert) {
        return;
    }

    alert.hidden = true;

    alert.textContent = "";

    alert.classList.remove(
        "success"
    );
}


/* =========================
   LOADING
========================= */

function setLoading(
    isLoading
) {
    const button =
        document.getElementById(
            "reset-button"
        );

    const text =
        document.getElementById(
            "reset-button-text"
        );

    if (!button) {
        return;
    }

    button.disabled =
        isLoading;

    button.classList.toggle(
        "loading",
        isLoading
    );

    if (text) {
        text.textContent =
            isLoading
                ? "Updating..."
                : "Update password";
    }
}


/* =========================
   PASSWORD TOGGLE
========================= */

function setupPasswordToggle(
    inputId,
    buttonId
) {
    const input =
        document.getElementById(
            inputId
        );

    const button =
        document.getElementById(
            buttonId
        );

    if (!input || !button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            const show =
                input.type ===
                "password";

            input.type =
                show
                    ? "text"
                    : "password";

            button.textContent =
                show
                    ? "Hide"
                    : "Show";
        }
    );
}