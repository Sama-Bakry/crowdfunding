from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User
from .serializers import (
    DeleteAccountSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
)
from .services import (
    send_activation_email,
    send_password_reset_email,
)
from .tokens import (
    verify_activation_token,
    verify_password_reset_token,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()

        send_activation_email(
            user=user,
            request=self.request,
        )


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {
                "detail": "Login successful.",
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": "Logout successful."
            },
            status=status.HTTP_200_OK,
        )


class ActivateAccountView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        user_id = verify_activation_token(token)

        if not user_id:
            return Response(
                {
                    "detail": "Invalid or expired activation link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(
            User,
            pk=user_id,
        )

        if user.is_email_verified:
            return Response(
                {
                    "detail": "This account has already been activated."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_email_verified = True
        user.is_active = True

        user.save(
            update_fields=[
                "is_email_verified",
                "is_active",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Your account has been activated successfully."
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        if user is not None:
            send_password_reset_email(
                user=user,
                request=request,
            )

        return Response(
            {
                "detail": (
                    "If an account with this email exists, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, uid, token, *args, **kwargs):
        user = get_object_or_404(
            User,
            pk=uid,
        )

        if not verify_password_reset_token(
            user=user,
            token=token,
        ):
            return Response(
                {
                    "detail": "Invalid or expired password reset link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save(
            update_fields=[
                "password",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Your password has been reset successfully."
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class DeleteAccountView(
    generics.GenericAPIView
):
    serializer_class = DeleteAccountSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = request.user

        refresh_token = request.data.get("refresh")

        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken

                RefreshToken(
                    refresh_token
                ).blacklist()

            except Exception:
                pass

        user.delete()

        return Response(
            {
                "detail": "Your account has been deleted successfully."
            },
            status=status.HTTP_200_OK,
        )