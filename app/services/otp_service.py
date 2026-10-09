import os
import random
import smtplib

from datetime import datetime, timedelta, timezone
from email.message import EmailMessage


# =========================================================
# SMTP CONFIGURATION
# =========================================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com"
)

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587"
    )
)

SMTP_USERNAME = os.getenv(
    "SMTP_USERNAME"
)

SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD"
)

SMTP_FROM = os.getenv(
    "SMTP_FROM",
    SMTP_USERNAME
)


# =========================================================
# OTP STORAGE
# =========================================================

otp_storage = {}


# =========================================================
# GENERATE OTP
# =========================================================

def generate_otp():
    return f"{random.randint(0, 999999):06d}"


# =========================================================
# SEND OTP
# =========================================================

def send_otp(email: str):

    recipient_email = str(email).lower().strip()

    print(
        "================================================="
    )

    print(
        f"OTP REQUEST FOR: {recipient_email}"
    )

    print(
        f"SMTP SERVER: {SMTP_HOST}:{SMTP_PORT}"
    )

    print(
        f"SMTP SENDER: {SMTP_USERNAME}"
    )

    # -----------------------------------------------------
    # CHECK SMTP CONFIG
    # -----------------------------------------------------

    if not SMTP_USERNAME:
        print("ERROR: SMTP_USERNAME is missing")
        return False

    if not SMTP_PASSWORD:
        print("ERROR: SMTP_PASSWORD is missing")
        return False

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=1)
    )

    otp_storage[recipient_email] = {
        "otp": otp,
        "expires_at": expires_at
    }

    print(
        f"Generated OTP for {recipient_email}"
    )

    # -----------------------------------------------------
    # CREATE EMAIL
    # -----------------------------------------------------

    message = EmailMessage()

    message["Subject"] = (
        "Enterprise DMS - Email Verification OTP"
    )

    message["From"] = SMTP_FROM

    # IMPORTANT:
    # This is the user's email.
    message["To"] = recipient_email

    message.set_content(
        f"""
Hello,

Your Enterprise Document Management System
verification OTP is:

{otp}

This OTP is valid for 1 minute only.

If the OTP expires, please request a new OTP.

If you did not request this OTP, please ignore this email.

Enterprise Document Intelligence
"""
    )

    # -----------------------------------------------------
    # CONNECT TO GMAIL
    # -----------------------------------------------------

    try:

        print(
            "Connecting to Gmail SMTP..."
        )

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=20
        ) as server:

            print(
                "Connected to Gmail SMTP."
            )

            server.ehlo()

            print(
                "Starting TLS..."
            )

            server.starttls()

            server.ehlo()

            print(
                "TLS connection established."
            )

            print(
                "Logging into Gmail..."
            )

            server.login(
                SMTP_USERNAME,
                SMTP_PASSWORD
            )

            print(
                "Gmail login successful."
            )

            print(
                f"Sending email to {recipient_email}..."
            )

            server.send_message(
                message
            )

            print(
                "Email sent successfully."
            )

        print(
            f"OTP successfully sent to {recipient_email}"
        )

        print(
            "================================================="
        )

        return True

    except smtplib.SMTPAuthenticationError as e:

        print(
            "SMTP AUTHENTICATION ERROR:"
        )

        print(e)

        otp_storage.pop(
            recipient_email,
            None
        )

        return False

    except smtplib.SMTPException as e:

        print(
            "SMTP ERROR:"
        )

        print(e)

        otp_storage.pop(
            recipient_email,
            None
        )

        return False

    except TimeoutError as e:

        print(
            "SMTP TIMEOUT:"
        )

        print(e)

        otp_storage.pop(
            recipient_email,
            None
        )

        return False

    except Exception as e:

        print(
            "GENERAL EMAIL ERROR:"
        )

        print(
            repr(e)
        )

        otp_storage.pop(
            recipient_email,
            None
        )

        return False


# =========================================================
# VERIFY OTP
# =========================================================

def verify_otp(
    email: str,
    otp: str
):

    recipient_email = str(
        email
    ).lower().strip()

    data = otp_storage.get(
        recipient_email
    )

    if not data:

        return (
            False,
            "No OTP found. Please request a new OTP."
        )

    # -----------------------------------------------------
    # CHECK EXPIRATION
    # -----------------------------------------------------

    if datetime.now(timezone.utc) > data["expires_at"]:

        otp_storage.pop(
            recipient_email,
            None
        )

        return (
            False,
            "OTP expired. Please request a new OTP."
        )

    # -----------------------------------------------------
    # CHECK FORMAT
    # -----------------------------------------------------

    if not otp.isdigit() or len(otp) != 6:

        return (
            False,
            "OTP must be 6 digits."
        )

    # -----------------------------------------------------
    # CHECK VALUE
    # -----------------------------------------------------

    if data["otp"] != otp:

        return (
            False,
            "Invalid OTP."
        )

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    otp_storage.pop(
        recipient_email,
        None
    )

    return (
        True,
        "OTP verified successfully."
    )