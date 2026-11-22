"""Validate Sites-only contracts without pretending legacy Wrangler checks passed."""
import argparse,json,re
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator
p=argparse.ArgumentParser();p.add_argument('--spec',required=True,type=Path);a=p.parse_args()
for name in ['profile','acceptance','maintenance','install']:
    document=yaml.safe_load(Path(f'.smallgreen/{name}.yaml').read_text())
    Draft202012Validator(json.loads((a.spec/f'schemas/{name}.schema.json').read_text())).validate(document)
install=yaml.safe_load(Path('.smallgreen/install.yaml').read_text())
hosting=json.loads(Path('.openai/hosting.json').read_text())
assert hosting['d1']=='DB' and hosting['r2']=='BUCKET' and hosting['capabilities']==['mcp']
assert install['hosting']['external_infrastructure']==[] and install['status']=='candidate' and install['blockers']
assert {item['stage'] for item in install['acceptance']}=={'deployment','runtime-setup','operational'}
assert not list(Path('.').glob('wrangler.*')), 'No standalone Cloudflare deployment configuration'
for folder in ['app','lib','worker']:
    for f in Path(folder).rglob('*'):
        if f.is_file() and f.suffix in ['.js','.mjs','.ts','.tsx']:
            text=f.read_text()
            assert not re.search(r'https://(?:api.openai.com|api.groq.com)|OPENAI_API_KEY|GROQ_API_KEY',text), f
print('PASS: four contract schemas; Sites manifest; candidate boundaries; no external AI runtime')
