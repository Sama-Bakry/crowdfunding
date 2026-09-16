from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ActivateAccountView,
    DeleteAccountView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    RegisterView,
    ResetPasswordView,
    UserProfileView,
    AdminUserListView,
    AdminUserDeleteView,
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

    path(
        "profile/",
        UserProfileView.as_view(),
        name="profile",
    ),

    path(
        "profile/delete/",
        DeleteAccountView.as_view(),
        name="delete-account",
    ),
    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path(
        "admin/users/",
        AdminUserListView.as_view(),
        name="admin-user-list",
    ),
    path(
        "admin/users/<int:pk>/",
        AdminUserDeleteView.as_view(),
        name="admin-user-delete",
    ),
]