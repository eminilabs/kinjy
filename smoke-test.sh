#!/usr/bin/env bash
# Kaluta smoke test — exercises the real end-to-end paths through the gateway.
# Usage: bash smoke-test.sh
set -uo pipefail

API="${API:-http://localhost:8200/api}"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ok   $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL $1 -> $2"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected $3, got $2"; fi; }

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
body() { curl -s "$@"; }

echo "== 1. stack health =="
STATUS=$(body "$API/status")
echo "$STATUS" | grep -q '"healthy"' && ok "gateway reachable" || bad "gateway reachable" "$STATUS"
echo "   $STATUS" | head -c 300; echo

echo "== 2. economy rules (no auth, no writes) =="
check "ledger rules" "$(code "$API/ledger/rules")" "200"

SIM=$(body -X POST "$API/ledger/simulate" -H 'Content-Type: application/json' \
      -d '{"kind":"ad_purchase","amount":"1000"}')
echo "$SIM" | grep -q "\"source\":\"1000.00\"" && ok "ad split sums to source" || bad "ad split" "$SIM"

echo "== 3. register + login =="
STAMP=$(date +%s)
REG=$(body -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{
  \"email\":\"smoke$STAMP@example.com\",
  \"password\":\"SmokeTest123!\",
  \"display_name\":\"Smoke Test\",
  \"handle\":\"smoke$STAMP\"
}")
TOKEN=$(echo "$REG" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
REF=$(echo "$REG" | grep -o '"referral_code":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] && ok "registered (referral $REF)" || bad "register" "$REG"
AUTH=(-H "Authorization: Bearer $TOKEN")

check "auth/me"        "$(code "${AUTH[@]}" "$API/auth/me")"     "200"
check "me unauthorised" "$(code "$API/auth/me")"                  "401"

echo "== 4. profile, circles, preferences =="
check "profile"   "$(code "${AUTH[@]}" "$API/users/me")"     "200"
CIRCLE=$(body -X POST "${AUTH[@]}" "$API/circles" -H 'Content-Type: application/json' \
         -d '{"name":"Family","kind":"family"}')
echo "$CIRCLE" | grep -q '"id"' && ok "circle created" || bad "circle" "$CIRCLE"
check "preferences" "$(code "${AUTH[@]}" "$API/preferences")" "200"

echo "== 5. post + feed + why =="
POST=$(body -X POST "${AUTH[@]}" "$API/posts" -H 'Content-Type: application/json' \
       -d '{"body":"Hello Kaluta","topics":["technology"],"city":"Dar es Salaam","country":"TZ"}')
PID=$(echo "$POST" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && ok "post created" || bad "post" "$POST"

check "feed modes"  "$(code "$API/feed/modes")"            "200"
check "feed new"    "$(code "${AUTH[@]}" "$API/feed?mode=new")" "200"
WHY=$(body "${AUTH[@]}" "$API/feed/why/$PID")
echo "$WHY" | grep -q '"factors"' && ok "why-am-i-seeing-this explains" || bad "why" "$WHY"

check "algorithms listed" "$(code "$API/algorithms")" "200"
ALGOS=$(body "$API/algorithms" | grep -o '"id"' | wc -l)
[ "$ALGOS" -ge 14 ] && ok "$ALGOS built-in algorithms seeded" || bad "algorithms" "only $ALGOS"

echo "== 6. family graph =="
ME=$(body -X POST "${AUTH[@]}" "$API/family/persons" -H 'Content-Type: application/json' \
     -d '{"given_name":"Demo","family_name":"Kaluta"}')
MEID=$(echo "$ME" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
DAD=$(body -X POST "${AUTH[@]}" "$API/family/persons" -H 'Content-Type: application/json' \
      -d '{"given_name":"Juma","family_name":"Kaluta"}')
DADID=$(echo "$DAD" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
GRAN=$(body -X POST "${AUTH[@]}" "$API/family/persons" -H 'Content-Type: application/json' \
       -d '{"given_name":"Fatuma","family_name":"Kaluta","deceased":true}')
GRANID=$(echo "$GRAN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

body -X POST "${AUTH[@]}" "$API/family/relationships" -H 'Content-Type: application/json' \
  -d "{\"from_person_id\":\"$DADID\",\"to_person_id\":\"$MEID\",\"kind\":\"parent_of\"}" >/dev/null
body -X POST "${AUTH[@]}" "$API/family/relationships" -H 'Content-Type: application/json' \
  -d "{\"from_person_id\":\"$GRANID\",\"to_person_id\":\"$DADID\",\"kind\":\"parent_of\"}" >/dev/null

REL=$(body "$API/family/how-related?from_person=$MEID&to_person=$GRANID")
echo "$REL" | grep -q 'grandparent' && ok "grandparent derived from edges" || bad "how-related" "$REL"

TREE=$(body "$API/family/tree/$MEID?depth=3")
echo "$TREE" | grep -q "\"level\":2" && ok "level model computed" || bad "tree levels" "$(echo "$TREE" | head -c 200)"

CYCLE=$(code -X POST "${AUTH[@]}" "$API/family/relationships" -H 'Content-Type: application/json' \
        -d "{\"from_person_id\":\"$MEID\",\"to_person_id\":\"$GRANID\",\"kind\":\"parent_of\"}")
check "cycle rejected" "$CYCLE" "400"

echo "== 7. memorial =="
MEM=$(body -X POST "${AUTH[@]}" "$API/memorials" -H 'Content-Type: application/json' \
      -d '{"full_name":"Fatuma Kaluta","death_date":"2019-04-02"}')
QR=$(echo "$MEM" | grep -o '"qr_code":"[^"]*"' | cut -d'"' -f4)
[ -n "$QR" ] && ok "memorial + QR code $QR" || bad "memorial" "$MEM"
check "QR resolves" "$(code "$API/memorials/qr/$QR")" "200"

FAITH=$(code -X POST "${AUTH[@]}" "$API/memorials" -H 'Content-Type: application/json' \
        -d '{"full_name":"Hassan Kaluta","faith_style":"islamic"}')
check "unsourced faith style rejected" "$FAITH" "400"

echo "== 8. marketplace pricing + escrow =="
PRICE=$(body "$API/commerce/pricing?vendor_price=100")
echo "$PRICE" | grep -q "\"customer_price\":\"120.00\"" && ok "100 -> 120 with 20 margin" || bad "pricing" "$PRICE"

PROD=$(body -X POST "${AUTH[@]}" "$API/commerce/products" -H 'Content-Type: application/json' \
       -d '{"title":"Kanga cloth","vendor_price":"100","country":"TZ"}')
echo "$PROD" | grep -q "\"margin\":\"20.00\"" && ok "product margin" || bad "product" "$PROD"

echo "== 9. ad floors =="
check "rate card" "$(code "$API/ads/rate-card")" "200"
LOW=$(code -X POST "${AUTH[@]}" "$API/ads/campaigns" -H 'Content-Type: application/json' \
      -d '{"name":"Cheap","objective":"awareness","pricing_model":"cpm","bid":"0.10","budget":"50"}')
check "below-floor bid rejected" "$LOW" "400"

echo "== 10. wallet, payouts, KYC gates =="
check "wallet"      "$(code "${AUTH[@]}" "$API/wallet")"              "200"
ELIG=$(body "${AUTH[@]}" "$API/payments/eligibility")
echo "$ELIG" | grep -q "\"eligible\":false" && ok "payout gated (no KYC/wallet)" || bad "eligibility" "$ELIG"
check "kyc status"  "$(code "${AUTH[@]}" "$API/kyc/status")"          "200"
KYC=$(code -X POST "${AUTH[@]}" "$API/kyc/start")
check "kyc needs fee first" "$KYC" "402"

echo "== 11. AI gateway + assistant =="
check "providers"  "$(code "$API/ai/providers")" "200"
TR=$(body -X POST "$API/ai/translate" -H 'Content-Type: application/json' \
     -d '{"text":"Habari za asubuhi","target_lang":"fr"}')
echo "$TR" | grep -q '"translated"' && ok "translation (mock)" || bad "translate" "$TR"
ASK=$(body -X POST "$API/assistant/ask" -H 'Content-Type: application/json' -d '{"question":"How do feeds work?"}')
echo "$ASK" | grep -q '"grounded"' && ok "assistant answers (ungrounded until KB seeded)" || bad "assistant" "$ASK"

echo "== 12. internal endpoints must not be reachable =="
check "internal upline blocked"  "$(code "$API/auth/internal/upline/x")"        "404"
check "internal posting blocked" "$(code -X POST "$API/ledger/internal/post/ad-purchase")" "404"
# The realtime hub's push endpoint is internal: anyone able to reach it could
# fabricate live events on other members' screens.
check "internal broadcast blocked"   "$(code -X POST "$API/conversations/internal/broadcast" -H 'Content-Type: application/json' -d '{"topic":"feed","type":"post"}')" "404"

# --- A second member, so the rules that involve two people can be exercised ---
REG2=$(body -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{
  \"email\":\"smoke${STAMP}b@example.com\",
  \"password\":\"SmokeTest123!\",
  \"display_name\":\"Smoke Two\",
  \"handle\":\"smoke${STAMP}b\"
}")
TOKEN2=$(echo "$REG2" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
AUTH2=(-H "Authorization: Bearer $TOKEN2")
UID2=$(body "${AUTH2[@]}" "$API/auth/me" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$TOKEN2" ] && ok "second member registered" || bad "second register" "$REG2"

echo "== 13. privacy rules are enforced, not just stored =="
# Default is connections-only: a stranger must not be able to open a chat.
DM=$(code "${AUTH[@]}" -X POST "$API/conversations" -H 'Content-Type: application/json' \
     -d "{\"participant_ids\":[\"$UID2\"]}")
check "stranger cannot message (default)" "$DM" "403"

body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' \
     -d '{"who_can_message":"everyone"}' >/dev/null
DM_OPEN=$(code "${AUTH[@]}" -X POST "$API/conversations" -H 'Content-Type: application/json' \
          -d "{\"participant_ids\":[\"$UID2\"]}")
check "allowed once they open it" "$DM_OPEN" "201"

echo "== 14. age mode filters in the query =="
MATURE=$(body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json' \
         -d '{"body":"smoke adult item","mature":true}')
MID=$(echo "$MATURE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$MID" ] && ok "adult-declared post created" || bad "mature post" "$MATURE"

body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"age_mode":"adult"}' >/dev/null
body "${AUTH2[@]}" "$API/feed?mode=new&limit=50" | grep -q "$MID" \
  && ok "adult viewer sees it" || bad "adult viewer" "not in feed"

body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"age_mode":"child"}' >/dev/null
body "${AUTH2[@]}" "$API/feed?mode=new&limit=50" | grep -q "$MID" \
  && bad "child viewer filtered" "still in feed" || ok "child viewer does not"
# The direct link must be closed too, or the filter is only cosmetic.
check "direct link closed for a minor" "$(code "${AUTH2[@]}" "$API/posts/$MID")" "404"
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"age_mode":"adult"}' >/dev/null

echo "== 15. data saver withholds bytes server-side =="
VID=$(body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json' \
      -d '{"body":"smoke clip","format":"video","media":[{"url":"http://x/v.mp4","kind":"video"},{"url":"http://x/i.jpg","kind":"image"}]}')
VIDID=$(echo "$VID" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"data_saver":true}' >/dev/null
SAVED=$(body "${AUTH2[@]}" "$API/feed?mode=new&limit=10")
echo "$SAVED" | python -c "
import sys,json
items={p['id']:p for p in json.load(sys.stdin)['items']}
p=items.get('$VIDID')
raise SystemExit(0 if p and len(p['media'])==1 and p['media'][0]['url'] is None and p['media'][0].get('deferred') else 1)
" && ok "video URL withheld, one attachment only" || bad "data saver" "media still sent"

body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"data_saver":false}' >/dev/null
body "${AUTH2[@]}" "$API/feed?mode=new&limit=10" | grep -q 'v.mp4' \
  && ok "sent again when off" || bad "data saver off" "still withheld"

echo "== 16. wellbeing counts time, and refuses to be lied to =="
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' \
     -d '{"wellbeing_enabled":true,"daily_limit_minutes":90}' >/dev/null
# Two defences, and both are checked: an absurd claim never reaches the counter,
# and a claim that *is* within the schema is still capped at the time that
# actually elapsed. Only the second one is a clamp; the first is a refusal.
check "absurd claim refused outright" \
  "$(code "${AUTH2[@]}" -X POST "$API/wellbeing/heartbeat" -H 'Content-Type: application/json' -d '{"minutes":600}')" \
  "422"

body "${AUTH2[@]}" -X POST "$API/wellbeing/heartbeat" -H 'Content-Type: application/json' -d '{"minutes":1}' >/dev/null
sleep 2
B2=$(body "${AUTH2[@]}" -X POST "$API/wellbeing/heartbeat" -H 'Content-Type: application/json' -d '{"minutes":10}')
M2=$(echo "$B2" | grep -o '"minutes_today":[0-9.]*' | cut -d: -f2)
# 10 claimed on top of 1 already counted, ~2 seconds elapsed. Unclamped would
# reach 11; clamped stays near 1.
python -c "raise SystemExit(0 if 0 < float('$M2' or 0) < 3 else 1)" \
  && ok "10-minute claim clamped to $M2 by elapsed time" || bad "wellbeing clamp" "credited '$M2'"

echo "== 17. reposts, views and declared interests =="
SRC=$(body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json' \
      -d '{"body":"smoke source #agriculture"}')
SRCID=$(echo "$SRC" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

RP=$(body "${AUTH2[@]}" -X POST "$API/posts/$SRCID/repost" -H 'Content-Type: application/json' -d '{}')
echo "$RP" | grep -q "\"repost_of\"" && ok "repost carries the original" || bad "repost" "$RP"
check "reposting twice refused" \
  "$(code "${AUTH2[@]}" -X POST "$API/posts/$SRCID/repost" -H 'Content-Type: application/json' -d '{}')" "409"
check "undo repost" \
  "$(code "${AUTH2[@]}" -X DELETE "$API/posts/$SRCID/repost")" "204"

V1=$(body "${AUTH2[@]}" -X POST "$API/posts/views" -H 'Content-Type: application/json' -d "{\"post_ids\":[\"$SRCID\",\"$SRCID\"]}")
V2=$(body "${AUTH2[@]}" -X POST "$API/posts/views" -H 'Content-Type: application/json' -d "{\"post_ids\":[\"$SRCID\"]}")
echo "$V1" | grep -q '"recorded":1' && ok "view counted once per member" || bad "views" "$V1"
echo "$V2" | grep -q '"recorded":0' && ok "replay adds nothing" || bad "views replay" "$V2"
OWN=$(body "${AUTH[@]}" -X POST "$API/posts/views" -H 'Content-Type: application/json' -d "{\"post_ids\":[\"$SRCID\"]}")
echo "$OWN" | grep -q '"recorded":0' && ok "author viewing own post does not count" || bad "self view" "$OWN"

# A declared interest must appear as a named factor, not vanish into a score.
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' \
     -d '{"interest_topics":["Agriculture"]}' >/dev/null
body "${AUTH2[@]}" "$API/feed?mode=for_you&limit=40" | python -c "
import sys,json
d=json.load(sys.stdin)
p=next((x for x in d['items'] if x['id']=='$SRCID'), None)
raise SystemExit(0 if p and any(f['factor']=='interest' for f in (p.get('why') or [])) else 1)
" && ok "interest shows as a named ranking factor" || bad "interest factor" "absent from why"
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"interest_topics":[]}' >/dev/null

echo "== 18. comments stop at two levels, hashtags become topics =="
C1=$(body "${AUTH2[@]}" -X POST "$API/posts/$SRCID/comments" -H 'Content-Type: application/json' -d '{"body":"top level"}')
C1ID=$(echo "$C1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C2=$(body "${AUTH[@]}" -X POST "$API/posts/$SRCID/comments" -H 'Content-Type: application/json' \
     -d "{\"body\":\"a reply\",\"parent_id\":\"$C1ID\"}")
C2ID=$(echo "$C2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C3=$(body "${AUTH2[@]}" -X POST "$API/posts/$SRCID/comments" -H 'Content-Type: application/json' \
     -d "{\"body\":\"deeper\",\"parent_id\":\"$C2ID\"}")
echo "$C3" | grep -q '"depth":1' && ok "third level folds back to depth 1" || bad "comment depth" "$C3"
echo "$SRC" | grep -q '"agriculture"' && ok "hashtag became a topic" || bad "hashtag" "$SRC"

echo "== 19. shorts =="
SHORT=$(body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json'         -d '{"body":"smoke reel clip","format":"short","media":[{"url":"http://x/s.mp4","kind":"video","width":1080,"height":1920,"duration_seconds":12.5}]}')
SHORTID=$(echo "$SHORT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "$SHORT" | grep -q '"width":1080' && ok "clip dimensions round-trip" || bad "short media" "$SHORT"

# A landscape clip posted to the feed must not be promoted into the reel.
body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json'      -d '{"body":"smoke wide clip","format":"video","media":[{"url":"http://x/w.mp4","kind":"video"}]}' >/dev/null
body "${AUTH2[@]}" "$API/shorts?limit=40" | python -c "
import sys,json
d=json.load(sys.stdin)
formats={p['format'] for p in d['items']}
raise SystemExit(0 if formats <= {'short'} and any(p['id']=='$SHORTID' for p in d['items']) else 1)
" && ok "reel carries shorts only" || bad "shorts feed" "a non-short leaked in"

# The reel shares the feed's base query, so age_mode must bite here too.
body "${AUTH[@]}" -X POST "$API/posts" -H 'Content-Type: application/json'      -d '{"body":"smoke adult reel","format":"short","mature":true,"media":[{"url":"http://x/m.mp4","kind":"video","width":1080,"height":1920}]}' >/dev/null
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"age_mode":"child"}' >/dev/null
body "${AUTH2[@]}" "$API/shorts?limit=40" | python -c "
import sys,json
raise SystemExit(0 if not any(p.get('mature') for p in json.load(sys.stdin)['items']) else 1)
" && ok "age mode filters the reel" || bad "shorts age filter" "a mature short reached a minor"
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"age_mode":"adult"}' >/dev/null

# A brand-new member's profile is materialised lazily. Their posts must still
# carry a resolved author everywhere — this used to fall back to a raw usr_… id.
body "${AUTH2[@]}" "$API/feed?mode=new&limit=30" | python -c "
import sys,json
items=json.load(sys.stdin)['items']
raise SystemExit(0 if items and all(p.get('author') for p in items) else 1)
" && ok "every author on the page resolves" || bad "author resolution" "a raw usr_ id leaked to the UI"

echo "== 20. people search (chat can be started without pasting an id) =="
HANDLE=$(echo "$REG2" | grep -o '"handle":"[^"]*"' | head -1 | cut -d'"' -f4)
# Searched by full handle: a shared prefix matches dozens of smoke accounts and
# the result cap would push the new one out — that would test the limit, not the
# search. Registration seeds the profile, so a brand-new member is findable
# immediately rather than only after visiting their own page.
body "${AUTH[@]}" "$API/users/search?q=$HANDLE" | python -c "
import sys,json
raise SystemExit(0 if any(i['handle']=='$HANDLE' for i in json.load(sys.stdin)['items']) else 1)
" && ok "a brand-new member is findable by handle" || bad "people search" "handle not found"

# discoverable must actually hide someone, not just be stored.
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"discoverable":false}' >/dev/null
body "${AUTH[@]}" "$API/users/search?q=$HANDLE" | python -c "
import sys,json
raise SystemExit(0 if not any(i['handle']=='$HANDLE' for i in json.load(sys.stdin)['items']) else 1)
" && ok "discoverable=false hides them from search" || bad "discoverable" "still findable"
body "${AUTH2[@]}" -X PATCH "$API/preferences" -H 'Content-Type: application/json' -d '{"discoverable":true}' >/dev/null

check "one-character query refused politely"   "$(code "${AUTH[@]}" "$API/users/search?q=a")" "200"

# Conversations must name people, not raw ids.
body "${AUTH[@]}" "$API/conversations" | python -c "
import sys,json
items=json.load(sys.stdin)['items']
raise SystemExit(0 if all('profiles' in c and 'unread' in c for c in items) else 1)
" && ok "conversations carry profiles and unread counts" || bad "conversations" "still ids only"

echo
echo "================================"
echo "  passed $PASS   failed $FAIL"
echo "================================"
[ "$FAIL" -eq 0 ]
