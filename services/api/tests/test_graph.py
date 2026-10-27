import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.graph.engine import GraphEngine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_graph_construction_and_traversal(test_db):
    repo = Repository(id="repo-g", name="GraphRepo")
    test_db.add(repo)

    f1 = IndexedFile(id="f1", repository_id="repo-g", path="app/api/users.py")
    f2 = IndexedFile(id="f2", repository_id="repo-g", path="app/services/user_service.py")
    f3 = IndexedFile(id="f3", repository_id="repo-g", path="app/models/user.py")
    test_db.add_all([f1, f2, f3])

    # f1 -> imports -> f2 -> imports -> f3
    e1 = DependencyEdge(id="e1", repository_id="repo-g", source_file_id="f1", target_file_id="f2", edge_type="imports")
    e2 = DependencyEdge(id="e2", repository_id="repo-g", source_file_id="f2", target_file_id="f3", edge_type="imports")
    test_db.add_all([e1, e2])
    test_db.commit()

    engine = GraphEngine(test_db)
    G = engine.build_repository_graph("repo-g")

    assert G.number_of_nodes() == 3
    assert G.number_of_edges() == 2

    # Test React Flow graph format
    rf = engine.get_react_flow_graph("repo-g", highlighted_files={"app/services/user_service.py"})
    assert len(rf["nodes"]) == 3
    assert len(rf["edges"]) == 2

    # Check connection traversal from seed f2
    connected = engine.find_connected_files("repo-g", ["app/services/user_service.py"])
    # Upstream should include f3
    assert "app/models/user.py" in connected["upstream"]
    # Downstream caller should include f1
    assert "app/api/users.py" in connected["downstream"]
