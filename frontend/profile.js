"use strict";


const PROFILE_API_URL =
    "http://127.0.0.1:8000/api/accounts/profile/";

const DELETE_ACCOUNT_API_URL =
    "http://127.0.0.1:8000/api/accounts/profile/delete/";

const LOGOUT_API_URL =
    "http://127.0.0.1:8000/api/accounts/logout/";


document.addEventListener(
    "DOMContentLoaded",
    initializeProfile
);


async function initializeProfile() {

    const accessToken =
        localStorage.getItem(
            "access_token"
        );


    if (!accessToken) {
        window.location.href =
            "login.html";

        return;
    }


    document
        .getElementById(
            "profile-form"
        )
        .addEventListener(
            "submit",
            handleProfileSubmit
        );


    document
        .getElementById(
            "profile-logout-button"
        )
        .addEventListener(
            "click",
            handleLogout
        );


    document
        .getElementById(
            "delete-account-button"
        )
        .addEventListener(
            "click",
            openDeleteModal
        );


    document
        .getElementById(
            "close-delete-modal"
        )
        .addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .querySelector(
            "[data-close-delete-modal]"
        )
        .addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .getElementById(
            "delete-account-form"
        )
        .addEventListener(
            "submit",
            handleDeleteAccount
        );


    await loadProfile();
}


