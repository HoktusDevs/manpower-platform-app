import boto3
import json

# Crear cliente de DynamoDB
dynamodb = boto3.client('dynamodb')

# Obtener todos los elementos
response = dynamodb.scan(
    TableName='ocr-documents-dev',
    ProjectionExpression='id'
)

# Eliminar cada elemento
deleted_count = 0
for item in response['Items']:
    try:
        dynamodb.delete_item(
            TableName='ocr-documents-dev',
            Key={'id': item['id']}
        )
        deleted_count += 1
        print(f"Eliminado: {item['id']['S']}")
    except Exception as e:
        print(f"Error eliminando {item['id']['S']}: {e}")

print(f"\nTotal eliminados: {deleted_count}")
