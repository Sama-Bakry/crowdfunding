"use strict";

const FORGOT_PASSWORD_API_URL =
    "http://127.0.0.1:8000/api/accounts/forgot-password/";

document.addEventListener("DOMContentLoaded", () => {
    const form =
        document.getElementById("forgot-form");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        handleForgotPassword
    );
});


async function handleForgotPassword(event) {
    event.preventDefault();

    clearErrors();
    hideAlert();
    setLoading(true);

    const email = document
        .getElementById("forgot-email")
        .value
        .trim()
        .toLowerCase();

    if (!email) {
        setFieldError(
            "forgot-email",
            "Email address is required."
        );

        setLoading(false);
        return;
    }

    if (!isValidEmail(email)) {
        setFieldError(
            "forgot-email",
            "Please enter a valid email address."
        );

        setLoading(false);
        return;
    }

    try {
        const response = await fetch(
            FORGOT_PASSWORD_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json",
                },

                body: JSON.stringify({
                    email,
                }),
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            handleApiError(data);

            return;
        }

        showAlert(
            data.detail ||
                "If an account with this email exists, a password reset link has been sent.",
            "success"
        );

        document
            .getElementById(
                "forgot-email"
            )
            .value = "";

    } catch (error) {
        console.error(error);

        showAlert(
            "Unable to connect to the server. Please try again.",
            "error"
        );

    } finally {
        setLoading(false);
    }
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}


function handleApiError(data) {
    if (data && data.email) {
        setFieldError(
            "forgot-email",
            Array.isArray(data.email)
                ? data.email[0]
                : data.email
        );

        return;
    }

    showAlert(
        data?.detail ||
            "Something went wrong. Please try again.",
        "error"
    );
}


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
        error.textContent = message;
    }
}


function clearErrors() {
    const input =
        document.getElementById(
            "forgot-email"
        );

    const error =
        document.getElementById(
            "forgot-email-error"
        );

    input?.classList.remove(
        "is-invalid"
    );

    if (error) {
        error.textContent = "";
    }
}


function showAlert(
    message,
    type = "error"
) {
    const alert =
        document.getElementById(
            "forgot-alert"
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
            "forgot-alert"
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


function setLoading(
    isLoading
) {
    const button =
        document.getElementById(
            "forgot-button"
        );

    const text =
        document.getElementById(
            "forgot-button-text"
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
                ? "Sending..."
                : "Send reset link";
    }
}