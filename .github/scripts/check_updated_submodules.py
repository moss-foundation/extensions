# TODO: Put to .github folder

import argparse
import json
import os
import subprocess

def check_updated_submodules(base: str) -> list[str]:
    command = ["git", "diff", "--name-only", base, "HEAD"]

    try:
        process = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        return [path for path in process.stdout.strip().splitlines() if path.startswith("extensions/")]
    except subprocess.CalledProcessError as e:
        print(f"Error executing git command: {e}")
        print(f"Stderr: {e.stderr}")
        exit(1)

def main():
    parser = argparse.ArgumentParser(
        prog='Check updated submodules',
        description='List all updated submodules',
    )
    parser.add_argument("base", help="Base commit to compare against")
    updated_submodules = check_updated_submodules(parser.parse_args().base)

    print(updated_submodules)

    json_output = json.dumps(updated_submodules)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as fh:
        fh.write(f'UPDATED_SUBMODULES={json_output}\n')


if __name__ == "__main__":
    main()