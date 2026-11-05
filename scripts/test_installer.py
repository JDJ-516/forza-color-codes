import base64
import hashlib
import io
from pathlib import Path
import re
import unittest
import zipfile
import tempfile
import subprocess
import os
import socket
import urllib.request
import json
import importlib.util
_spec=importlib.util.spec_from_file_location('installer_builder',Path(__file__).with_name('build-windows-installer.py'))
_builder=importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_builder)
ROOT,payload=_builder.ROOT,_builder.payload

class InstallerTests(unittest.TestCase):
    def test_payload_integrity_allowlist_and_reproducibility(self):
        installer=(ROOT/'Install Forza Garage.cmd').read_text()
        archive=base64.b64decode(installer.rsplit(':FORZA_PAYLOAD',1)[1].strip())
        expected=re.search(r"if\(\$actual -ne '([a-f0-9]{64})'",installer)[1]
        self.assertEqual(hashlib.sha256(archive).hexdigest(),expected)
        self.assertEqual(archive,payload())
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            self.assertIsNone(z.testzip())
            self.assertIn('app/launcher.js',z.namelist())
            self.assertIn('app/public/catalogue.json',z.namelist())
            self.assertIn('install.ps1',z.namelist())
            for name in z.namelist():
                self.assertTrue(name.startswith('app/') or name=='install.ps1')
                self.assertNotIn('..',Path(name).parts)
                self.assertNotIn('.git',Path(name).parts)
                self.assertNotIn('.env',Path(name).parts)
                if name.startswith('app/'):
                    self.assertEqual(z.read(name),(ROOT/name[4:]).read_bytes())

    def test_extracted_bundle_starts_and_serves_its_assets(self):
        installer=(ROOT/'Install Forza Garage.cmd').read_text()
        archive=base64.b64decode(installer.rsplit(':FORZA_PAYLOAD',1)[1].strip())
        with tempfile.TemporaryDirectory(prefix='forza-bundle-') as directory:
            with zipfile.ZipFile(io.BytesIO(archive)) as z:z.extractall(directory)
            app=Path(directory)/'app'
            with socket.socket() as listener:
                listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
            env={**os.environ,'FORZA_GARAGE_PORT':str(port),'FORZA_GARAGE_UDP_PORT':'0','FORZA_GARAGE_STATE_DIR':str(Path(directory)/'runtime')}
            try:
                subprocess.run(['node','launcher.js','--no-open'],cwd=app,env=env,check=True,capture_output=True,timeout=20)
                for resource in ['/', '/api/health', '/api/telemetry', '/app.js', '/garage.js', '/drag-workspace.js', '/color-tools.js', '/catalogue.json']:
                    with urllib.request.urlopen(f'http://127.0.0.1:{port}'+resource,timeout=3) as response:
                        self.assertEqual(response.status,200)
                        self.assertGreater(len(response.read()),0)
            finally:
                subprocess.run(['node','launcher.js','--stop'],cwd=app,env=env,capture_output=True,timeout=10)

if __name__=='__main__':unittest.main()
