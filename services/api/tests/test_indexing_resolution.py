from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import DependencyEdge, IndexedFile, IndexedSymbol, Repository
from app.indexing.engine import IndexingEngine


def _index(tmp_path, sources):
    for path, content in sources.items():
        source = tmp_path / path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text(content, encoding="utf-8")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add(Repository(id="resolution", name="Resolution", workspace_path=str(tmp_path), status="pending"))
    db.commit()
    assert IndexingEngine(db).index_repository("resolution").status == "ready"
    paths = {item.id: item.path for item in db.query(IndexedFile).all()}
    symbols = {item.id: (paths[item.file_id], item.name) for item in db.query(IndexedSymbol).all()}
    edges = [
        (paths[e.source_file_id], paths[e.target_file_id], e.edge_type,
         symbols.get(e.source_symbol_id), symbols.get(e.target_symbol_id))
        for e in db.query(DependencyEdge).all()
    ]
    db.close()
    engine.dispose()
    return edges


def test_same_named_functions_and_test_fixtures_resolve_within_source_file(tmp_path):
    edges = _index(tmp_path, {
        "pkg/a.py": "def helper(): pass\ndef use(): helper()\n",
        "pkg/b.py": "def helper(): pass\ndef use(): helper()\n",
        "tests/test_a.py": "from pkg.a import helper\ndef test_db(): helper()\n",
        "tests/test_b.py": "from pkg.b import helper\ndef test_db(): helper()\n",
    })
    calls = [edge for edge in edges if edge[2] == "calls"]
    assert ("tests/test_a.py", "pkg/a.py", "calls", ("tests/test_a.py", "test_db"), ("pkg/a.py", "helper")) in calls
    assert ("tests/test_b.py", "pkg/b.py", "calls", ("tests/test_b.py", "test_db"), ("pkg/b.py", "helper")) in calls
    assert not any(source == "pkg/a.py" and target == "pkg/b.py" for source, target, *_ in calls)


def test_imported_alias_and_statically_exported_instance_method_resolve(tmp_path):
    edges = _index(tmp_path, {
        "pkg/security.py": "def hash_password(value): return value\n",
        "pkg/service.py": "class Service:\n    def update(self): pass\nservice = Service()\n",
        "pkg/route.py": "from pkg.security import hash_password as hp\nfrom pkg.service import service as svc\ndef endpoint():\n    hp('x')\n    svc.update()\n",
    })
    calls = [edge for edge in edges if edge[2] == "calls"]
    assert ("pkg/route.py", "pkg/security.py", "calls", ("pkg/route.py", "endpoint"), ("pkg/security.py", "hash_password")) in calls
    assert ("pkg/route.py", "pkg/service.py", "calls", ("pkg/route.py", "endpoint"), ("pkg/service.py", "Service.update")) in calls


def test_ambiguous_and_dynamic_calls_create_no_speculative_edges(tmp_path):
    edges = _index(tmp_path, {
        "pkg/a.py": "def shared(): pass\n",
        "pkg/b.py": "def shared(): pass\n",
        "pkg/route.py": "def endpoint(obj):\n    shared()\n    obj.shared()\n",
    })
    assert not [edge for edge in edges if edge[2] == "calls"]


def test_package_module_alias_and_class_method_resolve_from_explicit_imports(tmp_path):
    edges = _index(tmp_path, {
        "pkg/a.py": "def run(): pass\n",
        "pkg/service.py": "class Service:\n    def update(self): pass\n",
        "pkg/route.py": "from pkg import a as module_a\nfrom pkg.service import Service\ndef endpoint():\n    module_a.run()\n    Service.update(None)\n",
    })
    calls = [edge for edge in edges if edge[2] == "calls"]
    assert ("pkg/route.py", "pkg/a.py", "calls", ("pkg/route.py", "endpoint"), ("pkg/a.py", "run")) in calls
    assert ("pkg/route.py", "pkg/service.py", "calls", ("pkg/route.py", "endpoint"), ("pkg/service.py", "Service.update")) in calls
