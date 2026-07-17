from pydantic import BaseModel


class ModelRecord(BaseModel):
    name: str
    version: str
    data: str
    license: str
    artifact: str
    report: str
