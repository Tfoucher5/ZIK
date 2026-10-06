import json, urllib.request, urllib.parse, time
songs=json.load(open('songs.json')); out={}
for key, lst in songs.items():
    res=[]
    for q in lst:
        u="https://api.deezer.com/search?limit=1&q="+urllib.parse.quote(q)
        try:
            d=json.load(urllib.request.urlopen(u, timeout=15))['data']
        except Exception as e:
            print('ERR',q,e); continue
        if not d: print('NONE',q); continue
        t=d[0]
        res.append(dict(artist=t['artist']['name'], title=t['title_short'], preview=t['preview'], cover=t['album']['cover_xl'], ext=str(t['id'])))
        time.sleep(0.12)
    out[key]=res
    print(key, len(res), [r['artist']+' - '+r['title'] for r in res][:30])
json.dump(out, open('tracks.json','w'), ensure_ascii=False, indent=0)