async function loadProfile() {

    try {

        const response =
            await authorizedFetch(
                PROFILE_API_URL,
                {
                    method: "GET",
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (response.status === 401) {
            clearAuthAndRedirect();
            return;
        }


        if (!response.ok) {

            showAlert(
                getDetail(
                    data,
                    "Unable to load your profile."
                ),
                "error"
            );

            return;
        }


        populateProfile(
            data
        );

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );


        showAlert(
            "Unable to connect to the server.",
            "error"
        );
    }
}


function populateProfile(data) {

    document.getElementById(
        "first-name"
    ).value =
        data.first_name || "";


    document.getElementById(
        "last-name"
    ).value =
        data.last_name || "";


    document.getElementById(
        "email"
    ).value =
        data.email || "";


    document.getElementById(
        "phone-number"
    ).value =
        data.phone_number || "";


    document.getElementById(
        "birthdate"
    ).value =
        data.birthdate || "";


    document.getElementById(
        "country"
    ).value =
        data.country || "";


    document.getElementById(
        "facebook-profile"
    ).value =
        data.facebook_profile || "";


    const avatar =
        document.getElementById(
            "profile-avatar"
        );


    const initials =
        `${data.first_name || ""} ${data.last_name || ""}`
            .trim()
            .split(/\s+/)
            .map(
                (part) =>
                    part.charAt(0).toUpperCase()
            )
            .slice(0, 2)
            .join("");


    avatar.textContent =
        initials || "U";


    if (data.profile_picture) {

        avatar.style.backgroundImage =
            `url("${data.profile_picture}")`;

        avatar.classList.add(
            "has-image"
        );

        avatar.textContent = "";

    } else {

        avatar.style.backgroundImage =
            "";

        avatar.classList.remove(
            "has-image"
        );
    }
}


async function handleProfileSubmit(event) {

    event.preventDefault();


    clearErrors();
    hideAlert();


    const formData =
        new FormData();


    formData.append(
        "first_name",
        document.getElementById(
            "first-name"
        ).value.trim()
    );


    formData.append(
        "last_name",
        document.getElementById(
            "last-name"
        ).value.trim()
    );


    formData.append(
        "phone_number",
        document.getElementById(
            "phone-number"
        ).value.trim()
    );


    formData.append(
        "birthdate",
        document.getElementById(
            "birthdate"
        ).value
    );


    formData.append(
        "country",
        document.getElementById(
            "country"
        ).value.trim()
    );


    formData.append(
        "facebook_profile",
        document.getElementById(
            "facebook-profile"
        ).value.trim()
    );


    const pictureInput =
        document.getElementById(
            "profile-picture"
        );


    if (
        pictureInput.files &&
        pictureInput.files.length > 0
    ) {

        formData.append(
            "profile_picture",
            pictureInput.files[0]
        );
    }


    setSaveState(true);


    try {

        const response =
            await authorizedFetch(
                PROFILE_API_URL,
                {
                    method: "PATCH",
                    body: formData,
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (response.status === 401) {
            clearAuthAndRedirect();
            return;
        }


        if (!response.ok) {

            handleApiErrors(
                data
            );

            return;
        }


        populateProfile(
            data
        );


        document.getElementById(
            "profile-picture"
        ).value = "";


        showAlert(
            "Your profile has been updated successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showAlert(
            "Unable to connect to the server.",
            "error"
        );

    } finally {

        setSaveState(false);
    }
}


async function handleDeleteAccount(event) {

    event.preventDefault();


    clearDeleteErrors();


    const password =
        document.getElementById(
            "delete-password"
        ).value;


    const confirmPassword =
        document.getElementById(
            "delete-confirm-password"
        ).value;


    if (!password) {

        setDeleteError(
            "delete-password",
            "Password is required."
        );

        return;
    }


    if (!confirmPassword) {

        setDeleteError(
            "delete-confirm-password",
            "Please confirm your password."
        );

        return;
    }


    if (
        password !== confirmPassword
    ) {

        setDeleteError(
            "delete-confirm-password",
            "Passwords do not match."
        );

        return;
    }


    const refreshToken =
        localStorage.getItem(
            "refresh_token"
        );


    const button =
        document.getElementById(
            "confirm-delete-button"
        );


    button.disabled = true;

    button.textContent =
        "Deleting account...";


    try {

        const response =
            await authorizedFetch(
                DELETE_ACCOUNT_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify({
                            password,
                            confirm_password:
                                confirmPassword,
                            refresh:
                                refreshToken,
                        }),
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (response.status === 401) {

            clearAuthAndRedirect();

            return;
        }


        if (!response.ok) {

            handleDeleteApiErrors(
                data
            );

            return;
        }


        clearAuthTokens();


        window.location.href =
            "register.html";

    } catch (error) {

        console.error(
            "Account deletion error:",
            error
        );


        setDeleteError(
            "delete-password",
            "Unable to connect to the server."
        );

    } finally {

        button.disabled = false;

        button.textContent =
            "Permanently delete account";
    }
}


function openDeleteModal() {

    clearDeleteErrors();


    document.getElementById(
        "delete-password"
    ).value = "";


    document.getElementById(
        "delete-confirm-password"
    ).value = "";


    document.getElementById(
        "delete-modal"
    ).hidden = false;


    document.getElementById(
        "delete-password"
    ).focus();
}


function closeDeleteModal() {

    document.getElementById(
        "delete-modal"
    ).hidden = true;
}


async function handleLogout() {

    const accessToken =
        localStorage.getItem(
            "access_token"
        );

    const refreshToken =
        localStorage.getItem(
            "refresh_token"
        );


    try {

        if (
            accessToken &&
            refreshToken
        ) {

            await fetch(
                LOGOUT_API_URL,
                {
                    method: "POST",

                    headers: {
                        Accept:
                            "application/json",

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${accessToken}`,
                    },

                    body:
                        JSON.stringify({
                            refresh:
                                refreshToken,
                        }),
                }
            );
        }

    } finally {

        clearAuthTokens();

        window.location.href =
            "index.html";
    }
}


async function authorizedFetch(
    url,
    options = {}
) {

    const accessToken =
        localStorage.getItem(
            "access_token"
        );


    return fetch(
        url,
        {
            ...options,

            headers: {
                Accept:
                    "application/json",

                ...(accessToken
                    ? {
                        Authorization:
                            `Bearer ${accessToken}`,
                    }
                    : {}),

                ...(options.headers || {}),
            },
        }
    );
}


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
            "Unexpected server response.",
    };
}


function handleApiErrors(data) {

    const fieldMap = {
        first_name:
            "first-name",

        last_name:
            "last-name",

        phone_number:
            "phone-number",

        profile_picture:
            "profile-picture",

        facebook_profile:
            "facebook-profile",
    };


    let foundError = false;


    Object.entries(
        fieldMap
    ).forEach(
        ([field, elementId]) => {

            if (
                !data ||
                !data[field]
            ) {
                return;
            }


            const message =
                Array.isArray(
                    data[field]
                )
                    ? data[field][0]
                    : data[field];


            setFieldError(
                elementId,
                message
            );


            foundError = true;
        }
    );


    if (
        data &&
        data.detail
    ) {

        showAlert(
            getDetail(
                data,
                "Unable to update your profile."
            ),
            "error"
        );

        return;
    }


    if (!foundError) {

        showAlert(
            "Unable to update your profile.",
            "error"
        );
    }
}


function handleDeleteApiErrors(
    data
) {

    if (
        data &&
        data.password
    ) {

        setDeleteError(
            "delete-password",
            getFieldMessage(
                data.password
            )
        );
    }


    if (
        data &&
        data.confirm_password
    ) {

        setDeleteError(
            "delete-confirm-password",
            getFieldMessage(
                data.confirm_password
            )
        );
    }
}


function getFieldMessage(
    value
) {

    return Array.isArray(value)
        ? value[0]
        : value;
}


function getDetail(
    data,
    fallback
) {

    if (
        data &&
        data.detail
    ) {

        return getFieldMessage(
            data.detail
        );
    }


    return fallback;
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

        error.textContent =
            message;
    }
}


function clearErrors() {

    document
        .querySelectorAll(
            ".is-invalid"
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
            ".field-error"
        )
        .forEach(
            (element) => {

                element.textContent =
                    "";
            }
        );
}


function setDeleteError(
    elementId,
    message
) {

    const error =
        document.getElementById(
            `${elementId}-error`
        );


    if (error) {

        error.textContent =
            message;
    }


    const input =
        document.getElementById(
            elementId
        );


    if (input) {

        input.classList.add(
            "is-invalid"
        );
    }
}


function clearDeleteErrors() {

    [
        "delete-password",
        "delete-confirm-password",
    ].forEach(
        (id) => {

            const input =
                document.getElementById(
                    id
                );


            const error =
                document.getElementById(
                    `${id}-error`
                );


            if (input) {

                input.classList.remove(
                    "is-invalid"
                );
            }


            if (error) {

                error.textContent =
                    "";
            }
        }
    );
}


function showAlert(
    message,
    type = "error"
) {

    const alert =
        document.getElementById(
            "profile-alert"
        );


    alert.hidden = false;

    alert.textContent =
        message;


    alert.classList.remove(
        "success"
    );


    if (
        type === "success"
    ) {

        alert.classList.add(
            "success"
        );
    }
}


function hideAlert() {

    const alert =
        document.getElementById(
            "profile-alert"
        );


    alert.hidden = true;

    alert.textContent =
        "";

    alert.classList.remove(
        "success"
    );
}


function setSaveState(
    saving
) {

    const button =
        document.getElementById(
            "profile-save-button"
        );


    button.disabled =
        saving;


    button.textContent =
        saving
            ? "Saving..."
            : "Save changes";
}


function clearAuthTokens() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "auth_user_email"
    );
}


function clearAuthAndRedirect() {

    clearAuthTokens();

    window.location.href =
        "login.html";
}