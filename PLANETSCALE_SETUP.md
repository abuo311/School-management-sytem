# PlanetScale Setup for School Management System

## Connection Details (Save these securely!)

Host: 
Username: 
Password: 

## Full JDBC URL Format:
jdbc:mysql://HOST/school_management?useSSL=true&serverTimezone=UTC

Example:
jdbc:mysql://aws.connect.psdb.cloud/school_management?useSSL=true&serverTimezone=UTC

## For Local Testing:

Update your `School-backend/src/main/resources/application-prod.properties`:

```properties
server.port=8080
spring.datasource.url=jdbc:mysql://YOUR_HOST/school_management?useSSL=true&serverTimezone=UTC
spring.datasource.username=YOUR_USERNAME
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
```

Then run with: `mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=prod"`

## For Render Deployment:

Set these environment variables in Render dashboard:
- SPRING_DATASOURCE_URL=jdbc:mysql://YOUR_HOST/school_management?useSSL=true&serverTimezone=UTC
- SPRING_DATASOURCE_USERNAME=YOUR_USERNAME
- SPRING_DATASOURCE_PASSWORD=YOUR_PASSWORD
- SPRING_JPA_HIBERNATE_DDL_AUTO=update
