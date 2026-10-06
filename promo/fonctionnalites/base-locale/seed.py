import json, uuid, random, datetime
random.seed(7)
T=json.load(open('tracks.json'))
BAD=('DJ Top Gun','Mark Holiday','DJ Playback','Andrea Bocelli','Master of Puppets','Purrple Cat','Daniel Garcia','Les Hérissons')
q=lambda s: "NULL" if s is None else "'"+str(s).replace("'","''")+"'"
out=[]
ADMIN=str(uuid.uuid4())
names=["LaPlatine","julie.mp3","Kaïdo","Bastos","Nono_92","Sweetbeat","DJ_Karim","Tomtom","Capucine","Vinylbaby","Mehdi_RTX","Zoé.zik","Gaspard","Yaya","Inès","Rémi_B","Sacha","Lulu","Malo","Anaïs_K"]
users=[(ADMIN,"ZIK",1300,320,"admin")]
for i,n in enumerate(names):
    users.append((str(uuid.uuid4()), n, 1250-i*17-random.randint(0,9), random.randint(25,300),"user"))
for uid,n,elo,gp,role in users:
    out.append(f"insert into auth.users(id) values ('{uid}');")
    lvl=max(1,int(gp/9))
    out.append(f"insert into profiles(id,username,elo,games_played,total_score,xp,level,role,current_streak,best_streak,win_streak,best_win_streak) values ('{uid}',{q(n)},{elo},{gp},{gp*14},{gp*180},{lvl},'{role}',{random.randint(1,12)},{random.randint(12,30)},{random.randint(0,4)},{random.randint(4,9)});")
tid_by={}
now=datetime.datetime.utcnow()
for key, lst in T.items():
    name,emoji,code,qcm=key.split('|')
    pid=str(uuid.uuid4())
    good=[t for t in lst if not t['artist'].startswith(BAD)]
    out.append(f"insert into custom_playlists(id,owner_id,name,emoji,is_public,track_count,is_official) values ('{pid}','{ADMIN}',{q(name)},{q(emoji)},true,{len(good)},true);")
    for pos,t in enumerate(good):
        k=(t['artist'].lower(),t['title'].lower())
        if k not in tid_by:
            tid=str(uuid.uuid4()); tid_by[k]=tid
            out.append(f"insert into tracks(id,artist,title,preview_url,preview_expires_at,cover_url,external_id,source) values ('{tid}',{q(t['artist'])},{q(t['title'])},{q(t['preview'])},'2099-01-01',{q(t['cover'])},{q(t['ext'])},'deezer');")
            out.append(f"insert into zikle_pool(track_id) values ('{tid}');")
        out.append(f"insert into custom_playlist_tracks(playlist_id,track_id,position,source,external_id) values ('{pid}','{tid_by[k]}',{pos},'deezer',{q(t['ext'])});")
    for c,mode,rounds,suffix in ((code,'classic',10,''),(qcm,'qcm',20,' - Casual')):
        if not c: continue
        out.append(f"insert into rooms(code,name,emoji,owner_id,playlist_id,is_public,is_official,game_mode,max_rounds) values ('{c}',{q(name+suffix)},{q(emoji)},'{ADMIN}','{pid}',true,true,'{mode}',{rounds});")
# games for leaderboards
for d in range(40):
    gid=str(uuid.uuid4()); t=now-datetime.timedelta(hours=d*5)
    out.append(f"insert into games(id,room_id,started_at,ended_at,mode) values ('{gid}','KM2H86','{t.isoformat()}','{(t+datetime.timedelta(minutes=6)).isoformat()}','classic');")
    for r,(uid,n,elo,gp,role) in enumerate(random.sample(users[1:],4)):
        out.append(f"insert into game_players(game_id,user_id,username,score,rank) values ('{gid}','{uid}',{q(n)},{random.randint(8,30)},{r+1});")
# zikle: today song
today=(now+datetime.timedelta(hours=2)).date()
zt=tid_by[('stromae','alors on danse')]
out.append(f"insert into daily_songs(date,track_id) values ('{today}','{zt}');")
for i,(uid,n,*_) in enumerate(users[1:15]):
    att=random.choice([1,2,2,3,3,4,5,6]); won=random.random()<0.85
    out.append(f"insert into daily_results(user_id,date,attempts,won,solve_time_seconds) values ('{uid}','{today}',{att},{str(won).lower()},{random.randint(4,60) if won else 'NULL'});")
# weekly challenge active
ws=today-datetime.timedelta(days=today.weekday())
cid=str(uuid.uuid4())
out.append(f"insert into weekly_challenges(id,week_start,week_end,type,target,current_value,status) values ('{cid}','{ws}','{ws+datetime.timedelta(days=6)}','correct_answers',5000,3712,'active');")
for uid,n,*_ in users[1:12]:
    out.append(f"insert into weekly_challenge_contributions(challenge_id,user_id,amount) values ('{cid}','{uid}',{random.randint(40,420)});")
open('03_seed.sql','w').write("\n".join(out))
json.dump({'admin':ADMIN,'users':users}, open('users.json','w'), ensure_ascii=False)
print(len(out))
