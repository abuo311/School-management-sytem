# Railway.app MySQL Setup

## Connection Details (Copy from Railway Dashboard)

MYSQL_HOST: 
MYSQL_PORT: 
MYSQL_USER: 
MYSQL_PASSWORD: 
MYSQL_DATABASE: 

## Full JDBC URL:
jdbc:mysql://MYSQL_HOST:MYSQL_PORT/MYSQL_DATABASE?useSSL=true&serverTimezone=UTC

Example filled in:
jdbc:mysql://containers-us-west-123.railway.app:6567/railway?useSSL=true&serverTimezone=UTC

## For Render Environment Variables:

Set these on Render dashboard:
- SPRING_DATASOURCE_URL = jdbc:mysql://MYSQL_HOST:MYSQL_PORT/MYSQL_DATABASE?useSSL=true&serverTimezone=UTC
- SPRING_DATASOURCE_USERNAME = MYSQL_USER
- SPRING_DATASOURCE_PASSWORD = MYSQL_PASSWORD
- SPRING_JPA_HIBERNATE_DDL_AUTO = update
