import os
import re
import smtplib
import json
import logging
from email.message import EmailMessage
from typing import Any
from urllib.parse import quote_plus
import requests

logger = logging.getLogger("kovidam.shortlist.notifier")

EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def extract_candidate_email(extracted: dict[str, Any]) -> str | None:
    data = extracted or {}
    # Prefer direct full text fields when present.
    preferred_sources = [
        str(data.get("raw_text_full") or ""),
        str(data.get("raw_text_preview") or ""),
        str((data.get("contact") or {}).get("email") or ""),
    ]
    for text in preferred_sources:
        match = EMAIL_REGEX.search(text)
        if match:
            return match.group(0).strip()

    # Fallback: scan the full extracted payload for any email token.
    try:
        payload_text = json.dumps(data, ensure_ascii=False)
    except Exception:
        payload_text = str(data)
    match = EMAIL_REGEX.search(payload_text)
    if match:
        return match.group(0).strip()
    return None


def build_interview_link(base_url: str, *, email: str, role: str, company_name: str, position_title: str) -> str:
    base = (base_url or "").strip()
    if not base:
        return ""
    sep = "&" if "?" in base else "?"
    params = (
        f"email={quote_plus(email)}"
        f"&role={quote_plus(role)}"
        f"&company={quote_plus(company_name)}"
        f"&position={quote_plus(position_title)}"
    )
    return f"{base}{sep}{params}"


def send_shortlist_email(
    *,
    to_email: str,
    candidate_name: str,
    interview_link: str,
    company_name: str,
    position_title: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str | None,
    smtp_password: str | None,
    from_email: str,
    use_tls: bool = True,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = f"Shortlisted for {position_title} at {company_name}"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        (
            f"Hi {candidate_name},\n\n"
            f"Congratulations! You are shortlisted for the {position_title} role at {company_name}.\n"
            "Please complete your AI interview using the link below:\n\n"
            f"{interview_link}\n\n"
            "Best,\n"
            f"{company_name} Hiring Team\n"
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        if smtp_user:
            server.login(smtp_user, smtp_password or "")
        server.send_message(msg)


def send_shortlist_notifications(
    *,
    shortlisted: list[dict[str, Any]],
    role: str,
    company_name: str,
    position_title: str,
    interview_base_url: str,
) -> dict[str, Any]:
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    resend_from_email = os.getenv("RESEND_FROM_EMAIL", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip() or None
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip() or None
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user or "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    use_resend = bool(resend_api_key and resend_from_email)
    use_smtp = bool(smtp_host and from_email)
    logger.info(
        "shortlist_notify_init",
        extra={
            "shortlisted_count": len(shortlisted),
            "use_resend": use_resend,
            "use_smtp": use_smtp,
            "smtp_host_set": bool(smtp_host),
            "smtp_user_set": bool(smtp_user),
            "smtp_password_len": len(smtp_password or ""),
            "interview_base_url_set": bool(interview_base_url),
        },
    )
    if not use_resend and not use_smtp:
        logger.warning("shortlist_notify_disabled_missing_provider")
        return {
            "enabled": False,
            "reason": "Configure either RESEND_API_KEY+RESEND_FROM_EMAIL or SMTP settings.",
            "sent": 0,
            "failed": 0,
            "results": [],
        }
    if use_smtp and smtp_user and not smtp_password and not use_resend:
        logger.warning("shortlist_notify_disabled_missing_smtp_password")
        return {
            "enabled": False,
            "reason": "SMTP_PASSWORD missing. For Gmail, use a 16-character App Password (not your normal Gmail password).",
            "sent": 0,
            "failed": 0,
            "results": [],
        }

    results: list[dict[str, Any]] = []
    sent = 0
    failed = 0
    for candidate in shortlisted:
        extracted = candidate.get("extracted", {}) or {}
        to_email = extract_candidate_email(extracted)
        filename = str(candidate.get("filename") or "Candidate")
        candidate_name = filename.rsplit(".", 1)[0]
        if not to_email:
            logger.warning("shortlist_notify_email_missing", extra={"candidate_filename": filename})
            failed += 1
            results.append({"filename": filename, "status": "failed", "reason": "Email not found in resume text"})
            continue

        interview_link = build_interview_link(
            interview_base_url,
            email=to_email,
            role=role,
            company_name=company_name,
            position_title=position_title,
        )
        if not interview_link:
            logger.warning(
                "shortlist_notify_interview_link_missing",
                extra={"candidate_filename": filename, "candidate_email": to_email},
            )
            failed += 1
            results.append({"filename": filename, "status": "failed", "reason": "Interview base URL missing"})
            continue

        try:
            if use_resend:
                resp = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": resend_from_email,
                        "to": [to_email],
                        "subject": f"Shortlisted for {position_title} at {company_name}",
                        "text": (
                            f"Hi {candidate_name},\n\n"
                            f"Congratulations! You are shortlisted for the {position_title} role at {company_name}.\n"
                            "Please complete your AI interview using the link below:\n\n"
                            f"{interview_link}\n\n"
                            "Best,\n"
                            f"{company_name} Hiring Team\n"
                        ),
                    },
                    timeout=20,
                )
                if resp.status_code >= 300:
                    raise RuntimeError(f"Resend API failed: {resp.status_code} {resp.text}")
            else:
                send_shortlist_email(
                    to_email=to_email,
                    candidate_name=candidate_name,
                    interview_link=interview_link,
                    company_name=company_name,
                    position_title=position_title,
                    smtp_host=smtp_host,
                    smtp_port=smtp_port,
                    smtp_user=smtp_user,
                    smtp_password=smtp_password,
                    from_email=from_email,
                    use_tls=use_tls,
                )
            sent += 1
            logger.info(
                "shortlist_notify_sent",
                extra={
                    "candidate_filename": filename,
                    "candidate_email": to_email,
                    "provider": "resend" if use_resend else "smtp",
                },
            )
            results.append({"filename": filename, "email": to_email, "status": "sent", "interview_link": interview_link})
        except Exception as exc:
            failed += 1
            logger.exception(
                "shortlist_notify_failed",
                extra={"candidate_filename": filename, "candidate_email": to_email},
            )
            results.append({"filename": filename, "email": to_email, "status": "failed", "reason": str(exc)})

    logger.info("shortlist_notify_summary", extra={"sent": sent, "failed": failed})
    return {
        "enabled": True,
        "reason": "",
        "sent": sent,
        "failed": failed,
        "results": results,
    }
