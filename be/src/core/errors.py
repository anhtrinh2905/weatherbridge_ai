from dataclasses import dataclass


@dataclass
class AppError(Exception):
    status_code: int
    detail: str
    code: str = "application_error"
