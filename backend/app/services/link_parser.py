import re
import uuid

WIKI_LINK_PATTERN = re.compile(r"\[\[(.+?)\]\]")


def extract_link_titles(content: str) -> list[str]:
    return WIKI_LINK_PATTERN.findall(content)


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False
