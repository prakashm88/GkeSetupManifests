cd gateway

docker build . --tag quay.io/prakashm88/itechgenie/nginx-gateway

docker push quay.io/prakashm88/itechgenie/nginx-gateway

#cd  ../backend-nodejs

#docker build . --tag quay.io/prakashm88/itechgenie/node-echo-backend

#docker push quay.io/prakashm88/itechgenie/node-echo-backend