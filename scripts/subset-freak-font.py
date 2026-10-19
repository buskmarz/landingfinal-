"""Optional asset regeneration; builds use the committed WOFF, no Python dependency."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parent.parent
source = TTFont(root / 'freak/rye.ttf')
font = TTFont(root / 'freak/rye.ttf')
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(0x0000, 0x0250))
subsetter.subset(font)
for name_id, value in [(1, 'Freak Display'), (3, 'FreakDisplayLatinSubset'), (4, 'Freak Display Regular'), (6, 'FreakDisplay-Regular'), (16, 'Freak Display')]:
    for record in list(font['name'].names):
        if record.nameID == name_id:
            font['name'].setName(value, name_id, record.platformID, record.platEncID, record.langID)
for character in set('FREAKDJ en vivo.Puntos y premiosáéíóúñÁÉÍÓÚÑ'):
    original = source.getBestCmap().get(ord(character))
    current = font.getBestCmap().get(ord(character))
    assert original and current, character
    assert source['hmtx'][original] == font['hmtx'][current], character
font.flavor = 'woff'
font.save(root / 'freak/fonts/FreakDisplay-Latin.woff')
print('Subset saved; Latin characters and horizontal metrics verified.')
