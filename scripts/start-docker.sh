root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f ipfs-tracker 2>/dev/null

# sometimes port 80 is busy for unknown reason
while ! nc -z localhost 80; do   
  sleep 0.1
done

# listen on 8000 and 80 ports because sometimes 80 doesn't work
# 4001 is the ipfs p2p port
docker run \
  --detach \
  --volume=$(pwd):/usr/src/ipfs-tracker \
  --workdir=/usr/src/ipfs-tracker \
  --name ipfs-tracker \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --publish 80:80 \
  node:18 sh -c "npm ci && NO_IP_VALIDATE=1 DEBUG=ipfs-tracker:* PORT=80 npm start"

docker logs --follow ipfs-tracker
