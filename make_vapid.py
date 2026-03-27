from base64 import b64encode
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid01

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

vapid = Vapid01()
vapid.generate_keys()

public_key_bytes = vapid.public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint,
)

public_key_base64url = (
    b64encode(public_key_bytes)
    .decode("utf-8")
    .replace("+", "-")
    .replace("/", "_")
    .replace("=", "")
)

private_key_pem = vapid.private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode("utf-8")

(DATA_DIR / "vapid_public_key.txt").write_text(public_key_base64url, encoding="utf-8")
(DATA_DIR / "vapid_private.pem").write_text(private_key_pem, encoding="utf-8")

print("saved:")
print(DATA_DIR / "vapid_public_key.txt")
print(DATA_DIR / "vapid_private.pem")
print()
print("VAPID_PUBLIC_KEY_BASE64URL=")
print(public_key_base64url)