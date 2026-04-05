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


def update_wiki_link_title(content: str, note_id: str, old_title: str, new_title: str) -> str:
    """Update wiki-link title in HTML content for a specific note ID."""
    # Pattern to match the wiki-link span with the specific note ID
    # Matches: <span ... data-note-id="uuid" ... data-title="old_title" ...>[[old_title]]</span>
    # Also handles: <span ... data-title="old_title" ... data-note-id="uuid" ...>[[old_title]]</span>
    
    def replace_link(match: re.Match) -> str:
        full_match = match.group(0)
        # Update data-title attribute
        updated = re.sub(
            r'data-title="[^"]*"',
            f'data-title="{new_title}"',
            full_match
        )
        # Update the text content [[old_title]] to [[new_title]]
        updated = re.sub(
            r'\[\[[^\]]*\]\]',
            f'[[{new_title}]]',
            updated
        )
        return updated
    
    # Match wiki-link spans with this specific note ID
    pattern = re.compile(
        rf'<span[^>]*data-type="wiki-link"[^>]*data-note-id="{re.escape(note_id)}"[^>]*>\[\[[^\]]*\]\]</span>',
        re.IGNORECASE
    )
    content = pattern.sub(replace_link, content)
    
    # Also handle case where data-note-id comes before data-type
    pattern2 = re.compile(
        rf'<span[^>]*data-note-id="{re.escape(note_id)}"[^>]*data-type="wiki-link"[^>]*>\[\[[^\]]*\]\]</span>',
        re.IGNORECASE
    )
    content = pattern2.sub(replace_link, content)
    
    return content
