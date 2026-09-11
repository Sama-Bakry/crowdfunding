import re

from rest_framework import serializers


EGYPTIAN_MOBILE_PATTERN = re.compile(
    r"^01[0125]\d{8}$"
)


def validate_egyptian_mobile(value):
    """
    Validate an Egyptian mobile phone number.

    Accepted format:
        01012345678
        01112345678
        01212345678
        01512345678
    """

    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Phone number is required."
        )

    if not value.isdigit():
        raise serializers.ValidationError(
            "Phone number must contain digits only."
        )

    if not EGYPTIAN_MOBILE_PATTERN.fullmatch(value):
        raise serializers.ValidationError(
            "Please enter a valid Egyptian mobile number."
        )

    return value