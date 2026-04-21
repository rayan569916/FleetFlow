import secrets
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv()

def gen_reset_token():
    return secrets.token_urlsafe(6)

def send_reset_email(to_email, token):
    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")

    if not email_address or not email_password:
        raise ValueError("EMAIL_ADDRESS or EMAIL_PASSWORD is not set in the environment.")

    message = MIMEText(f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color:#f6f6f6; padding:20px;">
        
        <div style="max-width:600px; margin:auto; background:white; padding:20px; border-radius:10px;">
        
        <h2 style="color:#333;">Reset Your Password</h2>
        
        <p>Dear Customer,</p>
        
        <p>
            We received a request to reset your password for your <b>Captain Cargo</b> account.
        </p>
        
        <p>
            Please use the following verification token to reset your password:
        </p>

        <!-- TOKEN BOX -->
        <div style="margin:20px 0; text-align:center;">
            <div style="
                display:inline-block;
                padding:15px 25px;
                font-size:24px;
                font-weight:bold;
                letter-spacing:3px;
                color:#000;
                background:#f1f1f1;
                border:2px dashed #ccc;
                border-radius:8px;
                user-select:all;
            ">
                {token}
            </div>
            <p style="font-size:12px; color:#777; margin-top:8px;">
            Tap and hold to copy this code
            </p>
        </div>

        <p>
            This token is valid for <b>15 minutes</b>. Please do not share it with anyone.
        </p>

        <p>
            If you did not request a password reset, you can safely ignore this email.
        </p>

        <hr style="margin:20px 0;">

        <p style="font-size:14px; color:#555;">
            Regards,<br>
            <b>Captain Cargo Team
            </b>
        </p>

        </div>
        
    </body>
    </html>
    """, "html")

    message["From"] = email_address
    message["To"] = to_email
    message["Subject"] = "Reset Password for Captain Cargo Application"

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login(email_address, email_password)
        smtp.sendmail(email_address, to_email, message.as_string())
