import os
import ast
import json

def load_exceptions():
    exceptions_file = os.path.join(os.path.dirname(__file__), "..", ".architecture_exceptions.json")
    if not os.path.exists(exceptions_file):
        return []
    with open(exceptions_file, "r") as f:
        data = json.load(f)
    exceptions = data.get("exceptions", [])
    
    # Audit Exception Validity
    for idx, exc in enumerate(exceptions):
        assert "source_file" in exc, f"Exception {idx} missing 'source_file'"
        assert "forbidden_module" in exc, f"Exception {idx} missing 'forbidden_module'"
        assert "reason" in exc, f"Exception {idx} missing 'reason'"
        assert "approved_by" in exc, f"Exception {idx} missing 'approved_by'"
    
    return exceptions

exceptions = load_exceptions()

def is_exempt(source_file, forbidden_module):
    # Normalize paths for comparison
    source_file_rel = os.path.relpath(source_file, os.path.join(os.path.dirname(__file__), "..")).replace("\\", "/")
    for exc in exceptions:
        if exc["source_file"] == source_file_rel and exc["forbidden_module"] == forbidden_module:
            return True
    return False

def get_imports(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=file_path)

    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module.split('.')[0])
    return set(imports)

def test_api_v1_routers_architecture():
    routers_dir = os.path.join(os.path.dirname(__file__), "..", "routers", "api", "v1")
    for root, _, files in os.walk(routers_dir):
        for file in files:
            if file.endswith(".py"):
                imports = get_imports(os.path.join(root, file))
                file_path = os.path.join(root, file)
                
                if "database" in imports and not is_exempt(file_path, "database"):
                    raise AssertionError(f"{file} violates architecture: imports 'database'")
                if "repositories" in imports and not is_exempt(file_path, "repositories"):
                    raise AssertionError(f"{file} violates architecture: imports 'repositories'")
                if "prisma" in imports and not is_exempt(file_path, "prisma"):
                    raise AssertionError(f"{file} violates architecture: imports 'prisma'")

def test_services_architecture():
    services_dir = os.path.join(os.path.dirname(__file__), "..", "services")
    for root, _, files in os.walk(services_dir):
        for file in files:
            if file.endswith(".py"):
                imports = get_imports(os.path.join(root, file))
                file_path = os.path.join(root, file)
                
                if "database" in imports and not is_exempt(file_path, "database"):
                    raise AssertionError(f"{file} violates architecture: imports 'database'")
                if "fastapi" in imports and not is_exempt(file_path, "fastapi"):
                    raise AssertionError(f"{file} violates architecture: imports 'fastapi'")
                if "starlette" in imports and not is_exempt(file_path, "starlette"):
                    raise AssertionError(f"{file} violates architecture: imports 'starlette'")
