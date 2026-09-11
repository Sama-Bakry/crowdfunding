"use strict";

const LOGIN_API_URL =
    "http://127.0.0.1:8000/api/accounts/login/";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleLoginSubmit);

    const toggleButton = document.getElementById(
        "login-password-toggle"
    );

    if (toggleButton) {
        toggleButton.addEventListener(
            "click",
            togglePasswordVisibility
        );
    }
});


async function handleLoginSubmit(event) {
    event.preventDefault();

    clearErrors();
    hideAlert();

    const email = document
        .getElementById("login-email")
        .value
        .trim()
        .toLowerCase();

    const password = document
        .getElementById("login-password")
        .value;

    const errors = validateForm(email, password);

    if (Object.keys(errors).length > 0) {
        showErrors(errors);
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(
            LOGIN_API_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showApiError(data);
            return;
        }

        localStorage.setItem(
            "access_token",
            data.access
        );

        localStorage.setItem(
            "refresh_token",
            data.refresh
        );

        localStorage.setItem(
            "auth_user_email",
            email
        );

        showAlert(
            "Login successful. Redirecting...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "index.html";
        }, 800);

    } catch (error) {
        console.error(error);

        showAlert(
            "Unable to connect to the server. Please make sure Django is running.",
            "error"
        );
    } finally {
        setLoading(false);
    }
}


function validateForm(email, password) {
    const errors = {};

    if (!email) {
        errors.email =
            "Email address is required.";
    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        errors.email =
            "Please enter a valid email address.";
    }

    if (!password) {
        errors.password =
            "Password is required.";
    }

    return errors;
}


function showErrors(errors) {
    if (errors.email) {
        setFieldError(
            "login-email",
            errors.email
        );
    }

    if (errors.password) {
        setFieldError(
            "login-password",
            errors.password
        );
    }
}


function showApiError(data) {
    if (data && data.detail) {
        const message = Array.isArray(data.detail)
            ? data.detail[0]
            : data.detail;

        showAlert(message, "error");
        return;
    }

    if (data && data.email) {
        setFieldError(
            "login-email",
            getFirstMessage(data.email)
        );
    }

    if (data && data.password) {
        setFieldError(
            "login-password",
            getFirstMessage(data.password)
        );
    }

    if (
        !data ||
        (!data.email && !data.password)
    ) {
        showAlert(
            "Invalid email or password.",
            "error"
        );
    }
}


function getFirstMessage(value) {
    return Array.isArray(value)
        ? value[0]
        : value;
}


function setFieldError(elementId, message) {
    const input =
        document.getElementById(elementId);

    const error =
        document.getElementById(
            `${elementId}-error`
        );

    if (input) {
        input.classList.add("is-invalid");
    }

    if (error) {
        error.textContent = message;
    }
}


function clearErrors() {
    document
        .querySelectorAll(
            "#login-form .is-invalid"
        )
        .forEach((element) => {
            element.classList.remove(
                "is-invalid"
            );
        });

    document
        .querySelectorAll(
            "#login-form .field-error"
        )
        .forEach((element) => {
            element.textContent = "";
        });
}


function showAlert(message, type = "error") {
    const alert =
        document.getElementById(
            "login-alert"
        );

    if (!alert) {
        return;
    }

    alert.hidden = false;
    alert.textContent = message;

    alert.classList.toggle(
        "success",
        type === "success"
    );
}


function hideAlert() {
    const alert =
        document.getElementById(
            "login-alert"
        );

    if (!alert) {
        return;
    }

    alert.hidden = true;
    alert.textContent = "";
    alert.classList.remove("success");
}


function setLoading(isLoading) {
    const button =
        document.getElementById(
            "login-button"
        );

    const text =
        document.getElementById(
            "login-button-text"
        );

    if (!button) {
        return;
    }

    button.disabled = isLoading;
    button.classList.toggle(
        "loading",
        isLoading
    );

    if (text) {
        text.textContent = isLoading
            ? "Signing in..."
            : "Sign in";
    }
}


function togglePasswordVisibility() {
    const input =
        document.getElementById(
            "login-password"
        );

    const button =
        document.getElementById(
            "login-password-toggle"
        );

    if (!input || !button) {
        return;
    }

    const show = input.type === "password";

    input.type = show
        ? "text"
        : "password";

    button.textContent = show
        ? "Hide"
        : "Show";

    button.setAttribute(
        "aria-label",
        show
            ? "Hide password"
            : "Show password"
    );
}