from .base import *

# Configure default domain name
ALLOWED_HOSTS = [os.environ['WEBSITE_SITE_NAME'] + '.akn4undocs.ipbes.net', '127.0.0.1', '172.17.0.5', 'localhost'] if 'WEBSITE_SITE_NAME' in os.environ else []

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configure Postgres database
db_from_env = dj_database_url.config(conn_max_age=500)
DATABASES['default'].update(db_from_env)

#### AZURE BLOB STORAGE ####
DEFAULT_FILE_STORAGE = 'indigo.custom_azure.AzureMediaStorage'
AZURE_ACCOUNT_NAME = os.environ.get('AZURE_ACCOUNT_NAME')
MEDIA_LOCATION = "media"
AZURE_ACCOUNT_NAME = os.environ.get('AZURE_ACCOUNT_NAME')
AZURE_CUSTOM_DOMAIN = f'{AZURE_ACCOUNT_NAME}.blob.core.windows.net'
# the URL for assets 
MEDIA_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{MEDIA_LOCATION}/' 