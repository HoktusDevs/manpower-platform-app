# DynamoDB Local Setup Guide

Este documento explica cómo levantar y utilizar una instancia local de DynamoDB para pruebas de APIs que luego se desplegarán en AWS.

---

## 1. Opciones principales

### DynamoDB Local (oficial de AWS)

* Corre en **Docker** o como `.jar`.
* Gratuito, rápido y confiable para la mayoría de tests.
* Permite almacenar datos en memoria o en disco.

### LocalStack

* Emula múltiples servicios de AWS, incluyendo DynamoDB.
* Útil si tu aplicación también usa **S3, SQS, Lambda**, etc.
* Recomendado para entornos que necesitan simular más de un servicio.

### Serverless Framework

* Con los plugins `serverless-offline` y `serverless-dynamodb-local` puedes levantar DynamoDB junto con tus lambdas simuladas.
* Ideal si ya usas **Serverless Framework**.

---

## 2. DynamoDB Local con Docker

### `docker-compose.yml`

```yaml
services:
  dynamodb:
    image: amazon/dynamodb-local:latest
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "/home/dynamodblocal/data"]
    ports:
      - "8000:8000"
    volumes:
      - ./dynamodb_data:/home/dynamodblocal/data
```

### Crear tabla de ejemplo

```bash
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### Insertar item inicial

```bash
aws dynamodb put-item \
  --table-name Users \
  --item '{"id":{"S":"u1"},"email":{"S":"demo@example.com"}}' \
  --endpoint-url http://localhost:8000 --region us-east-1
```

### Node.js / TypeScript Client

```ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const dynamo = new DynamoDBClient({
  region: "us-east-1",
  endpoint: process.env.DDB_ENDPOINT ?? "http://localhost:8000",
  credentials: {
    accessKeyId: "fake",
    secretAccessKey: "fake",
  },
});
```

> Usa `DDB_ENDPOINT` en local, pero no la definas en producción.

---

## 3. LocalStack con Docker

### `docker-compose.yml`

```yaml
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      - SERVICES=dynamodb,s3,lambda,sqs
      - DEFAULT_REGION=us-east-1
    volumes:
      - "./.localstack:/var/lib/localstack"
```

### Probar conexión

```bash
aws dynamodb list-tables --endpoint-url http://localhost:4566 --region us-east-1
```

---

## 4. Serverless Framework

### Configuración en `serverless.yml`

```yaml
plugins:
  - serverless-dynamodb-local
  - serverless-offline

custom:
  dynamodb:
    start:
      port: 8000
      inMemory: true
      migrate: true
      seed: true

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: Users
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

---

## 5. Buenas prácticas

* **Config por entorno**: manejar endpoint en `.env`.
* **Infra as Code**: define tablas con **CDK/Serverless** para usar la misma definición en local y en AWS.
* **Testing**:

  * Unit tests: mock del cliente DynamoDB.
  * Integration tests: levantar DynamoDB Local en CI y limpiar tablas al inicio/final.
* **Limitaciones**:

  * No hay auto-scaling ni backups gestionados.
  * Streams y TTL funcionan de forma limitada.
  * No soporta DAX ni Global Tables multi-región.

---

## 6. Alternativas de Mocking

* **Moto** (Python) o **dynalite** (Node) → útiles solo para unit tests ligeros.
* Para pruebas reales de integración → usar DynamoDB Local o LocalStack.

---

## 7. Scripts recomendados

En tu `package.json`:

```json
{
  "scripts": {
    "db:start": "docker-compose up -d dynamodb",
    "db:stop": "docker-compose down",
    "db:seed": "node scripts/seedDynamo.js"
  }
}
```

Así podrás iniciar, detener y poblar tu Dynamo local fácilmente.

---

## Conclusión

Sí, es posible levantar un entorno local de DynamoDB con DynamoDB Local, LocalStack o Serverless Framework. Esto te permite testear tus APIs con un entorno realista antes de desplegar en AWS.
