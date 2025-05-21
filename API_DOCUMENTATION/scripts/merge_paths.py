import yaml, os

root = os.path.dirname(__file__)
paths_dir = os.path.join(root, "../paths")
components_dir = os.path.join(root, "../components")
openapi_path = os.path.join(root, "../openapi.yaml")

with open(openapi_path, "r") as f:
    openapi = yaml.safe_load(f)

openapi["paths"] = {}
for file in os.listdir(paths_dir):
    if file.endswith(".yaml"):
        with open(os.path.join(paths_dir, file), "r") as f:
            data = yaml.safe_load(f)
            openapi["paths"].update(data.get("paths", {}))

for file in os.listdir(components_dir):
    if file.endswith(".yaml"):
        with open(os.path.join(components_dir, file), "r") as f:
            data = yaml.safe_load(f)
            for section, defs in data.get("components", {}).items():
                if section not in openapi["components"]:
                    openapi["components"][section] = {}
                openapi["components"][section].update(defs)

with open(openapi_path, "w") as f:
    yaml.dump(openapi, f, sort_keys=False)

print("✅ Merged openapi.yaml successfully.")
