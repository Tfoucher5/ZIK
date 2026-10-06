#!/bin/bash
# rafraîchit le preview Deezer du titre du jour (les liens expirent vite)
P=$(curl -s "https://api.deezer.com/track/$(psql -h /tmp -p 54322 -U postgres -d zik -tAc "select t.external_id from daily_songs d join tracks t on t.id=d.track_id order by date desc limit 1")" | python3 -c "import json,sys; print(json.load(sys.stdin)['preview'])")
psql -h /tmp -p 54322 -U postgres -d zik -qc "update tracks set preview_url='$P' where id=(select track_id from daily_songs order by date desc limit 1)"
echo "$P" | cut -c1-60
