from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        exc = ValidationError(detail)

    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and "message" in response.data:
            message = response.data["message"]
            if isinstance(message, list) and len(message) == 1:
                response.data["message"] = message[0]
        return response

    if isinstance(exc, IntegrityError):
        return Response(
            {
                "message": (
                    "The request could not be completed because it conflicts with existing data."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return None
