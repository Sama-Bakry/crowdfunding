"use strict";

const REGISTER_API_URL =
    "http://127.0.0.1:8000/api/accounts/register/";

let registerForm = null;
let registerButton = null;
let registerButtonText = null;
let registerAlert = null;


document.addEventListener(
    "DOMContentLoaded",
    () => {

        registerForm =
            document.getElementById(
                "register-form"
            );

        registerButton =
            document.getElementById(
                "register-button"
            );

        registerButtonText =
            document.getElementById(
                "register-button-text"
            );

        registerAlert =
            document.getElementById(
                "register-alert"
            );


        if (!registerForm) {

            console.error(
                "Registration form was not found."
            );

            return;
        }


        registerForm.addEventListener(
            "submit",
            handleRegisterSubmit
        );


        setupPasswordToggle(
            "password",
            "password-toggle"
        );


        setupPasswordToggle(
            "confirm-password",
            "confirm-password-toggle"
        );

    }
);


/* =========================
   SUBMIT
========================= */

async function handleRegisterSubmit(event) {

    event.preventDefault();
    event.stopPropagation();


    clearFormErrors();
    hideAlert();


    const formData =
        collectFormData();


    const validationErrors =
        validateRegisterForm(
            formData
        );


    if (
        Object.keys(
            validationErrors
        ).length > 0
    ) {

        showFormErrors(
            validationErrors
        );

        return;
    }


    setLoadingState(true);


    try {

        const response =
            await fetch(
                REGISTER_API_URL,
                {
                    method: "POST",

                    body: formData,

                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (!response.ok) {

            handleApiErrors(
                data
            );

            return;
        }


        handleRegisterSuccess(
            data
        );


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        showAlert(
            "Unable to connect to the server. Please make sure the Django server is running and try again.",
            "error"
        );


    } finally {

        setLoadingState(
            false
        );

    }

}


/* =========================
   COLLECT FORM DATA
========================= */

function collectFormData() {

    const formData =
        new FormData();


    const firstName =
        document
            .getElementById(
                "first-name"
            )
            .value
            .trim();


    const lastName =
        document
            .getElementById(
                "last-name"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "email"
            )
            .value
            .trim()
            .toLowerCase();


    const phoneNumber =
        document
            .getElementById(
                "phone-number"
            )
            .value
            .trim();


    const password =
        document.getElementById(
            "password"
        ).value;


    const confirmPassword =
        document.getElementById(
            "confirm-password"
        ).value;


    const profilePictureInput =
        document.getElementById(
            "profile-picture"
        );


    formData.append(
        "first_name",
        firstName
    );


    formData.append(
        "last_name",
        lastName
    );


    formData.append(
        "email",
        email
    );


    formData.append(
        "phone_number",
        phoneNumber
    );


    formData.append(
        "password",
        password
    );


    formData.append(
        "confirm_password",
        confirmPassword
    );


    if (
        profilePictureInput &&
        profilePictureInput.files &&
        profilePictureInput.files.length > 0
    ) {

        formData.append(
            "profile_picture",
            profilePictureInput.files[0]
        );

    }


    return formData;
}


/* =========================
   VALIDATION
========================= */

function validateRegisterForm(
    formData
) {

    const errors = {};


    const firstName =
        formData.get(
            "first_name"
        );


    const lastName =
        formData.get(
            "last_name"
        );


    const email =
        formData.get(
            "email"
        );


    const phoneNumber =
        formData.get(
            "phone_number"
        );


    const password =
        formData.get(
            "password"
        );


    const confirmPassword =
        formData.get(
            "confirm_password"
        );


    const terms =
        document.getElementById(
            "terms"
        );


    if (!firstName) {

        errors.first_name =
            "First name is required.";

    }


    if (!lastName) {

        errors.last_name =
            "Last name is required.";

    }


    if (!email) {

        errors.email =
            "Email address is required.";

    } else if (
        !isValidEmail(email)
    ) {

        errors.email =
            "Please enter a valid email address.";

    }


    if (!phoneNumber) {

        errors.phone_number =
            "Phone number is required.";

    } else if (
        !isValidEgyptianPhone(
            phoneNumber
        )
    ) {

        errors.phone_number =
            "Please enter a valid Egyptian mobile number.";

    }


    if (!password) {

        errors.password =
            "Password is required.";

    } else if (
        password.length < 8
    ) {

        errors.password =
            "Password must contain at least 8 characters.";

    }


    if (!confirmPassword) {

        errors.confirm_password =
            "Please confirm your password.";

    } else if (
        password !== confirmPassword
    ) {

        errors.confirm_password =
            "Passwords do not match.";

    }


    if (
        !terms ||
        !terms.checked
    ) {

        errors.terms =
            "Please accept the Terms of Service and Privacy Policy.";

    }


    return errors;
}


function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


function isValidEgyptianPhone(
    phone
) {

    return /^01[0125]\d{8}$/.test(
        phone
    );

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


    const text =
        await response.text();


    return {
        detail:
            text ||
            "An unexpected server response was received.",
    };

}


/* =========================
   API ERRORS
========================= */

function handleApiErrors(
    data
) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        showAlert(
            "Registration failed. Please review your information and try again.",
            "error"
        );

        return;
    }


    const fieldMap = {

        first_name:
            "first-name",

        last_name:
            "last-name",

        email:
            "email",

        phone_number:
            "phone-number",

        password:
            "password",

        confirm_password:
            "confirm-password",

        profile_picture:
            "profile-picture",

    };


    let hasFieldError = false;


    Object.entries(
        fieldMap
    ).forEach(
        ([apiField, elementId]) => {

            if (!data[apiField]) {
                return;
            }


            const message =
                Array.isArray(
                    data[apiField]
                )
                    ? data[apiField][0]
                    : data[apiField];


            setFieldError(
                elementId,
                message
            );


            hasFieldError = true;

        }
    );


    if (data.detail) {

        showAlert(
            Array.isArray(
                data.detail
            )
                ? data.detail[0]
                : data.detail,

            "error"
        );

        return;
    }


    if (!hasFieldError) {

        showAlert(
            "Registration failed. Please review your information and try again.",
            "error"
        );

    }

}


