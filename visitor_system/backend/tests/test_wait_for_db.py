from scripts.wait_for_db import main


def test_wait_for_db_script_succeeds_for_current_database():
    assert main() == 0
