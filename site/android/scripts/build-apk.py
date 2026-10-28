#!/usr/bin/env python3
"""Dependency-free SDK build. Signing material is supplied separately via environment."""
import hashlib
import os
import re
from pathlib import Path
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
sdk = Path(os.environ.get("ANDROID_HOME", os.environ.get("ANDROID_SDK_ROOT", "")))
jdk = Path(os.environ.get("JAVA_HOME", "/usr/lib/jvm/java-17-openjdk-amd64")) / "bin"
tools = sdk / "build-tools/36.0.0"
platform = sdk / "platforms/android-36/android.jar"
work = root / "app/build/manual-release"
work.mkdir(parents=True, exist_ok=True)
for name in ["gen", "classes", "dex"]:
    shutil.rmtree(work / name, ignore_errors=True)
    (work / name).mkdir()

def run(*args):
    subprocess.run([str(arg) for arg in args], check=True)

config=(root / "app/build.gradle").read_text()
version_code=re.search(r"versionCode\s+(\d+)",config).group(1)
version_name=re.search(r"versionName\s+[\"\']([^\"\']+)",config).group(1)
source = root / "app/src/main"
manifest = (source / "AndroidManifest.xml").read_text().replace('<manifest xmlns:android=', '<manifest package="br.com.sentinelatapajos.app" xmlns:android=')
(work / "AndroidManifest.xml").write_text(manifest)
run(tools / "aapt2", "compile", "--dir", source / "res", "-o", work / "resources.zip")
assets = ["-A", source / "assets"] if (source / "assets").is_dir() else []
run(tools / "aapt2", "link", "-o", work / "resources.apk", "-I", platform, "--manifest", work / "AndroidManifest.xml", "--java", work / "gen", "--auto-add-overlay", "--min-sdk-version", "23", "--target-sdk-version", "36", "--version-code", version_code, "--version-name", version_name, *assets, "-R", work / "resources.zip")
java = sorted((source / "java").rglob("*.java")) + sorted((work / "gen").rglob("*.java"))
run(jdk / "javac", "-encoding", "UTF-8", "--release", "8", "-classpath", platform, "-d", work / "classes", *java)
run(jdk / "java", "-cp", tools / "lib/d8.jar", "com.android.tools.r8.D8", "--lib", platform, "--min-api", "23", "--output", work / "dex", *sorted((work / "classes").rglob("*.class")))
shutil.copyfile(work / "resources.apk", work / "unsigned.apk")
with zipfile.ZipFile(work / "unsigned.apk", "a", compression=zipfile.ZIP_DEFLATED) as archive:
    for dex in sorted((work / "dex").glob("*.dex")):
        archive.write(dex, dex.name)
run(tools / "zipalign", "-f", "4", work / "unsigned.apk", work / "aligned.apk")
output = root / f"app/build/outputs/apk/release/Sentinela_Tapajos_v{version_name}.apk"
output.parent.mkdir(parents=True, exist_ok=True)
os.environ["SENTINELA_BUILD_PASSWORD"] = Path(os.environ["SENTINELA_PASSWORD_FILE"]).read_text().strip()
run(jdk / "java", "-jar", tools / "lib/apksigner.jar", "sign", "--ks", os.environ["SENTINELA_KEYSTORE"], "--ks-key-alias", "sentinela-tapajos", "--ks-pass", "env:SENTINELA_BUILD_PASSWORD", "--key-pass", "env:SENTINELA_BUILD_PASSWORD", "--v1-signing-enabled", "true", "--v2-signing-enabled", "true", "--v3-signing-enabled", "true", "--out", output, work / "aligned.apk")
run(jdk / "java", "-jar", tools / "lib/apksigner.jar", "verify", "--verbose", "--print-certs", output)
run(tools / "zipalign", "-c", "4", output)
print("APK:", output)
print("SHA-256:", hashlib.sha256(output.read_bytes()).hexdigest())
