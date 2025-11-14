import argparse
import json
import os
import re
import tarfile
import requests
from os.path import basename
from pathlib import Path
from typing import Dict

MANIFEST_FILE = "Sapic.json"
REGISTRY_URL_DEV = os.getenv("REGISTRY_URL_DEV")
REGISTRY_URL_PROD = os.getenv("REGISTRY_URL_PROD")
API_KEY = os.getenv("API_KEY")

semver_regex = r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$"

def parse_semver(semver: str) -> (int, int, int):
    match = re.match(semver_regex, semver)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    else:
        raise ValueError(f"Invalid semver: {semver}")

def publish_extension(manifest: Dict, artifact: Path):
    (ver_major, ver_minor, ver_patch) = parse_semver(manifest["version"])
    (min_app_major, min_app_minor, min_app_patch) = parse_semver(manifest["minAppVersion"])

    metadata = {
        'externalId': manifest["identifier"],
        'name': manifest["name"],
        'authors': manifest["authors"],
        'description': manifest["description"],
        'repository': manifest["repository"],
        'verMajor': ver_major,
        'verMinor': ver_minor,
        'verPatch': ver_patch,
        'minAppMajor': min_app_major,
        'minAppMinor': min_app_minor,
        'minAppPatch': min_app_patch,
    }

    print(metadata)

    data = {
        "metadata": json.dumps(metadata),
    }

    files = {
        "file": open(artifact, "rb"),
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    # Publishing the extension to both dev and prod registry
    response = requests.post(f"{REGISTRY_URL_DEV}/extensions", data=data, files=files, headers=headers)

    if response.status_code == 201:
        print(f"Successfully published extension {manifest['identifier']}-{manifest['version']} to dev registry")
    else:
        print(f"Failed to publish extension {manifest['identifier']}-{manifest['version']} to dev registry")
        print(response.json())
        exit(1)

    response = requests.post(f"{REGISTRY_URL_PROD}/extensions", data=data, files=files, headers=headers)

    if response.status_code == 201:
        print(f"Successfully published extension {manifest['identifier']}-{manifest['version']} to prod registry")
    else:
        print(f"Failed to publish extension {manifest['identifier']}-{manifest['version']} to prod registry")
        print(response.json())
        exit(1)


def build_extension(manifest: Dict, extension_path: Path) -> Path:
    # TODO: Proper build logic
    # For now we will just pack the manifest and all folders listed in the contributes in the manifest
    output_name = f"{basename(extension_path)}.tar.gz"
    output_path = Path("build")/ output_name

    folders = []
    for folder in manifest["contributes"].keys():
        folders.append(Path(folder))

    with tarfile.open(output_path, "w:gz") as tar:
        for folder in folders:
            tar.add(extension_path / folder, arcname=folder)
        tar.add(extension_path / MANIFEST_FILE, arcname=MANIFEST_FILE)

    return output_path

def main():
    parser = argparse.ArgumentParser(
        prog="Package extension",
        description="Build extension at the given submodule path and publish it",
    )
    parser.add_argument("path", help="Path to the extension submodule")
    args = parser.parse_args()

    # TODO: Validate extension
    extension_path = Path(args.path)
    manifest_path = extension_path / MANIFEST_FILE
    manifest = json.load(manifest_path.open())
    artifact = build_extension(manifest, Path(parser.parse_args().path))
    publish_extension(manifest, artifact)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        exit(1)