import networkx as nx
from collections import deque
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import IndexedFile, IndexedSymbol, DependencyEdge

def determine_layer(path: str, symbols: list[IndexedSymbol]) -> str:
    lower_path = path.lower()
    if "test" in lower_path:
        return "test"
    if any(s.symbol_type == "endpoint" for s in symbols) or "api" in lower_path or "route" in lower_path:
        return "api"
    if any(s.symbol_type == "model" for s in symbols) or "model" in lower_path or "schema" in lower_path:
        return "model"
    if "service" in lower_path:
        return "service"
    if "core" in lower_path or "config" in lower_path or "security" in lower_path:
        return "core"
    return "module"

class GraphEngine:
    def __init__(self, db: Session):
        self.db = db

    def build_repository_graph(self, repository_id: str) -> nx.DiGraph:
        """
        Builds a NetworkX directed graph from indexed files and edges.
        """
        files = self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
        edges = self.db.query(DependencyEdge).filter(DependencyEdge.repository_id == repository_id).all()

        symbols_by_file: dict[str, list[IndexedSymbol]] = {}
        all_symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()
        for sym in all_symbols:
            symbols_by_file.setdefault(sym.file_id, []).append(sym)

        G = nx.DiGraph()

        # Add nodes
        for f in files:
            f_symbols = symbols_by_file.get(f.id, [])
            layer = determine_layer(f.path, f_symbols)
            symbol_names = [s.name for s in f_symbols]
            endpoints = [
                {
                    "name": s.name,
                    "method": s.metadata_json.get("http_method", "GET"),
                    "route": s.metadata_json.get("route_path", ""),
                    "line": s.line_start
                }
                for s in f_symbols if s.symbol_type == "endpoint"
            ]

            G.add_node(
                f.id,
                file_id=f.id,
                path=f.path,
                label=f.path.split("/")[-1],
                language=f.language,
                layer=layer,
                symbol_count=len(f_symbols),
                symbols=symbol_names,
                endpoints=endpoints,
            )

        # Add edges
        for e in edges:
            if G.has_node(e.source_file_id) and G.has_node(e.target_file_id):
                G.add_edge(
                    e.source_file_id,
                    e.target_file_id,
                    edge_id=e.id,
                    edge_type=e.edge_type,
                    source_symbol_id=e.source_symbol_id,
                    target_symbol_id=e.target_symbol_id,
                )

        return G

    def get_react_flow_graph(
        self,
        repository_id: str,
        highlighted_files: set[str] | None = None,
        direct_files: set[str] | None = None,
        focus_subgraph_only: bool = False,
    ) -> dict[str, Any]:
        """
        Returns graph structured specifically for React Flow rendering,
        including layout coordinates, layer grouping, and impact styling.
        """
        G = self.build_repository_graph(repository_id)
        highlighted = highlighted_files or set()
        direct = direct_files or set()

        # Filter nodes if focusing on impact subgraph
        nodes_to_include = set(G.nodes)
        if focus_subgraph_only and highlighted:
            subgraph_nodes = set()
            for n, data in G.nodes(data=True):
                if data["path"] in highlighted:
                    subgraph_nodes.add(n)
                    # Include 1-hop predecessors and successors
                    subgraph_nodes.update(G.predecessors(n))
                    subgraph_nodes.update(G.successors(n))
            if subgraph_nodes:
                nodes_to_include = subgraph_nodes

        # Layout positioning calculation by architectural layers
        layer_order = ["api", "service", "model", "core", "test", "module"]
        layer_columns = {layer: i for i, layer in enumerate(layer_order)}
        layer_counts: dict[str, int] = {}

        rf_nodes = []
        for node_id in nodes_to_include:
            data = G.nodes[node_id]
            path = data["path"]
            layer = data["layer"]
            col_index = layer_columns.get(layer, 5)
            row_index = layer_counts.get(layer, 0)
            layer_counts[layer] = row_index + 1

            # Grid spacing for layout
            x_pos = col_index * 280 + 40
            y_pos = row_index * 140 + 60

            is_direct = path in direct
            is_affected = path in highlighted

            impact_status = "none"
            if is_direct:
                impact_status = "direct"
            elif is_affected:
                impact_status = "indirect"

            rf_nodes.append({
                "id": node_id,
                "type": "scopeNode",
                "position": {"x": x_pos, "y": y_pos},
                "data": {
                    "file_id": node_id,
                    "path": path,
                    "label": data["label"],
                    "layer": layer,
                    "language": data["language"],
                    "symbol_count": data["symbol_count"],
                    "symbols": data["symbols"],
                    "endpoints": data["endpoints"],
                    "impact_status": impact_status,
                }
            })

        rf_edges = []
        for u, v, edata in G.edges(data=True):
            if u in nodes_to_include and v in nodes_to_include:
                source_path = G.nodes[u]["path"]
                target_path = G.nodes[v]["path"]
                is_impacted_edge = (source_path in highlighted and target_path in highlighted)

                rf_edges.append({
                    "id": f"e-{u}-{v}-{edata.get('edge_id', '')}",
                    "source": u,
                    "target": v,
                    "animated": is_impacted_edge,
                    "label": edata.get("edge_type", "imports"),
                    "style": {
                        "stroke": "#ef4444" if is_impacted_edge else "#94a3b8",
                        "strokeWidth": 2 if is_impacted_edge else 1.2,
                    },
                })

        return {
            "nodes": rf_nodes,
            "edges": rf_edges,
            "stats": {
                "total_nodes": len(rf_nodes),
                "total_edges": len(rf_edges),
                "impacted_nodes": sum(1 for n in rf_nodes if n["data"]["impact_status"] != "none"),
            }
        }

    def find_connected_files(self, repository_id: str, seed_file_paths: list[str], max_depth: int = 2) -> dict[str, Any]:
        """
        Finds dependency neighbors and shortest explanation paths up to max_depth.
        Stored edges point from the importing/calling file to its dependency.
        Returns:
            "direct": indexed seed files
            "downstream": files that depend on seeds (callers/importers)
            "upstream": files that seeds depend on
            "paths": shortest seed-to-neighbor paths in each direction
        """
        graph = self.build_repository_graph(repository_id)
        path_to_node = {data["path"]: node_id for node_id, data in graph.nodes(data=True)}
        direct_paths = sorted(set(seed_file_paths) & path_to_node.keys())
        seed_nodes = [path_to_node[path] for path in direct_paths]
        seed_set = set(seed_nodes)

        def walk(connected_graph: nx.DiGraph) -> dict[str, list[str]]:
            paths_by_node = {node: [node] for node in seed_nodes}
            queue = deque(seed_nodes)
            while queue:
                node = queue.popleft()
                route = paths_by_node[node]
                if len(route) - 1 >= max_depth:
                    continue
                for neighbor in sorted(connected_graph.successors(node), key=lambda n: graph.nodes[n]["path"]):
                    if neighbor not in paths_by_node:
                        paths_by_node[neighbor] = [*route, neighbor]
                        queue.append(neighbor)
            return {
                graph.nodes[node]["path"]: [graph.nodes[step]["path"] for step in route]
                for node, route in paths_by_node.items() if node not in seed_set
            }

        upstream_paths = walk(graph)
        downstream_paths = walk(graph.reverse(copy=False))
        return {
            "direct": direct_paths,
            "upstream": sorted(upstream_paths),
            "downstream": sorted(downstream_paths),
            "paths": {
                "upstream": dict(sorted(upstream_paths.items())),
                "downstream": dict(sorted(downstream_paths.items())),
            },
        }
