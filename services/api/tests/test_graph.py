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


def test_dependency_chain_respects_depth_in_both_directions(test_db):
    test_db.add(Repository(id="chain", name="Chain"))
    paths = [f"app/{name}.py" for name in ("a", "b", "c", "d", "e")]
    test_db.add_all(IndexedFile(id=f"chain-{index}", repository_id="chain", path=path)
                    for index, path in enumerate(paths))
    test_db.add_all(DependencyEdge(id=f"chain-edge-{index}", repository_id="chain",
                                   source_file_id=f"chain-{index}", target_file_id=f"chain-{index + 1}",
                                   edge_type="imports") for index in range(4))
    test_db.commit()

    graph = GraphEngine(test_db)
    depth_one = graph.find_connected_files("chain", ["app/c.py"], max_depth=1)
    assert depth_one["direct"] == ["app/c.py"]
    assert depth_one["upstream"] == ["app/d.py"]
    assert depth_one["downstream"] == ["app/b.py"]
    assert depth_one["paths"]["upstream"] == {"app/d.py": ["app/c.py", "app/d.py"]}
    assert depth_one["paths"]["downstream"] == {"app/b.py": ["app/c.py", "app/b.py"]}

    depth_three = graph.find_connected_files("chain", ["app/c.py"], max_depth=3)
    assert depth_three["upstream"] == ["app/d.py", "app/e.py"]
    assert depth_three["downstream"] == ["app/a.py", "app/b.py"]
    assert depth_three["paths"]["downstream"]["app/a.py"] == ["app/c.py", "app/b.py", "app/a.py"]
    assert graph.find_connected_files("chain", ["app/c.py"], max_depth=0) == {
        "direct": ["app/c.py"], "upstream": [], "downstream": [],
        "paths": {"upstream": {}, "downstream": {}},
    }


def test_fanout_diamond_and_cycle_have_stable_shortest_paths(test_db):
    test_db.add(Repository(id="diamond", name="Diamond"))
    for name in ("seed", "b", "c", "target", "caller", "isolated"):
        test_db.add(IndexedFile(id=f"diamond-{name}", repository_id="diamond", path=f"app/{name}.py"))
    for source, target in (("seed", "c"), ("seed", "b"), ("b", "target"),
                           ("c", "target"), ("target", "seed"), ("caller", "seed")):
        test_db.add(DependencyEdge(repository_id="diamond", source_file_id=f"diamond-{source}",
                                   target_file_id=f"diamond-{target}", edge_type="calls"))
    test_db.commit()

    graph = GraphEngine(test_db)
    connected = graph.find_connected_files("diamond", ["app/seed.py", "app/seed.py"], max_depth=3)
    assert connected["direct"] == ["app/seed.py"]
    assert connected["upstream"] == ["app/b.py", "app/c.py", "app/target.py"]
    assert connected["downstream"] == ["app/b.py", "app/c.py", "app/caller.py", "app/target.py"]
    assert connected["paths"]["upstream"]["app/target.py"] == ["app/seed.py", "app/b.py", "app/target.py"]
    assert connected["paths"]["downstream"]["app/b.py"] == ["app/seed.py", "app/target.py", "app/b.py"]
    assert "app/isolated.py" not in connected["upstream"] + connected["downstream"]
    assert graph.find_connected_files("diamond", ["app/seed.py", "app/seed.py"], max_depth=3) == connected


def test_missing_seeds_and_other_repository_nodes_are_excluded(test_db):
    test_db.add_all([Repository(id="first", name="First"), Repository(id="second", name="Second")])
    test_db.add_all([
        IndexedFile(id="first-a", repository_id="first", path="a.py"),
        IndexedFile(id="first-b", repository_id="first", path="b.py"),
        IndexedFile(id="second-a", repository_id="second", path="a.py"),
        IndexedFile(id="second-secret", repository_id="second", path="secret.py"),
    ])
    test_db.add(DependencyEdge(repository_id="first", source_file_id="first-a", target_file_id="first-b", edge_type="imports"))
    test_db.add(DependencyEdge(repository_id="second", source_file_id="second-a", target_file_id="second-secret", edge_type="imports"))
    test_db.commit()

    graph = GraphEngine(test_db)
    assert graph.find_connected_files("first", ["missing.py"]) == {
        "direct": [], "upstream": [], "downstream": [], "paths": {"upstream": {}, "downstream": {}},
    }
    connected = graph.find_connected_files("first", ["missing.py", "a.py"], max_depth=4)
    assert connected["direct"] == ["a.py"]
    assert connected["upstream"] == ["b.py"]
    assert connected["downstream"] == []
    assert "secret.py" not in str(connected)
