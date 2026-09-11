from django.urls import path

from .views import (
    ActivateAccountView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    RegisterView,
    ResetPasswordView,
)


app_name = "accounts"


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
    path(
        "activate/<str:token>/",
        ActivateAccountView.as_view(),
        name="activate",
    ),
    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password",
    ),
    path(
        "reset-password/<int:uid>/<str:token>/",
        ResetPasswordView.as_view(),
        name="reset-password",
    ),
]