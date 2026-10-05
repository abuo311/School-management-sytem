# Railway.app MySQL Setup

## Connection Details (Copy from Railway Dashboard)

Use the MySQL service's public TCP Proxy host and port when connecting from Render. Do not use Railway's private domain or internal port from another hosting provider.

MYSQL_PUBLIC_HOST: 
MYSQL_PUBLIC_PORT: 
MYSQL_USER: 
MYSQL_PASSWORD: 
MYSQL_DATABASE: 

## Full JDBC URL:
jdbc:mysql://MYSQL_PUBLIC_HOST:MYSQL_PUBLIC_PORT/MYSQL_DATABASE?serverTimezone=UTC

Example filled in:
jdbc:mysql://<public-tcp-proxy-host>:<public-tcp-proxy-port>/railway?serverTimezone=UTC

## For Render Environment Variables:

Set these on Render dashboard:
- SPRING_DATASOURCE_URL = jdbc:mysql://MYSQL_PUBLIC_HOST:MYSQL_PUBLIC_PORT/MYSQL_DATABASE?serverTimezone=UTC
- SPRING_DATASOURCE_USERNAME = MYSQL_USER
- SPRING_DATASOURCE_PASSWORD = MYSQL_PASSWORD
- SPRING_JPA_HIBERNATE_DDL_AUTO = update
