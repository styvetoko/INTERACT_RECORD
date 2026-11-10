// Variables d'environnement des tests : base dédiée, secrets factices.
process.env.NODE_ENV = 'test';
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL manquant : lance les tests avec jest');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-characters';
process.env.SMS_PROVIDER = 'fake';
process.env.PAYMENT_PROVIDER = 'fake';
process.env.DEFAULT_COUNTRY = 'CM';
process.env.STORAGE_PROVIDER = 'fake';
process.env.PUBLIC_MEDIA_URL = 'http://localhost:4000/media';
process.env.PUBLIC_WEB_URL = 'https://interactrecord.test';
if (!process.env.STORAGE_DIR) throw new Error('STORAGE_DIR manquant : lance les tests avec jest');
