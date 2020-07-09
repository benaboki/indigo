from .base import *

# Configure default domain name
ALLOWED_HOSTS = [os.environ['WEBSITE_SITE_NAME'] + '.akn4undocs.ipbes.net', '127.0.0.1', '172.17.0.5', 'localhost'] if 'WEBSITE_SITE_NAME' in os.environ else []

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configure Postgres database
db_from_env = dj_database_url.config(conn_max_age=500)
DATABASES['default'].update(db_from_env)

# ##### SECURITY CONFIGURATION ############################

# If you have security settings like CSRF_COOKIE_SECURE = True is set and you are accessing /
# the site non-securely or if CSRF_COOKIE_HTTPONLY = True /
# https://docs.djangoproject.com/en/2.2/ref/settings/#csrf-cookie-secure
# https://docs.djangoproject.com/en/2.2/ref/settings/#csrf-cookie-httponly

# https://docs.djangoproject.com/en/dev/ref/settings/#secure-proxy-ssl-header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# # https://docs.djangoproject.com/en/dev/ref/settings/#secure-ssl-redirect
SECURE_SSL_REDIRECT = True

# # https://docs.djangoproject.com/en/dev/ref/settings/#session-cookie-secure
SESSION_COOKIE_SECURE = True

# # https://docs.djangoproject.com/en/dev/ref/settings/#csrf-cookie-secure
CSRF_COOKIE_SECURE = True

# # https://docs.djangoproject.com/en/dev/topics/security/#ssl-https
# # https://docs.djangoproject.com/en/dev/ref/settings/#secure-hsts-seconds
# # TODO: set this to 60 seconds first and then to 518400 once you prove the former works
SECURE_HSTS_SECONDS = 518400

# # https://docs.djangoproject.com/en/dev/ref/settings/#secure-hsts-include-subdomains
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# # https://docs.djangoproject.com/en/dev/ref/settings/#secure-hsts-preload
SECURE_HSTS_PRELOAD = True

# # https://docs.djangoproject.com/en/dev/ref/middleware/#x-content-type-options-nosniff
SECURE_CONTENT_TYPE_NOSNIFF = True

#### AZURE BLOB STORAGE ####
DEFAULT_FILE_STORAGE = 'indigo.custom_azure.AzureMediaStorage'
STATICFILES_STORAGE = 'indigo.custom_azure.AzureStaticStorage'

STATIC_LOCATION = "static"
MEDIA_LOCATION = "media"

AZURE_ACCOUNT_NAME = os.environ.get('AZURE_ACCOUNT_NAME')
AZURE_CUSTOM_DOMAIN = f'{AZURE_ACCOUNT_NAME}.blob.core.windows.net'

# the URL for assets 
# Use Azure settings to replace STATIC_URL above
STATIC_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{STATIC_LOCATION}/'
MEDIA_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{MEDIA_LOCATION}/' 
