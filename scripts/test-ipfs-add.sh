# add to ipfs and provide
cid=$(date | IPFS_PATH=.ipfs ./ipfs add --quieter --pin=false)
cid=$(IPFS_PATH=.ipfs ./ipfs cid base32 $cid)
IPFS_PATH=.ipfs ./ipfs pin add $cid

# remove from ipfs and fetch providers
IPFS_PATH=.ipfs ./ipfs pin rm $cid
IPFS_PATH=.ipfs ./ipfs block rm $cid
IPFS_PATH=.ipfs ./ipfs get $cid
