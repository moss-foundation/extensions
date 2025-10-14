import argparse
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
        return process.stdout.strip().splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error executing git command: {e}")
        print(f"Stderr: {e.stderr}")
        exit(1)

def main():
    parser = argparse.ArgumentParser(
        prog='CI',
        description='Check and publish updated submodules',
    )
    parser.add_argument("base", help="Base commit to compare against")
    check_updated_submodules(parser.parse_args().base)


if __name__ == "__main__":
    main()