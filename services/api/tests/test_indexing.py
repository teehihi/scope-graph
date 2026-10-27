from app.indexing.parser import PythonASTParser

SAMPLE_PYTHON_CODE = """
from fastapi import APIRouter
from app.services.user_service import user_service
from app.models.user import Base, User

router = APIRouter()

class UserDto:
    name: str

@router.patch("/me/email")
def update_email():
    \"\"\"Updates user email.\"\"\"
    return user_service.update_user_email(user_id=1, new_email="test@example.com")

def test_user_email():
    assert True
"""

def test_ast_parser_extraction():
    result = PythonASTParser.parse_code("app/api/users.py", SAMPLE_PYTHON_CODE)
    assert len(result.errors) == 0

    # Verify imports
    import_targets = [e.target_symbol for e in result.edges if e.edge_type == "imports"]
    assert "user_service" in import_targets
    assert "User" in import_targets

    # Verify symbols
    sym_names = [s.name for s in result.symbols]
    assert "update_email" in sym_names
    assert "UserDto" in sym_names
    assert "test_user_email" in sym_names

    # Verify endpoint detection
    endpoint_sym = next(s for s in result.symbols if s.name == "update_email")
    assert endpoint_sym.symbol_type == "endpoint"
    assert endpoint_sym.metadata["http_method"] == "PATCH"
    assert endpoint_sym.metadata["route_path"] == "/me/email"

    # Verify test detection
    test_sym = next(s for s in result.symbols if s.name == "test_user_email")
    assert test_sym.symbol_type == "test"
