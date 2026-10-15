Local Backup
mongodump --uri="mongodb://127.0.0.1:27017/auction_db" --out="C:\backup"

Server Backup
mongodump --uri="mongodb://admin:AdminStrongPass123@76.13.244.61:27017/auction_db?authSource=admin" --out="C:\backup"

Local Restore 
mongorestore --uri="mongodb://127.0.0.1:27017/auction_db" "C:\backup\auction_db"

Server Restore
mongorestore --uri="mongodb://admin:AdminStrongPass123@76.13.244.61:27017/auction_db?authSource=admin" "C:\backup\auction_db"

Restore from ZIP Backup
mongorestore --uri="mongodb://127.0.0.1:27017/auction_db" --archive="C:\backup\auction.gz" --gzip

DataBase Tools Installed
mongodump --version
mongorestore --version

Start / Stop MongoDB Server
Start:
net start MongoDB
Stop:
net stop MongoDB