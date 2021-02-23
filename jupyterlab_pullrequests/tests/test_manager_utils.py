import pytest

from jupyterlab_pullrequests.managers.utils import snake_to_camel_case, camel_to_snake_case

TO_BE_TESTED = [
    ("banana", "banana"),
    ("banana_split", "bananaSplit"),
    ("the_famous_banana_split", "theFamousBananaSplit"),
]


@pytest.mark.parametrize("input_, expected", TO_BE_TESTED)
def test_snake_to_camel_case(input_, expected):
    assert snake_to_camel_case(input_) == expected


@pytest.mark.parametrize("expected, input_", TO_BE_TESTED)
def test_camel_to_snake_case(expected, input_):
    assert camel_to_snake_case(input_) == expected
