from io import BytesIO
import base64
from PIL import Image
import exceptions
from uuid import UUID


def pillow_to_b64(pil_image, img_format="PNG"):
    buffered = BytesIO()  # create a virtual buffer
    pil_image.save(buffered, format=img_format)  # save the image to that virtual buffer

    img_bytes_array = buffered.getvalue()  # get the data from that buffer
    base64_encoded_bytes = base64.b64encode(img_bytes_array)
    base64_encoded_string = base64_encoded_bytes.decode("utf-8")
    return base64_encoded_string


def load_base64_to_pillow(base64_string):
    """
    Decodes a base64 image string and loads it into a Pillow Image object.

    Args:
        base64_string (str): The base64 encoded image string.
                             It might optionally include a prefix like
                             "data:image/png;base64," or "data:image/jpeg;base64,".

    Returns:
        PIL.Image.Image: A Pillow Image object, or None if decoding fails.
    """
    # 1. Handle potential data URI prefix
    # Many base64 image strings come with a prefix like "data:image/png;base64,"
    # We need to remove this prefix before decoding the actual base64 data.
    if "," in base64_string:
        # Split at the first comma and take the second part (the actual base64 data)
        base64_data = base64_string.split(",")[1]
    else:
        base64_data = base64_string

    try:
        # 2. Decode the base64 string to bytes
        decoded_bytes = base64.b64decode(base64_data)

        # 3. Use BytesIO to create an in-memory binary stream
        # Pillow's Image.open() can read from file-like objects
        image_stream = BytesIO(decoded_bytes)

        # 4. Open the image using Pillow
        pillow_image = Image.open(image_stream)

        return pillow_image

    except Exception as e:
        print(f"Error loading base64 image to Pillow: {e}")
        return None


def dashify_uuid(uuid: str) -> str:
    try:
        dashed_uuid = (
            uuid[0:8]
            + "-"
            + uuid[8:12]
            + "-"
            + uuid[12:16]
            + "-"
            + uuid[16:20]
            + "-"
            + uuid[20:32]
        )
        return dashed_uuid
    except:
        print(f"coudn't dashify uuid: {uuid}")
        return ""


def undashify_uuid(uuid: str) -> str:
    return uuid.replace("-", "")


def check_valid_uuid(uuid: str) -> bool:
    """Checks if a uuid is valid"""
    if not len(uuid) == 32:
        return False
    else:
        return True


def normalize_uuid(value: str) -> str:
    try:
        return UUID(value).hex
    except ValueError:
        raise exceptions.UnprocessableEntity("Invalid UUID")


def is_valid_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except ValueError:
        return False
