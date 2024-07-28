FROM nginx:1.26.1
#RUN rm /etc/nginx/conf.d/default.conf
COPY html/ /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
#COPY gzip.conf /etc/nginx/conf.d/gzip.conf

RUN mkdir /etc/nginx/njs

COPY njs/ /etc/nginx/njs

USER itg-user