/* =========================
   SUCCESS
========================= */

function handleRegisterSuccess() {

    showAlert(
        "Account created successfully. Redirecting to account activation...",
        "success"
    );


    registerForm.reset();


    setTimeout(
        () => {

            window.location.href =
                "activate.html";

        },
        1000
    );

}


/* =========================
   FORM ERRORS
========================= */

function showFormErrors(
    errors
) {

    Object.entries(
        errors
    ).forEach(
        ([fieldName, message]) => {

            if (
                fieldName === "terms"
            ) {

                const termsError =
                    document.getElementById(
                        "terms-error"
                    );


                if (termsError) {

                    termsError.textContent =
                        message;

                }

                return;
            }


            const elementId =
                getElementIdForField(
                    fieldName
                );


            if (elementId) {

                setFieldError(
                    elementId,
                    message
                );

            }

        }
    );

}


function getElementIdForField(
    fieldName
) {

    const fieldMap = {

        first_name:
            "first-name",

        last_name:
            "last-name",

        email:
            "email",

        phone_number:
            "phone-number",

        password:
            "password",

        confirm_password:
            "confirm-password",

        profile_picture:
            "profile-picture",

    };


    return (
        fieldMap[fieldName] ||
        null
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


    const errorElement =
        document.getElementById(
            `${elementId}-error`
        );


    if (input) {

        input.classList.add(
            "is-invalid"
        );

    }


    if (errorElement) {

        errorElement.textContent =
            message;

    }

}


function clearFormErrors() {

    if (!registerForm) {
        return;
    }


    registerForm
        .querySelectorAll(
            ".is-invalid"
        )
        .forEach(
            (input) => {

                input.classList.remove(
                    "is-invalid"
                );

            }
        );


    registerForm
        .querySelectorAll(
            ".field-error"
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

    if (!registerAlert) {
        return;
    }


    registerAlert.hidden = false;


    registerAlert.textContent =
        message;


    registerAlert.classList.remove(
        "success"
    );


    if (
        type === "success"
    ) {

        registerAlert.classList.add(
            "success"
        );

    }

}


function hideAlert() {

    if (!registerAlert) {
        return;
    }


    registerAlert.hidden = true;


    registerAlert.textContent = "";


    registerAlert.classList.remove(
        "success"
    );

}


/* =========================
   LOADING
========================= */

function setLoadingState(
    isLoading
) {

    if (!registerButton) {
        return;
    }


    registerButton.disabled =
        isLoading;


    registerButton.classList.toggle(
        "loading",
        isLoading
    );


    if (
        !registerButtonText
    ) {
        return;
    }


    registerButtonText.textContent =
        isLoading
            ? "Creating account..."
            : "Create account";

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


    if (
        !input ||
        !button
    ) {

        return;
    }


    button.addEventListener(
        "click",
        () => {

            const isPassword =
                input.type ===
                "password";


            input.type =
                isPassword
                    ? "text"
                    : "password";


            button.textContent =
                isPassword
                    ? "Hide"
                    : "Show";


            button.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}