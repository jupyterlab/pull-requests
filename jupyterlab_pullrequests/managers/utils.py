import re

UPPER_CASE = re.compile(r"(?<!^)(?=[A-Z])")


def snake_to_camel_case(name: str) -> str:
    first, *rest = name.split("_")
    return "".join([first.lower(), *map(str.title, rest)])


def camel_to_snake_case(name: str) -> str:
    return UPPER_CASE.sub("_", name).lower()
