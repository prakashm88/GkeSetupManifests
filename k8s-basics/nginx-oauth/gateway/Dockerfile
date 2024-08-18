FROM nginx:1.26.1

RUN apt-get update && \
    apt-get install -y vim-tiny && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
    
#RUN rm /etc/nginx/conf.d/default.conf
COPY html/ /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
#COPY gzip.conf /etc/nginx/conf.d/gzip.conf

RUN mkdir /etc/nginx/njs

COPY njs/ /etc/nginx/njs

RUN useradd -m -s /bin/bash itg-user
RUN chown -R itg-user:itg-user /etc/nginx

USER itg-user