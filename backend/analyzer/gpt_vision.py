import openai
import base64
import json
from io import BytesIO
from PIL import Image
import re
import os
from dotenv import load_dotenv

Image.MAX_IMAGE_PIXELS = None

# ✅ Load .env and set OpenAI key
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# ✅ Regex pattern for valid window tags + unlabeled
WINDOW_TAG_PATTERN = re.compile(
    r"^(E\d{1,3}|EWC\d+|EWA\d+|WG\d+|W\d+[A-Z]?|WW\d+|WINDOW[-_]?\d+|W[-_]?\d+|WIN\d+|WD\d+|W|UNLABELED)$",
    re.IGNORECASE
)

def is_valid_window_tag(tag):
    tag = tag.strip().upper()
    return bool(WINDOW_TAG_PATTERN.match(tag))

def image_to_base64(pil_image):
    buffered = BytesIO()
    pil_image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def analyze_image_with_references(pil_image, drawing_type, reference_images):
    """
    Analyze a tile with AI using provided reference images (doors/windows).
    """
    base64_tile = image_to_base64(pil_image)

    prompt = f"""
You are an AI model analyzing architectural drawing tiles.

Tasks:
- Detect ALL windows (tagged or untagged) and count them.
- If a window has a tag, use it as key. If a window has no tag, count it under "UNLABELED".
- Detect total number of doors.
- Flag conditions:
    • Any window closer than 24 inches to a door.
    • If drawing type is "elevation", flag any window less than 18 inches from the floor.

Instructions:
✅ Count every window, even if unlabeled.
✅ Differentiate between doors and windows accurately.
✅ Use reference images for guidance but rely on architectural patterns too.
✅ Do not confuse doors and windows even if similar.
✅ Output ONLY valid JSON in this format:
{{
  "window_types": {{"E01": 3, "UNLABELED": 250}},
  "door_count": 2,
  "flags": []
}}
"""

    try:
        # ✅ Build GPT message content dynamically with reference images
        content = [{"type": "text", "text": prompt.strip()}]

        for img_b64 in reference_images.values():
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img_b64}"}
            })

        # ✅ Add target tile image
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{base64_tile}"}
        })

        messages = [
            {
                "role": "system",
                "content": "You are a strict JSON generator. Only respond with valid JSON. No explanation. No markdown."
            },
            {"role": "user", "content": content}
        ]

        # ✅ Call GPT Vision
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
            temperature=0
        )

        text = response.choices[0].message.content.strip()
        print("GPT Raw Response:", text)

        json_start = text.find('{')
        json_end = text.rfind('}') + 1

        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON found in GPT response")

        json_str = text[json_start:json_end]
        result = json.loads(json_str)

        # ✅ Accept all valid window tags including "UNLABELED"
        filtered_window_types = {
            tag: count
            for tag, count in result.get("window_types", {}).items()
            if is_valid_window_tag(tag)
        }

        return {
            "window_types": filtered_window_types,
            "door_count": int(result.get("door_count", 0)),
            "flags": result.get("flags", [])
        }

    except Exception as e:
        print("GPT Vision error:", str(e))
        return {
            "window_types": {},
            "door_count": 0,
            "flags": ["AI detection failed or malformed response"]
        }
